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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export default function HardwareContent() {
  const { isAdmin } = useAuth();
  const modal = useModal();
  const [items, setItems] = useState<HardwareItem[] | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterLocation, setFilterLocation] = useState<string>(ALL);
  const [filterAssignee, setFilterAssignee] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('hardware_items')
        .select('id, type, type_index, is_personal_computer, model, assigned_to, location, value_price_cents, status, account, pin, notes')
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
  // own card (Desktops, Keyboards, Docks, …). Order matches the
  // overall `types` list so cards stay in the same alphabetical
  // order on every render. Each group also carries the sum of
  // value_price_cents so the card header can show its subtotal
  // without recomputing during render.
  const groupedByType = useMemo(() => {
    const buckets = new Map<string, HardwareItem[]>();
    for (const r of filtered) {
      const arr = buckets.get(r.type) ?? [];
      arr.push(r);
      buckets.set(r.type, arr);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, rows]) => ({
        type,
        rows,
        totalCents: rows.reduce((sum, r) => sum + (r.value_price_cents ?? 0), 0),
      }));
  }, [filtered]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1800px] mx-auto">
      <header className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
          Operations · Inventory
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Hardware
        </h1>
        <p className="mt-1 text-[13px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          Every laptop, monitor, dock, scanner, and accessory in the field — who has it and where it lives.
        </p>
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
            {groupedByType.map(({ type, rows, totalCents }) => (
              <section
                key={type}
                className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-[0_2px_8px_-4px_rgba(40,30,25,0.10)]"
              >
                <header className="flex items-baseline justify-between gap-3 px-5 py-3 border-b border-black/5 bg-warm-bg/40">
                  <div className="flex items-baseline gap-2 min-w-0">
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
                  <table className="w-full text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
                    <thead className="text-[10px] uppercase tracking-wider text-foreground/55">
                      <tr>
                        <th className="text-left px-3 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2 w-[320px]">Model</th>
                        <th className="text-left px-3 py-2 w-[240px]">Assignee</th>
                        <th className="text-left px-3 py-2 w-[200px]">Location</th>
                        <th className="text-right px-3 py-2 w-28">Value</th>
                        <th className="text-left px-3 py-2 w-[160px]">Status</th>
                        <th className="text-left px-3 py-2 w-[220px]">Account</th>
                        <th className="px-2 py-2 w-12" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {rows.map((r) => (
                        <tr key={r.id} className="group hover:bg-warm-bg/30 align-middle">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
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
