'use client';

// Hardware inventory page — Phase 1-4 of the 10-phase build.
//
// Reads every row of public.hardware_items, groups by Type with
// per-group totals, and renders a list view. Type / Location /
// Assigned-to dropdowns + a global search box filter the rows in
// real time without a round-trip; selection state is purely
// client-side so admins can stack filters and still read totals.
//
// Phases still to land:
//   5. Inline edit (click a cell to change assignment / location /
//      status / account / pin).
//   6. Add hardware modal + per-row Delete with confirm.
//   7. Per-item detail page at /app/hardware/[id].
//   8. Supabase realtime subscription so two admins editing
//      simultaneously see each other's writes.
//   9. CSV export / import.
//  10. Polish: skeleton loader, reduced-motion, admin gating in
//      the UI (RLS already gates writes server-side).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const ALL = '__all__';

function formatPrice(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HardwareContent() {
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

  const types = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((i) => i.type))).sort();
  }, [items]);

  const locations = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((i) => i.location ?? '').filter(Boolean))).sort();
  }, [items]);

  const assignees = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((i) => i.assigned_to ?? '').filter(Boolean))).sort();
  }, [items]);

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

  const grouped = useMemo(() => {
    const m = new Map<string, HardwareItem[]>();
    for (const it of filtered) {
      if (!m.has(it.type)) m.set(it.type, []);
      m.get(it.type)!.push(it);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const totalValueCents = useMemo(
    () => filtered.reduce((sum, i) => sum + (i.value_price_cents ?? 0), 0),
    [filtered],
  );

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

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Items" value={filtered.length.toString()} />
        <Stat label="Types" value={new Set(filtered.map((i) => i.type)).size.toString()} />
        <Stat label="Assigned" value={filtered.filter((i) => i.assigned_to && i.assigned_to.toLowerCase() !== 'unassigned').length.toString()} />
        <Stat label="Total value" value={formatPrice(totalValueCents)} />
      </div>

      {/* Filters */}
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
        <div className="space-y-4">
          {grouped.map(([type, rows]) => {
            const subtotal = rows.reduce((sum, r) => sum + (r.value_price_cents ?? 0), 0);
            return (
              <section key={type} className="rounded-2xl border border-black/10 bg-white overflow-hidden">
                <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-black/5 bg-warm-bg/40">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-[12.5px] font-bold tracking-wider uppercase text-foreground/75">{type}</h2>
                    <span className="text-[10.5px] tabular-nums text-foreground/40">{rows.length}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-foreground/55">{formatPrice(subtotal)}</span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
                    <thead className="bg-warm-bg/20 text-[10px] uppercase tracking-wider text-foreground/55">
                      <tr>
                        <th className="text-left px-3 py-1.5 w-10">#</th>
                        <th className="text-left px-3 py-1.5">Model</th>
                        <th className="text-left px-3 py-1.5">Assignee</th>
                        <th className="text-left px-3 py-1.5">Location</th>
                        <th className="text-right px-3 py-1.5 w-24">Value</th>
                        <th className="text-left px-3 py-1.5">Status</th>
                        <th className="text-left px-3 py-1.5">Account</th>
                        <th className="text-left px-3 py-1.5 w-16">PIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-warm-bg/30">
                          <td className="px-3 py-2 text-foreground/45 tabular-nums">{r.type_index ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className="text-foreground/85">{r.model || '—'}</span>
                            {r.is_personal_computer && (
                              <span className="ml-1.5 inline-block px-1 py-0.5 rounded text-[8.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider align-middle">PC</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground/75">{r.assigned_to || '—'}</td>
                          <td className="px-3 py-2 text-foreground/65">{r.location || '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground/65">{formatPrice(r.value_price_cents)}</td>
                          <td className="px-3 py-2 text-[11.5px] text-foreground/65">{r.status || ''}</td>
                          <td className="px-3 py-2 text-[11.5px] text-foreground/65 truncate max-w-[180px]" title={r.account ?? undefined}>{r.account || ''}</td>
                          <td className="px-3 py-2 text-[11.5px] text-foreground/55 tabular-nums">{r.pin || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
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
