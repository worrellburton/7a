'use client';

// Contacts (CRM) — referrers, leads, downgraded partners, and any
// person admissions wants to remember to follow up with. Apple-
// minimalist surface (warm bg, hairline borders, plenty of
// whitespace). Heavy bits:
//   * Optimistic Log-Contact modal that bumps the row's
//     last-contact-* fields the instant the user submits — backend
//     reconciles via realtime + the explicit response (Phase 6)
//   * Upgrade-to-Partner modal that pre-fills name / contact info /
//     location from the existing contact and gates the Levels-of-
//     Care input on the chosen Type (Phase 7)
//   * Manage Columns + drag-reorder persisted to public.shared_grid
//     _prefs scope='contacts' so the layout is org-wide and live
//     for every other tab via realtime (Phase 9)

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Types ──────────────────────────────────────────────────────

type ContactMethod = 'Phone' | 'In Person' | 'Left Message';

interface Contact {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  source: string | null;
  source_partner_id: string | null;
  last_contact_at: string | null;
  last_contact_by: string | null;
  last_contact_method: ContactMethod | null;
  last_contact_comments: string | null;
  last_contact_by_name?: string | null;
  last_contact_by_avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

const PARTNER_TYPES = ['Detox', 'RTC', 'Outpatient', 'Extended Care', 'Interventionist', 'Therapist'] as const;
type PartnerType = (typeof PARTNER_TYPES)[number];
const FACILITY_TYPES: ReadonlySet<string> = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care']);
const LEVELS_OF_CARE_OPTIONS = ['Detox', 'Inpatient', 'Residential', 'PHP', 'IOP', 'OP', 'Sober Living'];
const COMMON_INSURANCE = ['Aetna', 'BCBS', 'Cigna', 'UnitedHealthcare', 'Humana', 'TRICARE', 'Anthem', 'Medicaid', 'Self-Pay', 'Other'];

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right';
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role / Relation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'notes', label: 'Notes' },
];
const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);
const DEFAULT_ORDER = ALL_COLUMNS.map((c) => c.key);
const COL_BY_KEY = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c])) as Record<string, ColumnDef>;

// Per-column default widths in px. Used when the shared row in
// `shared_grid_prefs.column_widths` doesn't yet have an entry for a
// column. The 4 trailing engagement columns are also sizeable so the
// keys here must stay aligned with the `data-col-key` markers in
// the table header.
const DEFAULT_COL_WIDTHS_PX: Record<string, number> = {
  name: 200,
  role: 180,
  phone: 160,
  email: 220,
  location: 180,
  notes: 280,
  actions: 200,
  last_contact_by_name: 220,
  time_since: 150,
  last_contact_at: 160,
};
const RESIZE_MIN_PX = 70;
const RESIZE_MAX_PX = 900;
const EXPANDER_COL_WIDTH_PX = 40;

const METHOD_TONES: Record<ContactMethod, string> = {
  Phone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Person': 'bg-blue-50 text-blue-700 border-blue-200',
  'Left Message': 'bg-amber-50 text-amber-700 border-amber-200',
};

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtAbsolute(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Long-form "x minutes / hours / days / weeks / months" — used in
// the dedicated TIME SINCE column where readability matters more
// than compactness. Pluralises on the unit and rounds down so the
// value never overstates how recent the touch was.
function fmtAgoLong(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  const months = Math.floor(days / 30);
  if (months < 18) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

function sortValue(c: Contact, key: string): string | number | null {
  switch (key) {
    case 'name': return c.name || null;
    case 'role': return c.role || null;
    case 'phone': return c.phone || null;
    case 'email': return c.email || null;
    case 'location': return c.location || null;
    case 'notes': return c.notes || null;
    case 'last_contact_at':
    case 'time_since':
      return c.last_contact_at ? new Date(c.last_contact_at).getTime() : null;
    case 'last_contact_by_name': return c.last_contact_by_name || null;
    default: return null;
  }
}

// "Stale" if last contact >14 days, or never. Drives the row tint
// hint on the right-hand engagement column.
function staleness(iso: string | null): 'fresh' | 'cooling' | 'stale' | 'never' {
  if (!iso) return 'never';
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 7) return 'fresh';
  if (days < 21) return 'cooling';
  return 'stale';
}

// ─── Page ───────────────────────────────────────────────────────

export default function ContactsContent() {
  const { user, session } = useAuth();
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterStaleness, setFilterStaleness] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [logTarget, setLogTarget] = useState<Contact | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<Contact | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Contact | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<{ id: string; rect: DOMRect } | null>(null);

  const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Column widths in px keyed by column key. Empty / missing keys
  // fall back to a sensible default per column. Mutated optimistically
  // while the user drags a resize handle and persisted on pointer-up;
  // realtime updates from `shared_grid_prefs` overwrite this state so
  // every admin sees the same layout in lockstep.
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Default sort: contact with the most recent outreach action goes
  // to the top. Contacts with no logged contact (`last_contact_at`
  // null) sink to the bottom automatically — sortValue returns null
  // for them and the sort comparator pushes nulls regardless of
  // direction.
  const [sortKey, setSortKey] = useState<string>('last_contact_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  // Initial fetch + realtime subscriptions for contacts + shared prefs.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/contacts', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (r) => (r.ok ? ((await r.json()) as { rows: Contact[] }) : null))
      .then((json) => { if (!cancelled && json) setRows(json.rows ?? []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    fetch('/api/contacts/prefs', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((json) => {
        if (!cancelled && json) {
          applyPrefs(json.visible_columns, json.column_order);
          if (json.column_widths && typeof json.column_widths === 'object') {
            setColumnWidths(json.column_widths as Record<string, number>);
          }
        }
      });

    const channel = supabase
      .channel(`contacts-${user?.id ?? 'anon'}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setRows((prev) => prev.filter((p) => p.id !== old.id));
        } else {
          const row = payload.new as Contact;
          setRows((prev) => {
            const ix = prev.findIndex((p) => p.id === row.id);
            if (ix === -1) return [row, ...prev];
            const copy = prev.slice();
            // Preserve any joined display name we already had — the
            // realtime payload only carries raw columns.
            copy[ix] = { ...copy[ix], ...row };
            return copy;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_grid_prefs', filter: 'scope=eq.contacts' }, (payload) => {
        const row = payload.new as { visible_columns: string[]; column_order: string[]; column_widths?: Record<string, number> } | null;
        if (!row) return;
        applyPrefs(row.visible_columns, row.column_order);
        if (row.column_widths && typeof row.column_widths === 'object') {
          // Skip if a local resize is in flight — otherwise we'd
          // snap the dragged column back to the old width as our
          // own write echoes back.
          if (!resizingRef.current) {
            setColumnWidths(row.column_widths as Record<string, number>);
          }
        }
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
    setVisibleCols(v);
    setColumnOrder(o);
  }

  const persistPrefs = useCallback(
    async (visible: string[], order: string[]) => {
      if (!session?.access_token) return;
      await fetch('/api/contacts/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ visible_columns: visible, column_order: order }),
      });
    },
    [session?.access_token],
  );

  // Live-flag flipped on while the user is dragging a resize handle so
  // realtime echoes for in-flight widths don't snap the column back to
  // its previous size mid-drag.
  const resizingRef = useRef(false);
  const persistColumnWidth = useCallback(
    async (key: string, widthPx: number) => {
      if (!session?.access_token) return;
      await fetch('/api/contacts/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ column_widths: { [key]: Math.round(widthPx) } }),
      });
    },
    [session?.access_token],
  );

  // ── Filtering ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterMethod && r.last_contact_method !== filterMethod) return false;
      if (filterStaleness && staleness(r.last_contact_at) !== filterStaleness) return false;
      if (!q) return true;
      const hay = [r.name, r.role, r.phone, r.email, r.location, r.notes]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, filterMethod, filterStaleness]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      // Nulls always sink to the bottom regardless of direction.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'en', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const visibleColumnsResolved = useMemo(() => {
    const order = columnOrder ?? DEFAULT_ORDER;
    const visible = new Set(visibleCols ?? DEFAULT_VISIBLE);
    return order.filter((k) => visible.has(k)).map((k) => COL_BY_KEY[k]).filter(Boolean);
  }, [columnOrder, visibleCols]);

  // ── Drag-and-drop column reorder ───────────────────────────────

  const dragKeyRef = useRef<string | null>(null);
  function onColDragStart(key: string) { dragKeyRef.current = key; }
  function onColDrop(targetKey: string) {
    const dragKey = dragKeyRef.current;
    dragKeyRef.current = null;
    if (!dragKey || dragKey === targetKey) return;
    const next = (columnOrder ?? DEFAULT_ORDER).slice();
    const from = next.indexOf(dragKey);
    const to = next.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    setColumnOrder(next);
    void persistPrefs(visibleCols ?? DEFAULT_VISIBLE, next);
  }

  function toggleVisible(key: string) {
    const v = new Set(visibleCols ?? DEFAULT_VISIBLE);
    if (v.has(key)) v.delete(key);
    else v.add(key);
    const next = Array.from(v);
    setVisibleCols(next);
    void persistPrefs(next, columnOrder ?? DEFAULT_ORDER);
  }

  // ── Mutations ─────────────────────────────────────────────────

  async function handleAdd(payload: Partial<Contact>) {
    if (!session?.access_token) return;
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't save: ${json.error ?? res.status}`);
      return;
    }
    setShowAdd(false);
  }

  async function handleLogContact(target: Contact, method: ContactMethod, comments: string) {
    if (!session?.access_token) return;
    // Optimistic UI — bump the row before the request resolves so
    // the grid reflects the action immediately.
    const optimisticAt = new Date().toISOString();
    setRows((prev) =>
      prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              last_contact_at: optimisticAt,
              last_contact_by: user?.id ?? r.last_contact_by,
              last_contact_method: method,
              last_contact_comments: comments || null,
              last_contact_by_name:
                (user?.user_metadata?.full_name as string | undefined) ?? r.last_contact_by_name ?? null,
              last_contact_by_avatar_url:
                (user?.user_metadata?.avatar_url as string | undefined) ?? r.last_contact_by_avatar_url ?? null,
            }
          : r,
      ),
    );
    setLogTarget(null);
    const res = await fetch(`/api/contacts/${target.id}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ method, comments }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't log contact: ${json.error ?? res.status}`);
      // Realtime will reconcile state if the server rolled back.
    }
  }

  async function handleUpgrade(target: Contact, partnerPayload: Record<string, unknown>) {
    if (!session?.access_token) return;
    const res = await fetch(`/api/contacts/${target.id}/upgrade-to-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(partnerPayload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't upgrade: ${json.error ?? res.status}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setUpgradeTarget(null);
  }

  // Inline notes editing — invoked by the click-to-expand row in
  // ContactsGrid. Optimistic update so the cell collapses and the
  // grid reflects the saved text immediately. The realtime postgres
  // subscription will reconcile if the server pushes back something
  // different.
  async function handleSaveField(id: string, field: 'name' | 'role' | 'phone' | 'email' | 'location' | 'notes', value: string) {
    if (!session?.access_token) return;
    const trimmed = value.trim();
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: trimmed || null } : r)));
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ [field]: trimmed }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't save: ${json.error ?? res.status}`);
    }
  }

  async function handleSaveNotes(id: string, notes: string) {
    return handleSaveField(id, 'notes', notes);
  }

  async function handleDelete(target: Contact) {
    if (!session?.access_token) return;
    if (!confirm(`Delete ${target.name}? This can't be undone.`)) return;
    // Optimistic — drop the row immediately; restore if the request fails.
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    const res = await fetch(`/api/contacts/${target.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't delete: ${json.error ?? res.status}`);
      setRows((prev) => (prev.find((r) => r.id === target.id) ? prev : [target, ...prev]));
    }
  }

  // ── Render ────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Contacts</h1>
          <p className="text-sm text-foreground/55 mt-0.5">
            Outreach tracker for referrers, leads, and downgraded partners.
            {rows.length > 0 && (
              <span className="ml-1 text-foreground/40">· {rows.length} {rows.length === 1 ? 'contact' : 'contacts'}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-lg border border-black/10 bg-white text-foreground text-xs font-semibold uppercase tracking-wider hover:bg-warm-bg/60 transition-colors"
          >
            <UploadIcon />
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
          >
            <PlusIcon />
            Add contact
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, notes…"
            className="w-full pl-9 pr-3 py-2.5 sm:py-2 rounded-lg border border-black/10 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35">
            <SearchIcon />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 sm:py-2 rounded-lg border border-black/10 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All methods</option>
            <option value="Phone">Phone</option>
            <option value="In Person">In Person</option>
            <option value="Left Message">Left Message</option>
          </select>
          <select
            value={filterStaleness}
            onChange={(e) => setFilterStaleness(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 sm:py-2 rounded-lg border border-black/10 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Any freshness</option>
            <option value="fresh">Fresh (&lt; 7d)</option>
            <option value="cooling">Cooling (7–21d)</option>
            <option value="stale">Stale (&gt; 21d)</option>
            <option value="never">Never contacted</option>
          </select>
        </div>
        {/* Manage Columns only matters for the desktop table; on
            mobile every field is visible inside each card. */}
        <div className="hidden md:block ml-auto">
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

      <ContactsGrid
        loading={loading}
        rows={sorted}
        columns={visibleColumnsResolved}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onColDragStart={onColDragStart}
        onColDrop={onColDrop}
        onContact={(c) => setLogTarget(c)}
        onUpgrade={(c) => setUpgradeTarget(c)}
        onHistory={(c) => setHistoryTarget(c)}
        onDelete={(c) => handleDelete(c)}
        onSaveNotes={handleSaveNotes}
        onSaveField={handleSaveField}
        actionMenuFor={actionMenuFor}
        setActionMenuFor={setActionMenuFor}
        columnWidths={columnWidths}
        onResizeColumn={(key, w) => setColumnWidths((prev) => ({ ...prev, [key]: Math.round(w) }))}
        onCommitColumnWidth={(key, w) => { void persistColumnWidth(key, w); }}
        onResizeStart={() => { resizingRef.current = true; }}
        onResizeEnd={() => { resizingRef.current = false; }}
      />

      {showAdd && (
        <AddContactModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          token={session?.access_token ?? null}
        />
      )}
      {logTarget && (
        <LogContactModal
          contact={logTarget}
          onClose={() => setLogTarget(null)}
          onSubmit={(method, comments) => handleLogContact(logTarget, method, comments)}
        />
      )}
      {upgradeTarget && (
        <UpgradeToPartnerModal
          contact={upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          onSubmit={(payload) => handleUpgrade(upgradeTarget, payload)}
        />
      )}
      {historyTarget && (
        <ContactHistoryModal
          contact={historyTarget}
          accessToken={session?.access_token ?? null}
          onClose={() => setHistoryTarget(null)}
          onLogContact={() => { setLogTarget(historyTarget); setHistoryTarget(null); }}
        />
      )}
    </div>
  );
}

// Inline editor that drops into a single-cell row beneath a contact
// when the user clicks the notes cell. Holds its own draft state so
// edits don't propagate to the row until Save fires; Cancel and Esc
// discard. Cmd/Ctrl-Enter triggers save without leaving the keyboard.
function NotesEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (next: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    taRef.current?.focus();
    const len = taRef.current?.value.length ?? 0;
    taRef.current?.setSelectionRange(len, len);
  }, []);
  const dirty = value !== initial;
  async function commit() {
    if (saving) return;
    setSaving(true);
    try { await onSave(value); } finally { setSaving(false); }
  }
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 mb-1.5">Notes</p>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void commit(); }
        }}
        rows={4}
        placeholder="Write a note about this contact…"
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[13px] text-foreground/85 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void commit()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-white text-foreground/70 text-[12px] font-semibold border border-black/10 hover:bg-warm-bg/60 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto text-[11px] text-foreground/40">⌘↵ saves · Esc cancels</span>
      </div>
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────

function ContactsGrid({
  loading,
  rows,
  columns,
  sortKey,
  sortDir,
  onSort,
  onColDragStart,
  onColDrop,
  onContact,
  onUpgrade,
  onHistory,
  onDelete,
  onSaveNotes,
  onSaveField,
  actionMenuFor,
  setActionMenuFor,
  columnWidths,
  onResizeColumn,
  onCommitColumnWidth,
  onResizeStart,
  onResizeEnd,
}: {
  loading: boolean;
  rows: Contact[];
  columns: ColumnDef[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (k: string) => void;
  onColDragStart: (k: string) => void;
  onColDrop: (k: string) => void;
  onContact: (c: Contact) => void;
  onUpgrade: (c: Contact) => void;
  onHistory: (c: Contact) => void;
  onDelete: (c: Contact) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onSaveField: (id: string, field: 'name' | 'role' | 'phone' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
  actionMenuFor: { id: string; rect: DOMRect } | null;
  setActionMenuFor: (v: { id: string; rect: DOMRect } | null) => void;
  columnWidths: Record<string, number>;
  onResizeColumn: (key: string, widthPx: number) => void;
  onCommitColumnWidth: (key: string, widthPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}) {
  // Tracks the row whose notes-editor strip is currently expanded.
  // Click the notes cell to toggle. Persists across rerenders via a
  // simple id string; null when collapsed.
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const totalCols = columns.length + 5;

  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <FloatingScrollbar tableRef={tableScrollRef} />
      <div className="hidden md:block">
      <div
        ref={tableScrollRef}
        data-outreach-table
        className="overflow-x-auto rounded-xl border border-black/10 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <table className="w-full text-sm table-fixed">
        {/* <colgroup> drives the actual column widths so resize is
            cheap (only one node per column needs its width set, not
            every cell). Default widths from `DEFAULT_COL_WIDTHS_PX`
            are overridden by the shared `column_widths` map when the
            org has saved a layout. */}
        <colgroup>
          {columns.map((c) => {
            const w = columnWidths[c.key] ?? DEFAULT_COL_WIDTHS_PX[c.key] ?? 180;
            return <col key={c.key} style={{ width: `${w}px` }} />;
          })}
          {(['actions', 'last_contact_by_name', 'time_since', 'last_contact_at'] as const).map((k) => {
            const w = columnWidths[k] ?? DEFAULT_COL_WIDTHS_PX[k];
            return <col key={k} style={{ width: `${w}px` }} />;
          })}
          <col style={{ width: `${EXPANDER_COL_WIDTH_PX}px` }} />
        </colgroup>
        <thead className="bg-warm-bg/50 text-left text-[11px] uppercase tracking-wider text-foreground/55">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                data-col-key={c.key}
                draggable
                onDragStart={() => onColDragStart(c.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onColDrop(c.key)}
                onClick={() => onSort(c.key)}
                className={`group/th relative px-3 py-2 whitespace-nowrap select-none cursor-pointer hover:text-foreground/80 ${c.align === 'right' ? 'text-right' : ''}`}
              >
                <span className="inline-flex items-center gap-1 truncate">
                  {c.label}
                  {c.key === 'name' && (
                    <span
                      className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-foreground/10 text-foreground/65 text-[10px] font-bold tabular-nums"
                      title={`${rows.length} contact${rows.length === 1 ? '' : 's'}`}
                    >
                      {rows.length}
                    </span>
                  )}
                  <SortIndicator active={sortKey === c.key} dir={sortDir} />
                </span>
                <ResizeHandle
                  colKey={c.key}
                  onResize={onResizeColumn}
                  onCommit={onCommitColumnWidth}
                  onStart={onResizeStart}
                  onEnd={onResizeEnd}
                />
              </th>
            ))}
            {/* Engagement / action columns — fixed at the far right
                so admissions sees them no matter how the grid is
                customised. Order: Contact button, Last contact by,
                Time since (colored pill), Last contact date, actions menu. */}
            <th data-col-key="actions" className="group/th relative px-3 py-2 whitespace-nowrap">
              <span className="truncate">Actions</span>
              <ResizeHandle colKey="actions" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th
              data-col-key="last_contact_by_name"
              onClick={() => onSort('last_contact_by_name')}
              className="group/th relative px-3 py-2 whitespace-nowrap select-none cursor-pointer hover:text-foreground/80"
            >
              <span className="inline-flex items-center gap-1 truncate">
                Last contacted by
                <SortIndicator active={sortKey === 'last_contact_by_name'} dir={sortDir} />
              </span>
              <ResizeHandle colKey="last_contact_by_name" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th
              data-col-key="time_since"
              onClick={() => onSort('time_since')}
              className="group/th relative px-3 py-2 whitespace-nowrap select-none cursor-pointer hover:text-foreground/80"
            >
              <span className="inline-flex items-center gap-1 truncate">
                Time since
                <SortIndicator active={sortKey === 'time_since'} dir={sortDir} />
              </span>
              <ResizeHandle colKey="time_since" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th
              data-col-key="last_contact_at"
              onClick={() => onSort('last_contact_at')}
              className="group/th sticky right-10 z-20 bg-[#faf8f5] shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.08)] px-3 py-2 whitespace-nowrap select-none cursor-pointer hover:text-foreground/80"
            >
              <span className="inline-flex items-center gap-1 truncate">
                Last contact
                <SortIndicator active={sortKey === 'last_contact_at'} dir={sortDir} />
              </span>
              <ResizeHandle colKey="last_contact_at" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th className="sticky right-0 z-20 bg-[#faf8f5] px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {loading ? (
            <tr>
              <td colSpan={columns.length + 5} className="px-3 py-12 text-center text-foreground/45">
                Loading contacts…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 5} className="px-3 py-12 text-center text-foreground/45">
                No contacts yet. Click <span className="font-semibold">Add contact</span> to start.
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <Fragment key={c.id}>
              <tr className="group align-top hover:bg-warm-bg/40 transition-colors">
                {columns.map((col) => {
                  if (col.key === 'notes') {
                    const isExpanded = expandedNotesId === c.id;
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 align-middle cursor-pointer"
                        onClick={() => setExpandedNotesId((prev) => (prev === c.id ? null : c.id))}
                        title={c.notes ? 'Click to edit notes' : 'Click to add notes'}
                      >
                        <div className={`rounded-md px-2 -mx-2 py-1 transition-colors ${isExpanded ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/40'}`}>
                          {c.notes ? (
                            <span className="text-foreground/75 truncate block max-w-[420px]">{c.notes}</span>
                          ) : (
                            <span className="text-foreground/30 italic text-[12px]">Add notes…</span>
                          )}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}>
                      <ContactCell column={col} contact={c} onSaveField={onSaveField} />
                    </td>
                  );
                })}
                <td className="px-3 py-2.5">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onContact(c)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 hover:bg-primary/15 transition-colors"
                    >
                      <PhoneIcon />
                      Contact
                    </button>
                    <button
                      type="button"
                      onClick={() => onHistory(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-foreground/70 text-[11px] font-semibold border border-black/10 hover:bg-warm-bg/60 transition-colors"
                      title="View contact history"
                    >
                      History
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <LastContactedBy contact={c} />
                </td>
                <td className="px-3 py-2.5">
                  <TimeSinceCell contact={c} />
                </td>
                <td className="sticky right-10 z-10 bg-white group-hover:bg-[#fcfaf8] shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.08)] px-3 py-2.5 transition-colors">
                  <button
                    type="button"
                    onClick={() => onHistory(c)}
                    className="block w-full text-left rounded-md px-1 -mx-1 hover:bg-warm-bg/60 transition-colors"
                    title="View contact history"
                  >
                    <LastContactCell contact={c} />
                  </button>
                </td>
                <td className="sticky right-0 z-10 bg-white group-hover:bg-[#fcfaf8] px-2 py-2.5 text-right transition-colors">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (actionMenuFor?.id === c.id) { setActionMenuFor(null); return; }
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setActionMenuFor({ id: c.id, rect });
                    }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-foreground hover:bg-warm-bg"
                    aria-label="Actions"
                    aria-haspopup="menu"
                    aria-expanded={actionMenuFor?.id === c.id}
                  >
                    <DotsIcon />
                  </button>
                  {actionMenuFor?.id === c.id && (
                    <ActionMenuPortal
                      rect={actionMenuFor.rect}
                      onClose={() => setActionMenuFor(null)}
                      onContact={() => { setActionMenuFor(null); onContact(c); }}
                      onUpgrade={() => { setActionMenuFor(null); onUpgrade(c); }}
                      onHistory={() => { setActionMenuFor(null); onHistory(c); }}
                      onDelete={() => { setActionMenuFor(null); onDelete(c); }}
                    />
                  )}
                </td>
              </tr>
              {expandedNotesId === c.id && (
                <tr className="bg-warm-bg/30">
                  <td colSpan={totalCols} className="px-4 py-4">
                    <NotesEditor
                      initial={c.notes ?? ''}
                      onCancel={() => setExpandedNotesId(null)}
                      onSave={async (next) => {
                        await onSaveNotes(c.id, next);
                        setExpandedNotesId(null);
                      }}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
      </div>
      </div>

      {/* Mobile card layout — table is hard to scan on phones, so
          each contact gets its own stacked card with every field
          inline + the same engagement actions. */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-sm text-foreground/45">
            Loading contacts…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-sm text-foreground/45">
            No contacts yet. Tap <span className="font-semibold">Add contact</span> to start.
          </div>
        ) : (
          rows.map((c) => (
            <ContactMobileCard
              key={c.id}
              contact={c}
              onContact={() => onContact(c)}
              onUpgrade={() => onUpgrade(c)}
              onHistory={() => onHistory(c)}
              onDelete={() => onDelete(c)}
            />
          ))
        )}
      </div>
    </>
  );
}

function ActionMenuPortal({
  rect,
  onClose,
  onContact,
  onUpgrade,
  onHistory,
  onDelete,
}: {
  rect: DOMRect;
  onClose: () => void;
  onContact: () => void;
  onUpgrade: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Defer attach so the click that opened the menu doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  // Anchor the menu to the right edge of the trigger so it grows leftward
  // (the trigger sits at the far-right of the table, so right-anchored
  // is what keeps the menu fully on-screen).
  const top = rect.bottom + 4;
  const right = Math.max(8, window.innerWidth - rect.right);
  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: 'fixed', top, right, zIndex: 100 }}
      className="w-48 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden"
    >
      <button
        role="menuitem"
        onClick={onContact}
        className="block w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-warm-bg/60"
      >
        Log a contact
      </button>
      <button
        role="menuitem"
        onClick={onHistory}
        className="block w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-warm-bg/60"
      >
        View contact history
      </button>
      <button
        role="menuitem"
        onClick={onUpgrade}
        className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5"
      >
        Upgrade to Partner
      </button>
      <div className="border-t border-black/5" />
      <button
        role="menuitem"
        onClick={onDelete}
        className="block w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
      >
        Delete contact
      </button>
    </div>,
    document.body,
  );
}

// Custom horizontal scrollbar pinned to the bottom of the viewport.
// Rendered through a portal to document.body so no ancestor's
// `overflow: auto` (e.g. PlatformShell's main scroller) can clip
// or mis-anchor a sticky position. Tracks the table's bounding rect
// and scrollLeft on every scroll/resize/rAF tick so the thumb's
// width + offset always reflect the table's true scroll state.
// Glass styling: backdrop blur + translucent surface + ring; the
// thumb has its own glass treatment that brightens on hover/drag.
function FloatingScrollbar({ tableRef }: { tableRef: React.RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ left: number; width: number; thumbLeft: number; thumbWidth: number; visible: boolean; pct: number }>({
    left: 0,
    width: 0,
    thumbLeft: 0,
    thumbWidth: 0,
    visible: false,
    pct: 0,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    function pickLabel(t: HTMLDivElement) {
      const head = t.querySelector('thead');
      if (!head) return null;
      const ths = Array.from(head.querySelectorAll('th'));
      if (!ths.length) return null;
      const probeX = t.getBoundingClientRect().left + t.clientWidth / 2;
      let best: HTMLElement | null = null;
      for (const th of ths) {
        const r = (th as HTMLElement).getBoundingClientRect();
        if (r.left <= probeX && r.right >= probeX) { best = th as HTMLElement; break; }
      }
      const label = (best?.textContent ?? '').trim();
      return label || null;
    }
    function measure() {
      const t = tableRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const overflows = t.scrollWidth > t.clientWidth + 1;
      if (!overflows) {
        setLayout((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const trackW = rect.width;
      const ratio = t.clientWidth / t.scrollWidth;
      const thumbW = Math.max(48, trackW * ratio);
      const maxScroll = t.scrollWidth - t.clientWidth;
      const pct = maxScroll > 0 ? t.scrollLeft / maxScroll : 0;
      const thumbLeft = pct * (trackW - thumbW);
      setLayout({ left: rect.left, width: trackW, thumbLeft, thumbWidth: thumbW, visible: true, pct });
      setCurrentLabel(pickLabel(t));
    }
    measure();
    const t = tableRef.current;
    if (!t) return;
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    Array.from(t.children).forEach((c) => ro.observe(c as Element));
    document.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      document.removeEventListener('scroll', measure, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('resize', measure);
    };
  }, [mounted, tableRef]);

  // Arrow keys + page/home/end to pan the table horizontally when the
  // user has the track focused or the pointer is over the track or the
  // table itself. We bind to window to avoid forcing a focus state.
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      const t = tableRef.current;
      if (!t) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (target && target.isContentEditable) return;
      const maxScroll = t.scrollWidth - t.clientWidth;
      if (maxScroll <= 0) return;
      const step = Math.max(60, Math.round(t.clientWidth * 0.18));
      const big = Math.max(step * 3, Math.round(t.clientWidth * 0.9));
      let next: number | null = null;
      if (e.key === 'ArrowLeft') next = Math.max(0, t.scrollLeft - step);
      else if (e.key === 'ArrowRight') next = Math.min(maxScroll, t.scrollLeft + step);
      else if (e.key === 'PageUp') next = Math.max(0, t.scrollLeft - big);
      else if (e.key === 'PageDown') next = Math.min(maxScroll, t.scrollLeft + big);
      else if (e.key === 'Home' && (e.ctrlKey || e.metaKey || hovered || dragging)) next = 0;
      else if (e.key === 'End' && (e.ctrlKey || e.metaKey || hovered || dragging)) next = maxScroll;
      if (next == null) return;
      // Only handle when the bar is visible AND the user is "engaged"
      // with the bar (hovering or dragging) OR they're focused on the
      // table region. Avoids hijacking arrow keys everywhere.
      const overTable = target?.closest?.('[data-outreach-table]');
      if (!hovered && !dragging && !overTable && document.activeElement !== trackRef.current) return;
      e.preventDefault();
      t.scrollTo({ left: next, behavior: 'smooth' });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, hovered, dragging, tableRef]);

  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  function onThumbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const t = tableRef.current;
    if (!t) return;
    dragRef.current = { startX: e.clientX, startScrollLeft: t.scrollLeft };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onThumbPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const t = tableRef.current;
    if (!drag || !t) return;
    const dx = e.clientX - drag.startX;
    const trackW = layout.width;
    const thumbW = layout.thumbWidth;
    const maxScroll = t.scrollWidth - t.clientWidth;
    const denom = trackW - thumbW;
    if (denom <= 0) return;
    t.scrollLeft = drag.startScrollLeft + (dx * maxScroll) / denom;
  }
  function onThumbPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }
  function onTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const t = tableRef.current;
    const trackEl = trackRef.current;
    if (!t || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackW = rect.width;
    const thumbW = layout.thumbWidth;
    const maxScroll = t.scrollWidth - t.clientWidth;
    const denom = trackW - thumbW;
    if (denom <= 0) return;
    const target = Math.max(0, Math.min(maxScroll, ((clickX - thumbW / 2) / denom) * maxScroll));
    t.scrollTo({ left: target, behavior: 'smooth' });
  }

  if (!mounted || !layout.visible) return null;

  const showTooltip = dragging || hovered;
  const tooltipText = currentLabel
    ? `${currentLabel} · ${Math.round(layout.pct * 100)}%`
    : `${Math.round(layout.pct * 100)}%`;
  const thumbCenter = layout.thumbLeft + layout.thumbWidth / 2;

  return createPortal(
    <div
      ref={trackRef}
      tabIndex={0}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(layout.pct * 100)}
      onPointerDown={onTrackPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={`hidden md:block fixed bottom-4 z-[60] rounded-full border border-white/40 ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150 outline-none transition-[height,box-shadow,background-color] duration-200 ease-out ${dragging || hovered ? 'h-5 shadow-[0_18px_44px_-14px_rgba(60,48,42,0.45),inset_0_1px_0_rgba(255,255,255,0.85)] bg-white/55' : 'h-4 shadow-[0_10px_28px_-10px_rgba(60,48,42,0.32),inset_0_1px_0_rgba(255,255,255,0.7)] bg-white/40'}`}
      style={{ left: layout.left, width: layout.width }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
        onPointerCancel={onThumbPointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={`absolute inset-y-[3px] rounded-full ring-1 ring-white/50 cursor-grab active:cursor-grabbing transition-[transform,box-shadow,background-image,filter] duration-200 ease-out will-change-transform bg-gradient-to-b from-[#d6896b] via-[#bc6b4a] to-[#a85a3c] hover:from-[#e0997b] hover:via-[#c87557] hover:to-[#b1644a] active:from-[#e7a48a] active:via-[#d18066] active:to-[#bb6e54] shadow-[0_4px_10px_-2px_rgba(188,107,74,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] ${dragging ? 'scale-y-110 shadow-[0_8px_18px_-3px_rgba(188,107,74,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] brightness-110' : ''}`}
        style={{ left: layout.thumbLeft, width: layout.thumbWidth }}
      />
      {/* Tooltip pill above the thumb showing the column you're parked
          on plus % progress. Mirrors the glass aesthetic of the track
          and only appears while interacting so it doesn't crowd the
          page during quiet states. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap text-foreground/85 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 ring-1 ring-black/5 shadow-[0_8px_22px_-10px_rgba(60,48,42,0.35)] transition-all duration-200 ease-out ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        style={{ left: thumbCenter }}
      >
        {tooltipText}
      </div>
    </div>,
    document.body,
  );
}

// Right-edge column-resize grip rendered inside each `<th>`. The
// parent `<th>` is positioned-relative + group/th so a faint hover
// trace shows up across the whole header cell while the live drag
// state turns the grip orange. Pointer capture means the drag keeps
// tracking even if the cursor leaves the bar mid-drag. We compute
// width deltas off the live header bounding rect (NOT the in-state
// width) so multi-handle interactions stay accurate.
function ResizeHandle({
  colKey,
  onResize,
  onCommit,
  onStart,
  onEnd,
}: {
  colKey: string;
  onResize: (key: string, widthPx: number) => void;
  onCommit: (key: string, widthPx: number) => void;
  onStart: () => void;
  onEnd: () => void;
}) {
  const [active, setActive] = useState(false);
  const stateRef = useRef<{ startX: number; startWidth: number; lastWidth: number } | null>(null);

  function findHeaderEl(currentTarget: HTMLElement): HTMLElement | null {
    return currentTarget.closest(`th[data-col-key="${colKey}"]`) as HTMLElement | null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const headerEl = findHeaderEl(e.currentTarget);
    if (!headerEl) return;
    const startWidth = headerEl.getBoundingClientRect().width;
    stateRef.current = { startX: e.clientX, startWidth, lastWidth: startWidth };
    setActive(true);
    onStart();
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = stateRef.current;
    if (!s) return;
    e.preventDefault();
    const dx = e.clientX - s.startX;
    const next = Math.max(RESIZE_MIN_PX, Math.min(RESIZE_MAX_PX, s.startWidth + dx));
    s.lastWidth = next;
    onResize(colKey, next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const s = stateRef.current;
    if (!s) return;
    const finalWidth = s.lastWidth;
    stateRef.current = null;
    setActive(false);
    onEnd();
    onCommit(colKey, finalWidth);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${colKey} column`}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute right-0 top-1 bottom-1 w-2 -mr-px rounded-full select-none cursor-col-resize touch-none transition-colors duration-150 ${active ? 'bg-[#bc6b4a]/80' : 'bg-transparent hover:bg-foreground/25 group-hover/th:bg-foreground/10'}`}
    />
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className={`text-[9px] leading-none ${active ? 'text-foreground/70' : 'text-foreground/20'}`} aria-hidden>
      {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
    </span>
  );
}

function ContactCell({
  column,
  contact,
  onSaveField,
}: {
  column: ColumnDef;
  contact: Contact;
  onSaveField: (id: string, field: 'name' | 'role' | 'phone' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
}) {
  const save = (field: 'name' | 'role' | 'phone' | 'email' | 'location') => (next: string) =>
    onSaveField(contact.id, field, next);
  switch (column.key) {
    case 'name':
      return (
        <div>
          <EditableTextCell
            value={contact.name}
            onSave={save('name')}
            className="font-semibold text-foreground whitespace-nowrap"
            placeholder="Add name…"
          />
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/40 whitespace-nowrap">From partner</p>
          )}
        </div>
      );
    case 'role':
      return (
        <EditableTextCell
          value={contact.role}
          onSave={save('role')}
          className="text-foreground/70"
          placeholder="Add role…"
        />
      );
    case 'phone':
      return (
        <EditableTextCell
          value={contact.phone}
          onSave={save('phone')}
          type="tel"
          className="text-foreground/85"
          mono
          copyable
          placeholder="Add phone…"
        />
      );
    case 'email':
      return (
        <EditableTextCell
          value={contact.email}
          onSave={save('email')}
          type="email"
          className="text-foreground/85"
          copyable
          placeholder="Add email…"
        />
      );
    case 'location':
      return (
        <EditableTextCell
          value={contact.location}
          onSave={save('location')}
          className="text-foreground/65 whitespace-nowrap"
          placeholder="Add location…"
        />
      );
    case 'notes':
      return contact.notes
        ? <span className="text-foreground/75 truncate block max-w-[420px]" title={contact.notes}>{contact.notes}</span>
        : <Em />;
    default:
      return null;
  }
}

// Inline single-line editor used by the editable text columns. Click to
// edit, Enter / blur to save, Esc to cancel. Empty string clears the
// field server-side. Optimistic update plus the existing realtime
// subscription means every connected viewer sees the change.
function EditableTextCell({
  value,
  onSave,
  type = 'text',
  className = '',
  mono = false,
  copyable = false,
  placeholder,
}: {
  value: string | null | undefined;
  onSave: (next: string) => Promise<void> | void;
  type?: 'text' | 'tel' | 'email';
  className?: string;
  mono?: boolean;
  copyable?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    if ((next || '') === (value ?? '').trim()) {
      setEditing(false);
      return;
    }
    setEditing(false);
    await onSave(next);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(value ?? ''); setEditing(false); }
        }}
        className={`w-full min-w-0 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${mono ? 'font-mono tabular-nums' : ''}`}
      />
    );
  }
  const display = value ?? '';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); } }}
      title={display ? (copyable ? `${display} · click to edit` : 'Click to edit') : 'Click to add'}
      className={`group inline-flex items-center gap-1.5 cursor-text rounded-md px-1 -mx-1 py-0.5 hover:bg-warm-bg/60 transition-colors max-w-full ${className}`}
    >
      {display ? (
        <span className={`${mono ? 'font-mono tabular-nums' : ''} truncate`}>{display}</span>
      ) : (
        <span className="text-foreground/30 italic text-[12px]">{placeholder ?? 'Click to add'}</span>
      )}
      {copyable && display && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(display); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/40 hover:text-foreground/70"
          title="Copy"
          aria-label="Copy"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      )}
    </div>
  );
}

function ContactMobileCard({
  contact,
  onContact,
  onUpgrade,
  onHistory,
  onDelete,
}: {
  contact: Contact;
  onContact: () => void;
  onUpgrade: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-base leading-tight">{contact.name}</p>
          {contact.role && (
            <p className="mt-0.5 text-[12px] text-foreground/60">{contact.role}</p>
          )}
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/40">From partner</p>
          )}
        </div>
        <TimeSinceCell contact={contact} />
      </div>

      <dl className="mt-3 space-y-1.5 text-[13px]">
        {contact.phone && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Phone</dt>
            <dd className="min-w-0 flex-1"><CopyableCell value={contact.phone} mono /></dd>
          </div>
        )}
        {contact.email && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Email</dt>
            <dd className="min-w-0 flex-1 break-all"><CopyableCell value={contact.email} /></dd>
          </div>
        )}
        {contact.location && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Location</dt>
            <dd className="text-foreground/75">{contact.location}</dd>
          </div>
        )}
        {contact.notes && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Notes</dt>
            <dd className="text-foreground/75 whitespace-pre-wrap">{contact.notes}</dd>
          </div>
        )}
      </dl>

      {contact.last_contact_at && (
        <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2">
          {contact.last_contact_by_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.last_contact_by_avatar_url}
              alt={contact.last_contact_by_name ?? 'User'}
              className="w-7 h-7 rounded-full object-cover bg-warm-bg"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-[11px] font-semibold text-foreground/55">
              {(contact.last_contact_by_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[12px] font-semibold text-foreground truncate">
              {contact.last_contact_by_name || 'Unknown'}
            </p>
            <p className="text-[10.5px] text-foreground/45">{fmtAbsolute(contact.last_contact_at)}</p>
          </div>
          {contact.last_contact_method && (
            <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${METHOD_TONES[contact.last_contact_method]}`}>
              {contact.last_contact_method}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onContact}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <PhoneIcon />
          Contact
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md border border-black/10 text-[12px] font-semibold text-foreground/75 hover:bg-warm-bg/60 transition-colors"
        >
          History
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-black/10 text-foreground/55 hover:bg-warm-bg/60"
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <DotsIcon />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div role="menu" className="absolute right-0 bottom-full mb-1 z-20 w-48 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden">
                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); onUpgrade(); }}
                  className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5"
                >
                  Upgrade to Partner
                </button>
                <div className="border-t border-black/5" />
                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); onDelete(); }}
                  className="block w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                >
                  Delete contact
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Em() { return <span className="text-foreground/30">—</span>; }

function CopyableCell({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard blocked */ }
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

function LastContactedBy({ contact }: { contact: Contact }) {
  if (!contact.last_contact_at) return <Em />;
  return (
    <div className="flex items-center gap-2">
      {contact.last_contact_by_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.last_contact_by_avatar_url}
          alt=""
          className="w-7 h-7 rounded-full object-cover border border-black/10"
        />
      ) : (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
          {(contact.last_contact_by_name || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate">
          {contact.last_contact_by_name || '—'}
        </p>
        {contact.last_contact_method && (
          <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${METHOD_TONES[contact.last_contact_method]}`}>
            {contact.last_contact_method}
          </span>
        )}
      </div>
    </div>
  );
}

function TimeSinceCell({ contact }: { contact: Contact }) {
  // Re-render every 30s so values like "2 minutes" → "3 minutes"
  // tick forward without a page refresh. Cheap — just a counter
  // bump that React diffs against a pure render.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!contact.last_contact_at) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-foreground/5 text-foreground/45 border-foreground/10">
        Never
      </span>
    );
  }
  const s = staleness(contact.last_contact_at);
  const tone =
    s === 'fresh'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'cooling'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${tone}`}
      title={fmtAbsolute(contact.last_contact_at) ?? ''}
    >
      {fmtAgoLong(contact.last_contact_at)}
    </span>
  );
}

function LastContactCell({ contact }: { contact: Contact }) {
  if (!contact.last_contact_at) {
    return <span className="text-foreground/40 text-[11px] italic">never contacted</span>;
  }
  const tone =
    staleness(contact.last_contact_at) === 'fresh'
      ? 'text-emerald-700'
      : staleness(contact.last_contact_at) === 'cooling'
        ? 'text-amber-700'
        : 'text-rose-700';
  return (
    <div className="text-[12px]">
      <p className={`font-semibold ${tone}`}>{fmtAgo(contact.last_contact_at)}</p>
      <p className="text-foreground/45 mt-0.5 whitespace-nowrap">{fmtAbsolute(contact.last_contact_at)}</p>
    </div>
  );
}

// ─── Manage Columns ────────────────────────────────────────────

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
            {ALL_COLUMNS.map((c) => {
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

// ─── Add Contact modal ────────────────────────────────────────

function AddContactModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: Partial<Contact>) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        role: role.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Add a contact" eyebrow="New contact" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModalField label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="modal-input" />
          </ModalField>
          <ModalField label="Role / Relation">
            <input value={role} onChange={(e) => setRole(e.target.value)} className="modal-input" placeholder="Therapist · Family · Alum" />
          </ModalField>
          <ModalField label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="modal-input" inputMode="tel" />
          </ModalField>
          <ModalField label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="modal-input" type="email" />
          </ModalField>
          <ModalField label="Location" full>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="modal-input" placeholder="City, ST" />
          </ModalField>
          <ModalField label="Notes" full>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="modal-input resize-none" />
          </ModalField>
        </div>
        <ModalFooter
          submitting={submitting}
          submitDisabled={!name.trim()}
          submitLabel="Add contact"
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}

// ─── Log-Contact modal ────────────────────────────────────────

function LogContactModal({
  contact,
  onClose,
  onSubmit,
}: {
  contact: Contact;
  onClose: () => void;
  onSubmit: (method: ContactMethod, comments: string) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<ContactMethod>('Phone');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  return (
    <ModalShell
      title={`Log a contact with ${contact.name}`}
      eyebrow="Outreach"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit(method, comments.trim());
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="px-6 py-5 space-y-4">
          <ModalField label="Method" required>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as ContactMethod)}
              className="modal-input"
            >
              <option value="Phone">Phone</option>
              <option value="In Person">In Person</option>
              <option value="Left Message">Left Message</option>
            </select>
          </ModalField>
          <ModalField label="Comments / notes" hint="What did you talk about? Any next steps?">
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="modal-input resize-none"
              placeholder="They mentioned a referral coming next week — follow up on Tuesday."
            />
          </ModalField>
        </div>
        <ModalFooter
          submitting={submitting}
          submitDisabled={false}
          submitLabel="Log contact"
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}

// ─── Contact History modal ────────────────────────────────────

interface ContactLog {
  id: string;
  method: ContactMethod;
  comments: string | null;
  contacted_by: string | null;
  contacted_at: string;
  contacted_by_name: string | null;
  contacted_by_avatar_url: string | null;
}

function ContactHistoryModal({
  contact,
  accessToken,
  onClose,
  onLogContact,
}: {
  contact: Contact;
  accessToken: string | null;
  onClose: () => void;
  onLogContact: () => void;
}) {
  const [logs, setLogs] = useState<ContactLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch(`/api/contacts/${contact.id}/history`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((json as { error?: string }).error || `HTTP ${r.status}`);
        return json as { rows: ContactLog[] };
      })
      .then((j) => { if (!cancelled) setLogs(j.rows ?? []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [accessToken, contact.id]);

  return (
    <ModalShell title={contact.name} eyebrow="Contact history" onClose={onClose}>
      <div className="px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-foreground/55">
            {logs == null
              ? 'Loading…'
              : logs.length === 0
              ? 'No contact history yet.'
              : `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}, newest first.`}
          </p>
          <button
            type="button"
            onClick={onLogContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <PhoneIcon />
            Log a contact
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {logs && logs.length > 0 && (
          <ol className="relative border-l border-black/10 ml-3">
            {logs.map((log, i) => (
              <li key={log.id} className="relative pl-5 pb-5 last:pb-0">
                <span
                  className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    i === 0 ? 'bg-primary' : 'bg-foreground/30'
                  }`}
                />
                <div className="flex items-start gap-3">
                  {log.contacted_by_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={log.contacted_by_avatar_url}
                      alt={log.contacted_by_name ?? 'User'}
                      className="w-8 h-8 rounded-full object-cover bg-warm-bg"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-warm-bg flex items-center justify-center text-[11px] font-semibold text-foreground/55">
                      {(log.contacted_by_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {log.contacted_by_name || 'Unknown'}
                      </p>
                      <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${METHOD_TONES[log.method]}`}>
                        {log.method}
                      </span>
                      <span className="text-[11px] text-foreground/45" title={fmtAbsolute(log.contacted_at) ?? ''}>
                        {fmtAgo(log.contacted_at)} · {fmtAbsolute(log.contacted_at)}
                      </span>
                    </div>
                    {log.comments && (
                      <p className="mt-1.5 text-sm text-foreground/75 whitespace-pre-wrap leading-relaxed">
                        {log.comments}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ModalShell>
  );
}

// ─── Upgrade-to-Partner modal ─────────────────────────────────

function UpgradeToPartnerModal({
  contact,
  onClose,
  onSubmit,
}: {
  contact: Contact;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
}) {
  const prefilledContactInfo = [contact.phone, contact.email].filter(Boolean).join(' · ');
  const [name, setName] = useState(contact.name);
  const [type, setType] = useState<PartnerType>('Detox');
  const [specialty, setSpecialty] = useState('');
  const [poc, setPoc] = useState(contact.name);
  const [contactInfo, setContactInfo] = useState(prefilledContactInfo);
  const [admissionsLine, setAdmissionsLine] = useState('');
  const [location, setLocation] = useState(contact.location ?? '');
  const [cashPayRate, setCashPayRate] = useState('');
  const [insurance, setInsurance] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [website, setWebsite] = useState('');
  const [rep, setRep] = useState('');
  const [notes, setNotes] = useState(contact.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const isFacility = FACILITY_TYPES.has(type);

  function toggleArray(curr: string[], value: string): string[] {
    return curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        specialty: specialty.trim() || null,
        poc: poc.trim() || null,
        contact_info: contactInfo.trim() || null,
        admissions_line: admissionsLine.trim() || null,
        location: location.trim() || null,
        cash_pay_rate: cashPayRate.trim() === '' ? null : Number(cashPayRate),
        insurance,
        // Conditional rule, mirrored client-side, in the API
        // normaliser, and as a Postgres CHECK on partners.
        levels_of_care: isFacility ? levels : null,
        website: website.trim() || null,
        rep: rep.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Complete partner profile"
      eyebrow="Upgrade to partner"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="px-6 py-5">
          <div className="rounded-lg bg-warm-bg/60 border border-black/5 px-4 py-3 mb-5 text-[12px] text-foreground/65 leading-snug">
            Pre-filled from <span className="font-semibold text-foreground">{contact.name}</span>:
            point of contact, contact info{contact.location ? ', and location' : ''}. Fill in the
            partner-specific fields below — the contact will be removed from the
            grid and added to <span className="font-semibold text-foreground">Partners</span> on
            submit.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModalField label="Partner name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="modal-input" />
            </ModalField>
            <ModalField label="Type" required>
              <select value={type} onChange={(e) => setType(e.target.value as PartnerType)} className="modal-input">
                {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </ModalField>
            <ModalField label="Specialty">
              <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="modal-input" placeholder="e.g. Trauma, Eating Disorders" />
            </ModalField>
            <ModalField label="Admissions line">
              <input value={admissionsLine} onChange={(e) => setAdmissionsLine(e.target.value)} className="modal-input" />
            </ModalField>
            <ModalField label="Point of contact" hint="Pre-filled from contact name">
              <input value={poc} onChange={(e) => setPoc(e.target.value)} className="modal-input" />
            </ModalField>
            <ModalField label="Contact info" hint="Pre-filled from contact phone + email">
              <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="modal-input" />
            </ModalField>
            <ModalField label="Location" hint="Pre-filled from contact">
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="modal-input" />
            </ModalField>
            <ModalField label="Cash pay rate (USD)">
              <input
                value={cashPayRate}
                onChange={(e) => setCashPayRate(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                className="modal-input"
              />
            </ModalField>
            <ModalField label="Insurance" hint="Toggle the carriers this partner accepts." full>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_INSURANCE.map((c) => {
                  const active = insurance.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setInsurance((prev) => toggleArray(prev, c))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        active ? 'bg-primary/10 text-primary border-primary/25' : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </ModalField>
            <ModalField
              label="Levels of care"
              hint={isFacility
                ? 'Pick every level this partner offers.'
                : 'Available only when Type is Detox / RTC / Outpatient / Extended Care.'}
              disabled={!isFacility}
              full
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
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </ModalField>
            <ModalField label="Website">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className="modal-input" placeholder="https://" />
            </ModalField>
            <ModalField label="Our rep / point person">
              <input value={rep} onChange={(e) => setRep(e.target.value)} className="modal-input" />
            </ModalField>
            <ModalField label="Notes" full>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="modal-input resize-none" />
            </ModalField>
          </div>
        </div>
        <ModalFooter
          submitting={submitting}
          submitDisabled={!name.trim() || !type}
          submitLabel="Upgrade to partner"
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}

// ─── Modal primitives (shared between Add/Log/Upgrade) ────────

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 pb-[env(safe-area-inset-bottom)]"
      >
        {/* Drag handle hint — purely visual, signals 'this is a sheet'. */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <span className="block w-10 h-1 rounded-full bg-foreground/15" />
        </div>
        <header className="px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{eyebrow}</p>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground p-2 -mr-2" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        {children}
        <style jsx global>{`
          .modal-input {
            width: 100%;
            padding: 0.625rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: white;
            font-size: 16px; /* 16px prevents iOS Safari from zooming the viewport on focus */
            color: var(--color-foreground);
          }
          .modal-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(188, 107, 74, 0.15);
          }
          @media (min-width: 640px) {
            .modal-input { font-size: 0.875rem; padding: 0.5rem 0.75rem; }
          }
        `}</style>
      </div>
    </div>
  );
}

function ModalField({
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

function ModalFooter({
  submitting,
  submitDisabled,
  submitLabel,
  onCancel,
}: {
  submitting: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <footer className="px-6 py-4 border-t border-black/5 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
      <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting || submitDisabled}
        className="px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </footer>
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
function PhoneIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.95.36 1.88.7 2.77a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.31-1.31a2 2 0 012.11-.45c.89.34 1.82.57 2.77.7A2 2 0 0122 16.92z"/></svg>;
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
function UploadIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>;
}

// ─── CSV import modal ──────────────────────────────────────────

interface CsvContactRow {
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
}

// RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes
// ("" → "), and \r\n line endings. Returns header[] + rows[][] in
// the order they were read so the AI / mapper preserves the
// original ordering.
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { cur.push(field); field = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.length === 1 && cur[0] === '') { cur = []; continue; }
      lines.push(cur); cur = [];
      continue;
    }
    field += c;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); lines.push(cur); }
  if (lines.length === 0) return { header: [], rows: [] };
  const [header, ...rows] = lines;
  return { header: header.map((h) => h.trim()), rows };
}

function ImportCsvModal({ onClose, token }: { onClose: () => void; token: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parsed, setParsed] = useState<{ header: string[]; rows: string[][] } | null>(null);
  const [normalised, setNormalised] = useState<CsvContactRow[] | null>(null);
  const [normalising, setNormalising] = useState(false);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(f: File | null) {
    setError(null);
    setResult(null);
    setNormalised(null);
    setAiNotes(null);
    if (!f) {
      setFile(null);
      setParsed(null);
      setRawText('');
      return;
    }
    if (!/\.csv$|^text\/csv$/i.test(f.name) && !f.type.includes('csv') && !f.type.includes('text')) {
      setError('Please pick a .csv file.');
      return;
    }
    if (f.size > 1024 * 1024) {
      setError('CSV is larger than 1MB — split it before uploading.');
      return;
    }
    setFile(f);
    f.text().then((t) => {
      setRawText(t);
      setParsed(parseCsv(t));
    });
  }

  async function runAi() {
    if (!rawText) return;
    setNormalising(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts/import/normalise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ csv: rawText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `AI normalise failed (${res.status})`);
        return;
      }
      setNormalised(Array.isArray(json.rows) ? json.rows : []);
      setAiNotes(typeof json.notes === 'string' ? json.notes : null);
    } finally {
      setNormalising(false);
    }
  }

  async function runImport() {
    if (!normalised || normalised.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rows: normalised }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !json?.created) {
        setError(json.error || `Import failed (${res.status})`);
        return;
      }
      setResult({
        created: json.created ?? 0,
        skipped: json.skipped ?? 0,
        errors: Array.isArray(json.errors) ? json.errors : [],
      });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const headers = ['name', 'role', 'phone', 'email', 'location', 'notes'];
    const sample = [
      'Dr. Jane Park', 'Therapist', '(602) 555-0144', 'jane@example.com',
      'Phoenix, AZ', 'Met at AZ behavioural-health mixer.',
    ];
    const csv = `${headers.join(',')}\n${sample.map((c) => /[,\"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 pb-[env(safe-area-inset-bottom)]">
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <span className="block w-10 h-1 rounded-full bg-foreground/15" />
        </div>
        <header className="px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Bulk import</p>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Import contacts from CSV</h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground p-2 -mr-2" aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: pick file */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">1 · Upload CSV</p>
            <label className="block rounded-xl border-2 border-dashed border-black/15 bg-warm-bg/30 px-4 py-6 text-center cursor-pointer hover:border-primary/45 hover:bg-primary/5 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-sm font-semibold text-foreground">{file ? file.name : 'Click to choose a .csv'}</p>
              <p className="mt-1 text-[11.5px] text-foreground/55">
                Up to 1MB. Headers will be auto-detected — column names like &quot;Phone #&quot; or &quot;City, State&quot; are fine.
              </p>
            </label>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <button type="button" onClick={downloadTemplate} className="text-primary hover:underline">
                Download template CSV
              </button>
              {parsed && (
                <span className="text-foreground/55">
                  {parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} detected · {parsed.header.length} columns
                </span>
              )}
            </div>
          </div>

          {/* Step 2: AI normalise */}
          {parsed && parsed.rows.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
                2 · Let Claude normalise
              </p>
              <div className="rounded-xl border border-black/10 bg-white px-4 py-3">
                <p className="text-[12.5px] text-foreground/65 leading-snug">
                  Claude maps your headers to our schema, combines split first / last name columns,
                  normalises phone numbers, and tidies whitespace. The server re-validates every row
                  before insert, so a bad mapping can&apos;t bypass the rules.
                </p>
                <button
                  type="button"
                  onClick={runAi}
                  disabled={normalising || !!normalised}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary-dark disabled:opacity-50"
                >
                  {normalising ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      Mapping…
                    </>
                  ) : normalised ? 'Mapped'
                    : 'Normalise with Claude'}
                </button>
                {aiNotes && (
                  <p className="mt-2 text-[11.5px] text-foreground/55 italic">{aiNotes}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: preview + import */}
          {normalised && normalised.length > 0 && !result && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">3 · Preview &amp; import</p>
              <div className="overflow-x-auto rounded-xl border border-black/10 bg-white max-h-72">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-warm-bg/60 text-left text-[10.5px] uppercase tracking-wider text-foreground/55 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {normalised.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-semibold text-foreground">{r.name}</td>
                        <td className="px-3 py-1.5 text-foreground/70">{r.role || '—'}</td>
                        <td className="px-3 py-1.5 text-foreground/70">{r.phone || '—'}</td>
                        <td className="px-3 py-1.5 text-foreground/70">{r.email || '—'}</td>
                        <td className="px-3 py-1.5 text-foreground/70">{r.location || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {normalised.length > 50 && (
                <p className="mt-1 text-[11px] text-foreground/45">+ {normalised.length - 50} more not shown</p>
              )}
              <button
                type="button"
                onClick={runImport}
                disabled={importing}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    Importing…
                  </>
                ) : `Import ${normalised.length} ${normalised.length === 1 ? 'contact' : 'contacts'}`}
              </button>
            </div>
          )}

          {/* Done */}
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">
                Created {result.created} {result.created === 1 ? 'contact' : 'contacts'}
                {result.skipped > 0 && <span className="text-foreground/55"> · {result.skipped} skipped</span>}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[12px] text-foreground/70 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}><span className="text-foreground/45">Row {e.row}:</span> {e.reason}</li>
                  ))}
                  {result.errors.length > 20 && (
                    <li className="text-foreground/40 italic">+ {result.errors.length - 20} more</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-black/5 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
            {result ? 'Done' : 'Cancel'}
          </button>
        </footer>
      </div>
    </div>
  );
}
