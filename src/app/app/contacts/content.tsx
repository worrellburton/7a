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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [showCols, setShowCols] = useState(false);
  const [logTarget, setLogTarget] = useState<Contact | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<Contact | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<{ id: string; rect: DOMRect } | null>(null);

  const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

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
      .then((json) => { if (!cancelled && json) applyPrefs(json.visible_columns, json.column_order); });

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

  // ── Render ────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Contacts</h1>
          <p className="text-sm text-foreground/55 mt-0.5">
            Outreach tracker for referrers, leads, and downgraded partners.
            {rows.length > 0 && (
              <span className="ml-1 text-foreground/40">· {rows.length} {rows.length === 1 ? 'contact' : 'contacts'}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
        >
          <PlusIcon />
          Add contact
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, notes…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35">
            <SearchIcon />
          </span>
        </div>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All methods</option>
          <option value="Phone">Phone</option>
          <option value="In Person">In Person</option>
          <option value="Left Message">Left Message</option>
        </select>
        <select
          value={filterStaleness}
          onChange={(e) => setFilterStaleness(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Any freshness</option>
          <option value="fresh">Fresh (&lt; 7d)</option>
          <option value="cooling">Cooling (7–21d)</option>
          <option value="stale">Stale (&gt; 21d)</option>
          <option value="never">Never contacted</option>
        </select>
        <div className="ml-auto">
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
        rows={filtered}
        columns={visibleColumnsResolved}
        onColDragStart={onColDragStart}
        onColDrop={onColDrop}
        onContact={(c) => setLogTarget(c)}
        onUpgrade={(c) => setUpgradeTarget(c)}
        actionMenuFor={actionMenuFor}
        setActionMenuFor={setActionMenuFor}
      />

      {showAdd && (
        <AddContactModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
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
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────

function ContactsGrid({
  loading,
  rows,
  columns,
  onColDragStart,
  onColDrop,
  onContact,
  onUpgrade,
  actionMenuFor,
  setActionMenuFor,
}: {
  loading: boolean;
  rows: Contact[];
  columns: ColumnDef[];
  onColDragStart: (k: string) => void;
  onColDrop: (k: string) => void;
  onContact: (c: Contact) => void;
  onUpgrade: (c: Contact) => void;
  actionMenuFor: { id: string; rect: DOMRect } | null;
  setActionMenuFor: (v: { id: string; rect: DOMRect } | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/50 text-left text-[11px] uppercase tracking-wider text-foreground/55">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                draggable
                onDragStart={() => onColDragStart(c.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onColDrop(c.key)}
                className={`px-3 py-2 whitespace-nowrap select-none cursor-move ${c.align === 'right' ? 'text-right' : ''}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
            {/* Engagement / action columns — fixed at the far right
                so admissions sees them no matter how the grid is
                customised. Order: Contact button, Last contact by,
                Last contact date, actions menu. */}
            <th className="px-3 py-2 text-center whitespace-nowrap" style={{ width: 100 }}>Action</th>
            <th className="px-3 py-2 whitespace-nowrap" style={{ width: 220 }}>Last contacted by</th>
            <th className="px-3 py-2 whitespace-nowrap" style={{ width: 160 }}>Last contact</th>
            <th className="px-3 py-2 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {loading ? (
            <tr>
              <td colSpan={columns.length + 4} className="px-3 py-12 text-center text-foreground/45">
                Loading contacts…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 4} className="px-3 py-12 text-center text-foreground/45">
                No contacts yet. Click <span className="font-semibold">Add contact</span> to start.
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <tr key={c.id} className="align-top hover:bg-warm-bg/40 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}>
                    <ContactCell column={col} contact={c} />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => onContact(c)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 hover:bg-primary/15 transition-colors"
                  >
                    <PhoneIcon />
                    Contact
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <LastContactedBy contact={c} />
                </td>
                <td className="px-3 py-2.5">
                  <LastContactCell contact={c} />
                </td>
                <td className="px-2 py-2.5 text-right">
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
                    />
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

function ActionMenuPortal({
  rect,
  onClose,
  onContact,
  onUpgrade,
}: {
  rect: DOMRect;
  onClose: () => void;
  onContact: () => void;
  onUpgrade: () => void;
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
        onClick={onUpgrade}
        className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5"
      >
        Upgrade to Partner
      </button>
    </div>,
    document.body,
  );
}

function ContactCell({ column, contact }: { column: ColumnDef; contact: Contact }) {
  switch (column.key) {
    case 'name':
      return (
        <div>
          <p className="font-semibold text-foreground">{contact.name}</p>
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/40">From partner</p>
          )}
        </div>
      );
    case 'role':
      return <span className="text-foreground/70">{contact.role || <Em />}</span>;
    case 'phone':
      return contact.phone ? <CopyableCell value={contact.phone} mono /> : <Em />;
    case 'email':
      return contact.email ? <CopyableCell value={contact.email} /> : <Em />;
    case 'location':
      return <span className="text-foreground/65 whitespace-nowrap">{contact.location || <Em />}</span>;
    case 'notes':
      return contact.notes
        ? <span className="text-foreground/75 line-clamp-2 leading-snug max-w-[320px]">{contact.notes}</span>
        : <Em />;
    default:
      return null;
  }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <header className="px-6 py-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{eyebrow}</p>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        {children}
        <style jsx global>{`
          .modal-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: white;
            font-size: 0.875rem;
            color: var(--color-foreground);
          }
          .modal-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(188, 107, 74, 0.15);
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
