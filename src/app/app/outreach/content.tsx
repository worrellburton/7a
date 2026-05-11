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
import { SearchSelectCell } from '@/components/SearchSelectCell';

// ─── Types ──────────────────────────────────────────────────────

type ContactMethod = 'Phone' | 'In Person' | 'Left Message';

type ContactRating = 'Tier 1' | 'Tier 2' | 'Tier 3';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  company_website: string | null;
  rating: ContactRating | null;
  role: string | null;
  phone: string | null;
  phone_cell: string | null;
  phone_office: string | null;
  email: string | null;
  partner_id?: string | null;
  location: string | null;
  // Set when a user picks a place from the autocomplete dropdown.
  // formatted_address is what we display (canonical "City, ST, USA"
  // from Google); place_id pins the row to a stable Google entity;
  // lat / lng / tz drive the map view + local-time label.
  formatted_address?: string | null;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  tz?: string | null;
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
  { key: 'company', label: 'Company' },
  { key: 'website', label: 'Site', align: 'left' },
  { key: 'rating', label: 'Rating' },
  { key: 'role', label: 'Role / Relation' },
  // Single merged "Contact" cell. Renders the cell phone, office
  // phone, email, and pin (location) as four icon buttons in a row.
  // Each carries its own hover popover + click-to-copy / click-to-
  // open-link, and the pin opens the place autocomplete editor.
  { key: 'contact', label: 'Contact' },
  { key: 'notes', label: 'Notes' },
];

const RATING_TONES: Record<ContactRating, string> = {
  'Tier 1': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Tier 2': 'bg-amber-50 text-amber-700 border-amber-200',
  'Tier 3': 'bg-foreground/5 text-foreground/60 border-foreground/15',
};
const RATING_OPTIONS: ContactRating[] = ['Tier 1', 'Tier 2', 'Tier 3'];
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
  company: 180,
  website: 60,
  rating: 110,
  role: 180,
  // Merged "Contact" column — needs room for 4 icons (cell, office,
  // email, pin) plus their hover affordances. 200px keeps them
  // breathing without crowding adjacent columns.
  contact: 200,
  notes: 280,
  actions: 140,
  // Merged engagement column (replaces last_contact_by_name + time_since
  // + last_contact_at). Needs room for avatar + name + method chip +
  // freshness pill on row 1 and the relative + absolute date on row 2.
  last_contact_summary: 320,
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
    case 'company': return c.company || null;
    case 'role': return c.role || null;
    case 'phone': return c.phone || null;
    case 'email': return c.email || null;
    case 'location': return c.location || null;
    // Merged Contact column sorts by location (most useful pivot —
    // groups admissions can read by city / state / time zone). Phone /
    // email aren't great sort keys anyway.
    case 'contact': return c.formatted_address || c.location || null;
    case 'notes': return c.notes || null;
    case 'last_contact_at':
    case 'time_since':
      return c.last_contact_at ? new Date(c.last_contact_at).getTime() : null;
    case 'last_contact_by_name': return c.last_contact_by_name || null;
    // Default sort: any activity on the row (field edit, log-a-contact,
    // notes update) bumps updated_at, so sorting desc on this puts the
    // most-recently-touched row at the top of the grid.
    case 'updated_at':
      return c.updated_at ? new Date(c.updated_at).getTime() : null;
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
  // Table vs Map view-mode toggle. Persisted in the URL via ?view=map
  // so the choice survives refresh + lets admissions bookmark either
  // view directly.
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'map') setViewMode('map');
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (viewMode === 'map') url.searchParams.set('view', 'map');
    else url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  }, [viewMode]);

  // First time the user opens the map view, fire a single backfill
  // round through POST /api/outreach/geocode so legacy rows that have
  // a freeform `location` but no lat/lng get pinned without us
  // shipping a separate "geocode now" button. Capped to 100 rows /
  // call server-side so this is safe to fire eagerly.
  const geocodedThisSessionRef = useRef(false);
  useEffect(() => {
    if (viewMode !== 'map') return;
    if (geocodedThisSessionRef.current) return;
    if (!session?.access_token) return;
    const pending = rows.some((r) => r.location && (r.lat == null || r.lng == null));
    if (!pending) return;
    geocodedThisSessionRef.current = true;
    void fetch('/api/outreach/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      // retry_failed: true so the map view re-attempts any rows that
      // previously came back empty — e.g. when the user first wired
      // up the integration and the Geocoding API wasn't enabled yet.
      // Cheap on quota since most pipelines have far fewer than 100
      // pending rows.
      body: JSON.stringify({ limit: 100, retry_failed: true }),
    }).then(async (r) => {
      if (!r.ok) return;
      // Pull the freshly-geocoded rows back in. Realtime would do this
      // for us too eventually, but the explicit refetch makes the map
      // pop full immediately instead of trickling in pin-by-pin.
      const list = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r2) => (r2.ok ? r2.json() : null)).catch(() => null);
      if (list && Array.isArray((list as { rows?: Contact[] }).rows)) {
        setRows((list as { rows: Contact[] }).rows);
      }
    }).catch(() => { /* silent — map will just show fewer pins */ });
  }, [viewMode, session?.access_token, rows]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [logTarget, setLogTarget] = useState<Contact | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<Contact | null>(null);
  // Click "History" (or the row's expand chevron) toggles an inline
  // details drawer beneath the row. We hold the contact's id rather
  // than the whole contact so realtime row updates flow through to
  // the open drawer automatically.
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
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
  // Default sort: most recent ANY-activity at the top. updated_at is
  // bumped on every contacts-row write (field edits, contact logs,
  // notes saves, optimistic UI from log-a-contact, etc.) so sorting
  // desc on it produces the natural "things that just happened are
  // first" feed admissions expects.
  const [sortKey, setSortKey] = useState<string>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  // "New since you were last here" tracking. seenAt is loaded once on
  // mount from /api/outreach/seen — any contact whose updated_at is
  // greater than seenAt renders highlighted and bubbles to the top of
  // the sort. pageLoadAt is captured at the same time and persisted as
  // the user's new seenAt when they leave the page (visibilitychange /
  // beforeunload), so the highlight survives the rest of this session
  // and clears on the next visit.
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const pageLoadAtRef = useRef<string>(new Date().toISOString());

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

    fetch('/api/outreach/seen', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (r) => (r.ok ? ((await r.json()) as { seen_at: string | null }) : null))
      .then((j) => { if (!cancelled && j) setSeenAt(j.seen_at); })
      .catch(() => { /* not fatal — falls back to no highlights */ });

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
          // Detect when the realtime row introduces a `last_contact_by`
          // that the client doesn't yet have a joined name for. The
          // realtime payload only carries raw columns; without this
          // lookup the cell renders "—" because last_contact_by_name
          // stays null until the next full /api/contacts refetch.
          // public.users.users_select_authenticated allows any signed-
          // in user to SELECT, so we can pull the missing display
          // fields straight from the client.
          setRows((prev) => {
            const ix = prev.findIndex((p) => p.id === row.id);
            const existing = ix === -1 ? null : prev[ix];
            const needsLookup =
              !!row.last_contact_by &&
              (!existing
                || existing.last_contact_by !== row.last_contact_by
                || !existing.last_contact_by_name);
            if (needsLookup) {
              void supabase
                .from('users')
                .select('full_name, avatar_url')
                .eq('id', row.last_contact_by as string)
                .maybeSingle()
                .then(({ data }) => {
                  if (!data) return;
                  const name = (data as { full_name?: string | null }).full_name ?? null;
                  const avatar = (data as { avatar_url?: string | null }).avatar_url ?? null;
                  setRows((cur) => cur.map((r) => (
                    r.id === row.id
                      ? { ...r, last_contact_by_name: name, last_contact_by_avatar_url: avatar }
                      : r
                  )));
                });
            }
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

  // Persist "I just saw this page" when the user navigates away,
  // closes the tab, or backgrounds the tab. We stamp it to the
  // pageLoadAt we captured on mount (not now()) so contacts updated
  // WHILE the user was looking at the page still highlight as "new"
  // on the NEXT visit — which is the natural read of "I haven't
  // seen those yet, they appeared after I opened the page".
  //
  // sendBeacon keeps the POST alive across navigation; the fetch
  // fallback covers browsers that block beacons for non-Blob bodies.
  useEffect(() => {
    if (!session?.access_token) return;
    const token = session.access_token;
    const persist = () => {
      const payload = JSON.stringify({ at: pageLoadAtRef.current });
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const sent = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
          ? navigator.sendBeacon('/api/outreach/seen', blob)
          : false;
        if (sent) return;
      } catch { /* fall through to fetch */ }
      void fetch('/api/outreach/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: payload,
        keepalive: true,
      });
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
      persist();
    };
  }, [session?.access_token]);

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
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.name, r.company, r.company_website, r.role, r.phone, r.phone_cell, r.phone_office, r.email, r.location, r.formatted_address, r.notes]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  // Sorted, deduplicated list of every company string currently in
  // the contacts table. Drives the SearchSelect dropdown on the
  // Company column so admissions picks an existing facility name out
  // of the list — keeps the data clean as multiple contacts at the
  // same partner / referrer org accumulate.
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r.company ?? '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [rows]);

  // Same pattern as companyOptions: seed the Role/Relation dropdown with
  // the canonical PARTNER_TYPES, then union in whatever ad-hoc role
  // strings already exist on rows so legacy values aren't hidden from
  // the picker. SearchSelectCell still allows "+ Add new" so admissions
  // can introduce a fresh role on the fly.
  const roleOptions = useMemo(() => {
    const set = new Set<string>(PARTNER_TYPES);
    for (const r of rows) {
      const v = (r.role ?? '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [rows]);

  // Headline counts for the insight tiles at the top of the page.
  // Always computed against the unfiltered `rows` (not the filtered
  // view) because the tiles describe the whole pipeline, not what's
  // currently visible after a search/method/freshness filter.
  const insights = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    let week = 0;
    let month = 0;
    let total = 0;
    let never = 0;
    for (const r of rows) {
      if (!r.last_contact_at) { never += 1; continue; }
      total += 1;
      const age = now - new Date(r.last_contact_at).getTime();
      if (age <= weekMs) week += 1;
      if (age <= monthMs) month += 1;
    }
    return { week, month, total, never };
  }, [rows]);

  // Helper used by both the sort and the row renderer: a contact is
  // "new" to this user iff updated_at is strictly newer than the
  // user's stored last_outreach_seen_at. seenAt = null means the user
  // has never visited the page before — in that case we don't flood
  // them with highlights on every row, so we treat null as "infinitely
  // recent" (nothing is new yet).
  const isNewToUser = useMemo(() => {
    if (!seenAt) return (_c: Contact) => false;
    const seenMs = new Date(seenAt).getTime();
    return (c: Contact) => new Date(c.updated_at).getTime() > seenMs;
  }, [seenAt]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      // Brand-new-since-last-visit rows always bubble to the very
      // top regardless of the active column sort, so admissions can
      // see the day's changes first.
      const aNew = isNewToUser(a);
      const bNew = isNewToUser(b);
      if (aNew !== bNew) return aNew ? -1 : 1;

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
  }, [filtered, sortKey, sortDir, isNewToUser]);

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

  async function handleLogContact(target: Contact, method: ContactMethod, comments: string, transcript: string, durationSeconds: number) {
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
      body: JSON.stringify({ method, comments, transcript, duration_seconds: durationSeconds }),
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
  async function handleSaveField(id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) {
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

  // Multi-field save used by interactions that touch more than one
  // column at once: the PlaceAutocomplete dropdown stores location +
  // formatted_address + place_id + tz + lat + lng in a single click;
  // the Company cell saves company_website alongside company. Same
  // optimistic-update + PATCH pattern as handleSaveField, just with
  // a generic patch object.
  async function handleSavePatch(id: string, patch: Partial<Contact>) {
    if (!session?.access_token) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(patch),
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
          <h1 className="text-base font-semibold text-foreground tracking-tight">Outreach</h1>
          <p className="text-[13px] text-foreground/55 mt-0.5">
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

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <InsightTile label="Contacted this week" value={insights.week} tone="fresh" />
        <InsightTile label="Contacted this month" value={insights.month} tone="cooling" />
        <InsightTile label="Total contacted" value={insights.total} tone="neutral" />
        <InsightTile label="Never contacted" value={insights.never} tone="stale" />
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, notes…"
            className="w-full pl-9 pr-3 py-2.5 sm:py-2 rounded-lg border border-black/10 bg-white text-[13px] sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35">
            <SearchIcon />
          </span>
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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
      )}

      {/* View-mode tabs sit on top of the table card so the toggle
          stays in muscle-memory regardless of which view is active.
          Insights tiles + search bar above remain visible in both
          views — they describe the underlying data, not the render. */}
      <div className="hidden md:flex items-center gap-1 mb-2 border-b border-black/10">
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`relative px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${viewMode === 'table' ? 'text-foreground' : 'text-foreground/45 hover:text-foreground/70'}`}
          aria-pressed={viewMode === 'table'}
        >
          Table
          {viewMode === 'table' && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-t" />}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`relative px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${viewMode === 'map' ? 'text-foreground' : 'text-foreground/45 hover:text-foreground/70'}`}
          aria-pressed={viewMode === 'map'}
        >
          Map
          {viewMode === 'map' && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-t" />}
        </button>
      </div>

      {viewMode === 'map' ? (
        <ContactsMapView
          contacts={sorted}
          onLogContact={(c) => setLogTarget(c)}
          onOpenDetails={(c) => {
            setViewMode('table');
            setExpandedDetailsId(c.id);
          }}
        />
      ) : (
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
        onHistory={(c) => setExpandedDetailsId((prev) => (prev === c.id ? null : c.id))}
        expandedDetailsId={expandedDetailsId}
        accessToken={session?.access_token ?? null}
        onOpenLog={(c) => setLogTarget(c)}
        isNewToUser={isNewToUser}
        onDelete={(c) => handleDelete(c)}
        onSaveNotes={handleSaveNotes}
        onSaveField={handleSaveField}
        onSavePatch={handleSavePatch}
        companyOptions={companyOptions}
        roleOptions={roleOptions}
        actionMenuFor={actionMenuFor}
        setActionMenuFor={setActionMenuFor}
        columnWidths={columnWidths}
        onResizeColumn={(key, w) => setColumnWidths((prev) => ({ ...prev, [key]: Math.round(w) }))}
        onCommitColumnWidth={(key, w) => { void persistColumnWidth(key, w); }}
        onResizeStart={() => { resizingRef.current = true; }}
        onResizeEnd={() => { resizingRef.current = false; }}
      />
      )}

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
          onSubmit={(method, comments, transcript, durationSeconds) => handleLogContact(logTarget, method, comments, transcript, durationSeconds)}
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
      <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 mb-1.5">Notes</p>
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
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[12px] text-foreground/85 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void commit()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-white text-foreground/70 text-[11px] font-semibold border border-black/10 hover:bg-warm-bg/60 transition-colors"
        >
          Cancel
        </button>
        <span className="ml-auto text-[10px] text-foreground/40">⌘↵ saves · Esc cancels</span>
      </div>
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────

// Lazy-load Google Maps JS once across the app and cache the promise so
// repeat mounts of the map view don't kick off a second <script>. The
// `marker` library carries AdvancedMarkerElement but we use the classic
// Marker too (still works on the latest weekly channel and doesn't
// require a mapId in GCP). Returns the loaded `google` namespace.
// Loose type — Google Maps doesn't ship in our dependency tree and
// pulling @types/google.maps just for the few methods the map view
// touches would be overkill. Every call site treats the namespace as
// unknown and either type-guards (typeof, in) or casts narrowly.
type GoogleNamespace = { maps?: unknown } | undefined;
let mapsLoadPromise: Promise<GoogleNamespace> | null = null;
function getGoogle(): GoogleNamespace {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { google?: GoogleNamespace }).google;
}
function loadGoogleMaps(apiKey: string): Promise<GoogleNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  const existingGoogle = getGoogle();
  if (existingGoogle && existingGoogle.maps) return Promise.resolve(existingGoogle);
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps-loader]') as HTMLScriptElement | null;
    const handle = (s: HTMLScriptElement) => {
      s.addEventListener('load', () => {
        const g = getGoogle();
        if (g && g.maps) resolve(g);
        else reject(new Error('Maps JS loaded but window.google missing'));
      });
      s.addEventListener('error', () => reject(new Error('Failed to load Google Maps JS')));
    };
    if (existing) { handle(existing); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    handle(script);
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

// Outreach map view. Renders contacts with lat/lng as classic Google
// markers on a US-centred map; click a marker to open a side panel
// with the contact's contact-card info + jump-to-table affordance.
// Contacts without lat/lng land in a "not on map" footer with a hint
// to add a Location via the autocomplete cell so they show up.
function ContactsMapView({
  contacts,
  onLogContact,
  onOpenDetails,
}: {
  contacts: Contact[];
  onLogContact: (c: Contact) => void;
  onOpenDetails: (c: Contact) => void;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);

  const mapped = useMemo(
    () => contacts.filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number'),
    [contacts],
  );
  const unmappedCount = contacts.length - mapped.length;

  // Load the JS API + initialise the map once.
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      || process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
      || '';
    if (!apiKey) {
      setError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in this environment. Set the env var (Maps JavaScript API enabled on the Google Cloud project) and reload to see the map.');
      return;
    }
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !mapEl.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Map = (g as any).maps.Map;
        const map = new Map(mapEl.current, {
          center: { lat: 39.5, lng: -98.35 },
          zoom: 4,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return () => { cancelled = true; };
  }, []);

  // Reconcile markers whenever the contact set changes.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = getGoogle();
    if (!g?.maps) return;

    // Clear existing
    for (const m of markersRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any).setMap?.(null);
    }
    markersRef.current = [];

    if (mapped.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bounds = new (g.maps as any).LatLngBounds();
    for (const c of mapped) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (g.maps as any).Marker({
        position: { lat: c.lat as number, lng: c.lng as number },
        map: mapRef.current,
        title: c.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animation: (g.maps as any).Animation?.DROP,
      });
      marker.addListener('click', () => setSelected(c));
      markersRef.current.push(marker);
      bounds.extend({ lat: c.lat as number, lng: c.lng as number });
    }
    // Auto-fit if we have more than one pin; for a single pin keep the
    // US-wide zoom (single-pin fitBounds maxes out the zoom which feels
    // jarring).
    if (mapped.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any).fitBounds(bounds, 80);
    }
  }, [ready, mapped]);

  return (
    <div className="relative rounded-xl border border-black/10 bg-white overflow-hidden">
      {error ? (
        <div className="px-5 py-12 text-center text-[13px] text-foreground/55 whitespace-pre-wrap">
          {error}
        </div>
      ) : (
        <>
          <div ref={mapEl} className="w-full h-[640px]" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-[12px] text-foreground/55">
              Loading map…
            </div>
          )}
          {/* Side panel for the currently selected pin. */}
          {selected && (
            <div className="absolute top-3 right-3 w-72 rounded-xl border border-black/10 bg-white shadow-xl overflow-hidden">
              <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-black/5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{selected.name}</p>
                  {selected.company && (
                    <p className="text-[11px] text-foreground/65 truncate">{selected.company}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded text-foreground/40 hover:text-foreground hover:bg-warm-bg/60"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="px-3 py-2 space-y-1.5 text-[11.5px] text-foreground/75">
                {selected.role && <p><span className="text-foreground/40">Role:</span> {selected.role}</p>}
                {(selected.formatted_address || selected.location) && (
                  <p><span className="text-foreground/40">Location:</span> {selected.formatted_address || selected.location}</p>
                )}
                {selected.phone && <p><span className="text-foreground/40">Phone:</span> {selected.phone}</p>}
                {selected.email && <p className="truncate"><span className="text-foreground/40">Email:</span> {selected.email}</p>}
                {selected.tz && (() => {
                  const lt = localTimeInTz(selected.tz);
                  return lt ? <p><span className="text-foreground/40">Local time:</span> {lt.label}{lt.abbr ? ` · ${lt.abbr}` : ''}</p> : null;
                })()}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => onLogContact(selected)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  <PhoneIcon />
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDetails(selected)}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-white text-foreground/70 text-[10px] font-semibold border border-black/10 hover:bg-warm-bg/60 transition-colors"
                >
                  Open details
                </button>
              </div>
            </div>
          )}
          {/* Unmapped footer pill. */}
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-black/10 shadow-sm text-[10.5px]">
            <span className="font-semibold text-foreground">{mapped.length}</span>
            <span className="text-foreground/55">on map</span>
            {unmappedCount > 0 && (
              <>
                <span className="text-foreground/25">·</span>
                <span className="font-semibold text-foreground/70">{unmappedCount}</span>
                <span className="text-foreground/55">missing location</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
  onSavePatch,
  actionMenuFor,
  setActionMenuFor,
  columnWidths,
  onResizeColumn,
  onCommitColumnWidth,
  onResizeStart,
  onResizeEnd,
  expandedDetailsId,
  accessToken,
  onOpenLog,
  isNewToUser,
  companyOptions,
  roleOptions,
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
  onSaveField: (id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
  onSavePatch: (id: string, patch: Partial<Contact>) => Promise<void>;
  actionMenuFor: { id: string; rect: DOMRect } | null;
  setActionMenuFor: (v: { id: string; rect: DOMRect } | null) => void;
  columnWidths: Record<string, number>;
  onResizeColumn: (key: string, widthPx: number) => void;
  onCommitColumnWidth: (key: string, widthPx: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  expandedDetailsId: string | null;
  accessToken: string | null;
  onOpenLog: (c: Contact) => void;
  isNewToUser: (c: Contact) => boolean;
  companyOptions: string[];
  roleOptions: string[];
}) {
  // Tracks the row whose notes-editor strip is currently expanded.
  // Click the notes cell to toggle. Persists across rerenders via a
  // simple id string; null when collapsed.
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  // Trailing columns the user can't reorder/hide: Actions + the merged
  // Last Contact summary + the action-menu expander. Was 5 (Actions,
  // Last Contacted By, Time Since, Last Contact, expander); now 3
  // since the three engagement columns folded into LastContactSummaryCell.
  const totalCols = columns.length + 3;

  // All three trailing columns (Actions, Last Contact summary, and the
  // expander) are sticky to the right edge of the scrollable table.
  // Their right offsets stack: expander hugs right: 0, summary sits to
  // its left, Actions sits to the left of the summary. The summary width
  // is user-resizable so we read it from the live columnWidths map.
  const summaryWidth = columnWidths['last_contact_summary'] ?? DEFAULT_COL_WIDTHS_PX['last_contact_summary'];
  const actionsStickyRightPx = EXPANDER_COL_WIDTH_PX + summaryWidth;

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
        <table className="w-full text-[13px] table-fixed">
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
          {(['actions', 'last_contact_summary'] as const).map((k) => {
            const w = columnWidths[k] ?? DEFAULT_COL_WIDTHS_PX[k];
            return <col key={k} style={{ width: `${w}px` }} />;
          })}
          <col style={{ width: `${EXPANDER_COL_WIDTH_PX}px` }} />
        </colgroup>
        <thead className="bg-warm-bg/50 text-left text-[10px] uppercase tracking-wider text-foreground/55">
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
                      className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-foreground/10 text-foreground/65 text-[9px] font-bold tabular-nums"
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
            {/* Trailing fixed columns — pinned to the far right of the
                grid no matter how the user reorders/hides the dynamic
                left-side columns. Order:
                  1. Actions (Contact + History buttons)
                  2. Last contact summary (avatar + name + method +
                     freshness pill + relative + absolute date — rolled
                     up from the old Last Contacted By / Time Since /
                     Last Contact trio)
                  3. Action-menu expander (3-dot) */}
            <th
              data-col-key="actions"
              style={{ right: `${actionsStickyRightPx}px` }}
              className="group/th sticky z-20 bg-[#faf8f5]/70 backdrop-blur-md backdrop-saturate-150 border-l border-white/40 shadow-[-8px_0_16px_-12px_rgba(0,0,0,0.18)] px-3 py-2 whitespace-nowrap"
            >
              <span className="truncate">Actions</span>
              <ResizeHandle colKey="actions" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th
              data-col-key="last_contact_summary"
              onClick={() => onSort('last_contact_at')}
              className="group/th sticky right-10 z-20 bg-[#faf8f5]/70 backdrop-blur-md backdrop-saturate-150 border-l border-white/40 shadow-[-8px_0_16px_-12px_rgba(0,0,0,0.18)] px-3 py-2 whitespace-nowrap select-none cursor-pointer hover:text-foreground/80"
            >
              <span className="inline-flex items-center gap-1 truncate">
                Contact history
                <SortIndicator active={sortKey === 'last_contact_at'} dir={sortDir} />
              </span>
              <ResizeHandle colKey="last_contact_summary" onResize={onResizeColumn} onCommit={onCommitColumnWidth} onStart={onResizeStart} onEnd={onResizeEnd} />
            </th>
            <th className="sticky right-0 z-20 bg-[#faf8f5]/70 backdrop-blur-md backdrop-saturate-150 px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {loading ? (
            <tr>
              <td colSpan={totalCols} className="px-3 py-12 text-center text-foreground/45">
                Loading contacts…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-3 py-12 text-center text-foreground/45">
                No contacts yet. Click <span className="font-semibold">Add contact</span> to start.
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <Fragment key={c.id}>
              <tr className={`group align-top transition-colors ${isNewToUser(c) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-warm-bg/40'}`}>
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
                            <span className="text-foreground/30 italic text-[11px]">Add notes…</span>
                          )}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}>
                      <ContactCell column={col} contact={c} onSaveField={onSaveField} onSavePatch={onSavePatch} isNew={isNewToUser(c)} companyOptions={companyOptions} roleOptions={roleOptions} />
                    </td>
                  );
                })}
                <td
                  style={{ right: `${actionsStickyRightPx}px` }}
                  className={`sticky z-10 backdrop-blur-md backdrop-saturate-150 border-l border-white/40 shadow-[-8px_0_16px_-12px_rgba(0,0,0,0.18)] px-3 py-2.5 transition-colors ${isNewToUser(c) ? 'bg-[#fbf2ed]/72 group-hover:bg-[#f7e8df]/85' : 'bg-white/65 group-hover:bg-white/85'}`}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onContact(c)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20 hover:bg-primary/15 transition-colors"
                    >
                      <PhoneIcon />
                      Contact
                    </button>
                  </div>
                </td>
                <td className={`sticky right-10 z-10 backdrop-blur-md backdrop-saturate-150 border-l border-white/40 shadow-[-8px_0_16px_-12px_rgba(0,0,0,0.18)] px-3 py-2.5 transition-colors ${isNewToUser(c) ? 'bg-[#fbf2ed]/72 group-hover:bg-[#f7e8df]/85' : 'bg-white/65 group-hover:bg-white/85'}`}>
                  <button
                    type="button"
                    onClick={() => onHistory(c)}
                    className="flex w-full items-start justify-between gap-2 text-left rounded-md px-1 -mx-1 hover:bg-warm-bg/60 transition-colors"
                    title={expandedDetailsId === c.id ? 'Hide history' : 'Show contact history'}
                    aria-expanded={expandedDetailsId === c.id}
                  >
                    <span className="min-w-0 flex-1">
                      <LastContactSummaryCell contact={c} />
                    </span>
                    <span
                      className={`shrink-0 mt-1 inline-flex items-center justify-center w-6 h-6 rounded-md border transition-all ${expandedDetailsId === c.id ? 'bg-foreground text-white border-foreground rotate-180' : 'bg-white text-foreground/55 border-black/10'}`}
                      aria-hidden
                    >
                      <ChevronDownIcon />
                    </span>
                  </button>
                </td>
                <td className={`sticky right-0 z-10 backdrop-blur-md backdrop-saturate-150 px-2 py-2.5 text-right transition-colors ${isNewToUser(c) ? 'bg-[#fbf2ed]/72 group-hover:bg-[#f7e8df]/85' : 'bg-white/65 group-hover:bg-white/85'}`}>
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
                      hasPartner={!!c.partner_id}
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
              {expandedDetailsId === c.id && (
                <tr className="bg-warm-bg/30">
                  <td colSpan={totalCols} className="px-4 py-4">
                    <ContactDetailsDrawer
                      contact={c}
                      accessToken={accessToken}
                      onLogContact={() => onOpenLog(c)}
                      onClose={() => onHistory(c)}
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
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[13px] text-foreground/45">
            Loading contacts…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[13px] text-foreground/45">
            No contacts yet. Tap <span className="font-semibold">Add contact</span> to start.
          </div>
        ) : (
          rows.map((c) => (
            <ContactMobileCard
              key={c.id}
              contact={c}
              expanded={expandedDetailsId === c.id}
              accessToken={accessToken}
              onContact={() => onContact(c)}
              onUpgrade={() => onUpgrade(c)}
              onHistory={() => onHistory(c)}
              onOpenLog={() => onOpenLog(c)}
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
  hasPartner,
  onClose,
  onContact,
  onUpgrade,
  onHistory,
  onDelete,
}: {
  rect: DOMRect;
  // When true, the contact already has a partner record attached, so
  // we hide the "Add partner" affordance (a second attach would 409
  // on the API). Removal is done from the partnerships side.
  hasPartner: boolean;
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
      {!hasPartner && (
        <button
          role="menuitem"
          onClick={onUpgrade}
          className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5"
        >
          Add partner
        </button>
      )}
      {hasPartner && (
        <div className="block px-3 py-2 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50/40">
          ● Linked partner
        </div>
      )}
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
        className={`pointer-events-none absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap text-foreground/85 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 ring-1 ring-black/5 shadow-[0_8px_22px_-10px_rgba(60,48,42,0.35)] transition-all duration-200 ease-out ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
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
  onSavePatch,
  isNew = false,
  companyOptions = [],
  roleOptions = [],
}: {
  column: ColumnDef;
  contact: Contact;
  onSaveField: (id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
  onSavePatch: (id: string, patch: Partial<Contact>) => Promise<void>;
  isNew?: boolean;
  companyOptions?: string[];
  roleOptions?: string[];
}) {
  const save = (field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location') => (next: string) =>
    onSaveField(contact.id, field, next);
  switch (column.key) {
    case 'name':
      return (
        <div>
          <div className="flex items-center gap-1.5 min-w-0">
            <EditableTextCell
              value={contact.name}
              onSave={save('name')}
              className="font-semibold text-foreground whitespace-nowrap min-w-0"
              placeholder="Add name…"
            />
            {isNew && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-foreground/40 whitespace-nowrap">From partner</p>
          )}
        </div>
      );
    case 'company':
      return (
        <SearchSelectCell
          value={contact.company}
          options={companyOptions}
          onSave={(next) => onSaveField(contact.id, 'company', next ?? '')}
          placeholder="Add company…"
        />
      );
    case 'website':
      return (
        <WebsiteCell
          value={contact.company_website}
          onSave={(url) => onSavePatch(contact.id, { company_website: url.trim() || null })}
        />
      );
    case 'rating':
      return (
        <RatingCell
          value={contact.rating}
          onSave={(next) => onSavePatch(contact.id, { rating: next })}
        />
      );
    case 'role':
      return (
        <SearchSelectCell
          value={contact.role}
          options={roleOptions}
          onSave={(next) => onSaveField(contact.id, 'role', next ?? '')}
          placeholder="Add role…"
        />
      );
    case 'contact':
      return (
        <div className="inline-flex items-center gap-0.5">
          <IconCopyCell
            value={contact.phone_cell ?? contact.phone}
            onSave={save('phone_cell')}
            kind="cell"
            emptyLabel="Add cell number…"
            tz={contact.tz}
          />
          <IconCopyCell
            value={contact.phone_office}
            onSave={save('phone_office')}
            kind="office"
            emptyLabel="Add office number…"
            tz={contact.tz}
          />
          <IconCopyCell
            value={contact.email}
            onSave={save('email')}
            kind="email"
            emptyLabel="Add email…"
          />
          <PlaceAutocompleteCell
            contact={contact}
            onSavePlace={(patch) => onSavePatch(contact.id, patch)}
            iconOnly
          />
        </div>
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
        className={`w-full min-w-0 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${mono ? 'font-mono tabular-nums' : ''}`}
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
        <span className="text-foreground/30 italic text-[11px]">{placeholder ?? 'Click to add'}</span>
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

function InsightTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'fresh' | 'cooling' | 'stale' | 'neutral';
}) {
  const toneCx =
    tone === 'fresh' ? 'text-emerald-700 bg-emerald-50/60 border-emerald-200/70' :
    tone === 'cooling' ? 'text-amber-700 bg-amber-50/60 border-amber-200/70' :
    tone === 'stale' ? 'text-rose-700 bg-rose-50/60 border-rose-200/70' :
    'text-foreground/85 bg-warm-bg/50 border-black/10';
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneCx}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70 truncate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums leading-none">{value.toLocaleString()}</p>
    </div>
  );
}

// Designed instant-hover popover used by the Phone / Email icon cells.
// Native browser title="..." has a ~700ms delay before it appears and
// renders as the OS default styling; admissions wants the phone number
// / email address legible the moment they mouse over the icon, with
// a quick pop-in animation. We render via a portal at viewport-fixed
// coordinates so the popover isn't clipped by the table's overflow.
function HoverPopover({
  value,
  copied,
  subtitle,
  children,
}: {
  value: string;
  copied: boolean;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);

  function enter() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setRect({ left: r.left + r.width / 2, top: r.top });
    }
    setHovering(true);
  }
  function leave() { setHovering(false); }

  return (
    <span
      ref={triggerRef}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="inline-flex"
    >
      {children}
      {hovering && rect && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={{ left: rect.left, top: rect.top - 6 }}
          className="fixed z-[1000] pointer-events-none -translate-x-1/2 -translate-y-full"
        >
          <div className="tooltip-pop-in relative">
            <div className="whitespace-nowrap rounded-md bg-foreground text-white text-[10.5px] font-semibold px-2.5 py-1 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span>{value}</span>
                <span className="text-white/55 font-medium">{copied ? 'copied' : 'click to copy'}</span>
              </div>
              {subtitle && (
                <div className="mt-0.5 text-[9px] font-medium text-white/70">
                  {subtitle}
                </div>
              )}
            </div>
            <span className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}

type IconCellKind = 'phone' | 'cell' | 'office' | 'email';
function IconForKind({ kind }: { kind: IconCellKind }) {
  switch (kind) {
    case 'phone': return <PhoneIcon />;
    case 'cell': return <CellPhoneIcon />;
    case 'office': return <OfficePhoneIcon />;
    case 'email': return <EmailIcon />;
  }
}
function IconCopyCell({
  value,
  onSave,
  kind,
  emptyLabel,
  tz,
}: {
  value: string | null | undefined;
  onSave: (next: string) => Promise<void> | void;
  kind: IconCellKind;
  emptyLabel: string;
  // IANA timezone id (e.g. "America/Phoenix"). When set on a phone /
  // cell / office cell, the hover popover gains a "Local: 9:03 AM MST"
  // subtitle so admissions can see whether it's a polite hour to dial
  // before they actually pick up the phone.
  tz?: string | null;
}) {
  const isPhone = kind === 'phone' || kind === 'cell' || kind === 'office';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next !== (value ?? '').trim()) await onSave(next);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={isPhone ? 'tel' : 'email'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(value ?? ''); setEditing(false); }
        }}
        className={`w-full min-w-0 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 ${isPhone ? 'font-mono tabular-nums' : ''}`}
      />
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title={emptyLabel}
        aria-label={emptyLabel}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-warm-bg/60 transition-colors"
      >
        <IconForKind kind={kind} />
      </button>
    );
  }

  const kindLabel = kind === 'cell' ? 'cell' : kind === 'office' ? 'office' : kind;
  return (
    <div className="group/icc inline-flex items-center gap-1">
      <HoverPopover
        value={value}
        copied={copied}
        subtitle={isPhone ? (() => {
          const lt = localTimeInTz(tz);
          const labelPrefix = kind === 'cell' ? 'Cell · ' : kind === 'office' ? 'Office · ' : '';
          if (lt) return `${labelPrefix}Local: ${lt.label}${lt.abbr ? ` · ${lt.abbr}` : ''}`;
          return labelPrefix ? labelPrefix.replace(/ · $/, '') : undefined;
        })() : undefined}
      >
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch { /* clipboard blocked — silent */ }
          }}
          aria-label={`Copy ${kindLabel} — ${value}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/75 hover:text-foreground hover:bg-warm-bg transition-colors"
        >
          {copied ? <CheckIcon /> : <IconForKind kind={kind} />}
        </button>
      </HoverPopover>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Edit"
        aria-label="Edit"
        className="opacity-0 group-hover/icc:opacity-100 transition-opacity inline-flex items-center justify-center w-5 h-5 rounded text-foreground/35 hover:text-foreground/70"
      >
        <PencilIcon />
      </button>
    </div>
  );
}

// Standalone external-link icon for the new Website column. When the
// row has a company_website saved, the cell shows the globe icon as a
// clickable link with a hover popover revealing the full URL. Empty
// cells render a faded plus-globe affordance that flips to an inline
// URL input on click — same pattern as the empty-state phone / email
// icons elsewhere in the grid.
function WebsiteCell({
  value,
  onSave,
}: {
  value: string | null | undefined;
  onSave: (next: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  async function commit() {
    setEditing(false);
    if (draft.trim() !== (value ?? '').trim()) await onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(value ?? ''); setEditing(false); }
        }}
        placeholder="https://example.com"
        className="w-44 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    );
  }

  const href = value ? normaliseUrl(value) : null;
  if (!href) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Add website"
        aria-label="Add website"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-warm-bg/60 transition-colors"
      >
        <GlobeIcon />
      </button>
    );
  }

  return (
    <div className="group/web inline-flex items-center gap-1">
      <HoverPopover value={value ?? ''} copied={false}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${value} in a new tab`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/75 hover:text-primary hover:bg-warm-bg transition-colors"
        >
          <ExternalLinkIcon />
        </a>
      </HoverPopover>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Edit"
        aria-label="Edit"
        className="opacity-0 group-hover/web:opacity-100 transition-opacity inline-flex items-center justify-center w-5 h-5 rounded text-foreground/35 hover:text-foreground/70"
      >
        <PencilIcon />
      </button>
    </div>
  );
}

// Tier 1 / Tier 2 / Tier 3 pill that flips to a small popup with the
// three options + a Clear row. Portal-rendered at the trigger's
// viewport rect so the popup escapes the table's overflow-x-auto
// clipping context (same trick as HoverPopover).
function RatingCell({
  value,
  onSave,
}: {
  value: ContactRating | null;
  onSave: (next: ContactRating | null) => Promise<void> | void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4 });
    }
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const triggerCx = value
    ? RATING_TONES[value]
    : 'bg-foreground/5 text-foreground/45 border-foreground/15';
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${triggerCx} ${value === 'Tier 1' ? 'sa-tier1-premium' : ''}`}
        title={value ? `Rating: ${value}` : 'Set rating'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {value === 'Tier 1' && <span aria-hidden className="text-amber-500">★</span>}
        {value ?? '— Set tier —'}
        <ChevronDownIcon />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-[1000] w-36 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden tooltip-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          {RATING_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); void onSave(t); }}
              className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] font-semibold hover:bg-warm-bg/60 transition-colors ${value === t ? 'text-foreground' : 'text-foreground/70'}`}
            >
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${RATING_TONES[t]} ${t === 'Tier 1' ? 'sa-tier1-premium' : ''}`}>
                {t === 'Tier 1' && <span aria-hidden className="text-amber-500">★</span>}
                {t}
              </span>
              {value === t && <CheckIcon />}
            </button>
          ))}
          {value && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); void onSave(null); }}
              className="block w-full px-2.5 py-1.5 text-left text-[10.5px] text-rose-700 hover:bg-rose-50 border-t border-black/5"
            >
              Clear rating
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

// Coerce a freeform URL ("seven-arrows.com", "http://x.com", etc.) into
// an https:// link safe to drop into href / window.open. Leaves valid
// http/https URLs alone, rejects anything that doesn't parse so we
// don't accidentally render a javascript: link from bad input.
function normaliseUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Inline editor + external-link affordance for the Company column.
// Click the company name to edit in place; click the globe icon (or the
// "+ Add website" affordance when there isn't one yet) to open the
// website in a new tab / drop a URL onto the row.
function CompanyCell({
  contact,
  onSaveCompany,
  onSaveWebsite,
}: {
  contact: Contact;
  onSaveCompany: (next: string) => Promise<void> | void;
  onSaveWebsite: (next: string) => Promise<void> | void;
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [draftUrl, setDraftUrl] = useState(contact.company_website ?? '');
  const urlRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (!editingUrl) setDraftUrl(contact.company_website ?? ''); }, [contact.company_website, editingUrl]);
  useEffect(() => { if (editingUrl) { urlRef.current?.focus(); urlRef.current?.select(); } }, [editingUrl]);

  const href = contact.company_website ? normaliseUrl(contact.company_website) : null;

  return (
    <div className="group/co inline-flex items-center gap-1 min-w-0">
      <EditableTextCell
        value={contact.company}
        onSave={onSaveCompany}
        className="text-foreground/75 whitespace-nowrap"
        placeholder="Add company…"
      />
      {contact.company && !editingUrl && (
        href ? (
          <HoverPopover value={contact.company_website ?? ''} copied={false}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open ${contact.company_website} in a new tab`}
              className="inline-flex items-center justify-center w-5 h-5 rounded text-foreground/45 hover:text-primary hover:bg-warm-bg/60 transition-colors"
            >
              <ExternalLinkIcon />
            </a>
          </HoverPopover>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditingUrl(true); }}
            title="Add company website"
            aria-label="Add company website"
            className="opacity-0 group-hover/co:opacity-100 transition-opacity inline-flex items-center justify-center w-5 h-5 rounded text-foreground/35 hover:text-foreground/70"
          >
            <GlobeIcon />
          </button>
        )
      )}
      {contact.company && editingUrl && (
        <input
          ref={urlRef}
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => { setEditingUrl(false); void onSaveWebsite(draftUrl); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); setEditingUrl(false); void onSaveWebsite(draftUrl); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditingUrl(false); }
          }}
          placeholder="https://example.com"
          className="w-44 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}
    </div>
  );
}

// Place autocomplete for the Location column. Types into the input
// debounce-hits /api/outreach/place-autocomplete; clicking a suggestion
// hits /api/outreach/place-details, which returns formatted_address +
// lat / lng + IANA tz. We save all four (plus place_id and the raw
// `location` string as a redundant fallback for legacy reads) in one
// PATCH via onSavePlace so the row gets pinned on the map AND gets a
// timezone for the phone popover in a single click.
interface PlaceSuggestion {
  place_id: string;
  description: string;
  main: string;
  secondary: string;
}
function PlaceAutocompleteCell({
  contact,
  onSavePlace,
  iconOnly = false,
}: {
  contact: Contact;
  onSavePlace: (patch: Partial<Contact>) => Promise<void> | void;
  // When true, the collapsed state renders as just a pin icon (no
  // address text) so the cell fits inside the merged "Contact"
  // column alongside the phone / email icons. Hovering the pin
  // shows the full address via the same HoverPopover the phone
  // icons use.
  iconOnly?: boolean;
}) {
  const display = contact.formatted_address || contact.location || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // Where to anchor the portal-rendered dropdown — read off the input
  // wrapper's bounding rect when we open. Kept in state so re-renders
  // while editing don't lose the anchor position.
  const [dropRect, setDropRect] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => { if (!editing) setDraft(display); }, [display, editing]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      if (wrapperRef.current) {
        const r = wrapperRef.current.getBoundingClientRect();
        setDropRect({ left: r.left, top: r.bottom + 4, width: r.width });
      }
    } else {
      setSuggestions([]);
      setDropRect(null);
    }
  }, [editing]);

  // Close on outside click — the dropdown lives in a portal so we
  // check BOTH the wrapper (input) and the dropdown for the click
  // target before closing. Without the dropdown-ref check, clicking
  // a suggestion would close the dropdown before its mousedown fired.
  useEffect(() => {
    if (!editing) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setEditing(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [editing]);

  function onDraftChange(next: string) {
    setDraft(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (next.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/outreach/place-autocomplete?input=${encodeURIComponent(next)}`);
        if (!res.ok) { setSuggestions([]); return; }
        const json = (await res.json()) as { suggestions?: PlaceSuggestion[] };
        setSuggestions(json.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }

  async function pick(s: PlaceSuggestion) {
    setResolving(true);
    try {
      const res = await fetch(`/api/outreach/place-details?place_id=${encodeURIComponent(s.place_id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        place_id?: string;
        formatted_address?: string | null;
        lat?: number | null;
        lng?: number | null;
        tz?: string | null;
      };
      await onSavePlace({
        location: json.formatted_address ?? s.description,
        formatted_address: json.formatted_address ?? s.description,
        place_id: json.place_id ?? s.place_id,
        tz: json.tz ?? null,
        lat: json.lat ?? null,
        lng: json.lng ?? null,
      });
      setEditing(false);
    } finally {
      setResolving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="group/loc inline-flex items-center gap-1.5 max-w-full rounded-md px-1 -mx-1 py-0.5 cursor-text hover:bg-warm-bg/60 transition-colors"
        title={contact.tz ? `${display} · ${contact.tz}` : (display || 'Add location')}
      >
        {display ? (
          <>
            <PinIcon />
            <span className="text-foreground/65 whitespace-nowrap truncate">{display}</span>
          </>
        ) : (
          <span className="text-foreground/30 italic text-[11px]">Add location…</span>
        )}
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          else if (e.key === 'Enter' && suggestions[0]) { e.preventDefault(); void pick(suggestions[0]); }
        }}
        placeholder="Search a city, state, or address…"
        className="w-full min-w-0 rounded-md border border-primary/40 bg-white px-1.5 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {/* Suggestions render in a portal so the table's overflow-x-auto
          (which implicitly clips overflow-y) doesn't hide them, AND so
          their clicks aren't captured by the row's own click handlers. */}
      {dropRect && (loading || resolving || suggestions.length > 0) && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{ left: dropRect.left, top: dropRect.top, width: Math.max(260, dropRect.width) }}
          className="fixed z-[1000] rounded-lg border border-black/10 bg-white shadow-xl overflow-hidden tooltip-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          {resolving ? (
            <div className="px-3 py-2 text-[11px] text-foreground/55">Saving location…</div>
          ) : loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-foreground/55">Searching…</div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); void pick(s); }}
                className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-warm-bg/60 transition-colors"
              >
                <span className="mt-0.5 text-foreground/40 shrink-0"><PinIcon /></span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-foreground truncate">{s.main}</span>
                  {s.secondary && <span className="block text-[10.5px] text-foreground/55 truncate">{s.secondary}</span>}
                </span>
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Compute current local time + short tz abbreviation in a contact's
// IANA timezone. Returns null if the tz is missing or unparseable.
function localTimeInTz(tz: string | null | undefined): { label: string; abbr: string } | null {
  if (!tz) return null;
  try {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(now);
    const abbr = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return { label: time, abbr };
  } catch {
    return null;
  }
}

function ContactMobileCard({
  contact,
  expanded,
  accessToken,
  onContact,
  onUpgrade,
  onHistory,
  onOpenLog,
  onDelete,
}: {
  contact: Contact;
  expanded: boolean;
  accessToken: string | null;
  onContact: () => void;
  onUpgrade: () => void;
  onHistory: () => void;
  onOpenLog: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-[13px] leading-tight">{contact.name}</p>
          {contact.company && (
            <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">{contact.company}</p>
          )}
          {contact.role && (
            <p className="mt-0.5 text-[11px] text-foreground/60">{contact.role}</p>
          )}
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-1 text-[9px] uppercase tracking-wider text-foreground/40">From partner</p>
          )}
        </div>
        <TimeSinceCell contact={contact} />
      </div>

      <dl className="mt-3 space-y-1.5 text-[12px]">
        {contact.phone && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Phone</dt>
            <dd className="min-w-0 flex-1"><CopyableCell value={contact.phone} mono /></dd>
          </div>
        )}
        {contact.email && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Email</dt>
            <dd className="min-w-0 flex-1 break-all"><CopyableCell value={contact.email} /></dd>
          </div>
        )}
        {contact.location && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Location</dt>
            <dd className="text-foreground/75">{contact.location}</dd>
          </div>
        )}
        {contact.notes && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 w-16 shrink-0">Notes</dt>
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
            <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
              {(contact.last_contact_by_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] font-semibold text-foreground truncate">
              {contact.last_contact_by_name || 'Unknown'}
            </p>
            <p className="text-[9px] text-foreground/45">{fmtAbsolute(contact.last_contact_at)}</p>
          </div>
          {contact.last_contact_method && (
            <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[contact.last_contact_method]}`}>
              {contact.last_contact_method}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onContact}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition-colors"
        >
          <PhoneIcon />
          Contact
        </button>
        <button
          type="button"
          onClick={onHistory}
          className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-[11px] font-semibold border transition-colors ${expanded ? 'bg-foreground text-white border-foreground' : 'border-black/10 text-foreground/75 hover:bg-warm-bg/60'}`}
          aria-expanded={expanded}
        >
          History
          <span className={`inline-flex transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
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
                {!contact.partner_id ? (
                  <button
                    role="menuitem"
                    onClick={() => { setOpen(false); onUpgrade(); }}
                    className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5"
                  >
                    Add partner
                  </button>
                ) : (
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50/40">
                    ● Linked partner
                  </div>
                )}
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

      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <ContactDetailsDrawer
            contact={contact}
            accessToken={accessToken}
            onLogContact={onOpenLog}
            onClose={onHistory}
          />
        </div>
      )}
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

// Standalone freshness pill — still used by the mobile card layout
// where the avatar / name / dates render in separate <dl> rows. The
// desktop grid inlines this logic inside LastContactSummaryCell.
function TimeSinceCell({ contact }: { contact: Contact }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!contact.last_contact_at) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-foreground/5 text-foreground/45 border-foreground/10">
        Never
      </span>
    );
  }
  const s = staleness(contact.last_contact_at);
  const tone =
    s === 'fresh' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    s === 'cooling' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${tone}`}
      title={fmtAbsolute(contact.last_contact_at) ?? ''}
    >
      {fmtAgoLong(contact.last_contact_at)}
    </span>
  );
}

// Single cell that rolls up the three old engagement columns (Last
// Contacted By, Time Since, Last Contact) into one compact strip:
// avatar + name + method chip on top, freshness pill + relative + absolute
// time on the bottom. Re-renders every 30s so "2 minutes" → "3 minutes"
// ticks forward without a page refresh — same cheap counter bump the
// old TimeSinceCell used.
function LastContactSummaryCell({ contact }: { contact: Contact }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!contact.last_contact_at) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/30 text-[11px] shrink-0">
          —
        </span>
        <div className="min-w-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-foreground/5 text-foreground/45 border-foreground/10">
            Never
          </span>
          <p className="text-foreground/35 text-[10px] italic mt-0.5">never contacted</p>
        </div>
      </div>
    );
  }

  const s = staleness(contact.last_contact_at);
  const textTone =
    s === 'fresh' ? 'text-emerald-700' :
    s === 'cooling' ? 'text-amber-700' :
    'text-rose-700';

  return (
    <div className="flex items-start gap-2.5 min-w-0">
      {contact.last_contact_by_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.last_contact_by_avatar_url}
          alt=""
          className="w-7 h-7 rounded-full object-cover border border-black/10 shrink-0 mt-0.5"
        />
      ) : (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 shrink-0 mt-0.5">
          {(contact.last_contact_by_name || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {/* Top row: just the contacter's name. Freshness pill moved
            out — the colored time on the bottom row already conveys
            "how long ago" without the duplicate. */}
        <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
          {contact.last_contact_by_name || '—'}
        </p>
        {/* Bottom row: method pill (Phone / In Person / Left Message)
            followed by the colored relative time + absolute timestamp.
            The method pill lives here now so the top row reads as a
            clean "who" and the bottom reads as "how + when". */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10.5px] leading-tight" title={fmtAbsolute(contact.last_contact_at) ?? ''}>
          {contact.last_contact_method && (
            <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[contact.last_contact_method]}`}>
              {contact.last_contact_method}
            </span>
          )}
          <span className={`font-semibold ${textTone}`}>{fmtAgo(contact.last_contact_at)}</span>
          <span className="text-foreground/45">· {fmtAbsolute(contact.last_contact_at)}</span>
        </div>
      </div>
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
          <p className="px-3 py-2 text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/45 border-b border-black/5">
            Visible columns
          </p>
          <ul className="py-1 max-h-80 overflow-y-auto">
            {ALL_COLUMNS.map((c) => {
              const checked = visibleCols.includes(c.key);
              return (
                <li key={c.key}>
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-warm-bg/60 cursor-pointer text-[11.5px]">
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
          <p className="px-3 py-2 border-t border-black/5 text-[9px] text-foreground/45">
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
  const [company, setCompany] = useState('');
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
        company: company.trim() || null,
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
          <ModalField label="Company">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="modal-input" placeholder="Mountain House · Lumina Recovery" />
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
  onSubmit: (method: ContactMethod, comments: string, transcript: string, durationSeconds: number) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<ContactMethod>('Phone');
  const [comments, setComments] = useState('');
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  // Call duration captured as minutes + seconds for a forgiving entry
  // UI; we serialise to seconds on submit. Defaults to 30s the moment
  // the user picks "Left Message" — a typical brief voicemail length
  // — so admissions doesn't have to manually type it for every drop.
  // The "userTouched" ref guards against the auto-default clobbering a
  // value the admin has already typed.
  const [durationMin, setDurationMin] = useState<string>('');
  const [durationSec, setDurationSec] = useState<string>('');
  const durationTouchedRef = useRef(false);
  useEffect(() => {
    if (method === 'Left Message' && !durationTouchedRef.current) {
      setDurationMin('0');
      setDurationSec('30');
    }
  }, [method]);
  const totalSeconds = (() => {
    const m = parseInt(durationMin, 10);
    const s = parseInt(durationSec, 10);
    return (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0);
  })();
  const durationValid = totalSeconds > 0;

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
          if (!durationValid) return;
          setSubmitting(true);
          try {
            await onSubmit(method, comments.trim(), transcript.trim(), totalSeconds);
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
          <ModalField label="Duration" required hint={method === 'Left Message' ? 'Voicemails default to 30 seconds — adjust if you held the line longer.' : 'How long was the call / conversation?'}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={720}
                value={durationMin}
                onChange={(e) => { durationTouchedRef.current = true; setDurationMin(e.target.value); }}
                placeholder="0"
                className="modal-input w-20 text-center tabular-nums"
                aria-label="Minutes"
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">min</span>
              <input
                type="number"
                min={0}
                max={59}
                value={durationSec}
                onChange={(e) => { durationTouchedRef.current = true; setDurationSec(e.target.value); }}
                placeholder="0"
                className="modal-input w-20 text-center tabular-nums"
                aria-label="Seconds"
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">sec</span>
            </div>
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

          {/* Optional: paste a call / meeting transcript. We stash the
              raw text in Supabase Storage and send it to Claude for a
              short summary that lives on the log entry so the inline
              history drawer can show it at a glance. */}
          <div className="rounded-lg border border-dashed border-black/15 bg-warm-bg/30">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              aria-expanded={showTranscript}
            >
              <span className="text-[11px] font-semibold text-foreground/75">
                Paste transcript {transcript.trim() && <span className="ml-1 text-primary">· {transcript.trim().length.toLocaleString()} chars</span>}
              </span>
              <span className="text-[10px] text-foreground/50">
                {showTranscript ? 'Hide' : 'Claude will summarise it for the history'}
              </span>
            </button>
            {showTranscript && (
              <div className="px-3 pb-3">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  className="modal-input resize-y font-mono text-[11px]"
                  placeholder="Paste a call recording / meeting transcript here. We'll save the full text and Claude will write a short summary that shows up in the contact history."
                />
                <p className="mt-1.5 text-[10px] text-foreground/50">
                  Stored privately. Only people who can see this contact will be able to open the full transcript.
                </p>
              </div>
            )}
          </div>
        </div>
        <ModalFooter
          submitting={submitting}
          submitDisabled={!durationValid}
          submitLabel={transcript.trim() ? 'Log contact + summarise' : 'Log contact'}
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
  duration_seconds: number | null;
  transcript_storage_path: string | null;
  transcript_summary: string | null;
}

// Format a raw seconds count as "MM:SS" (or "0:30") for the contact-
// history timeline. Returns null if the input is null / zero so the
// caller can hide the field rather than render a misleading "0:00".
function fmtDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ContactDetailsDrawer({
  contact,
  accessToken,
  onLogContact,
  onClose,
}: {
  contact: Contact;
  accessToken: string | null;
  onLogContact: () => void;
  onClose: () => void;
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

  const detailRows: { label: string; value: string | null | undefined }[] = [
    { label: 'Company', value: contact.company },
    { label: 'Role / Relation', value: contact.role },
    { label: 'Phone', value: contact.phone },
    { label: 'Email', value: contact.email },
    { label: 'Location', value: contact.location },
    { label: 'Source', value: contact.source === 'downgrade-from-partner' ? 'Downgraded from partner' : contact.source },
    { label: 'Added', value: fmtAbsolute(contact.created_at) },
    { label: 'Updated', value: fmtAbsolute(contact.updated_at) },
  ];

  return (
    <div className="rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/40">Contact details</p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground truncate">{contact.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLogContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[10px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <PhoneIcon />
            Log a contact
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/40 hover:text-foreground hover:bg-warm-bg/60 transition-colors"
            aria-label="Collapse details"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-6">
        <div className="px-5 py-4 md:border-r md:border-black/5">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-[12px]">
            {detailRows.map((r) => (
              <Fragment key={r.label}>
                <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 self-start mt-1">{r.label}</dt>
                <dd className="text-foreground/80 break-words">{r.value || <span className="text-foreground/30 italic">—</span>}</dd>
              </Fragment>
            ))}
            {contact.notes && (
              <>
                <dt className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/45 self-start mt-1">Notes</dt>
                <dd className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{contact.notes}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/45">Contact history</p>
            <p className="text-xs text-foreground/45">
              {logs == null
                ? 'Loading…'
                : logs.length === 0
                ? 'No history yet'
                : `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
          )}
          {logs && logs.length > 0 && (
            <ol className="relative border-l border-black/10 ml-2">
              {logs.map((log, i) => (
                <li key={log.id} className="relative pl-4 pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      i === 0 ? 'bg-primary' : 'bg-foreground/30'
                    }`}
                  />
                  <div className="flex items-start gap-2.5">
                    {log.contacted_by_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={log.contacted_by_avatar_url}
                        alt={log.contacted_by_name ?? 'User'}
                        className="w-7 h-7 rounded-full object-cover bg-warm-bg"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-[9px] font-semibold text-foreground/55">
                        {(log.contacted_by_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-[12px] font-semibold text-foreground">
                          {log.contacted_by_name || 'Unknown'}
                        </p>
                        <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[log.method]}`}>
                          {log.method}
                        </span>
                        {fmtDuration(log.duration_seconds) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold border bg-foreground/5 text-foreground/65 border-foreground/15 tabular-nums">
                            {fmtDuration(log.duration_seconds)}
                          </span>
                        )}
                        <span className="text-[10px] text-foreground/45" title={fmtAbsolute(log.contacted_at) ?? ''}>
                          {fmtAgo(log.contacted_at)}
                        </span>
                      </div>
                      {log.comments && (
                        <p className="mt-1 text-[12px] text-foreground/75 whitespace-pre-wrap leading-relaxed">
                          {log.comments}
                        </p>
                      )}
                      {(log.transcript_summary || log.transcript_storage_path) && (
                        <TranscriptBlock
                          contactId={contact.id}
                          logId={log.id}
                          summary={log.transcript_summary}
                          hasTranscript={!!log.transcript_storage_path}
                          accessToken={accessToken}
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function TranscriptBlock({
  contactId,
  logId,
  summary,
  hasTranscript,
  accessToken,
}: {
  contactId: string;
  logId: string;
  summary: string | null;
  hasTranscript: boolean;
  accessToken: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (transcript != null || !hasTranscript || !accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/contacts/${contactId}/transcript/${logId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTranscript(await r.text());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-primary/15 bg-primary/[0.04] px-2.5 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
          Transcript
        </span>
        <div className="min-w-0 flex-1">
          {summary ? (
            <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{summary}</p>
          ) : (
            <p className="text-[11px] text-foreground/45 italic">Summary unavailable.</p>
          )}
          {hasTranscript && (
            <button
              type="button"
              onClick={toggle}
              className="mt-1 text-[10px] font-semibold text-primary hover:underline"
            >
              {expanded ? 'Hide full transcript' : 'View full transcript'}
            </button>
          )}
          {expanded && hasTranscript && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded border border-black/10 bg-white px-2 py-1.5 text-[10px] text-foreground/75 font-mono whitespace-pre-wrap">
              {loading ? 'Loading transcript…' : err ? `Failed to load: ${err}` : (transcript ?? '')}
            </div>
          )}
        </div>
      </div>
    </div>
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
          <div className="rounded-lg bg-warm-bg/60 border border-black/5 px-4 py-3 mb-5 text-[11px] text-foreground/65 leading-snug">
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
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
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
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
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
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/45">{eyebrow}</p>
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
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
      <label className={`block text-[9px] font-bold tracking-[0.18em] uppercase mb-1 ${disabled ? 'text-foreground/30' : 'text-foreground/55'}`}>
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className={`mt-1 text-[10px] ${disabled ? 'text-foreground/30' : 'text-foreground/45'}`}>{hint}</p>}
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
function CellPhoneIcon() {
  // Mobile handset — distinguishes the "cell" phone column entry.
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>;
}
function OfficePhoneIcon() {
  // Desk phone — distinguishes the "office" phone column entry.
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4"/><path d="M8 15h.01M12 15h.01M16 15h.01"/></svg>;
}
function EmailIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
}
function PencilIcon() {
  return <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
}
function ChevronDownIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>;
}
function GlobeIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
}
function ExternalLinkIcon() {
  return <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 3h7v7"/><path d="M21 3l-9 9"/><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/></svg>;
}
function PinIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="3"/></svg>;
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
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/45">Bulk import</p>
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Import contacts from CSV</h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground p-2 -mr-2" aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: pick file */}
          <div>
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">1 · Upload CSV</p>
            <label className="block rounded-xl border-2 border-dashed border-black/15 bg-warm-bg/30 px-4 py-6 text-center cursor-pointer hover:border-primary/45 hover:bg-primary/5 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-[13px] font-semibold text-foreground">{file ? file.name : 'Click to choose a .csv'}</p>
              <p className="mt-1 text-[10.5px] text-foreground/55">
                Up to 1MB. Headers will be auto-detected — column names like &quot;Phone #&quot; or &quot;City, State&quot; are fine.
              </p>
            </label>
            <div className="mt-2 flex items-center justify-between text-[10px]">
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
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
                2 · Let Claude normalise
              </p>
              <div className="rounded-xl border border-black/10 bg-white px-4 py-3">
                <p className="text-[11.5px] text-foreground/65 leading-snug">
                  Claude maps your headers to our schema, combines split first / last name columns,
                  normalises phone numbers, and tidies whitespace. The server re-validates every row
                  before insert, so a bad mapping can&apos;t bypass the rules.
                </p>
                <button
                  type="button"
                  onClick={runAi}
                  disabled={normalising || !!normalised}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-primary-dark disabled:opacity-50"
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
                  <p className="mt-2 text-[10.5px] text-foreground/55 italic">{aiNotes}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: preview + import */}
          {normalised && normalised.length > 0 && !result && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">3 · Preview &amp; import</p>
              <div className="overflow-x-auto rounded-xl border border-black/10 bg-white max-h-72">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-warm-bg/60 text-left text-[9px] uppercase tracking-wider text-foreground/55 sticky top-0">
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
                <p className="mt-1 text-[10px] text-foreground/45">+ {normalised.length - 50} more not shown</p>
              )}
              <button
                type="button"
                onClick={runImport}
                disabled={importing}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-foreground text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-50"
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
              <p className="text-[13px] font-semibold text-emerald-900">
                Created {result.created} {result.created === 1 ? 'contact' : 'contacts'}
                {result.skipped > 0 && <span className="text-foreground/55"> · {result.skipped} skipped</span>}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[11px] text-foreground/70 max-h-32 overflow-y-auto">
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
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
