'use client';

// Partnerships & Referrals — directory of clinical partners.
// Apple-minimalist aesthetic: warm-bg surface, hairline borders,
// generous whitespace, monochrome iconography, copper accent only on
// interactive states. Heavy lifting:
//   * grid grouped + sorted by Specialty with dynamic per-group
//     Priority numbering (Phase 5)
//   * conditional Levels-of-Care that lights up only for facility
//     types (Phase 6 + 8)
//   * draggable headers + Manage Columns dropdown, persisted to
//     public.shared_grid_prefs so the layout is org-wide and live
//     via Supabase realtime (Phase 7)
//   * Map View placeholder rendered with specialty-clustered pins
//     (Phase 9)
//   * Downgrade to Contact action (Phase 9) with a confirmation
//     dialog and a clean entity conversion through the API.

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────

const PARTNER_TYPES = ['Detox', 'RTC', 'Outpatient', 'Extended Care', 'Interventionist', 'Therapist'] as const;
type PartnerType = (typeof PARTNER_TYPES)[number];

const FACILITY_TYPES: ReadonlySet<string> = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care']);

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  specialty: string | null;
  location: string | null;
  poc: string | null;
  contact_info: string | null;
  admissions_line: string | null;
  cash_pay_rate: number | null;
  insurance: string[];
  levels_of_care: string[] | null;
  website: string | null;
  notes: string | null;
  comments: string | null;
  rep: string | null;
  created_at: string;
  updated_at: string;
}

// Column metadata. `key='priority'` is special — it's pinned at the
// far left, can't be hidden, and renders the dynamic per-specialty
// counter rather than a Partner field.
interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right';
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'priority', label: '#', width: '52px', align: 'right' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', width: '130px' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'location', label: 'Location' },
  { key: 'poc', label: 'PoC' },
  { key: 'contact_info', label: 'Contact info' },
  { key: 'admissions_line', label: 'Admissions line' },
  { key: 'cash_pay_rate', label: 'Cash rate', align: 'right', width: '110px' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'levels_of_care', label: 'Levels of care' },
  { key: 'website', label: 'Website' },
  { key: 'rep', label: 'Rep' },
  { key: 'notes', label: 'Notes' },
  { key: 'comments', label: 'Comments' },
];
const DEFAULT_VISIBLE = ALL_COLUMNS.filter((c) => c.key !== 'comments').map((c) => c.key);
const DEFAULT_ORDER = ALL_COLUMNS.map((c) => c.key);
const COL_BY_KEY = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c])) as Record<string, ColumnDef>;

// Pretty colors for badges. Stable hash → palette so the same
// insurance / level value lands on the same color across rows.
const BADGE_PALETTE = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-orange-50 text-orange-700 border-orange-200',
];
function badgeClass(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return BADGE_PALETTE[Math.abs(h) % BADGE_PALETTE.length];
}

const TYPE_TONES: Record<PartnerType, string> = {
  Detox: 'bg-rose-50 text-rose-800 border-rose-200',
  RTC: 'bg-amber-50 text-amber-800 border-amber-200',
  Outpatient: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Extended Care': 'bg-teal-50 text-teal-800 border-teal-200',
  Interventionist: 'bg-blue-50 text-blue-800 border-blue-200',
  Therapist: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const LEVELS_OF_CARE_OPTIONS = ['Detox', 'Inpatient', 'Residential', 'PHP', 'IOP', 'OP', 'Sober Living'];
const COMMON_INSURANCE = ['Aetna', 'BCBS', 'Cigna', 'UnitedHealthcare', 'Humana', 'TRICARE', 'Anthem', 'Medicaid', 'Self-Pay', 'Other'];

// ─── Page ───────────────────────────────────────────────────────

export default function PartnershipsContent() {
  const { user, session } = useAuth();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [filterInsurance, setFilterInsurance] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<Partner | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);

  // Shared column prefs (visible + order). null until first load.
  const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  // Initial fetch + realtime subscriptions for partners + prefs.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/partnerships', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (r) => (r.ok ? ((await r.json()) as { rows: Partner[] }) : null))
      .then((json) => {
        if (cancelled || !json) return;
        setRows(json.rows ?? []);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    fetch('/api/partnerships/prefs', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        applyPrefs(json.visible_columns, json.column_order);
      });

    const channel = supabase
      .channel(`partners-${user?.id ?? 'anon'}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setRows((prev) => prev.filter((p) => p.id !== old.id));
        } else {
          const row = payload.new as Partner;
          setRows((prev) => {
            const ix = prev.findIndex((p) => p.id === row.id);
            if (ix === -1) return [...prev, row];
            const copy = prev.slice();
            copy[ix] = row;
            return copy;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_grid_prefs', filter: 'scope=eq.partners' }, (payload) => {
        const row = payload.new as { visible_columns: string[]; column_order: string[] } | null;
        if (row) applyPrefs(row.visible_columns, row.column_order);
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [session?.access_token, user?.id]);

  function applyPrefs(visible: unknown, order: unknown) {
    const v = Array.isArray(visible) && visible.length > 0
      ? (visible as string[]).filter((k) => k in COL_BY_KEY)
      : DEFAULT_VISIBLE;
    const o = Array.isArray(order) && order.length > 0
      ? (order as string[]).filter((k) => k in COL_BY_KEY)
      : DEFAULT_ORDER;
    // Guarantee priority is always present + first.
    const orderWithPriority = ['priority', ...o.filter((k) => k !== 'priority')];
    const visibleWithPriority = Array.from(new Set(['priority', ...v]));
    setVisibleCols(visibleWithPriority);
    setColumnOrder(orderWithPriority);
  }

  // Save prefs to Supabase (org-wide).
  const persistPrefs = useCallback(
    async (visible: string[], order: string[]) => {
      if (!session?.access_token) return;
      await fetch('/api/partnerships/prefs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ visible_columns: visible, column_order: order }),
      });
    },
    [session?.access_token],
  );

  // ── Grid logic ────────────────────────────────────────────────

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.specialty) set.add(r.specialty);
    return Array.from(set).sort();
  }, [rows]);

  const insuranceList = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const i of r.insurance) set.add(i);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterSpecialty && (r.specialty || '') !== filterSpecialty) return false;
      if (filterInsurance && !r.insurance.includes(filterInsurance)) return false;
      if (!q) return true;
      const hay = [r.name, r.location, r.notes].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, filterSpecialty, filterInsurance]);

  // Group + sort by Specialty (alpha), then by Name within group.
  // Compute the dynamic priority counter as we walk the sorted list.
  const groupedRows = useMemo(() => {
    const sorted = filtered.slice().sort((a, b) => {
      const sa = (a.specialty || '~~').toLowerCase();
      const sb = (b.specialty || '~~').toLowerCase();
      if (sa !== sb) return sa.localeCompare(sb);
      return a.name.localeCompare(b.name);
    });
    let lastSpecialty: string | null = null;
    let priority = 0;
    return sorted.map((r) => {
      const sKey = r.specialty || null;
      if (sKey !== lastSpecialty) {
        priority = 1;
        lastSpecialty = sKey;
      } else {
        priority += 1;
      }
      return { row: r, priority, isFirstOfGroup: priority === 1 };
    });
  }, [filtered]);

  const visibleColumnsResolved = useMemo(() => {
    const order = columnOrder ?? DEFAULT_ORDER;
    const visible = new Set(visibleCols ?? DEFAULT_VISIBLE);
    return order.filter((k) => visible.has(k)).map((k) => COL_BY_KEY[k]).filter(Boolean);
  }, [columnOrder, visibleCols]);

  // ── Drag-and-drop column reorder ────────────────────────────────

  const dragKeyRef = useRef<string | null>(null);
  function onColDragStart(key: string) { dragKeyRef.current = key; }
  function onColDrop(targetKey: string) {
    const dragKey = dragKeyRef.current;
    dragKeyRef.current = null;
    if (!dragKey || dragKey === targetKey) return;
    if (dragKey === 'priority' || targetKey === 'priority') return; // pinned
    const next = (columnOrder ?? DEFAULT_ORDER).slice();
    const from = next.indexOf(dragKey);
    const to = next.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    setColumnOrder(next);
    void persistPrefs(visibleCols ?? DEFAULT_VISIBLE, next);
  }

  // ── Toggle column visibility ──────────────────────────────────

  function toggleVisible(key: string) {
    if (key === 'priority') return; // pinned
    const v = new Set(visibleCols ?? DEFAULT_VISIBLE);
    if (v.has(key)) v.delete(key);
    else v.add(key);
    const nextVisible = Array.from(v);
    setVisibleCols(nextVisible);
    void persistPrefs(nextVisible, columnOrder ?? DEFAULT_ORDER);
  }

  // ── Mutations ─────────────────────────────────────────────────

  async function handleCreate(payload: Partial<Partner>) {
    if (!session?.access_token) return;
    const res = await fetch('/api/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't save: ${json.error ?? res.status}`);
      return;
    }
    setShowCreate(false);
    // Realtime will sync the row in.
  }

  async function handleUpdate(id: string, payload: Partial<Partner>) {
    if (!session?.access_token) return;
    const res = await fetch(`/api/partnerships/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't save: ${json.error ?? res.status}`);
      return;
    }
    setEditing(null);
  }

  async function confirmDowngrade() {
    const target = downgradeTarget;
    if (!target || !session?.access_token) return;
    const res = await fetch(`/api/partnerships/${target.id}/downgrade`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't downgrade: ${json.error ?? res.status}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setDowngradeTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Partnerships &amp; Referrals</h1>
          <p className="text-sm text-foreground/55 mt-0.5">
            Clinical partners and referral sources, grouped by specialty.
            {rows.length > 0 && (
              <span className="ml-1 text-foreground/40">· {rows.length} {rows.length === 1 ? 'partner' : 'partners'}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
        >
          <PlusIcon />
          New partner
        </button>
      </header>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, location, notes…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35">
            <SearchIcon />
          </span>
        </div>
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All specialties</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterInsurance}
          onChange={(e) => setFilterInsurance(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All insurance</option>
          {insuranceList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <ManageColumnsButton
            open={showCols}
            onToggle={() => setShowCols((v) => !v)}
            visibleCols={visibleCols ?? DEFAULT_VISIBLE}
            onToggleColumn={toggleVisible}
            onClose={() => setShowCols(false)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {view === 'grid' ? (
        <PartnersGrid
          loading={loading}
          rows={groupedRows}
          columns={visibleColumnsResolved}
          onColDragStart={onColDragStart}
          onColDrop={onColDrop}
          onEdit={(p) => setEditing(p)}
          onDowngrade={(p) => setDowngradeTarget(p)}
          actionMenuFor={actionMenuFor}
          setActionMenuFor={setActionMenuFor}
        />
      ) : (
        <PartnersMapView rows={filtered} />
      )}

      {showCreate && (
        <PartnerForm
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
      {editing && (
        <PartnerForm
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => handleUpdate(editing.id, p)}
        />
      )}
      {downgradeTarget && (
        <DowngradeConfirm
          partner={downgradeTarget}
          onCancel={() => setDowngradeTarget(null)}
          onConfirm={confirmDowngrade}
        />
      )}
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────

function PartnersGrid({
  loading,
  rows,
  columns,
  onColDragStart,
  onColDrop,
  onEdit,
  onDowngrade,
  actionMenuFor,
  setActionMenuFor,
}: {
  loading: boolean;
  rows: { row: Partner; priority: number; isFirstOfGroup: boolean }[];
  columns: ColumnDef[];
  onColDragStart: (key: string) => void;
  onColDrop: (key: string) => void;
  onEdit: (p: Partner) => void;
  onDowngrade: (p: Partner) => void;
  actionMenuFor: string | null;
  setActionMenuFor: (id: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/50 text-left text-[11px] uppercase tracking-wider text-foreground/55">
          <tr>
            {columns.map((c) => {
              const isPriority = c.key === 'priority';
              return (
                <th
                  key={c.key}
                  draggable={!isPriority}
                  onDragStart={() => onColDragStart(c.key)}
                  onDragOver={(e) => { if (!isPriority) e.preventDefault(); }}
                  onDrop={() => onColDrop(c.key)}
                  className={`px-3 py-2 whitespace-nowrap select-none ${c.align === 'right' ? 'text-right' : ''} ${
                    isPriority ? 'sticky left-0 bg-warm-bg/50 z-10' : 'cursor-move'
                  }`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              );
            })}
            <th className="px-3 py-2 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {loading ? (
            <tr><td colSpan={columns.length + 1} className="px-3 py-12 text-center text-foreground/45">Loading partners…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="px-3 py-12 text-center text-foreground/45">No partners yet. Click <span className="font-semibold">New partner</span> to add one.</td></tr>
          ) : (
            rows.map(({ row, priority, isFirstOfGroup }) => (
              <tr
                key={row.id}
                className={`align-top hover:bg-warm-bg/40 transition-colors ${isFirstOfGroup ? 'border-t-2 border-t-primary/15' : ''}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2.5 ${c.align === 'right' ? 'text-right' : ''} ${c.key === 'priority' ? 'sticky left-0 bg-white z-[1] font-semibold tabular-nums text-foreground/55' : ''}`}
                  >
                    <CellRenderer column={c} partner={row} priority={priority} onEdit={onEdit} />
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right relative">
                  <button
                    type="button"
                    onClick={() => setActionMenuFor(actionMenuFor === row.id ? null : row.id)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-foreground hover:bg-warm-bg"
                    aria-label="Actions"
                    aria-haspopup="menu"
                    aria-expanded={actionMenuFor === row.id}
                  >
                    <DotsIcon />
                  </button>
                  {actionMenuFor === row.id && (
                    <div
                      role="menu"
                      className="absolute right-3 top-9 z-30 w-44 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden"
                    >
                      <button
                        role="menuitem"
                        onClick={() => { setActionMenuFor(null); onEdit(row); }}
                        className="block w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-warm-bg/60"
                      >
                        Edit partner
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => { setActionMenuFor(null); onDowngrade(row); }}
                        className="block w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Downgrade to Contact
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cell renderer ──────────────────────────────────────────────

function CellRenderer({
  column,
  partner,
  priority,
  onEdit,
}: {
  column: ColumnDef;
  partner: Partner;
  priority: number;
  onEdit: (p: Partner) => void;
}) {
  switch (column.key) {
    case 'priority':
      return <span>{priority}</span>;
    case 'name':
      return (
        <button
          type="button"
          onClick={() => onEdit(partner)}
          className="text-left font-semibold text-foreground hover:text-primary transition-colors"
        >
          {partner.name}
        </button>
      );
    case 'type':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${TYPE_TONES[partner.type] ?? 'bg-warm-bg text-foreground/65 border-black/10'}`}>
          {partner.type}
        </span>
      );
    case 'specialty':
      return <span className="text-foreground/75">{partner.specialty || <Em />}</span>;
    case 'location':
      return <span className="text-foreground/65 whitespace-nowrap">{partner.location || <Em />}</span>;
    case 'poc':
      return <span className="text-foreground/75">{partner.poc || <Em />}</span>;
    case 'contact_info':
      return partner.contact_info
        ? <CopyableCell value={partner.contact_info} />
        : <Em />;
    case 'admissions_line':
      return partner.admissions_line
        ? <CopyableCell value={partner.admissions_line} mono />
        : <Em />;
    case 'cash_pay_rate':
      return partner.cash_pay_rate != null
        ? <span className="tabular-nums text-foreground/85">${partner.cash_pay_rate.toLocaleString()}</span>
        : <Em />;
    case 'insurance':
      return partner.insurance.length > 0
        ? <BadgeList values={partner.insurance} />
        : <Em />;
    case 'levels_of_care':
      // Conditional: only meaningful for facility types.
      if (!FACILITY_TYPES.has(partner.type)) {
        return <span className="text-foreground/30">—</span>;
      }
      return partner.levels_of_care && partner.levels_of_care.length > 0
        ? <BadgeList values={partner.levels_of_care} />
        : <Em />;
    case 'website':
      return partner.website
        ? <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate inline-block max-w-[220px]">{partner.website.replace(/^https?:\/\//, '')}</a>
        : <Em />;
    case 'rep':
      return <span className="text-foreground/75">{partner.rep || <Em />}</span>;
    case 'notes':
      return partner.notes
        ? <span className="text-foreground/75 line-clamp-2 leading-snug max-w-[320px]">{partner.notes}</span>
        : <Em />;
    case 'comments':
      return partner.comments
        ? <span className="text-foreground/75 line-clamp-2 leading-snug max-w-[320px]">{partner.comments}</span>
        : <Em />;
    default:
      return null;
  }
}

function Em() {
  return <span className="text-foreground/30">—</span>;
}

function BadgeList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <span key={v} className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold border ${badgeClass(v)}`}>
          {v}
        </span>
      ))}
    </div>
  );
}

function CopyableCell({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — silently no-op */
    }
  };
  return (
    <span className="inline-flex items-center gap-1 group/cp">
      <span className={`text-foreground/80 ${mono ? 'tabular-nums' : ''}`}>{value}</span>
      <button
        type="button"
        onClick={handle}
        className="opacity-0 group-hover/cp:opacity-100 transition-opacity text-foreground/40 hover:text-primary"
        aria-label="Copy"
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </span>
  );
}

// ─── Manage Columns dropdown ───────────────────────────────────

function ManageColumnsButton({
  open,
  onToggle,
  visibleCols,
  onToggleColumn,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  visibleCols: string[];
  onToggleColumn: (key: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/10 bg-white text-xs font-semibold text-foreground/70 hover:bg-warm-bg/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ColumnsIcon />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-60 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
          <p className="px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/45 border-b border-black/5">
            Visible columns
          </p>
          <ul className="py-1 max-h-80 overflow-y-auto">
            {ALL_COLUMNS.filter((c) => c.key !== 'priority').map((c) => {
              const checked = visibleCols.includes(c.key);
              return (
                <li key={c.key}>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-warm-bg/60 cursor-pointer text-[12.5px]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleColumn(c.key)}
                      className="accent-primary"
                    />
                    <span className={checked ? 'text-foreground' : 'text-foreground/55'}>{c.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-2 border-t border-black/5 text-[10px] text-foreground/45">
            Saves for everyone — drag headers to reorder.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── View toggle ────────────────────────────────────────────────

function ViewToggle({ value, onChange }: { value: 'grid' | 'map'; onChange: (v: 'grid' | 'map') => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-black/10 bg-white p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${value === 'grid' ? 'bg-foreground text-white' : 'text-foreground/65 hover:text-foreground'}`}
      >
        <span className="inline-flex items-center gap-1.5"><GridIcon /> Grid</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('map')}
        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${value === 'map' ? 'bg-foreground text-white' : 'text-foreground/65 hover:text-foreground'}`}
      >
        <span className="inline-flex items-center gap-1.5"><MapIcon /> Map</span>
      </button>
    </div>
  );
}

// ─── Map placeholder ────────────────────────────────────────────

function PartnersMapView({ rows }: { rows: Partner[] }) {
  const clusters = useMemo(() => {
    const map = new Map<string, Partner[]>();
    for (const r of rows) {
      const k = r.specialty || 'Unspecified';
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);
  // Deterministic but visually-spread placement: hash specialty
  // name into a polar coordinate so clusters don't overlap.
  function polarFor(label: string, idx: number, total: number) {
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
    const baseAngle = ((Math.abs(h) % 360) + idx * (360 / Math.max(total, 1))) * (Math.PI / 180);
    const radius = 30 + (Math.abs(h >> 4) % 22);
    return { x: 50 + radius * Math.cos(baseAngle), y: 50 + radius * Math.sin(baseAngle) };
  }
  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-black/5 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-foreground">Map view</p>
        <p className="text-[11px] text-foreground/45">Pins clustered by specialty · {rows.length} partners</p>
      </div>
      <div className="relative aspect-[16/9] bg-gradient-to-br from-warm-bg/50 via-white to-warm-bg/30 p-6">
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        {clusters.map(([label, items], i) => {
          const { x, y } = polarFor(label, i, clusters.length);
          return (
            <div
              key={label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`rounded-full border-2 border-white shadow-[0_8px_24px_-12px_rgba(60,48,42,0.35)] flex items-center justify-center text-white text-xs font-bold tabular-nums ${badgeClass(label).replace('bg-', 'bg-').replace('text-', 'text-').split(' ').filter((c) => c.startsWith('bg-')).join(' ')}`}
                style={{ width: 36 + items.length * 6, height: 36 + items.length * 6, backgroundColor: undefined }}
                title={`${label} — ${items.length}`}
              >
                {items.length}
              </div>
              <p className="mt-1 text-center text-[10px] font-semibold text-foreground/70 whitespace-nowrap">{label}</p>
            </div>
          );
        })}
        {clusters.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-foreground/40">
            Add a partner to see the map populate.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / edit form ────────────────────────────────────────

function PartnerForm({
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initial?: Partner;
  onClose: () => void;
  onSubmit: (payload: Partial<Partner>) => Promise<void> | void;
}) {
  const [type, setType] = useState<PartnerType>((initial?.type as PartnerType) ?? 'Detox');
  const [name, setName] = useState(initial?.name ?? '');
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [poc, setPoc] = useState(initial?.poc ?? '');
  const [contactInfo, setContactInfo] = useState(initial?.contact_info ?? '');
  const [admissionsLine, setAdmissionsLine] = useState(initial?.admissions_line ?? '');
  const [cashPayRate, setCashPayRate] = useState<string>(initial?.cash_pay_rate != null ? String(initial.cash_pay_rate) : '');
  const [insurance, setInsurance] = useState<string[]>(initial?.insurance ?? []);
  const [levels, setLevels] = useState<string[]>(initial?.levels_of_care ?? []);
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [comments, setComments] = useState(initial?.comments ?? '');
  const [rep, setRep] = useState(initial?.rep ?? '');
  const [submitting, setSubmitting] = useState(false);
  const isFacility = FACILITY_TYPES.has(type);

  function toggleArray(curr: string[], value: string): string[] {
    return curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const payload: Partial<Partner> = {
      name: name.trim(),
      type,
      specialty: specialty.trim() || null,
      location: location.trim() || null,
      poc: poc.trim() || null,
      contact_info: contactInfo.trim() || null,
      admissions_line: admissionsLine.trim() || null,
      cash_pay_rate: cashPayRate.trim() === '' ? null : Number(cashPayRate),
      insurance,
      // Conditional rule, enforced at three layers (UI + API + DB).
      levels_of_care: isFacility ? levels : null,
      website: website.trim() || null,
      notes: notes.trim() || null,
      comments: comments.trim() || null,
      rep: rep.trim() || null,
    };
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
      >
        <header className="px-6 py-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
              {mode === 'create' ? 'New partner' : 'Edit partner'}
            </p>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              {mode === 'create' ? 'Add a partner or referral source' : initial?.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground" aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="form-input" />
          </Field>
          <Field label="Type" required>
            <select value={type} onChange={(e) => setType(e.target.value as PartnerType)} className="form-input">
              {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Specialty">
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="form-input" placeholder="e.g. Trauma, Eating Disorders" />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" placeholder="e.g. Phoenix, AZ" />
          </Field>
          <Field label="Point of contact">
            <input value={poc} onChange={(e) => setPoc(e.target.value)} className="form-input" />
          </Field>
          <Field label="Contact info">
            <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="form-input" placeholder="Email, mobile, or both" />
          </Field>
          <Field label="Admissions line">
            <input value={admissionsLine} onChange={(e) => setAdmissionsLine(e.target.value)} className="form-input" />
          </Field>
          <Field label="Cash pay rate (USD)">
            <input value={cashPayRate} onChange={(e) => setCashPayRate(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="form-input" placeholder="e.g. 18000" />
          </Field>
          <Field label="Insurance" hint="Toggle the carriers this partner accepts.">
            <div className="flex flex-wrap gap-1.5">
              {COMMON_INSURANCE.map((c) => {
                const active = insurance.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setInsurance((prev) => toggleArray(prev, c))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${active ? badgeClass(c) : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field
            label="Levels of care"
            hint={isFacility ? 'Select every level this partner offers.' : 'Only available for Detox / RTC / Outpatient / Extended Care.'}
            disabled={!isFacility}
          >
            <div className={`flex flex-wrap gap-1.5 ${isFacility ? '' : 'opacity-40 pointer-events-none'}`}>
              {LEVELS_OF_CARE_OPTIONS.map((l) => {
                const active = levels.includes(l);
                return (
                  <button
                    type="button"
                    key={l}
                    disabled={!isFacility}
                    onClick={() => setLevels((prev) => toggleArray(prev, l))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${active ? badgeClass(l) : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'}`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Website">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="form-input" placeholder="https://" />
          </Field>
          <Field label="Rep / our point person">
            <input value={rep} onChange={(e) => setRep(e.target.value)} className="form-input" />
          </Field>
          <Field label="Notes" full>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="form-input resize-none" />
          </Field>
          <Field label="Comments" full>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="form-input resize-none" />
          </Field>
        </div>

        <footer className="px-6 py-4 border-t border-black/5 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50">
            {submitting ? 'Saving…' : mode === 'create' ? 'Create partner' : 'Save changes'}
          </button>
        </footer>
        <style jsx>{`
          .form-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: white;
            font-size: 0.875rem;
            color: var(--color-foreground);
          }
          .form-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(188, 107, 74, 0.15);
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  full,
  disabled,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className={`block text-[10px] font-bold tracking-[0.18em] uppercase mb-1 ${disabled ? 'text-foreground/30' : 'text-foreground/55'}`}>
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className={`mt-1 text-[11px] ${disabled ? 'text-foreground/30' : 'text-foreground/45'}`}>{hint}</p>}
    </div>
  );
}

// ─── Downgrade confirmation ─────────────────────────────────────

function DowngradeConfirm({
  partner,
  onCancel,
  onConfirm,
}: {
  partner: Partner;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-6" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 p-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-rose-700 mb-1">Downgrade to contact</p>
        <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{partner.name}</h3>
        <p className="mt-2 text-sm text-foreground/65 leading-snug">
          The partner row will be removed from the active grid. Their PoC, contact info, and location move to a new entry in <span className="font-semibold text-foreground">Contacts</span>, with a note that it was downgraded from this partner.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => { setSubmitting(true); try { await onConfirm(); } finally { setSubmitting(false); } }}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? 'Working…' : 'Downgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────

function PlusIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>;
}
function SearchIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
}
function ColumnsIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="16" rx="1"/><rect x="11" y="4" width="6" height="16" rx="1"/><rect x="19" y="4" width="2" height="16" rx="1"/></svg>;
}
function GridIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function MapIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>;
}
function DotsIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>;
}
function CopyIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>;
}
function CheckIcon() {
  return <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>;
}
function CloseIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>;
}
