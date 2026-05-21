'use client';

// Hardware inventory page.
//
// Single flat list view ("sheet") — every row in one scrollable
// table, sorted by Type then Type Index. Each editable cell is a
// SearchSelectCell so admins can pick an existing value out of the
// dropdown OR type a new one, with the same inline edit + delete
// affordances the picker offers elsewhere. Writes go straight to
// Supabase via the user's session (RLS already restricts updates to
// admins, so non-admins see read-only cells).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { SearchSelectCell } from '@/components/SearchSelectCell';

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

type EditableField = 'type' | 'model' | 'assigned_to' | 'location' | 'status' | 'account' | 'pin';

const ALL = '__all__';

function formatPrice(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HardwareContent() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<HardwareItem[] | null>(null);
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

  // Live multi-user sync. Anyone editing a cell, adding a row, or
  // deleting one elsewhere shows up here without a refresh. The
  // table is already in the supabase_realtime publication, so we
  // just subscribe and patch local state in place. Re-sort after
  // every applied change so the (type asc, type_index asc) order
  // matches the initial fetch.
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

  // Distinct-values memos drive both the filter dropdowns at the top
  // AND the per-cell SearchSelectCell suggestion lists. Rebuilt from
  // the live items array so a freshly-typed value shows up for the
  // next admin to pick.
  const types = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.type).filter(Boolean))).sort(), [items]);
  const models = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.model).filter(Boolean))).sort(), [items]);
  const locations = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.location ?? '').filter(Boolean))).sort(), [items]);
  const assignees = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.assigned_to ?? '').filter(Boolean))).sort(), [items]);
  const statuses = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.status ?? '').filter(Boolean))).sort(), [items]);
  const accounts = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.account ?? '').filter(Boolean))).sort(), [items]);
  const pins = useMemo(() => Array.from(new Set((items ?? []).map((i) => i.pin ?? '').filter(Boolean))).sort(), [items]);

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

  // Save a single field on a single row. Optimistic — mutates local
  // state immediately, then writes; restores on failure. RLS will
  // reject writes from non-admins, so the catch surfaces a clear
  // error rather than leaving the cell stale.
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
      // Restore the prior value so the cell doesn't lie to the user.
      setItems((cur) => cur && prev ? cur.map((it) => (it.id === id ? prev! : it)) : cur);
      setError(`Couldn't save ${field}: ${error.message}`);
    }
  }, []);

  // Bulk rename / delete a dropdown option across every row that
  // holds it. Mirrors the picker's bulk hooks on /app/outreach so
  // admins can clean up stray values inline (e.g. consolidate two
  // typos of the same location). For "delete" (to === null) on a
  // NOT NULL column like type/model the safer behaviour is to bail
  // instead of writing nulls — we never call it for those two.
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

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
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
        // One flat sheet, no per-type sub-tables. Sticky header so the
        // column labels stay visible while scrolling a long list.
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            {/* min-w forces each column to ask for the room it
                needs; the parent's overflow-x-auto then lets the
                page scroll sideways instead of squishing Type to
                "Desk…" or hiding Account/PIN off the right edge.
                w-full is gone because it was capping the table at
                the container's width and triggering the squish. */}
            <table className="min-w-[1400px] text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
              <thead className="sticky top-0 z-10 bg-warm-bg/60 backdrop-blur-sm text-[10px] uppercase tracking-wider text-foreground/55">
                <tr>
                  <th className="text-left px-3 py-2 w-[110px]">Type</th>
                  <th className="text-left px-3 py-2 w-10">#</th>
                  <th className="text-left px-3 py-2 w-[280px]">Model</th>
                  <th className="text-left px-3 py-2 w-[180px]">Assignee</th>
                  <th className="text-left px-3 py-2 w-[160px]">Location</th>
                  <th className="text-right px-3 py-2 w-24">Value</th>
                  <th className="text-left px-3 py-2 w-[140px]">Status</th>
                  <th className="text-left px-3 py-2 w-[200px]">Account</th>
                  <th className="text-left px-3 py-2 w-20">PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-warm-bg/30 align-middle">
                    <td className="px-3 py-1.5">
                      {isAdmin ? (
                        <SearchSelectCell
                          value={r.type}
                          options={types}
                          onSave={(next) => saveField(r.id, 'type', next || r.type)}
                          onRenameOption={(from, to) => bulkRename('type', from, to)}
                          placeholder="Set type…"
                        />
                      ) : (
                        <span className="text-foreground/85">{r.type}</span>
                      )}
                    </td>
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
                      {isAdmin ? (
                        <SearchSelectCell
                          value={r.assigned_to}
                          options={assignees}
                          onSave={(next) => saveField(r.id, 'assigned_to', next)}
                          onRenameOption={(from, to) => bulkRename('assigned_to', from, to)}
                          onDeleteOption={(v) => bulkRename('assigned_to', v, null)}
                          placeholder="Assign…"
                          className="text-foreground/75"
                        />
                      ) : (
                        <span className="text-foreground/75">{r.assigned_to || '—'}</span>
                      )}
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
                        <span className="text-foreground/65 text-[11.5px] truncate inline-block max-w-[180px] align-middle" title={r.account ?? undefined}>{r.account || ''}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {isAdmin ? (
                        <SearchSelectCell
                          value={r.pin}
                          options={pins}
                          onSave={(next) => saveField(r.id, 'pin', next)}
                          onRenameOption={(from, to) => bulkRename('pin', from, to)}
                          onDeleteOption={(v) => bulkRename('pin', v, null)}
                          placeholder="Set PIN…"
                          className="text-foreground/55 tabular-nums"
                        />
                      ) : (
                        <span className="text-foreground/55 tabular-nums text-[11.5px]">{r.pin || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
