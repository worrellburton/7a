'use client';

// Hardware inventory page.
//
// Spreadsheet-style sheet on desktop (sortable, sticky-right
// actions, floating horizontal scrollbar) and a card grid on
// mobile. Every cell is an inline editor that writes directly to
// Supabase via the user's session; RLS already restricts mutating
// writes to admins, so non-admins see read-only cells.
//
// The whole table is realtime-synced — adds, edits, and deletes
// land on every connected user without a refresh.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { SearchSelectCell } from '@/components/SearchSelectCell';
import { toAvatarThumb } from '@/lib/avatarThumb';

interface HardwareItem {
  id: string;
  type: string;
  type_index: number | null;
  is_personal_computer: boolean;
  model: string;
  assigned_to: string | null;
  location: string | null;
  value_price_cents: number | null;
  status: string | null;
  account: string | null;
  pin: string | null;
  notes: string | null;
  updated_at: string | null;
}

// Open flag against a hardware row, filed by a user via the
// home-screen Hardware check-in. Surfaced as a red banner on the
// affected row of /app/hardware so admins can triage; cleared via
// the row's "mark resolved" affordance.
interface HardwareFlag {
  id: string;
  item_id: string;
  flagged_by: string | null;
  status: 'open' | 'resolved';
  message: string | null;
  reported_assigned_to: string | null;
  created_at: string;
  flagged_by_name?: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

type EditableField = 'type' | 'model' | 'assigned_to' | 'location' | 'status' | 'account' | 'pin';

const ALL = '__all__';

function formatPrice(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Short relative-time helper for the Last updated column. Falls
// back to a calendar date once we're past two weeks so the column
// stays readable without truncation.
function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 14 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HardwareContent() {
  const { isAdmin } = useAuth();
  const modal = useModal();
  const [items, setItems] = useState<HardwareItem[] | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  // Open flags grouped by item_id. The hardware page surfaces these
  // as red banners on the row + a "mark resolved" action; the home
  // hardware check-in writes to the same table.
  const [openFlags, setOpenFlags] = useState<Record<string, HardwareFlag[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterLocation, setFilterLocation] = useState<string>(ALL);
  const [filterAssignee, setFilterAssignee] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  // Persisted per-type ordering for the cards. Keyed by `type`, the
  // value is an arbitrary integer — smaller renders earlier. Loaded
  // from public.hardware_type_order once on mount and kept fresh
  // via the same realtime channel pattern as the items themselves.
  const [typeOrder, setTypeOrder] = useState<Record<string, number>>({});
  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('hardware_items')
        .select('id, type, type_index, is_personal_computer, model, assigned_to, location, value_price_cents, status, account, pin, notes, updated_at')
        .order('type', { ascending: true })
        .order('type_index', { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) { setError(error.message); return; }
      setItems((data ?? []) as HardwareItem[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Team roster for the assignee picker. Loaded once on mount —
  // active staff only (alumni / guest / on-hold accounts shouldn't
  // be in the inventory drop-down). Avatar + name so the picker
  // looks like a people-search instead of a string list.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, status, user_kind')
        .order('full_name', { ascending: true });
      if (cancelled || !Array.isArray(data)) return;
      const list: TeamMember[] = (data as Array<{ id: string; full_name: string | null; avatar_url: string | null; status: string | null; user_kind: string | null }>)
        .filter((u) => (u.status === 'active' || u.status === null) && (u.user_kind === 'staff' || u.user_kind === null))
        .map((u) => ({ id: u.id, full_name: u.full_name, avatar_url: u.avatar_url }));
      setTeam(list);
    })();
    return () => { cancelled = true; };
  }, []);

  // Live multi-user sync. Anyone editing a cell, adding a row, or
  // deleting one elsewhere shows up here without a refresh.
  useEffect(() => {
    function sortItems(arr: HardwareItem[]): HardwareItem[] {
      return [...arr].sort((a, b) => {
        const t = a.type.localeCompare(b.type);
        if (t !== 0) return t;
        const ai = a.type_index ?? Number.POSITIVE_INFINITY;
        const bi = b.type_index ?? Number.POSITIVE_INFINITY;
        return ai - bi;
      });
    }
    const ch = supabase
      .channel('hardware-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hardware_items' },
        (payload) => {
          setItems((cur) => {
            if (!cur) return cur;
            if (payload.eventType === 'INSERT') {
              const n = payload.new as HardwareItem;
              if (cur.some((i) => i.id === n.id)) return cur;
              return sortItems([...cur, n]);
            }
            if (payload.eventType === 'UPDATE') {
              const n = payload.new as HardwareItem;
              return sortItems(cur.map((i) => (i.id === n.id ? { ...i, ...n } : i)));
            }
            if (payload.eventType === 'DELETE') {
              const o = payload.old as { id?: string };
              if (!o.id) return cur;
              return cur.filter((i) => i.id !== o.id);
            }
            return cur;
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Card ordering: load every saved row on mount, then subscribe so
  // a drag-and-reorder by another admin updates the local order
  // live. Same channel-name-as-table convention as the items hook.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('hardware_type_order')
        .select('type, sort_order');
      if (cancelled || !Array.isArray(data)) return;
      const next: Record<string, number> = {};
      for (const r of data as Array<{ type: string; sort_order: number }>) {
        next[r.type] = r.sort_order;
      }
      setTypeOrder(next);
    })();
    const ch = supabase
      .channel('hardware-type-order-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hardware_type_order' },
        (payload) => {
          setTypeOrder((cur) => {
            if (payload.eventType === 'DELETE') {
              const o = payload.old as { type?: string };
              if (!o.type) return cur;
              const next = { ...cur };
              delete next[o.type];
              return next;
            }
            const n = payload.new as { type: string; sort_order: number };
            if (!n.type) return cur;
            if (cur[n.type] === n.sort_order) return cur;
            return { ...cur, [n.type]: n.sort_order };
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); cancelled = true; };
  }, []);

  // Open flags load + realtime. We only care about status='open'
  // here — resolved flags get archived from the UI immediately so
  // admins aren't staring at stale red banners. Grouped by item_id
  // for O(1) lookup during render.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('hardware_flags')
        .select('id, item_id, flagged_by, status, message, reported_assigned_to, created_at, users:flagged_by(full_name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (cancelled || !Array.isArray(data)) return;
      const next: Record<string, HardwareFlag[]> = {};
      // The `users:flagged_by(full_name)` nested select can come
      // back either as an object or a single-element array
      // depending on supabase-js version; coerce both shapes.
      type RawRow = HardwareFlag & {
        users: { full_name: string | null } | { full_name: string | null }[] | null;
      };
      for (const r of data as unknown as RawRow[]) {
        const u = Array.isArray(r.users) ? r.users[0] : r.users;
        const flag: HardwareFlag = {
          id: r.id,
          item_id: r.item_id,
          flagged_by: r.flagged_by,
          status: r.status,
          message: r.message,
          reported_assigned_to: r.reported_assigned_to,
          created_at: r.created_at,
          flagged_by_name: u?.full_name ?? null,
        };
        (next[flag.item_id] ||= []).push(flag);
      }
      setOpenFlags(next);
    })();
    const ch = supabase
      .channel('hardware-flags-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hardware_flags' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as HardwareFlag;
            if (n.status !== 'open') return;
            setOpenFlags((cur) => {
              const arr = cur[n.item_id] ?? [];
              if (arr.some((f) => f.id === n.id)) return cur;
              return { ...cur, [n.item_id]: [n, ...arr] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const n = payload.new as HardwareFlag;
            setOpenFlags((cur) => {
              const arr = (cur[n.item_id] ?? []).filter((f) => f.id !== n.id);
              if (n.status === 'open') arr.unshift(n);
              if (arr.length === 0) {
                const copy = { ...cur };
                delete copy[n.item_id];
                return copy;
              }
              return { ...cur, [n.item_id]: arr };
            });
          } else if (payload.eventType === 'DELETE') {
            const o = payload.old as { id?: string; item_id?: string };
            if (!o.id || !o.item_id) return;
            setOpenFlags((cur) => {
              const arr = (cur[o.item_id!] ?? []).filter((f) => f.id !== o.id);
              if (arr.length === 0) {
                const copy = { ...cur };
                delete copy[o.item_id!];
                return copy;
              }
              return { ...cur, [o.item_id!]: arr };
            });
          }
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); cancelled = true; };
  }, []);

  const types = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.type).filter(Boolean))).sort(), [items]);
  const models = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.model).filter(Boolean))).sort(), [items]);
  const locations = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.location ?? '').filter(Boolean))).sort(), [items]);
  const assignees = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.assigned_to ?? '').filter(Boolean))).sort(), [items]);
  const statuses = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.status ?? '').filter(Boolean))).sort(), [items]);
  const accounts = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.account ?? '').filter(Boolean))).sort(), [items]);

  // Pre-build the user-by-name map so the assignee renderer can
  // light up the avatar + name treatment whenever the stored value
  // matches a team member's full_name. Case-insensitive, trimmed —
  // forgives stray capitalisation that snuck in via earlier
  // free-text edits.
  const teamByLowerName = useMemo(() => {
    const m = new Map<string, TeamMember>();
    for (const u of team) {
      if (u.full_name) m.set(u.full_name.trim().toLowerCase(), u);
    }
    return m;
  }, [team]);

  // Rooms come from existing location values + any assignee value
  // that isn't a known person. Lets admins assign hardware to a
  // physical space (Group Room, Zoom Room, BHT Space, Barn, …)
  // alongside people without keeping a separate rooms table.
  const rooms = useMemo(() => {
    const set = new Set<string>();
    for (const l of locations) set.add(l);
    for (const a of assignees) {
      if (!a) continue;
      if (teamByLowerName.has(a.trim().toLowerCase())) continue;
      set.add(a);
    }
    return Array.from(set).sort();
  }, [locations, assignees, teamByLowerName]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filterType !== ALL && i.type !== filterType) return false;
      if (filterLocation !== ALL && (i.location ?? '') !== filterLocation) return false;
      if (filterAssignee !== ALL && (i.assigned_to ?? '') !== filterAssignee) return false;
      if (!q) return true;
      const hay = [i.model, i.assigned_to, i.location, i.status, i.account, i.pin, i.notes, i.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, filterType, filterLocation, filterAssignee, query]);

  const totalValueCents = useMemo(
    () => filtered.reduce((sum, i) => sum + (i.value_price_cents ?? 0), 0),
    [filtered],
  );

  // Group the filtered rows by type so each type renders as its
  // own card (Desktops, Keyboards, Docks, …). Order uses the
  // persisted `typeOrder` map from hardware_type_order — types
  // without a saved row sort by name AFTER any ordered ones, so
  // newly-added types just stack at the bottom until an admin
  // drags them up. Each group carries the sum of value_price_cents
  // so the card header can show its subtotal without recomputing
  // during render.
  const groupedByType = useMemo(() => {
    const buckets = new Map<string, HardwareItem[]>();
    for (const r of filtered) {
      const arr = buckets.get(r.type) ?? [];
      arr.push(r);
      buckets.set(r.type, arr);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => {
        const oa = typeOrder[a];
        const ob = typeOrder[b];
        const hasA = oa != null;
        const hasB = ob != null;
        if (hasA && hasB) {
          if (oa !== ob) return oa - ob;
          return a.localeCompare(b);
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return a.localeCompare(b);
      })
      .map(([type, rows]) => ({
        type,
        rows,
        totalCents: rows.reduce((sum, r) => sum + (r.value_price_cents ?? 0), 0),
      }));
  }, [filtered, typeOrder]);

  const saveField = useCallback(async (id: string, field: EditableField, next: string | null) => {
    let prev: HardwareItem | undefined;
    setItems((cur) => {
      if (!cur) return cur;
      return cur.map((it) => {
        if (it.id !== id) return it;
        prev = it;
        return { ...it, [field]: next };
      });
    });
    const { error } = await supabase
      .from('hardware_items')
      .update({ [field]: next })
      .eq('id', id);
    if (error) {
      setItems((cur) => cur && prev ? cur.map((it) => (it.id === id ? prev! : it)) : cur);
      setError(`Couldn't save ${field}: ${error.message}`);
    }
  }, []);

  const bulkRename = useCallback(async (field: EditableField, from: string, to: string | null) => {
    const fromLower = from.toLowerCase();
    let prevRows: HardwareItem[] | null = null;
    setItems((cur) => {
      if (!cur) return cur;
      prevRows = cur;
      return cur.map((it) => {
        const cell = (it as unknown as Record<string, unknown>)[field];
        if (typeof cell === 'string' && cell.toLowerCase() === fromLower) {
          return { ...it, [field]: to };
        }
        return it;
      });
    });
    const { error } = await supabase
      .from('hardware_items')
      .update({ [field]: to })
      .ilike(field, from);
    if (error) {
      if (prevRows) setItems(prevRows);
      setError(`Couldn't ${to === null ? 'delete' : 'rename'} "${from}": ${error.message}`);
    }
  }, []);

  // Hard-delete a hardware row. Confirms first via the in-app
  // modal (matches the rest of the codebase post-window-confirm
  // sweep). Optimistic — pulls the row out of local state then
  // restores on RLS / network failure.
  const deleteItem = useCallback(async (item: HardwareItem) => {
    const ok = await modal.confirm(`Delete "${item.model || item.type}"?`, {
      message: 'Permanently removes this row from inventory. Cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    let prev: HardwareItem[] | null = null;
    setItems((cur) => {
      if (!cur) return cur;
      prev = cur;
      return cur.filter((i) => i.id !== item.id);
    });
    const { error } = await supabase.from('hardware_items').delete().eq('id', item.id);
    if (error) {
      if (prev) setItems(prev);
      setError(`Couldn't delete: ${error.message}`);
    }
  }, [modal]);

  // Mark every open flag on an item as resolved. Triggered by the
  // "Mark resolved" affordance inside the per-row alert banner.
  // Optimistic — wipes the item's entry from openFlags before the
  // PATCH lands.
  const resolveFlagsForItem = useCallback(async (itemId: string) => {
    const flags = openFlags[itemId];
    if (!flags || flags.length === 0) return;
    const ids = flags.map((f) => f.id);
    setOpenFlags((cur) => {
      const copy = { ...cur };
      delete copy[itemId];
      return copy;
    });
    const { error } = await supabase
      .from('hardware_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .in('id', ids);
    if (error) {
      setError(`Couldn't resolve flag: ${error.message}`);
    }
  }, [openFlags]);

  // Reorder the type cards by dropping a dragged type before or
  // after a target. Compacts every visible type into a fresh 0..N
  // sequence and upserts the whole list in one round-trip so a
  // stale row from a deleted type doesn't keep sorting itself to
  // the front forever. Optimistic — flips local typeOrder before
  // the network write so the cards reorder instantly.
  const reorderType = useCallback(async (draggedType: string, targetType: string) => {
    if (draggedType === targetType) return;
    const ordered = groupedByType.map((g) => g.type);
    const fromIdx = ordered.indexOf(draggedType);
    const toIdx = ordered.indexOf(targetType);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = ordered.slice();
    next.splice(fromIdx, 1);
    // When moving down, the splice removed an earlier index so the
    // target moves one slot up — adjust accordingly.
    next.splice(fromIdx < toIdx ? toIdx : toIdx, 0, draggedType);
    const nextOrder: Record<string, number> = {};
    next.forEach((t, i) => { nextOrder[t] = i; });
    const prevOrder = typeOrder;
    setTypeOrder(nextOrder);
    const rows = next.map((t, i) => ({ type: t, sort_order: i, updated_at: new Date().toISOString() }));
    const { error } = await supabase
      .from('hardware_type_order')
      .upsert(rows, { onConflict: 'type' });
    if (error) {
      setTypeOrder(prevOrder);
      setError(`Couldn't save card order: ${error.message}`);
    }
  }, [groupedByType, typeOrder]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1800px] mx-auto">
      <header className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Operations · Inventory
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Hardware
          </h1>
          <p className="mt-1 text-[13px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Every laptop, monitor, dock, scanner, and accessory in the field — who has it and where it lives.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-white text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-foreground/85 transition-colors shadow-[0_8px_22px_-12px_rgba(40,30,25,0.45)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add hardware
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Items" value={filtered.length.toString()} />
        <Stat label="Types" value={new Set(filtered.map((i) => i.type)).size.toString()} />
        <Stat label="Assigned" value={filtered.filter((i) => i.assigned_to && i.assigned_to.toLowerCase() !== 'unassigned').length.toString()} />
        <Stat label="Total value" value={formatPrice(totalValueCents)} />
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-3 mb-4 flex flex-wrap gap-2 items-center">
        <FilterSelect label="Type" value={filterType} onChange={setFilterType} options={types} />
        <FilterSelect label="Location" value={filterLocation} onChange={setFilterLocation} options={locations} />
        <FilterSelect label="Assignee" value={filterAssignee} onChange={setFilterAssignee} options={assignees} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search model, assignee, location, status…"
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label="Search hardware"
        />
        {(filterType !== ALL || filterLocation !== ALL || filterAssignee !== ALL || query) && (
          <button
            type="button"
            onClick={() => { setFilterType(ALL); setFilterLocation(ALL); setFilterAssignee(ALL); setQuery(''); }}
            className="px-2.5 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/65 hover:bg-warm-bg/60"
          >
            Clear filters
          </button>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3" role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-[12.5px] text-foreground/55 italic">Loading inventory…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic">No hardware matches the current filters.</p>
      ) : (
        <>
          {/* Mobile — card grid. Hardware rows are wide for a phone
              screen, so on mobile we drop the table entirely and
              render a stacked grid of cards. Same field set, just
              vertically arranged. */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((r) => (
              <HardwareCard
                key={r.id}
                item={r}
                isAdmin={isAdmin}
                team={team}
                teamByLowerName={teamByLowerName}
                rooms={rooms}
                onSaveField={saveField}
                onBulkRename={bulkRename}
                onDelete={deleteItem}
              />
            ))}
          </div>

          {/* Desktop — grouped by type into per-type cards. Each
              card is its own self-contained sheet with its own
              header (type label · item count · sum value) and a
              full row of editable columns underneath. The wider
              page container (max-w-[1800px]) gives every column
              room to breathe so Type is no longer truncated — and
              since each card IS already a single type, we drop
              the Type column inside the rows entirely. */}
          <div className="hidden md:block space-y-4">
            {groupedByType.map(({ type, rows, totalCents }) => {
              const isDragging = draggingType === type;
              const isDropTarget = dragOverType === type && draggingType && draggingType !== type;
              return (
              <section
                key={type}
                onDragOver={isAdmin && draggingType ? (e) => {
                  e.preventDefault();
                  if (dragOverType !== type) setDragOverType(type);
                } : undefined}
                onDragLeave={isAdmin && draggingType ? (e) => {
                  // Only clear the highlight when the pointer truly
                  // left this section (not when it crossed into a
                  // child). Comparing relatedTarget against the
                  // section's bounding box would be flaky during
                  // fast moves; rely on the next dragover to
                  // re-paint instead.
                  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
                    if (dragOverType === type) setDragOverType(null);
                  }
                } : undefined}
                onDrop={isAdmin && draggingType ? (e) => {
                  e.preventDefault();
                  const dropped = draggingType;
                  setDraggingType(null);
                  setDragOverType(null);
                  if (dropped && dropped !== type) void reorderType(dropped, type);
                } : undefined}
                className={`rounded-2xl border bg-white overflow-hidden shadow-[0_2px_8px_-4px_rgba(40,30,25,0.10)] transition-all ${
                  isDragging ? 'opacity-50 border-primary/40' :
                  isDropTarget ? 'border-primary ring-2 ring-primary/35 shadow-[0_8px_24px_-8px_rgba(188,107,74,0.35)]' :
                  'border-black/10'
                }`}
              >
                <header
                  draggable={isAdmin}
                  onDragStart={isAdmin ? (e) => {
                    setDraggingType(type);
                    e.dataTransfer.effectAllowed = 'move';
                    // dataTransfer.setData is required for Firefox
                    // to actually fire the drop event; the payload
                    // itself is unused since we track via state.
                    e.dataTransfer.setData('text/plain', type);
                  } : undefined}
                  onDragEnd={isAdmin ? () => {
                    setDraggingType(null);
                    setDragOverType(null);
                  } : undefined}
                  className={`flex items-baseline justify-between gap-3 px-5 py-3 border-b border-black/5 bg-warm-bg/40 ${isAdmin ? 'cursor-move select-none' : ''}`}
                  title={isAdmin ? 'Drag to reorder cards' : undefined}
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    {isAdmin && (
                      <span
                        aria-hidden="true"
                        className="self-center text-foreground/30 hover:text-foreground/60 transition-colors"
                        title="Drag to reorder"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </span>
                    )}
                    <h2 className="text-[14px] font-semibold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                      {type}
                    </h2>
                    <span className="text-[11px] tabular-nums text-foreground/55">
                      {rows.length} {rows.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span className="text-[11.5px] tabular-nums text-foreground/65 font-semibold">
                    {formatPrice(totalCents)}
                  </span>
                </header>
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  {/* table-fixed forces every per-type card to use
                      the exact column widths declared in <thead>,
                      independent of row content. Without it the
                      Assignee column drifts left or right depending
                      on how long the Model strings are in that
                      particular card. */}
                  <table className="w-full table-fixed text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
                    <thead className="text-[10px] uppercase tracking-wider text-foreground/55">
                      <tr>
                        <th className="text-left px-3 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2 w-[320px]">Model</th>
                        <th className="text-left px-3 py-2 w-[240px]">Assignee</th>
                        <th className="text-left px-3 py-2 w-[200px]">Location</th>
                        <th className="text-right px-3 py-2 w-28">Value</th>
                        <th className="text-left px-3 py-2 w-[160px]">Status</th>
                        <th className="text-left px-3 py-2 w-[220px]">Account</th>
                        <th className="text-left px-3 py-2 w-[120px]">Last updated</th>
                        <th className="px-2 py-2 w-12" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {rows.map((r) => (
                        <Fragment key={r.id}>
                        <tr className="group hover:bg-warm-bg/30 align-middle">
                          <td className="px-3 py-1.5 text-foreground/45 tabular-nums">{r.type_index ?? '—'}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isAdmin ? (
                                <SearchSelectCell
                                  value={r.model}
                                  options={models}
                                  onSave={(next) => saveField(r.id, 'model', next || r.model)}
                                  onRenameOption={(from, to) => bulkRename('model', from, to)}
                                  placeholder="Set model…"
                                  className="text-foreground/85"
                                />
                              ) : (
                                <span className="text-foreground/85">{r.model || '—'}</span>
                              )}
                              {r.is_personal_computer && (
                                <span className="shrink-0 inline-block px-1 py-0.5 rounded text-[8.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">PC</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            <AssigneeCell
                              value={r.assigned_to}
                              team={team}
                              teamByLowerName={teamByLowerName}
                              rooms={rooms}
                              editable={isAdmin}
                              onSave={(next) => saveField(r.id, 'assigned_to', next)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            {isAdmin ? (
                              <SearchSelectCell
                                value={r.location}
                                options={locations}
                                onSave={(next) => saveField(r.id, 'location', next)}
                                onRenameOption={(from, to) => bulkRename('location', from, to)}
                                onDeleteOption={(v) => bulkRename('location', v, null)}
                                placeholder="Set location…"
                                className="text-foreground/65"
                              />
                            ) : (
                              <span className="text-foreground/65">{r.location || '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-foreground/65">{formatPrice(r.value_price_cents)}</td>
                          <td className="px-3 py-1.5">
                            {isAdmin ? (
                              <SearchSelectCell
                                value={r.status}
                                options={statuses}
                                onSave={(next) => saveField(r.id, 'status', next)}
                                onRenameOption={(from, to) => bulkRename('status', from, to)}
                                onDeleteOption={(v) => bulkRename('status', v, null)}
                                placeholder="Set status…"
                                className="text-foreground/65"
                              />
                            ) : (
                              <span className="text-foreground/65 text-[11.5px]">{r.status || ''}</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {isAdmin ? (
                              <SearchSelectCell
                                value={r.account}
                                options={accounts}
                                onSave={(next) => saveField(r.id, 'account', next)}
                                onRenameOption={(from, to) => bulkRename('account', from, to)}
                                onDeleteOption={(v) => bulkRename('account', v, null)}
                                placeholder="Set account…"
                                className="text-foreground/65"
                              />
                            ) : (
                              <span className="text-foreground/65 text-[11.5px] truncate inline-block max-w-[200px] align-middle" title={r.account ?? undefined}>{r.account || ''}</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-foreground/55 text-[11.5px] tabular-nums" title={r.updated_at ?? undefined}>
                            {formatRelativeTime(r.updated_at)}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => deleteItem(r)}
                                aria-label={`Delete ${r.model || r.type}`}
                                title="Delete this hardware item"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-foreground/45 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-transparent transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Flag banner — surfaces every open flag
                            filed against this row. Spans every
                            column; admins get a "Mark resolved"
                            affordance, everyone else just sees the
                            reporter + their note. */}
                        {(openFlags[r.id] ?? []).length > 0 && (
                          <tr className="bg-rose-50/60">
                            <td colSpan={9} className="px-3 py-2 border-b border-rose-200/60">
                              <div className="flex flex-col gap-1.5">
                                {(openFlags[r.id] ?? []).map((f) => (
                                  <div key={f.id} className="flex items-center justify-between gap-2 text-[11.5px] text-rose-800">
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 9v4" />
                                        <path d="M12 17h.01" />
                                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                      </svg>
                                      <span className="font-semibold">Flagged{f.flagged_by_name ? ` by ${f.flagged_by_name}` : ''}</span>
                                      <span className="text-rose-700/85">· {formatRelativeTime(f.created_at)}</span>
                                      {f.message && (
                                        <span className="text-rose-900/90 truncate">— &ldquo;{f.message}&rdquo;</span>
                                      )}
                                      {f.reported_assigned_to && (
                                        <span className="text-rose-700/70 truncate">(was: {f.reported_assigned_to})</span>
                                      )}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => void resolveFlagsForItem(r.id)}
                                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider text-rose-800 hover:bg-rose-100 border border-rose-200"
                                      >
                                        Mark resolved
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              );
            })}
          </div>
        </>
      )}

      {addOpen && (
        <AddHardwareModal
          types={types}
          locations={locations}
          team={team}
          teamByLowerName={teamByLowerName}
          rooms={rooms}
          onClose={() => setAddOpen(false)}
          onCreated={(row) => {
            // Optimistic insert into local state; realtime will
            // dedupe via the id check inside the hardware-items
            // realtime hook.
            setItems((cur) => (cur ? [...cur, row].sort((a, b) => {
              const t = a.type.localeCompare(b.type);
              if (t !== 0) return t;
              const ai = a.type_index ?? Number.POSITIVE_INFINITY;
              const bi = b.type_index ?? Number.POSITIVE_INFINITY;
              return ai - bi;
            }) : [row]));
          }}
        />
      )}
    </div>
  );
}

// AssigneeCell — read view that shows a person's avatar + name when
// the stored value matches a team member, OR a small "🏠 Room" pill
// for room assignments, OR a "+ Assign" prompt when empty. Click to
// open the people-or-room picker.
function AssigneeCell({
  value,
  team,
  teamByLowerName,
  rooms,
  editable,
  onSave,
}: {
  value: string | null;
  team: TeamMember[];
  teamByLowerName: Map<string, TeamMember>;
  rooms: string[];
  editable: boolean;
  onSave: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const user = value ? teamByLowerName.get(value.trim().toLowerCase()) : null;
  const isRoom = !user && !!value && value.toLowerCase() !== 'unassigned';

  if (!editable) {
    if (user) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Avatar user={user} size={20} />
          <span className="text-foreground/85 truncate max-w-[160px]">{user.full_name}</span>
        </span>
      );
    }
    return <span className="text-foreground/65 text-[11.5px]">{value || '—'}</span>;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md hover:bg-warm-bg/60 -mx-1.5 -my-0.5 max-w-full text-left"
        title={value ? `Assigned to ${value}` : 'Click to assign'}
      >
        {user ? (
          <>
            <Avatar user={user} size={20} />
            <span className="text-foreground/85 truncate">{user.full_name}</span>
          </>
        ) : isRoom ? (
          <>
            <span aria-hidden className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 text-amber-700 text-[10px]">🏠</span>
            <span className="text-foreground/75 truncate">{value}</span>
          </>
        ) : (
          <span className="text-foreground/40 italic text-[11.5px]">+ Assign</span>
        )}
      </button>
      {open && (
        <AssigneePicker
          anchorRef={triggerRef}
          team={team}
          rooms={rooms}
          current={value}
          onClose={() => setOpen(false)}
          onPick={(next) => {
            setOpen(false);
            onSave(next);
          }}
        />
      )}
    </>
  );
}

// Avatar — small round avatar with a letter fallback. Sized in pixels
// so it can render at 20px in the table and 28px on the mobile card.
function Avatar({ user, size }: { user: TeamMember; size: number }) {
  const initial = (user.full_name || '?').charAt(0).toUpperCase();
  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={toAvatarThumb(user.avatar_url, 100) ?? user.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        className="rounded-full object-cover bg-warm-bg shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.45) }}
    >
      {initial}
    </span>
  );
}

// Portal-rendered picker. Two sections — People and Rooms — both
// filtered by the same search box. Selecting an item stores its
// display string in assigned_to. The "Custom" row at the bottom
// lets the user save freeform text (e.g. a brand-new room name or
// a contractor's name that isn't yet in the users table). The
// "Unassigned" row clears the field.
function AssigneePicker({
  anchorRef,
  team,
  rooms,
  current,
  onClose,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  team: TeamMember[];
  rooms: string[];
  current: string | null;
  onClose: () => void;
  onPick: (next: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(260, rect.width),
    });
  }, [anchorRef]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  const q = query.trim().toLowerCase();
  const matchedPeople = team
    .filter((u) => !q || (u.full_name ?? '').toLowerCase().includes(q))
    .slice(0, 30);
  const matchedRooms = rooms
    .filter((r) => !q || r.toLowerCase().includes(q))
    .slice(0, 30);
  const hasCustom = q.length > 0
    && !matchedPeople.some((p) => (p.full_name ?? '').toLowerCase() === q)
    && !matchedRooms.some((r) => r.toLowerCase() === q);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-[80] rounded-xl border border-black/10 bg-white shadow-[0_18px_40px_-18px_rgba(40,30,25,0.45)] overflow-hidden max-h-[70vh] flex flex-col"
      style={{ left: pos.left, top: pos.top, width: pos.width }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-black/5">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people or rooms…"
          className="w-full px-2 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => onPick(null)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-warm-bg/60 ${!current ? 'text-primary font-semibold' : 'text-foreground/55'}`}
        >
          <span aria-hidden className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-foreground/15 text-foreground/45 text-[9px]">⊘</span>
          Unassigned
        </button>
        {matchedPeople.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45">People</p>
            {matchedPeople.map((u) => {
              const active = current && u.full_name && current.trim().toLowerCase() === u.full_name.trim().toLowerCase();
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => u.full_name && onPick(u.full_name)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-warm-bg/60 ${active ? 'bg-primary/8 text-primary font-semibold' : 'text-foreground/85'}`}
                >
                  <Avatar user={u} size={22} />
                  <span className="truncate">{u.full_name}</span>
                </button>
              );
            })}
          </>
        )}
        {matchedRooms.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45">Rooms</p>
            {matchedRooms.map((r) => {
              const active = current && current.trim().toLowerCase() === r.toLowerCase();
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPick(r)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-warm-bg/60 ${active ? 'bg-primary/8 text-primary font-semibold' : 'text-foreground/85'}`}
                >
                  <span aria-hidden className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md bg-amber-100 text-amber-700 text-[10px]">🏠</span>
                  <span className="truncate">{r}</span>
                </button>
              );
            })}
          </>
        )}
        {hasCustom && (
          <>
            <p className="px-3 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45">Custom</p>
            <button
              type="button"
              onClick={() => onPick(query.trim())}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-primary hover:bg-primary/5"
            >
              <span aria-hidden className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md bg-primary/10 text-primary">+</span>
              <span>Set to &ldquo;{query.trim()}&rdquo;</span>
            </button>
          </>
        )}
        {!hasCustom && matchedPeople.length === 0 && matchedRooms.length === 0 && (
          <p className="px-3 py-3 text-[12px] text-foreground/45 italic">No matches.</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Mobile card render — one HardwareItem per card, all fields
// stacked vertically. Same inline editors as the desktop sheet but
// laid out for a phone screen.
function HardwareCard({
  item,
  isAdmin,
  team,
  teamByLowerName,
  rooms,
  onSaveField,
  onBulkRename,
  onDelete,
}: {
  item: HardwareItem;
  isAdmin: boolean;
  team: TeamMember[];
  teamByLowerName: Map<string, TeamMember>;
  rooms: string[];
  onSaveField: (id: string, field: EditableField, next: string | null) => void;
  onBulkRename: (field: EditableField, from: string, to: string | null) => void;
  onDelete: (item: HardwareItem) => void;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-3.5 flex flex-col gap-2.5" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="flex items-start justify-between gap-2 pb-2 border-b border-black/5">
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45">
            {item.type}{item.type_index != null ? ` · #${item.type_index}` : ''}
          </p>
          <p className="text-[13.5px] font-semibold text-foreground truncate">
            {item.model || '(no model)'}
          </p>
        </div>
        {item.is_personal_computer && (
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">PC</span>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label={`Delete ${item.model || item.type}`}
            title="Delete this hardware item"
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-foreground/45 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </header>

      <CardField label="Assignee">
        <AssigneeCell
          value={item.assigned_to}
          team={team}
          teamByLowerName={teamByLowerName}
          rooms={rooms}
          editable={isAdmin}
          onSave={(next) => onSaveField(item.id, 'assigned_to', next)}
        />
      </CardField>

      <CardField label="Location">
        {isAdmin ? (
          <SearchSelectCell
            value={item.location}
            options={rooms}
            onSave={(next) => onSaveField(item.id, 'location', next)}
            onRenameOption={(from, to) => onBulkRename('location', from, to)}
            onDeleteOption={(v) => onBulkRename('location', v, null)}
            placeholder="Set location…"
            className="text-foreground/75"
          />
        ) : (
          <span className="text-foreground/75 text-[12.5px]">{item.location || '—'}</span>
        )}
      </CardField>

      <div className="grid grid-cols-2 gap-2">
        <CardField label="Value">
          <span className="text-foreground/75 text-[12.5px] tabular-nums">{formatPrice(item.value_price_cents)}</span>
        </CardField>
        <CardField label="Status">
          {isAdmin ? (
            <SearchSelectCell
              value={item.status}
              options={[]}
              onSave={(next) => onSaveField(item.id, 'status', next)}
              placeholder="Set status…"
              className="text-foreground/75 text-[12.5px]"
            />
          ) : (
            <span className="text-foreground/75 text-[12.5px]">{item.status || '—'}</span>
          )}
        </CardField>
      </div>

      {(item.account || isAdmin) && (
        <CardField label="Account">
          {isAdmin ? (
            <SearchSelectCell
              value={item.account}
              options={[]}
              onSave={(next) => onSaveField(item.id, 'account', next)}
              placeholder="Set account…"
              className="text-foreground/75 text-[12.5px]"
            />
          ) : (
            <span className="text-foreground/75 text-[12.5px] truncate inline-block" title={item.account ?? undefined}>{item.account || '—'}</span>
          )}
        </CardField>
      )}
    </article>
  );
}

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <div className="text-[12.5px] min-h-[1.4rem]">{children}</div>
    </div>
  );
}

// Add hardware modal — two paths:
//   * Manual: fill the form directly.
//   * From screenshot: drop / pick an Amazon (or other) product
//     page screenshot, /api/hardware/extract-from-image runs it
//     through Claude vision, and the resulting fields drop into
//     the same form (which the user reviews + edits before Save).
// Portaled to <body> to escape any containing-block-creating
// ancestors on the hardware page, same trick the home check-in
// modal uses.
function AddHardwareModal({
  types,
  locations,
  team,
  teamByLowerName,
  rooms,
  onClose,
  onCreated,
}: {
  types: string[];
  locations: string[];
  team: TeamMember[];
  teamByLowerName: Map<string, TeamMember>;
  rooms: string[];
  onClose: () => void;
  onCreated: (row: HardwareItem) => void;
}) {
  const [tab, setTab] = useState<'manual' | 'screenshot'>('manual');
  const [type, setType] = useState('');
  const [model, setModel] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  // Stored as a string in the input + coerced to cents on save.
  // Empty / NaN means "no value tracked".
  const [valueDollars, setValueDollars] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [isPC, setIsPC] = useState(false);
  // Screenshot tab state.
  const [imageData, setImageData] = useState<{ data: string; mediaType: string; preview: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);

  // Esc closes the modal anywhere it has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleFile(file: File) {
    if (!/^image\//i.test(file.type)) {
      setExtractError('Only image files are accepted (PNG, JPEG, GIF, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setExtractError('Image is too large (max 5MB). Please re-export at a smaller size.');
      return;
    }
    setExtractError(null);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    // dataUrl is "data:<mime>;base64,<data>". Split it.
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const data = dataUrl.slice(comma + 1);
    const mediaType = header.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
    setImageData({ data, mediaType, preview: dataUrl });
  }

  async function runExtract() {
    if (!imageData) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch('/api/hardware/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: { data: imageData.data, mediaType: imageData.mediaType } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExtractError(json.error || `HTTP ${res.status}`);
        return;
      }
      const f = json.fields as {
        type: string | null;
        model: string | null;
        value_price_cents: number | null;
        is_personal_computer: boolean;
        notes: string | null;
      };
      if (f.type) setType(f.type);
      if (f.model) setModel(f.model);
      if (typeof f.value_price_cents === 'number') {
        setValueDollars((f.value_price_cents / 100).toFixed(2));
      }
      if (f.is_personal_computer) setIsPC(true);
      if (f.notes) setNotes(f.notes);
      // Switch back to the manual form so the user can review +
      // tweak before saving.
      setTab('manual');
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    setSaveError(null);
    const trimmedType = type.trim();
    const trimmedModel = model.trim();
    if (!trimmedType) { setSaveError('Type is required.'); return; }
    const dollars = parseFloat(valueDollars);
    const cents = Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null;
    setSaving(true);
    try {
      // Pick a type_index one above the current max for this type so
      // the new row lands at the bottom of its card instead of
      // colliding with row #1.
      const { data: maxRow } = await supabase
        .from('hardware_items')
        .select('type_index')
        .eq('type', trimmedType)
        .order('type_index', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const nextIndex = ((maxRow?.type_index as number | null) ?? 0) + 1;
      const payload = {
        type: trimmedType,
        type_index: nextIndex,
        is_personal_computer: isPC,
        model: trimmedModel,
        assigned_to: assignedTo,
        location: location.trim() || null,
        value_price_cents: cents,
        status: statusValue.trim() || null,
        account: account.trim() || null,
        pin: null,
        notes: notes.trim() || null,
      };
      const { data, error } = await supabase
        .from('hardware_items')
        .insert(payload)
        .select('id, type, type_index, is_personal_computer, model, assigned_to, location, value_price_cents, status, account, pin, notes, updated_at')
        .maybeSingle();
      if (error || !data) {
        setSaveError(error?.message || 'Could not save.');
        return;
      }
      onCreated(data as HardwareItem);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!portalReady || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-hardware-title"
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto"
      style={{
        padding: 'max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-xl my-auto rounded-3xl overflow-hidden bg-white/85 supports-[backdrop-filter]:bg-white/65 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 border border-white/70 shadow-[0_24px_60px_-20px_rgba(40,30,25,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col max-h-[85vh]">
          <header className="shrink-0 px-6 sm:px-7 pt-6 pb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">Operations · Inventory</p>
              <h2 id="add-hardware-title" className="text-lg font-bold text-foreground leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                Add hardware
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground/55 hover:bg-warm-bg/60 hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="shrink-0 px-6 sm:px-7 pb-3">
            <div role="tablist" className="inline-flex p-0.5 rounded-full bg-warm-bg/60 border border-black/8 text-[11.5px] font-semibold">
              <button
                role="tab"
                aria-selected={tab === 'manual'}
                onClick={() => setTab('manual')}
                className={`px-3 py-1.5 rounded-full transition-colors ${tab === 'manual' ? 'bg-white text-foreground shadow-[0_2px_8px_-3px_rgba(40,30,25,0.20)]' : 'text-foreground/55 hover:text-foreground'}`}
              >
                Fill in manually
              </button>
              <button
                role="tab"
                aria-selected={tab === 'screenshot'}
                onClick={() => setTab('screenshot')}
                className={`px-3 py-1.5 rounded-full transition-colors ${tab === 'screenshot' ? 'bg-white text-foreground shadow-[0_2px_8px_-3px_rgba(40,30,25,0.20)]' : 'text-foreground/55 hover:text-foreground'}`}
              >
                From a screenshot
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-7 pb-5 overscroll-contain">
            {tab === 'screenshot' && (
              <div className="space-y-3">
                <p className="text-[12.5px] text-foreground/65 leading-relaxed">
                  Drop in (or paste) a screenshot of the product page — Amazon, Apple Store, Best Buy, anything with the product title and price visible. We&apos;ll extract Type, Model, Value, and Notes; the rest stays on the manual tab for you to fill in.
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) await handleFile(f);
                  }}
                  className="rounded-2xl border-2 border-dashed border-foreground/15 bg-white/40 px-4 py-6 flex flex-col items-center gap-2 text-center"
                >
                  {imageData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageData.preview} alt="Screenshot preview" className="max-h-56 rounded-lg border border-black/10 shadow-sm object-contain" />
                  ) : (
                    <>
                      <span className="text-3xl" aria-hidden>📸</span>
                      <p className="text-[12.5px] text-foreground/65">
                        Drag an image here, or
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-foreground text-white text-[11.5px] font-semibold uppercase tracking-[0.12em] hover:bg-foreground/85 transition-colors"
                  >
                    {imageData ? 'Choose a different image' : 'Choose a screenshot'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleFile(f);
                    }}
                  />
                </div>
                {extractError && (
                  <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5" role="alert">
                    {extractError}
                  </p>
                )}
                {imageData && (
                  <button
                    type="button"
                    onClick={runExtract}
                    disabled={extracting}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors ${extracting ? 'bg-primary/40 text-white cursor-wait' : 'bg-primary text-white hover:bg-primary-dark'}`}
                  >
                    {extracting ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/70 border-t-white rounded-full animate-spin" />
                        Decoding…
                      </>
                    ) : (
                      <>
                        ✨ Decode this screenshot
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {tab === 'manual' && (
              <div className="space-y-3">
                <ModalField label="Type" required hint="Used to group rows on the page (e.g. Laptop, Keyboard).">
                  <DatalistTextInput
                    value={type}
                    onChange={setType}
                    options={types}
                    placeholder="Laptop, Keyboard, Dock…"
                  />
                </ModalField>
                <ModalField label="Model" hint="Full product name as it'll show on the row.">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Apple MacBook Pro 14, M3 Pro, 18GB / 512GB"
                    className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/35"
                  />
                </ModalField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalField label="Assignee">
                    <AssigneeCell
                      value={assignedTo}
                      team={team}
                      teamByLowerName={teamByLowerName}
                      rooms={rooms}
                      editable={true}
                      onSave={setAssignedTo}
                    />
                  </ModalField>
                  <ModalField label="Location">
                    <DatalistTextInput
                      value={location}
                      onChange={setLocation}
                      options={locations}
                      placeholder="Admin Building, Lodge…"
                    />
                  </ModalField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalField label="Value (USD)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45 text-[12.5px]">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={valueDollars}
                        onChange={(e) => setValueDollars(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/35"
                      />
                    </div>
                  </ModalField>
                  <ModalField label="Status">
                    <input
                      type="text"
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value)}
                      placeholder="Active, Loaner, In storage…"
                      className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/35"
                    />
                  </ModalField>
                </div>
                <ModalField label="Account" hint="Login or service account (if applicable).">
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="e.g. shared sign-in"
                    className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/35"
                  />
                </ModalField>
                <ModalField label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Color, serial, anything else worth tracking."
                    className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/35 resize-none"
                  />
                </ModalField>
                <label className="flex items-center gap-2 text-[12.5px] text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPC}
                    onChange={(e) => setIsPC(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  This is a personal computer (laptop / desktop someone logs into)
                </label>
              </div>
            )}
          </div>

          <footer className="shrink-0 px-6 sm:px-7 py-3 border-t border-black/5 bg-warm-bg/40 flex items-center justify-end gap-2">
            {saveError && (
              <p className="text-[12px] text-rose-700 mr-auto" role="alert">{saveError}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-[11.5px] font-semibold uppercase tracking-[0.12em] text-foreground/70 hover:bg-warm-bg/60"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !type.trim()}
              className={`px-4 py-1.5 rounded-full text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors ${saving || !type.trim() ? 'bg-primary/40 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {saving ? 'Saving…' : 'Save hardware'}
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModalField({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
        {label}
        {required && <span className="ml-0.5 text-rose-700">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10.5px] text-foreground/45 leading-snug">{hint}</p>}
    </div>
  );
}

// Tiny "type or pick" input. Native <datalist> renders the dropdown
// suggestions; users can still type a brand-new value. Matches the
// spirit of SearchSelectCell without the heavier portal popup since
// the modal isn't space-constrained.
function DatalistTextInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = `dl-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={id}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/35"
      />
      <datalist id={id}>
        {options.slice(0, 200).map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2">
      <p className="text-[9.5px] font-bold tracking-[0.22em] uppercase text-foreground/45">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-md border border-black/10 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
