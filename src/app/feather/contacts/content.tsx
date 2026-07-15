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

import Link from '@/components/HoverPrefetchLink';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Fragment, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { SearchSelectCell } from '@/components/SearchSelectCell';
import { companySlug } from '@/lib/company';
import { looksLikePersonName } from '@/lib/contact-suggest';
import {
  CONTACT_METHODS,
  CONTACT_METHOD_BY_VALUE,
  ContactMethodPicker,
  METHOD_TONES as SHARED_METHOD_TONES,
  type ContactMethod as SharedContactMethod,
} from '@/lib/contact-methods';
import { QuickLogHost, type QuickLogPerson, type QuickLogResult } from '../QuickLog';

// ─── Shared clock ───────────────────────────────────────────────
// One interval for the whole grid instead of a setInterval per
// Last-contact cell (~1100 timers). Cells subscribe via useNowTick();
// the single timer bumps a version every 60s to refresh "x ago" labels.
const nowListeners = new Set<() => void>();
let nowTimer: ReturnType<typeof setInterval> | null = null;
let nowVersion = 0;
function subscribeNow(cb: () => void): () => void {
  nowListeners.add(cb);
  if (!nowTimer) {
    nowTimer = setInterval(() => {
      nowVersion += 1;
      nowListeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    nowListeners.delete(cb);
    if (nowListeners.size === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}
function useNowTick(): number {
  return useSyncExternalStore(subscribeNow, () => nowVersion, () => 0);
}

// Reactive media query (via useSyncExternalStore so it's hydration-safe).
// Used to mount the desktop table OR the mobile cards — never both, which
// otherwise doubled the rendered row count (~2200 row subtrees).
function useMediaQuery(query: string, serverDefault = true): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverDefault);
}

// ─── Types ──────────────────────────────────────────────────────

type ContactMethod = SharedContactMethod;

type ContactRating = 'Tier 1' | 'Tier 2' | 'Tier 3';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  company_website: string | null;
  // Multi-select service-type tags (Detox / PHP / IOP / RTC /
  // Outpatient / …). Stored as text[] in the DB so a contact can carry
  // more than one offering (e.g. a facility that runs both Detox and
  // PHP tracks). Open-vocabulary — admissions can add new tags
  // inline and they survive as options.
  type: string[] | null;
  // Free-text clinical specialty / focus area (Trauma, Eating Disorders,
  // …). Mirrors partners.specialty so a contact upgraded into a partner
  // carries the same tag with no re-entry.
  specialty: string | null;
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
  follow_up_at: string | null;
  /** Set when the contact clicked the unsubscribe link in any
   *  campaign email. The campaign send pipeline filters these out
   *  before they hit Resend, and the list UI flags them inline so a
   *  rep can see they've opted out before reaching out. */
  unsubscribed_at: string | null;
  unsubscribed_source: string | null;
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
  // Column order locked in by admissions:
  //   Name → Last contact → Rating → Site → Company → Type → Specialty/Focus → Contact → Location → Notes → Role/Relation
  // Last contact leads (right after Name) so the most recent touch is
  // the first thing you read — it used to be pinned far right in the
  // sticky "engagement" cell. Rating follows. Site → Company → Type → Specialty / Focus
  // sit as a contiguous "who is this contact / what do they do" block —
  // the four columns are intentionally adjacent so the eye reads them
  // as one identity strip and admissions can't reorder them apart
  // without re-grouping deliberately. Contact → Location follow as the
  // outreach block. Notes lives just after Location so the free-text
  // context sits next to the address. Role / Relation anchors the
  // right end. Contact history + Actions are sticky on the right
  // (rendered outside this array).
  { key: 'name', label: 'Name' },
  // The last-contact summary, relocated out of the old sticky-right
  // "engagement" cell to sit right after Name. Rendered as a normal
  // (scrolling, reorderable, resizable) column whose cell carries the
  // log-a-contact button + last-contact summary + history expander.
  { key: 'engagement', label: 'Last contact' },
  { key: 'rating', label: 'Rating' },
  { key: 'website', label: 'Site', align: 'left' },
  { key: 'company', label: 'Company' },
  // "Type" mirrors partnerships.type — a categorical service-type tag
  // (Detox / PHP / IOP …). Open vocabulary on the DB; the picker seeds
  // the three starting options and surfaces new tags inline.
  { key: 'type', label: 'Type' },
  // "Specialty / Focus" mirrors partnerships.specialty — free-text,
  // searched + selected via SearchSelectCell, with options sourced from
  // every value already in the dataset so new tags propagate.
  { key: 'specialty', label: 'Specialty / Focus' },
  // Merged "Contact" cell. Renders the cell phone, office phone, and
  // email as 3 icon buttons in a row. Each carries its own hover
  // popover + click-to-copy / click-to-open-link. Location moved out
  // to its own column right after this one.
  { key: 'contact', label: 'Contact info' },
  { key: 'location', label: 'Location' },
  { key: 'notes', label: 'Notes' },
  { key: 'role', label: 'Role / Relation' },
  // "Follow up" mirrors partnerships.follow_up_at — the date the
  // user scheduled in the Log-contact modal. Pills render overdue /
  // today / in-Nd with the same tones as the partners grid.
  { key: 'follow_up', label: 'Follow up', width: '130px' },
];

// Site → Company → Type → Specialty/Focus render as one visual identity
// strip. Drag-reorder and the column-picker both consult this set to
// keep them adjacent in the same order — they get re-grouped together
// if any one of them is moved, so the strip never fragments.
const IDENTITY_GROUP: readonly string[] = ['website', 'company', 'type', 'specialty'] as const;
// Seed vocabulary for the Type pill dropdown. The first three are the
// "first-touch" outreach tags admissions used before this column
// existed; PARTNER_TYPES is appended so the dropdown mirrors what the
// partnerships page offers (a contact upgraded into a partner can
// keep the same tag with no re-entry). De-duplicated below.
const TYPE_OPTIONS: readonly string[] = Array.from(new Set<string>(
  ['Detox', 'PHP', 'IOP', ...PARTNER_TYPES]
));


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
  type: 110,
  specialty: 180,
  rating: 110,
  role: 180,
  // "Contact" column — 3 icons (cell, office, email) plus their hover
  // affordances. 160px keeps them breathing without crowding adjacent
  // columns. The pin/Location editor lives in its own column now.
  contact: 160,
  location: 240,
  notes: 280,
  // Legacy widths kept for back-compat with shared_grid_prefs rows
  // saved before the engagement column merge. The new unified
  // engagement column (`engagement`) absorbs both slots and gets
  // its own default sized to fit the Contact button + the merged
  // last-contact summary on one row at desktop widths.
  actions: 140,
  last_contact_summary: 320,
  engagement: 360,
};
const RESIZE_MIN_PX = 70;
const RESIZE_MAX_PX = 900;
const EXPANDER_COL_WIDTH_PX = 40;
// Leading checkbox column for batch-select. Fixed width on desktop;
// hidden on mobile (mobile cards get their own inline checkbox).
const SELECT_COL_WIDTH_PX = 36;

// Circular row-select checkbox. Replaces the native square checkbox
// across the desktop row, the desktop header (with indeterminate
// support for "some-but-not-all selected"), and the mobile card.
// The whole row also doubles as a click-to-select target — clicks on
// inputs / buttons / links inside the row don't propagate to the
// row-level toggle (see isInteractiveClick).
function CircleCheckbox({
  checked,
  indeterminate = false,
  onToggle,
  ariaLabel,
  size = 'md',
  className = '',
}: {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[20px] h-[20px]';
  const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        // The row itself is also a click target — without stopPropagation
        // the click would toggle once for the box AND once for the row,
        // cancelling out.
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center justify-center ${dim} rounded-full border-[1.5px] transition-all duration-150 align-middle ${
        checked
          ? 'bg-primary border-primary text-white shadow-[0_2px_8px_-2px_rgba(188,107,74,0.55)]'
          : indeterminate
          ? 'bg-primary/15 border-primary text-primary'
          : 'bg-white border-foreground/25 hover:border-primary/60 hover:bg-primary/5'
      } ${className}`}
    >
      {checked ? (
        <svg
          className={icon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : indeterminate ? (
        <span aria-hidden className="block w-2.5 h-[2px] bg-current rounded-full" />
      ) : null}
    </button>
  );
}

// Returns true when a click landed on an interactive element (or
// inside one), so the row-level click handler can opt out of
// toggling selection. Covers inputs, buttons, selects, anchors,
// textareas, contenteditable, role=button, and the column-resize
// handle which uses a div with cursor-col-resize.
function isInteractiveClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(
    'input, button, select, textarea, a, [role="button"], [role="combobox"], [contenteditable="true"], [data-no-row-select]',
  ) !== null;
}

const METHOD_TONES = SHARED_METHOD_TONES;

// Forgive bare-host input on Site / Website fields. Reps routinely
// type "www.deletehis.com" or "rehab.com/contact" — the native
// type="url" check rejects either because it requires a scheme, so
// we strip type="url" from the inputs and normalise here on save:
//   ""                    → null         (nothing typed)
//   "www.deletehis.com"   → "https://www.deletehis.com"
//   "http://x.com"        → "http://x.com"  (preserve what they typed)
//   "https://x.com"       → "https://x.com"
// Anything still ambiguous after normalisation hits the same
// downstream consumers that already handle malformed URLs (the
// website cell prepends https:// before opening, link components
// rel=noopener so a typo can't hijack anything).
function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}

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
    // The Contact column is now just phone / email icons (Location
    // moved out to its own column). Sort by the most useful contact
    // string admissions actually looks at — cell number first, then
    // office, then email — so identical phone numbers cluster.
    case 'contact': return c.phone_cell || c.phone || c.phone_office || c.email || null;
    case 'notes': return c.notes || null;
    case 'last_contact_at':
    case 'time_since':
    case 'last_contact_summary':
    case 'engagement':
      return c.last_contact_at ? new Date(c.last_contact_at).getTime() : null;
    case 'last_contact_by_name': return c.last_contact_by_name || null;
    case 'follow_up':
      return c.follow_up_at ? new Date(c.follow_up_at).getTime() : null;
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
  // The search box binds to `search` for instant typing feedback, but
  // the heavy filter→sort→grid recompute reads this deferred value so
  // React can keep the input responsive and re-render the (large,
  // un-virtualized) row list at a lower priority. Without this every
  // keystroke synchronously re-rendered hundreds of ContactCells.
  const deferredSearch = useDeferredValue(search);
  // Tier filter sits inline next to the search bar. 'all' means
  // "show every tier including unrated rows"; 'unrated' specifically
  // narrows to rows where rating is null so the team can hunt down
  // contacts that still need a tier assigned.
  // Table / Map / Insights view-mode toggle. Persisted in the URL via
  // ?view=map / ?view=insights so the choice survives refresh + lets
  // admissions bookmark each view directly. `table` is the default
  // (no query param needed).
  const [viewMode, setViewMode] = useState<'table' | 'map' | 'insights'>('table');
  // Contact list presentation. 'simple' (default) is the lightweight
  // collapsible row list — avatar + name + who-last-touched + when;
  // 'table' brings back the full power-grid (sort / columns / bulk
  // edit / inline edit) for when that's needed.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'map') setViewMode('map');
    else if (v === 'insights') setViewMode('insights');
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (viewMode === 'map') url.searchParams.set('view', 'map');
    else if (viewMode === 'insights') url.searchParams.set('view', 'insights');
    else url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  }, [viewMode]);

  // First time the user opens the map view, fire a single backfill
  // round through POST /api/outreach/geocode so legacy rows that have
  // a freeform `location` but no lat/lng get pinned without us
  // shipping a separate "geocode now" button. Capped to 100 rows /
  // call server-side so this is safe to fire eagerly.
  const geocodedThisSessionRef = useRef(false);
  // Hold the latest rows in a ref so the geocode effect can read the
  // "pending rows exist" condition without listing `rows` as a dep.
  // Listing `rows` re-fired the effect on every realtime update
  // (rows.length identical, new array reference); the ref breaks that.
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => {
    if (viewMode !== 'map') return;
    if (geocodedThisSessionRef.current) return;
    if (!session?.access_token) return;
    const pending = rowsRef.current.some((r) => r.location && (r.lat == null || r.lng == null));
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
  }, [viewMode, session?.access_token]);
  const [showAdd, setShowAdd] = useState(false);
  // Single + dropdown that consolidates Add-with-Claude / Upload CSV /
  // Add contact. Replaces the three-button row that lived in the header.
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showAddMenu) return;
    const onDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAddMenu(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showAddMenu]);
  // Mobile-only "New log" quick-action: open a slim modal that asks
  // for a person's name + the same fields as LogContactModal. If
  // the name matches an existing contact we log against it; if not
  // we create the contact on the fly so the log isn't blocked by a
  // separate "Add contact" step.
  const [showNewLog, setShowNewLog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  // Quick-log sheet inputs, derived from the live grid rows so the
  // combobox / recents stay in sync with optimistic edits. Recents
  // approximates "my latest touches" as contacts whose most recent
  // log is mine — good enough without an extra fetch on a page that
  // already holds every row.
  const quickLogRoster = useMemo<QuickLogPerson[]>(
    () =>
      rows
        .filter((r) => !!r.name)
        .map((r) => ({
          id: r.id,
          name: r.name as string,
          company: r.company ?? null,
          lastAt: r.last_contact_at,
          lastMethod: r.last_contact_method,
        })),
    [rows],
  );
  const quickLogRecents = useMemo<QuickLogPerson[]>(
    () =>
      rows
        .filter((r) => !!r.name && !!r.last_contact_at && r.last_contact_by === user?.id)
        .sort((a, b) => new Date(b.last_contact_at as string).getTime() - new Date(a.last_contact_at as string).getTime())
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          name: r.name as string,
          company: r.company ?? null,
          lastAt: r.last_contact_at,
          lastMethod: r.last_contact_method,
        })),
    [rows, user?.id],
  );
  // "Add with Claude" flow — opens a wizard modal that asks Claude
  // for candidate referrers/leads, lets admissions cherry-pick which
  // ones to keep, and bulk-inserts the selected rows.
  const [showSuggest, setShowSuggest] = useState(false);
  // Batch-edit selection. Holds the contact ids the admin has ticked
  // via the leading checkbox column. When > 0 a floating bottom bar
  // appears with quick-set buttons for Company / Rating / Type /
  // Specialty / Location — applies the same value to every selected
  // row in parallel and clears on success.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function setSelectedFromList(ids: string[], on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id); else next.delete(id);
      }
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }
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
  // Default sort keys the grid by "most recently contacted" desc so
  // the row admissions just touched sits at the top. The Contact
  // history column is sticky on the right; clicking its header
  // toggles asc/desc on the same key.
  const [sortKey, setSortKey] = useState<string>('engagement');
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
      // Explicit unsubscribe before removeChannel — without it,
      // rapid effect re-runs (token refresh, fast nav) can leave
      // a half-disposed channel pumping messages that overwrite
      // state from the next mount. unsubscribe() stops the
      // message pump synchronously; removeChannel() tears down
      // the underlying socket.
      void channel.unsubscribe();
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
    // The contacts grid gains/reshuffles columns over time. The shared
    // `shared_grid_prefs` row can carry an order written before newer
    // columns existed — appending missing keys at the end of the
    // stored array (which the previous version did) leaves them
    // stranded at the right of the table (e.g. Rating drifted past
    // Notes once it was introduced). When stored prefs are missing
    // ANY canonical key, reset both visible_columns and column_order
    // to the canonical DEFAULT_VISIBLE / DEFAULT_ORDER and persist
    // back — a one-shot auto-migration that re-aligns every connected
    // viewer to the layout the code currently expects. Admins can
    // still drag-reorder afterwards and that customisation will stick
    // (next load has no missing keys → reset doesn't fire).
    const known = (arr: unknown): string[] | null => (
      Array.isArray(arr) && arr.length > 0 ? (arr as string[]).filter((k) => k in COL_BY_KEY) : null
    );
    const storedV = known(visible);
    const storedO = known(order);
    const missingV = storedV ? DEFAULT_VISIBLE.filter((k) => !storedV.includes(k)) : [];
    const missingO = storedO ? DEFAULT_ORDER.filter((k) => !storedO.includes(k)) : [];
    const stale = !storedV || !storedO || missingV.length > 0 || missingO.length > 0;
    const v = stale ? DEFAULT_VISIBLE.slice() : storedV!;
    const o = stale ? DEFAULT_ORDER.slice() : storedO!;
    setVisibleCols(v);
    setColumnOrder(o);
    if (stale) {
      // eslint-disable-next-line no-console
      console.info('[outreach] resetting shared_grid_prefs to canonical column layout', {
        missingFromVisible: missingV,
        missingFromOrder: missingO,
        hadStoredVisible: !!storedV,
        hadStoredOrder: !!storedO,
      });
      void persistPrefs(v, o);
    }
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

  // Precompute one lowercased search blob per contact — built once when
  // `rows` changes, not on every keystroke. Keyed by the contact object
  // so an edit (new object) refreshes only that entry's blob on the next
  // rebuild. Filtering then becomes a cheap Map lookup + substring test.
  const searchIndex = useMemo(() => {
    const m = new Map<Contact, string>();
    for (const r of rows) {
      m.set(r, [r.name, r.company, r.company_website, r.role, r.phone, r.phone_cell, r.phone_office, r.email, r.location, r.formatted_address, r.notes, r.specialty, ...(r.type ?? [])]
        .filter(Boolean).join(' ').toLowerCase());
    }
    return m;
  }, [rows]);
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return (searchIndex.get(r) ?? '').includes(q);
    });
  }, [rows, searchIndex, deferredSearch]);

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

  // Type & Specialty options: seed Type with the three canonical
  // starting tags (Detox / PHP / IOP) plus anything admissions has
  // already typed in. Specialty is fully open-vocabulary — only
  // seeded with values already on rows so the suggestion list
  // doesn't lie about what's "official".
  const typeOptions = useMemo(() => {
    const set = new Set<string>(TYPE_OPTIONS);
    for (const r of rows) {
      for (const v of r.type ?? []) {
        const t = v.trim();
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [rows]);
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r.specialty ?? '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [rows]);

  // Headline counts for the insight tiles at the top of the page.
  // Always computed against the unfiltered `rows` (not the filtered
  // view) because the tiles describe the whole pipeline, not what's
  // currently visible after a search/method/freshness filter.
  // Header KPI pills. Decoupled from live row edits via useDeferredValue
  // so a cell edit updates the grid immediately and the aggregates catch
  // up in the background instead of recomputing on the critical path.
  const deferredRows = useDeferredValue(rows);
  const insights = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    let week = 0;
    let month = 0;
    let total = 0;
    let never = 0;
    let missingEmail = 0;
    for (const r of deferredRows) {
      if (!(r.email && r.email.trim())) missingEmail += 1;
      if (!r.last_contact_at) { never += 1; continue; }
      total += 1;
      const age = now - new Date(r.last_contact_at).getTime();
      if (age <= weekMs) week += 1;
      if (age <= monthMs) month += 1;
    }
    return { week, month, total, never, missingEmail };
  }, [deferredRows]);

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

  // followUpDays: a number schedules a follow-up, null explicitly
  // clears it, undefined leaves the contact's follow-up untouched
  // (the quick-log path — logging a touchpoint must not silently
  // wipe a scheduled follow-up). Returns the created log's id so the
  // quick-log toast can offer Undo.
  async function handleLogContact(target: Contact, method: ContactMethod, comments: string, transcript: string, durationSeconds: number, followUpDays: number | null | undefined): Promise<{ ok: boolean; logId: string | null }> {
    if (!session?.access_token) return { ok: false, logId: null };
    // Optimistic UI — bump the row before the request resolves so
    // the grid reflects the action immediately.
    const optimisticAt = new Date().toISOString();
    const optimisticFollowUp =
      followUpDays != null && followUpDays > 0
        ? new Date(Date.now() + followUpDays * 86400000).toISOString()
        : target.follow_up_at;
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
              follow_up_at: optimisticFollowUp,
            }
          : r,
      ),
    );
    setLogTarget(null);
    const res = await fetch(`/api/contacts/${target.id}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      // JSON.stringify drops an undefined follow_up_days entirely,
      // which the route reads as "leave follow_up_at alone".
      body: JSON.stringify({ method, comments, transcript, duration_seconds: durationSeconds, follow_up_days: followUpDays }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't log contact: ${json.error ?? res.status}`);
      // Realtime will reconcile state if the server rolled back.
      return { ok: false, logId: null };
    }
    const json = (await res.json().catch(() => null)) as { log_id?: string } | null;
    return { ok: true, logId: json?.log_id ?? null };
  }

  // Quick-log path from the mobile "New log" FAB / desktop Add-Log
  // pill. Finds-or-creates a contact by name (case-insensitive match
  // against the loaded rows; falls back to POST /api/contacts if the
  // name is brand new), then runs the same log-touchpoint flow
  // handleLogContact uses for grid rows. Returns the QuickLogResult
  // the host needs for its Undo toast, or null on failure (which
  // keeps the sheet open).
  async function handleQuickLog(
    name: string,
    method: ContactMethod,
    comments: string,
    durationSeconds: number,
    pickedId: string | null,
  ): Promise<QuickLogResult | null> {
    if (!session?.access_token) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    // Prefer the exact contact the rep picked from the list (so a
    // shared name logs against the right one); fall back to a by-name
    // match; otherwise create. A stale picked id just drops to by-name.
    let target = pickedId ? rows.find((r) => r.id === pickedId) : undefined;
    if (!target) target = rows.find((r) => (r.name ?? '').toLowerCase() === lowered);
    let created = false;
    if (!target) {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Couldn't create contact: ${json.error ?? res.status}`);
        return null;
      }
      target = (await res.json()) as Contact;
      created = true;
      // Push the new contact into local state so the realtime
      // subscription doesn't have to race the log call below.
      setRows((prev) => [target as Contact, ...prev]);
    }
    // follow_up_days deliberately undefined — a quick log must not
    // clear a follow-up someone scheduled on this contact.
    const logRes = await handleLogContact(target, method, comments, '', durationSeconds, undefined);
    if (!logRes.ok) return null;
    return {
      logId: logRes.logId,
      contactId: target.id,
      contactName: target.name ?? trimmed,
      createdContact: created,
      method,
      durationSeconds,
    };
  }

  // Undo for the quick-log toast: delete the log (author-only route;
  // it also re-syncs contacts.last_contact_*, which realtime pushes
  // back into the grid) and, if the quick log created the contact,
  // remove the otherwise-empty row too.
  async function handleQuickLogUndo(result: QuickLogResult) {
    if (!session?.access_token) throw new Error('no session');
    if (result.logId) {
      const res = await fetch(`/api/contacts/${result.contactId}/history/${result.logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('undo failed');
    }
    if (result.createdContact) {
      await fetch(`/api/contacts/${result.contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setRows((prev) => prev.filter((r) => r.id !== result.contactId));
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
  // useCallback so the reference is stable across renders — this is
  // what lets React.memo(ContactCell) actually skip unchanged cells
  // (the grid passes this straight down to every cell).
  const handleSaveField = useCallback(async (id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) => {
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
  }, [session?.access_token]);

  // Multi-field save used by interactions that touch more than one
  // column at once: the PlaceAutocomplete dropdown stores location +
  // formatted_address + place_id + tz + lat + lng in a single click;
  // the Company cell saves company_website alongside company. Same
  // optimistic-update + PATCH pattern as handleSaveField, just with
  // a generic patch object.
  const handleSavePatch = useCallback(async (id: string, patch: Partial<Contact>) => {
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
  }, [session?.access_token]);

  const handleSaveNotes = useCallback(async (id: string, notes: string) => {
    return handleSaveField(id, 'notes', notes);
  }, [handleSaveField]);

  // Rename / delete a dropdown option across every row at once.
  // `to: null` means delete (clear the value on every row that held
  // it). Hits the server-side bulk endpoint, then applies the same
  // transform locally so the grid + options list update before the
  // realtime channel echoes back.
  const handleBulkRenameOption = useCallback(async (column: 'company' | 'role' | 'specialty' | 'type', from: string, to: string | null) => {
    if (!session?.access_token) return;
    const res = await fetch('/api/contacts/rename-value', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ column, from, to }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't update: ${json.error ?? res.status}`);
      return;
    }
    const fromLower = from.toLowerCase();
    setRows((prev) => prev.map((r) => {
      const cur = (r as unknown as Record<string, unknown>)[column];
      if (Array.isArray(cur)) {
        if (!cur.some((v) => typeof v === 'string' && v.toLowerCase() === fromLower)) return r;
        let next: string[];
        if (to === null) {
          next = (cur as string[]).filter((v) => v.toLowerCase() !== fromLower);
        } else {
          const seen = new Set<string>();
          next = [];
          for (const v of cur as string[]) {
            const repl = v.toLowerCase() === fromLower ? to : v;
            const k = repl.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            next.push(repl);
          }
        }
        return { ...r, [column]: next.length === 0 ? null : next };
      }
      if (typeof cur === 'string' && cur.toLowerCase() === fromLower) {
        return { ...r, [column]: to };
      }
      return r;
    }));
  }, [session?.access_token]);

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
      {/* Single header row: title + contact count on the left, the
          three icon controls on the right — all on one line. */}
      <header className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold text-foreground tracking-tight">Contacts</h1>
          {rows.length > 0 && (
            <span className="text-[13px] text-foreground/40 tabular-nums">{rows.length.toLocaleString()}</span>
          )}
        </div>
        <InsightsCard
          fallback={insights}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onAddContact={() => setShowAdd(true)}
          onAddWithAI={() => setShowSuggest(true)}
          onUploadCsv={() => setShowImport(true)}
        />
      </header>


      <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="group relative w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, type, specialty, notes…"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-black/[0.07] bg-white text-[13px] text-foreground placeholder:text-foreground/40 shadow-[0_1px_2px_rgba(60,48,42,0.04)] hover:border-black/15 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full text-foreground/40 hover:text-foreground hover:bg-warm-bg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
      )}

      {(viewMode === 'map' || viewMode === 'insights') && (
        <div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 p-0 sm:p-6"
          onClick={() => setViewMode('table')}
        >
          <div
            className="relative w-full max-w-6xl h-full sm:h-auto sm:max-h-[90vh] bg-white rounded-none sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                {viewMode === 'map' ? 'Marketing map' : 'Marketing insights'}
              </h2>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className="text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
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
                <ContactsInsightsView contacts={sorted} loading={loading} />
              )}
            </div>
          </div>
        </div>
      )}

      <SimpleContactList
        loading={loading}
        rows={sorted}
        expandedId={expandedDetailsId}
        onToggle={(c) => setExpandedDetailsId((prev) => (prev === c.id ? null : c.id))}
        accessToken={session?.access_token ?? null}
        onOpenLog={(c) => setLogTarget(c)}
      />

      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          existingContacts={rows}
        />
      )}
      <QuickLogHost
        open={showNewLog}
        onOpenChange={setShowNewLog}
        roster={quickLogRoster}
        recents={quickLogRecents}
        onSubmit={handleQuickLog}
        onUndo={handleQuickLogUndo}
      />
      {/* Mobile-only "New log" FAB. Lives outside the rest of the
          layout so it pins to the viewport bottom with safe-area
          padding instead of inflating the page's vertical rhythm.
          Hidden on sm+ because admissions on desktop has the full
          row of header actions (Add Contact / Upload CSV / etc.)
          and doesn't need a thumb-reachable quick action.
          When a contact's details panel is expanded the FAB hides —
          the card's own LOG button is already on screen, and three
          stacked logging affordances (card LOG + panel button + FAB)
          read as clutter on a phone. It also hides while the
          quick-log sheet is open: the sheet renders its OWN fixed
          Save pill in the same spot (state-aware — disabled until a
          name is typed, shows progress), so keeping this one around
          produced two stacked save buttons. */}
      {!showNewLog && expandedDetailsId === null && (
      <button
        type="button"
        onClick={() => setShowNewLog(true)}
        className="sm:hidden fixed inset-x-4 z-50 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-foreground text-white text-sm font-semibold uppercase tracking-wider shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)] active:scale-[0.98] transition-all duration-200"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden className="text-base leading-none">🪵</span>
        New log
      </button>
      )}
      {showSuggest && (
        <SuggestWithClaudeModal
          token={session?.access_token ?? null}
          onClose={() => setShowSuggest(false)}
          onInserted={(inserted) => {
            // Optimistic prepend so the new rows show up in the grid
            // immediately. Realtime will reconcile if the server picks
            // up something slightly different (e.g. trigger-set columns).
            if (inserted.length > 0) {
              setRows((prev) => [...inserted, ...prev]);
            }
            setShowSuggest(false);
          }}
        />
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
          onSubmit={async (method, comments, transcript, durationSeconds, followUpDays) => { await handleLogContact(logTarget, method, comments, transcript, durationSeconds, followUpDays); }}
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

// SVG markup for a Tier 1 (premium) pin: gold + amber teardrop body
// with a white inner dot, flame plume above, and a pulsing radial
// glow halo at the base. The flame uses three stacked teardrops
// (red / amber / yellow) so the inner / outer flame layers shimmer
// independently. Larger than the regular pin (32x44 vs 22x32) so the
// "best partners" cluster reads as the loudest thing on the map.
const TIER1_PIN_SVG = `
  <span class="sa-pin-glow" aria-hidden="true"></span>
  <span class="sa-pin-flame" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 1 C 7 5, 4 8, 4 12 a7 7 0 1 0 14 0 c 0-3-3-6-7-11z" fill="#ef4444"/>
      <path d="M11 5 C 8.5 8, 7 10, 7 13 a4 4 0 1 0 8 0 c 0-2.5-2-4-4-8z" fill="#f59e0b"/>
      <path d="M11 9 C 9.5 11, 9 12, 9 13.5 a2 2 0 1 0 4 0 c 0-1.5-1-2-2-4.5z" fill="#fde047"/>
    </svg>
  </span>
  <svg class="sa-pin-body" width="32" height="44" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.92 0 0 4.92 0 11c0 8.25 11 21 11 21s11-12.75 11-21C22 4.92 17.08 0 11 0z" fill="url(#sa-pin-tier1-grad)" stroke="#fbbf24" stroke-width="0.6"/>
    <circle cx="11" cy="11" r="4.4" fill="#fff"/>
    <defs>
      <linearGradient id="sa-pin-tier1-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="60%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
    </defs>
  </svg>
`;

// SVG markup for the regular pin (Tier 2 / Tier 3 / unrated). Sized
// at 22x32 — about 70% of the Tier 1 footprint so the premium
// partners visibly tower over the rest at the same zoom level. Body
// fill is the brand copper.
const REGULAR_PIN_SVG = `
  <svg class="sa-pin-body" width="22" height="32" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.92 0 0 4.92 0 11c0 8.25 11 21 11 21s11-12.75 11-21C22 4.92 17.08 0 11 0z" fill="#bc6b4a"/>
    <circle cx="11" cy="11" r="4.2" fill="#fff"/>
  </svg>
`;

// Build the absolutely-positioned wrapper element that the OverlayView
// places at the marker's projected pixel. Tier 1 picks up the
// `sa-pin-tier1` class which lights up the flame + glow keyframes in
// globals.css; everything else gets the smaller plain pin. The title
// attribute carries the contact name so the browser's native tooltip
// surfaces it on hover (safe because `title` is auto-escaped by the
// DOM API — we never feed `name` into innerHTML).
function buildOutreachPinElement(contact: Contact, isTier1: boolean): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `sa-outreach-pin ${isTier1 ? 'sa-pin-tier1' : 'sa-pin-regular'}`;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('aria-label', `${contact.name || 'Contact'}${isTier1 ? ' — Tier 1' : ''}`);
  wrap.title = contact.name || '';
  wrap.innerHTML = isTier1 ? TIER1_PIN_SVG : REGULAR_PIN_SVG;
  return wrap;
}

// ─── Insights view ──────────────────────────────────────────────
//
// Outreach insights — a 10-phase analytics surface that sits next to
// the Table / Map tabs and rolls the contact list into KPI tiles,
// animated SVG charts, leaderboards, and conversion funnels. Phase 1
// only frames the page (header + 12-column responsive grid + section
// placeholders); each subsequent phase fills one of the panels.
function ContactsInsightsView({ contacts, loading }: { contacts: Contact[]; loading: boolean }) {
  const kpis = useMemo(() => computeOutreachKpis(contacts), [contacts]);
  // `loading` is true on first paint before the initial fetch resolves.
  // Render a skeleton in that window so the view doesn't flash a sea of
  // empty-state messages before the real data lands.
  if (loading && contacts.length === 0) {
    return <ContactsInsightsSkeleton />;
  }
  return (
    <div className="sa-outreach-insights rounded-xl border border-black/10 bg-white px-5 sm:px-6 py-5 sm:py-6 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Outreach insights</h2>
          <p className="mt-0.5 text-[12px] text-foreground/60">
            Live rollup of every contact in the grid — refreshes whenever a row, log, or rating changes.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/65 text-[10.5px] font-semibold tabular-nums">
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} in view
        </span>
      </div>

      {/* Phase 2 — KPI strip */}
      <KpiStrip kpis={kpis} />

      {/* All charts share a 12-column responsive grid; the layout
          shape was locked in from phase 1 and each subsequent phase
          replaced one dashed placeholder. */}
      <div className="grid grid-cols-12 gap-4">
        <TierMixDonut contacts={contacts} />
        <ThirtyDayTouchesChart contacts={contacts} />
        <ContactMethodMixBars contacts={contacts} />
        <TopPerformersLeaderboard contacts={contacts} />
        <StalenessFunnel contacts={contacts} />
        <PartnerConversionFunnel contacts={contacts} />
        <GeographicConcentration contacts={contacts} />
      </div>

      <p className="text-[10px] text-foreground/40 text-right tabular-nums">
        Live · derived client-side from the contacts table · last refresh {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
  );
}

// Mounted on the first paint of the Insights tab when the page is
// still fetching the initial contact list. Matches the real chart
// grid 1:1 so the layout doesn't shift when data lands; the panes
// shimmer via the existing sa-skeleton-shimmer keyframe rather than
// a hard "Loading…" string. Reduced-motion users get the panes at
// rest opacity instead of the shimmer.
function ContactsInsightsSkeleton() {
  return (
    <div className="sa-outreach-insights rounded-xl border border-black/10 bg-white px-5 sm:px-6 py-5 sm:py-6 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="sa-insights-skel h-5 w-44 rounded-md" />
          <div className="sa-insights-skel h-3 w-72 rounded-md" />
        </div>
        <div className="sa-insights-skel h-6 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sa-insights-skel h-[88px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="sa-insights-skel col-span-12 md:col-span-4 h-[230px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 md:col-span-8 h-[230px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 md:col-span-6 h-[200px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 md:col-span-6 h-[200px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 md:col-span-7 h-[200px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 md:col-span-5 h-[200px] rounded-xl" />
        <div className="sa-insights-skel col-span-12 h-[260px] rounded-xl" />
      </div>
    </div>
  );
}

interface OutreachKpis {
  total: number;
  contactedWeek: number;
  contactedMonth: number;
  stale: number;
  never: number;
  tier1: number;
}

function computeOutreachKpis(contacts: Contact[]): OutreachKpis {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const staleMs = 30 * 24 * 60 * 60 * 1000; // > 30d since last touch
  let contactedWeek = 0;
  let contactedMonth = 0;
  let stale = 0;
  let never = 0;
  let tier1 = 0;
  for (const c of contacts) {
    if (c.rating === 'Tier 1') tier1++;
    if (!c.last_contact_at) {
      never++;
      continue;
    }
    const ms = now - new Date(c.last_contact_at).getTime();
    if (ms < weekMs) contactedWeek++;
    if (ms < monthMs) contactedMonth++;
    if (ms > staleMs) stale++;
  }
  return { total: contacts.length, contactedWeek, contactedMonth, stale, never, tier1 };
}

function KpiStrip({ kpis }: { kpis: OutreachKpis }) {
  // Six tiles, each with its own accent. Bottom strip animates a tiny
  // proportion bar so admissions can eyeball "is this big or small
  // relative to the whole pipeline" without doing the math. The bar
  // scales horizontally on mount via a CSS transition, which gives
  // every tile a quiet "fill" beat when the page first paints.
  const total = Math.max(1, kpis.total);
  const tiles: Array<{ label: string; value: number; tone: string; bar: string; help: string }> = [
    { label: 'Total contacts', value: kpis.total, tone: 'text-foreground', bar: 'bg-foreground/55', help: 'Every row currently in view (search / filter applied).' },
    { label: 'Tier 1', value: kpis.tier1, tone: 'text-amber-700', bar: 'bg-amber-500', help: 'Premium partners flagged Tier 1 in the rating cell.' },
    { label: 'Contacted this week', value: kpis.contactedWeek, tone: 'text-emerald-700', bar: 'bg-emerald-500', help: 'Last contact logged within the last 7 days.' },
    { label: 'Contacted this month', value: kpis.contactedMonth, tone: 'text-sky-700', bar: 'bg-sky-500', help: 'Last contact logged within the last 30 days.' },
    { label: 'Stale (>30d)', value: kpis.stale, tone: 'text-rose-700', bar: 'bg-rose-500', help: 'No outreach in the last 30 days — owed a touch.' },
    { label: 'Never contacted', value: kpis.never, tone: 'text-foreground/65', bar: 'bg-foreground/35', help: 'No log entry yet.' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} share={t.value / total} />
      ))}
    </div>
  );
}

function KpiTile({
  label, value, tone, bar, help, share,
}: { label: string; value: number; tone: string; bar: string; help: string; share: number }) {
  // Bar grows from 0% width to its share on mount via CSS transition
  // — tiny but reads as the page exhaling once data lands. Re-runs on
  // value change because React keys the inner span by `share` so
  // remounts trigger the transition again.
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setW(Math.min(1, Math.max(0, share))));
    return () => window.cancelAnimationFrame(id);
  }, [share]);
  return (
    <div
      className="rounded-xl border border-black/10 bg-warm-bg/30 px-3.5 py-3 flex flex-col gap-2 transition-shadow hover:shadow-sm"
      title={help}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/55 truncate">{label}</p>
      <p className={`text-[22px] sm:text-[26px] font-semibold tabular-nums leading-none ${tone}`}>
        {value.toLocaleString()}
      </p>
      <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
        <span
          className={`block h-full rounded-full ${bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${(w * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

// Tier mix donut. SVG ring of four stacked arcs (Tier 1 / 2 / 3 /
// unrated) drawn via stroke-dasharray + stroke-dashoffset on a single
// circle path per slice. On mount each slice's offset shrinks from
// "fully hidden" (offset = circumference) down to its target offset
// over 700ms, so the wedges sweep clockwise from 12 o'clock to fill
// the ring in one beat. Hovering any slice slightly thickens its
// stroke + bumps a paired legend row's background so the ring and
// the legend read as one control. The center label flips between
// the total count and the hovered slice count.
const TIER_PALETTE: Array<{ key: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Unrated'; label: string; color: string; tint: string }> = [
  { key: 'Tier 1', label: 'Tier 1', color: '#f59e0b', tint: 'bg-amber-50' },
  { key: 'Tier 2', label: 'Tier 2', color: '#0ea5e9', tint: 'bg-sky-50' },
  { key: 'Tier 3', label: 'Tier 3', color: '#a3a3a3', tint: 'bg-foreground/5' },
  { key: 'Unrated', label: 'Unrated', color: '#e5e7eb', tint: 'bg-foreground/5' },
];

function TierMixDonut({ contacts }: { contacts: Contact[] }) {
  const counts = useMemo(() => {
    const out: Record<'Tier 1' | 'Tier 2' | 'Tier 3' | 'Unrated', number> = {
      'Tier 1': 0, 'Tier 2': 0, 'Tier 3': 0, 'Unrated': 0,
    };
    for (const c of contacts) {
      const k = (c.rating ?? 'Unrated') as keyof typeof out;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  }, [contacts]);
  const total = contacts.length;
  const [hover, setHover] = useState<string | null>(null);

  // Geometry. The viewBox is square; r = 60 leaves room for stroke
  // width 22 to render comfortably inside a 160 box. Circumference is
  // pre-computed so the slice math doesn't recompute on every render.
  const r = 60;
  const cx = 80;
  const cy = 80;
  const C = 2 * Math.PI * r;

  // Translate per-tier counts into rotation + arc-length offsets.
  // Each slice starts at the previous slice's end and consumes a
  // share of the circumference equal to its proportion.
  const slices: Array<{ key: string; color: string; rotation: number; length: number; share: number; count: number }> = [];
  let cursor = 0;
  for (const t of TIER_PALETTE) {
    const count = counts[t.key];
    const share = total > 0 ? count / total : 0;
    const length = share * C;
    slices.push({ key: t.key, color: t.color, rotation: cursor, length, share, count });
    cursor += share * 360;
  }

  // Mount animation: ring starts hidden (offset = C), then in the
  // next frame snaps to its target offset so the CSS transition
  // sweeps the slices in. Re-fires when total changes so adding /
  // removing a contact replays the reveal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [total, counts]);

  const centerCount = hover
    ? counts[hover as keyof typeof counts] ?? 0
    : total;
  const centerLabel = hover ?? 'Total';

  return (
    <div className="col-span-12 md:col-span-4 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Tier mix</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{total} total</span>
      </div>
      {total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-[11.5px] text-foreground/45">
          No contacts in view.
        </div>
      ) : (
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
          <svg viewBox="0 0 160 160" className="w-[160px] h-[160px] shrink-0" role="img" aria-label="Tier mix donut">
            {/* Track ring underneath so an empty / single-tier mix still reads as a circle. */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(0 0 0 / 0.05)" strokeWidth={22} />
            {slices.map((s) => {
              if (s.length <= 0.0001) return null;
              const target = C - s.length;
              return (
                <circle
                  key={s.key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === s.key ? 26 : 22}
                  strokeLinecap="butt"
                  strokeDasharray={`${s.length} ${C - s.length}`}
                  strokeDashoffset={mounted ? target : C}
                  transform={`rotate(${s.rotation - 90} ${cx} ${cy})`}
                  style={{
                    transition: 'stroke-dashoffset 700ms ease-out, stroke-width 160ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${s.key}: ${s.count} (${(s.share * 100).toFixed(1)}%)`}</title>
                </circle>
              );
            })}
            {/* Center text — flips between Total and the hovered slice. */}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 600 }}>
              {centerCount.toLocaleString()}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-foreground/55" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {centerLabel}
            </text>
          </svg>
          <ul className="flex-1 w-full space-y-1.5">
            {TIER_PALETTE.map((t) => {
              const c = counts[t.key];
              const share = total > 0 ? c / total : 0;
              const isHover = hover === t.key;
              return (
                <li
                  key={t.key}
                  onMouseEnter={() => setHover(t.key)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md cursor-default transition-colors ${isHover ? t.tint : ''}`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: t.color }}
                      aria-hidden
                    />
                    <span className="text-[12px] text-foreground/80 truncate">{t.label}</span>
                  </span>
                  <span className="text-[11px] text-foreground/55 tabular-nums shrink-0">
                    {c} <span className="text-foreground/35">·</span> {(share * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// 30-day daily touches line chart. Buckets every contact whose
// `last_contact_at` falls inside the last 30 days into one of 30
// daily slots (00:00 local → 23:59 local), then draws an area + line
// SVG that reveals via stroke-dashoffset on mount. Only the row's
// most-recent touch is counted (the Contact[] feed doesn't carry full
// log history) — multiple touches on the same row in the same day
// still contribute one to that day's bucket, which is fine for the
// "activity heat" signal we want here. Hovering anywhere on the
// chart snaps a vertical guideline + a tooltip to the nearest day.
function ThirtyDayTouchesChart({ contacts }: { contacts: Contact[] }) {
  const days = useMemo(() => {
    // 30 trailing days, oldest → newest. Each entry carries the
    // bucket midnight + a touch count.
    const out: Array<{ date: Date; key: string; count: number }> = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ date: d, key, count: 0 });
    }
    const idx: Record<string, number> = {};
    for (let i = 0; i < out.length; i++) idx[out[i].key] = i;
    for (const c of contacts) {
      if (!c.last_contact_at) continue;
      const d = new Date(c.last_contact_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (k in idx) out[idx[k]].count += 1;
    }
    return out;
  }, [contacts]);

  const total = days.reduce((acc, d) => acc + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const W = 720;
  const H = 220;
  const padL = 28;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xFor = (i: number) => padL + (i / (days.length - 1 || 1)) * innerW;
  const yFor = (v: number) => padT + innerH - (v / max) * innerH;

  // Smooth path via cardinal-spline-ish midpoint blending — keeps the
  // line silky without pulling in d3.
  const linePath = useMemo(() => {
    if (days.length === 0) return '';
    const pts = days.map((d, i) => [xFor(i), yFor(d.count)] as [number, number]);
    let p = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const xm = (x0 + x1) / 2;
      p += ` Q ${x0} ${y0}, ${xm} ${(y0 + y1) / 2}`;
      if (i === pts.length - 2) p += ` T ${x1} ${y1}`;
    }
    return p;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, max]);
  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const last = days.length - 1;
    return `${linePath} L ${xFor(last)} ${padT + innerH} L ${xFor(0)} ${padT + innerH} Z`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, days]);

  // stroke-dashoffset reveal — measure the path length once we have a
  // ref to the rendered <path>. Initial render uses an estimate, then
  // we replace it with the real getTotalLength() after mount.
  const lineRef = useRef<SVGPathElement | null>(null);
  const [pathLen, setPathLen] = useState(2000);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    if (lineRef.current) {
      try { setPathLen(lineRef.current.getTotalLength()); } catch { /* SVG not measurable */ }
    }
    const id = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(id);
  }, [linePath]);

  // Hover guideline + tooltip — find the nearest day to the cursor's x.
  const wrapRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = (wrapRef.current as SVGSVGElement).getBoundingClientRect();
    const xPx = e.clientX - r.left;
    const xSvg = (xPx / r.width) * W;
    const within = (xSvg - padL) / innerW;
    const i = Math.round(within * (days.length - 1));
    if (Number.isFinite(i)) setHoverIdx(Math.min(days.length - 1, Math.max(0, i)));
  }
  function onLeave() { setHoverIdx(null); }

  // X-axis labels at every 5th day so they don't crowd; format as
  // "Jul 12" using the user's locale.
  const xTicks = days.filter((_, i) => i % 5 === 0 || i === days.length - 1);
  const yTicks = [0, Math.ceil(max / 2), max];

  return (
    <div className="col-span-12 md:col-span-8 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Last 30 days · daily logs</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{total} {total === 1 ? 'log' : 'logs'}</span>
      </div>
      <div className="mt-2 relative">
        <svg
          ref={wrapRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[220px]"
          role="img"
          aria-label={`Daily logs over the last 30 days. Total ${total}.`}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <defs>
            <linearGradient id="sa-touches-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(188 107 74 / 0.45)" />
              <stop offset="100%" stopColor="rgb(188 107 74 / 0)" />
            </linearGradient>
          </defs>
          {/* horizontal grid lines */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={yFor(v)} y2={yFor(v)} stroke="rgb(0 0 0 / 0.06)" strokeWidth={1} />
              <text x={padL - 6} y={yFor(v) + 3} textAnchor="end" className="fill-foreground/45" style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{v}</text>
            </g>
          ))}
          {/* x-axis tick labels */}
          {xTicks.map((d, i) => (
            <text
              key={d.key}
              x={xFor(days.indexOf(d))}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-foreground/55"
              style={{ fontSize: 9 }}
            >
              {d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}
          {/* area fill — fades in alongside the line */}
          <path
            d={areaPath}
            fill="url(#sa-touches-fill)"
            style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms ease-out 200ms' }}
          />
          {/* line — stroke-dashoffset reveal */}
          <path
            ref={lineRef}
            d={linePath}
            fill="none"
            stroke="#bc6b4a"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={revealed ? 0 : pathLen}
            style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          {/* hover guideline + dot */}
          {hoverIdx !== null && (
            <g>
              <line
                x1={xFor(hoverIdx)} x2={xFor(hoverIdx)}
                y1={padT} y2={padT + innerH}
                stroke="rgb(0 0 0 / 0.18)" strokeDasharray="3 3"
              />
              <circle cx={xFor(hoverIdx)} cy={yFor(days[hoverIdx].count)} r={4.5} fill="#bc6b4a" stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>
        {/* HTML tooltip — easier to style than an SVG <foreignObject>. */}
        {hoverIdx !== null && (() => {
          const d = days[hoverIdx];
          const r = wrapRef.current?.getBoundingClientRect();
          const px = r ? (xFor(hoverIdx) / W) * r.width : 0;
          return (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-foreground text-white text-[10.5px] px-2 py-1.5 shadow-lg whitespace-nowrap"
              style={{ left: `${px}px`, top: `${(yFor(d.count) / H) * 220 - 4}px` }}
            >
              <p className="font-semibold tabular-nums">{d.count} {d.count === 1 ? 'log' : 'logs'}</p>
              <p className="text-white/65 text-[9.5px]">{d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Contact-method mix horizontal bars. Buckets every contact by its
// `last_contact_method`. Rows are derived from the shared
// CONTACT_METHODS registry so adding a new method (e.g. Smoke
// Signals) needs no edits here. To keep the panel scannable we
// only render method rows with at least 1 entry; the "Never"
// bucket always shows.
function ContactMethodMixBars({ contacts }: { contacts: Contact[] }) {
  type BucketKey = ContactMethod | 'Never';
  const buckets = useMemo(() => {
    const out = {} as Record<BucketKey, number>;
    for (const m of CONTACT_METHODS) out[m.value] = 0;
    out.Never = 0;
    for (const c of contacts) {
      if (!c.last_contact_method) out.Never += 1;
      else if (c.last_contact_method in out) out[c.last_contact_method as BucketKey] += 1;
      else out.Never += 1;
    }
    return out;
  }, [contacts]);
  const total = contacts.length;
  const max = Math.max(1, ...Object.values(buckets));

  const ROWS = useMemo(() => {
    const r: Array<{ key: BucketKey; label: string; tone: string; bar: string; help: string; Icon?: () => React.ReactNode }> = [];
    for (const m of CONTACT_METHODS) {
      if (buckets[m.value] === 0) continue;
      r.push({
        key: m.value,
        label: m.label,
        tone: m.tone.replace(/bg-\S+\s+/, '').replace(/border-\S+/, '').trim(),
        bar: m.barGradient,
        help: `Last touch was ${m.label.toLowerCase()}.`,
        Icon: m.Icon,
      });
    }
    r.push({
      key: 'Never',
      label: 'Never',
      tone: 'text-foreground/55',
      bar: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0.32))',
      help: 'Contact has no log entry yet.',
    });
    return r;
  }, [buckets]);

  // Mount animation — bars grow from 0% to their share-of-max width
  // on the next animation frame so the page feels alive when you
  // land on Insights. Re-fires when any bucket changes so a
  // logged-contact action makes its bar visibly grow.
  const bucketSignature = ROWS.map((r) => buckets[r.key]).join('|');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [bucketSignature]);

  return (
    <div className="col-span-12 md:col-span-6 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Contact methods</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{total} contacts</span>
      </div>
      {total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-[11.5px] text-foreground/45">
          No contacts in view.
        </div>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {ROWS.map((r, i) => {
            const v = buckets[r.key];
            const share = max === 0 ? 0 : v / max;
            const pct = total === 0 ? 0 : v / total;
            return (
              <li key={r.key} title={r.help} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${r.tone}`}>
                    {r.Icon && <span className="opacity-80"><r.Icon /></span>}
                    {r.label}
                  </span>
                  <span className="text-[11px] text-foreground/55 tabular-nums">
                    {v} <span className="text-foreground/35">·</span> {(pct * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-foreground/5 overflow-hidden">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(mounted ? share : 0) * 100}%`,
                      background: r.bar,
                      transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                      transitionDelay: `${i * 100}ms`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Top performers leaderboard. Counts how many times each teammate
// appears as the `last_contact_by_name` on a contact row over the
// last 30 days, ranks them desc, takes the top 5, and renders an
// avatar + name + bar + count list. Bars grow from 0 to share-of-#1
// on mount with a 100ms per-row stagger so the leaderboard cascades
// in. Same data shape the LastContactSummaryCell already reads —
// the avatar URL falls through to a generated initials chip when
// the user hasn't uploaded a photo yet. If nobody has logged a touch
// in the window the panel renders an empty-state hint instead of
// an empty list.
function TopPerformersLeaderboard({ contacts }: { contacts: Contact[] }) {
  const performers = useMemo(() => {
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - monthMs;
    const counts = new Map<string, { name: string; avatar: string | null; count: number }>();
    for (const c of contacts) {
      if (!c.last_contact_at) continue;
      const ts = new Date(c.last_contact_at).getTime();
      if (Number.isNaN(ts) || ts < cutoff) continue;
      const name = (c.last_contact_by_name ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
        if (!prev.avatar && c.last_contact_by_avatar_url) prev.avatar = c.last_contact_by_avatar_url;
      } else {
        counts.set(key, { name, avatar: c.last_contact_by_avatar_url ?? null, count: 1 });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [contacts]);

  const topCount = Math.max(1, ...performers.map((p) => p.count));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [performers]);

  return (
    <div className="col-span-12 md:col-span-6 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Top performers · last 30 days</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{performers.length} {performers.length === 1 ? 'teammate' : 'teammates'}</span>
      </div>
      {performers.length === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-[11.5px] text-foreground/45 text-center px-4">
          No outreach logged in the last 30 days.<br />
          Click the <span className="text-foreground/65 font-semibold">🪵</span> on any row to log a touchpoint and start the leaderboard.
        </div>
      ) : (
        <ol className="mt-2 space-y-2">
          {performers.map((p, i) => {
            const share = p.count / topCount;
            const initials = p.name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
            const isLeader = i === 0;
            return (
              <li key={p.name} className="flex items-center gap-2.5">
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold tabular-nums ${isLeader ? 'bg-amber-100 text-amber-700' : 'bg-foreground/5 text-foreground/55'}`}
                  title={`Rank #${i + 1}`}
                >
                  {i + 1}
                </span>
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt="" className="shrink-0 w-7 h-7 rounded-full object-cover border border-black/10" />
                ) : (
                  <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
                    {initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground truncate">{p.name}</span>
                    <span className="text-[11px] text-foreground/55 tabular-nums shrink-0">
                      {p.count} {p.count === 1 ? 'log' : 'logs'}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-foreground/5 overflow-hidden">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(mounted ? share : 0) * 100}%`,
                        background: isLeader
                          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          : 'linear-gradient(90deg, #bc6b4a, #6b2a14)',
                        transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                        transitionDelay: `${i * 100}ms`,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Staleness funnel. Buckets every contact by how long since the last
// touch — Fresh (<7d) / Cooling (7-21d) / Stale (>21d, ever touched)
// / Never (no log) — and renders a single stacked horizontal bar
// where each segment widens to its share of total on mount. Same
// thresholds as the existing `staleness()` helper used by the row
// tint hints in the table, so the colour language is consistent
// across surfaces. Hover any segment to halo it + reveal a count
// chip; click any segment to filter the contact list by that bucket
// (TODO in a later pass — this phase just establishes the visual).
function StalenessFunnel({ contacts }: { contacts: Contact[] }) {
  const buckets = useMemo(() => {
    const out = { Fresh: 0, Cooling: 0, Stale: 0, Never: 0 };
    for (const c of contacts) {
      if (!c.last_contact_at) { out.Never += 1; continue; }
      const days = (Date.now() - new Date(c.last_contact_at).getTime()) / 86_400_000;
      if (days < 7) out.Fresh += 1;
      else if (days < 21) out.Cooling += 1;
      else out.Stale += 1;
    }
    return out;
  }, [contacts]);
  const total = contacts.length;
  const SEGMENTS: Array<{ key: keyof typeof buckets; label: string; help: string; color: string; tone: string }> = [
    { key: 'Fresh',   label: 'Fresh',   help: '< 7 days since last touch', color: '#10b981', tone: 'text-emerald-700' },
    { key: 'Cooling', label: 'Cooling', help: '7 to 21 days since last touch', color: '#fbbf24', tone: 'text-amber-700' },
    { key: 'Stale',   label: 'Stale',   help: '> 21 days since last touch', color: '#f43f5e', tone: 'text-rose-700' },
    { key: 'Never',   label: 'Never',   help: 'No log entry yet', color: '#9ca3af', tone: 'text-foreground/55' },
  ];

  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState<keyof typeof buckets | null>(null);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [buckets.Fresh, buckets.Cooling, buckets.Stale, buckets.Never]);

  return (
    <div className="col-span-12 md:col-span-7 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Staleness funnel</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{total} contacts</span>
      </div>
      {total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-[11.5px] text-foreground/45">
          No contacts in view.
        </div>
      ) : (
        <>
          {/* Stacked bar — one row, four segments, with a thin
              divider between segments so adjacent same-ish tones don't
              blur into each other. */}
          <div className="mt-3 flex h-7 rounded-full overflow-hidden border border-black/5 bg-foreground/5">
            {SEGMENTS.map((s, i) => {
              const v = buckets[s.key];
              const share = total === 0 ? 0 : v / total;
              const isHover = hover === s.key;
              return (
                <span
                  key={s.key}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                  className="relative h-full"
                  style={{
                    flexBasis: `${(mounted ? share : 0) * 100}%`,
                    flexGrow: 0,
                    flexShrink: 0,
                    background: s.color,
                    transition: 'flex-basis 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: `${i * 90}ms`,
                    boxShadow: isHover ? 'inset 0 0 0 2px rgba(0,0,0,0.18)' : 'none',
                    cursor: 'default',
                  }}
                  title={`${s.label} — ${v} (${(share * 100).toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Legend rows underneath — same color squares + label +
              count + percent. Hover here also highlights the segment
              above so the two read as one composed control. */}
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEGMENTS.map((s) => {
              const v = buckets[s.key];
              const share = total === 0 ? 0 : v / total;
              const isHover = hover === s.key;
              return (
                <li
                  key={s.key}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${isHover ? 'bg-foreground/5' : ''}`}
                  title={s.help}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <p className={`text-[11.5px] font-semibold leading-none ${s.tone}`}>{s.label}</p>
                    <p className="mt-0.5 text-[10px] text-foreground/55 tabular-nums">
                      {v} <span className="text-foreground/30">·</span> {(share * 100).toFixed(0)}%
                    </p>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// Geographic concentration. Pulls the 2-letter state code out of
// each contact's `formatted_address` (Google's canonical format is
// "Street, City, ST ZIP, USA"), buckets them, ranks by count, and
// renders the top 10 as horizontal bars + a row of state code +
// count + percent. Each bar is colour-graded from the brand copper
// (rank 1) toward muted (rank 10) so the leaderboard reads as a
// concentration ramp, not a wall of identical bars. State abbrev is
// rendered in a square chip on the left so admissions can scan a
// vertical column of "TX | AZ | CA" at a glance. Bars grow from
// 0 to share-of-#1 on mount with a 60ms per-row stagger so the
// list cascades down. Contacts whose `formatted_address` doesn't
// match the canonical pattern get rolled into an "Other / unknown"
// stat at the bottom right of the card so the rollup never silently
// drops rows.
const STATE_REGEX = /,\s*([A-Z]{2})\s+\d{4,5}(?:-\d{4})?/;
function GeographicConcentration({ contacts }: { contacts: Contact[] }) {
  const { rows, unmatched } = useMemo(() => {
    const counts = new Map<string, number>();
    let unknown = 0;
    for (const c of contacts) {
      const addr = c.formatted_address ?? '';
      const m = STATE_REGEX.exec(addr);
      if (m) {
        const st = m[1];
        counts.set(st, (counts.get(st) ?? 0) + 1);
      } else if (addr || c.location) {
        unknown += 1;
      }
    }
    const r = Array.from(counts.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { rows: r, unmatched: unknown };
  }, [contacts]);

  const top = rows[0]?.count ?? 1;
  const total = contacts.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [rows]);

  return (
    <div className="col-span-12 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Geographic concentration · top states</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">
          {rows.length} {rows.length === 1 ? 'state' : 'states'}
          {unmatched > 0 ? ` · ${unmatched} unmapped` : ''}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-[11.5px] text-foreground/45 text-center px-4">
          No contacts have a recognised US state in their address.<br />
          Use the Location column on a row and pick from the place autocomplete to populate this chart.
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {rows.map((r, i) => {
            const share = r.count / top;
            const pct = total === 0 ? 0 : r.count / total;
            // Colour ramp: top of the leaderboard is the brand
            // copper, bottom is muted. Linearly interpolate alpha so
            // rank 1 is fully saturated and rank 10 is around 35%.
            const alpha = 1 - (i / Math.max(1, rows.length - 1)) * 0.6;
            const bg = `linear-gradient(90deg, rgba(188,107,74,${alpha.toFixed(2)}), rgba(107,42,20,${alpha.toFixed(2)}))`;
            return (
              <li key={r.state} className="flex items-center gap-2.5">
                <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-foreground/5 text-foreground/80 text-[11px] font-bold tabular-nums">
                  {r.state}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] text-foreground/65">Rank #{i + 1}</span>
                    <span className="text-[11px] text-foreground/55 tabular-nums shrink-0">
                      {r.count} <span className="text-foreground/35">·</span> {(pct * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-foreground/5 overflow-hidden">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(mounted ? share : 0) * 100}%`,
                        background: bg,
                        transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Partner conversion funnel. Three stages: every contact in the
// pipeline → contacts that have been touched at least once →
// contacts that converted into a partner (partner_id is non-null).
// Drawn as three stacked SVG trapezoids whose widths taper from the
// total width down toward the conversion stage, each shaded with
// the conventional pipeline gradient (cool blue at the top → warm
// gold at the bottom for the "converted" stage). On mount the
// trapezoids reveal via a clip-path that sweeps from height 0 to
// full height, top-to-bottom, with a 120ms per-stage stagger so the
// funnel paints from the widest stage down to the conversion
// stage. Each stage carries a count + percent-of-prior chip so the
// conversion rates read at a glance. Empty pipelines collapse to a
// muted hint.
function PartnerConversionFunnel({ contacts }: { contacts: Contact[] }) {
  const stages = useMemo(() => {
    const total = contacts.length;
    let touched = 0;
    let converted = 0;
    for (const c of contacts) {
      if (c.last_contact_at) touched++;
      if (c.partner_id) converted++;
    }
    return [
      { key: 'all',       label: 'All contacts',  count: total,     color: ['#bae6fd', '#0ea5e9'], help: 'Every row currently in view.' },
      { key: 'touched',   label: 'Contacted',     count: touched,   color: ['#a7f3d0', '#10b981'], help: 'Have at least one logged touch.' },
      { key: 'converted', label: 'Partner',       count: converted, color: ['#fde68a', '#f59e0b'], help: 'Upgraded to a full partner record.' },
    ];
  }, [contacts]);

  const top = Math.max(1, stages[0].count);
  const W = 420;
  const stageH = 64;
  const gap = 8;
  const H = stages.length * stageH + (stages.length - 1) * gap;

  // Each stage's top + bottom width is a share of the leading stage.
  // Top width matches the previous stage's bottom width so the funnel
  // reads as one continuous taper.
  const widths = stages.map((s) => Math.max(40, (s.count / top) * W));
  const inset = (w: number) => (W - w) / 2;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [stages[0].count, stages[1].count, stages[2].count]);

  return (
    <div className="col-span-12 md:col-span-5 rounded-xl border border-black/10 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">Partner conversion funnel</p>
        <span className="text-[10.5px] text-foreground/45 tabular-nums">{stages[0].count} in</span>
      </div>
      {stages[0].count === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-[11.5px] text-foreground/45">
          No contacts in view.
        </div>
      ) : (
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px] h-auto" role="img" aria-label="Partner conversion funnel">
            <defs>
              {stages.map((s, i) => (
                <linearGradient key={s.key} id={`sa-funnel-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color[0]} />
                  <stop offset="100%" stopColor={s.color[1]} />
                </linearGradient>
              ))}
              <clipPath id="sa-funnel-clip" clipPathUnits="userSpaceOnUse">
                <rect x="0" y="0" width={W} height={mounted ? H : 0} style={{ transition: 'height 1000ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
              </clipPath>
            </defs>
            <g clipPath="url(#sa-funnel-clip)">
              {stages.map((s, i) => {
                const yTop = i * (stageH + gap);
                const yBot = yTop + stageH;
                const topW = i === 0 ? widths[i] : widths[i - 1];
                const botW = widths[i];
                const xtl = inset(topW);
                const xtr = W - inset(topW);
                const xbl = inset(botW);
                const xbr = W - inset(botW);
                return (
                  <g key={s.key} style={{ opacity: mounted ? 1 : 0, transition: `opacity 600ms ease-out ${i * 120}ms` }}>
                    <path
                      d={`M ${xtl} ${yTop} L ${xtr} ${yTop} L ${xbr} ${yBot} L ${xbl} ${yBot} Z`}
                      fill={`url(#sa-funnel-${i})`}
                      stroke="rgba(0,0,0,0.06)"
                    />
                    <text x={W / 2} y={yTop + stageH / 2 - 4} textAnchor="middle" className="fill-white" style={{ fontSize: 18, fontWeight: 600 }}>
                      {s.count.toLocaleString()}
                    </text>
                    <text x={W / 2} y={yTop + stageH / 2 + 13} textAnchor="middle" className="fill-white/85" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      {s.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          {/* Conversion-rate chips column. Each chip pairs with a
              stage and reads the conversion vs. the prior stage. */}
          <ul className="flex-1 w-full space-y-1.5">
            {stages.map((s, i) => {
              const prior = i === 0 ? s.count : stages[i - 1].count;
              const rate = prior === 0 ? 0 : s.count / prior;
              return (
                <li key={s.key} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-foreground/5" title={s.help}>
                  <span className="text-[11px] font-semibold text-foreground/75">{s.label}</span>
                  <span className="text-[11px] text-foreground/55 tabular-nums">
                    {s.count}
                    {i > 0 && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/80 border border-black/5 text-[10px] font-semibold text-foreground/65">
                        {(rate * 100).toFixed(0)}% of prior
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function InsightsPlaceholder({ span, label, hint }: { span: string; label: string; hint: string }) {
  return (
    <div className={`${span} rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-4 py-5 min-h-[140px] flex flex-col items-center justify-center text-center`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className="mt-1 text-[11.5px] text-foreground/45">{hint}</p>
    </div>
  );
}

// Outreach map view. Renders contacts with lat/lng as custom HTML
// markers on a US-centred map; click a marker to open a side panel
// with the contact's contact-card info + jump-to-table affordance.
// Tier 1 contacts get a larger animated-flame / glowing pin so the
// premium partners visibly tower over the rest at the same zoom level.
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = g.maps as any;

    // Clear existing
    for (const m of markersRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any).setMap?.(null);
    }
    markersRef.current = [];

    if (mapped.length === 0) return;

    // Custom HTML pin via OverlayView so we can layer CSS animations
    // on top of the marker (animated flame + glow halo for Tier 1).
    // The classic google.maps.Marker only accepts static SVG/PNG icons
    // and can't host child DOM elements, which is why we drop down to
    // OverlayView here. The class is defined inside the effect because
    // OverlayView is only available once Maps JS has loaded.
    class HtmlPinMarker extends maps.OverlayView {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      position: any;
      el: HTMLElement;
      onClick: () => void;
      mounted: HTMLElement | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(position: any, el: HTMLElement, onClick: () => void) {
        super();
        this.position = position;
        this.el = el;
        this.onClick = onClick;
      }
      onAdd() {
        this.el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onClick();
        });
        this.getPanes().overlayMouseTarget.appendChild(this.el);
        this.mounted = this.el;
      }
      draw() {
        const projection = this.getProjection();
        if (!projection || !this.mounted) return;
        const point = projection.fromLatLngToDivPixel(this.position);
        if (point) {
          this.mounted.style.left = `${point.x}px`;
          this.mounted.style.top = `${point.y}px`;
        }
      }
      onRemove() {
        if (this.mounted && this.mounted.parentNode) {
          this.mounted.parentNode.removeChild(this.mounted);
        }
        this.mounted = null;
      }
    }

    const bounds = new maps.LatLngBounds();
    // Render Tier 1 pins LAST so they paint on top of every other pin
    // when their bounding boxes overlap. The flame plume + glow halo
    // would otherwise get clipped by neighbouring pins at busy zoom
    // levels.
    const ordered = mapped.slice().sort((a, b) => {
      const aT1 = a.rating === 'Tier 1' ? 1 : 0;
      const bT1 = b.rating === 'Tier 1' ? 1 : 0;
      return aT1 - bT1;
    });
    for (const c of ordered) {
      const isTier1 = c.rating === 'Tier 1';
      const el = buildOutreachPinElement(c, isTier1);
      const ll = new maps.LatLng(c.lat as number, c.lng as number);
      const marker = new HtmlPinMarker(ll, el, () => setSelected(c));
      marker.setMap(mapRef.current);
      markersRef.current.push(marker);
      bounds.extend(ll);
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
          {/* Selected-pin card. Centered overlay (used to live in the
              top-right corner where it collided with map controls and
              clipped pins near the edge of the viewport). The wrapper
              keeps pointer events on the card itself; clicking the
              backdrop dismisses the selection so the map stays fully
              interactive everywhere outside the card. */}
          {selected && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center px-4"
              onClick={() => setSelected(null)}
            >
              <div
                className="w-80 max-w-[calc(100%-1.5rem)] rounded-xl border border-black/10 bg-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
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
                    Contact history
                  </button>
                </div>
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

// ── Simple contact list ───────────────────────────────────────
// Each contact is its own card: the contact's name on the left and,
// on the right, the picture of whoever last logged a touch (no name /
// timestamp text — the avatar carries it, with the detail on hover).
// Clicking the card expands the full ContactDetailsDrawer inline.
function SimpleContactRow({
  contact: c,
  expanded,
  accessToken,
  onToggle,
  onOpenLog,
}: {
  contact: Contact;
  expanded: boolean;
  accessToken: string | null;
  onToggle: () => void;
  onOpenLog: () => void;
}) {
  const lastByTip = c.last_contact_at
    ? `Last contacted by ${c.last_contact_by_name || 'Unknown'} · ${fmtAgo(c.last_contact_at)}`
    : undefined;
  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 60px' }}
      className={`rounded-xl border bg-white transition-colors ${expanded ? 'border-primary/30 ring-1 ring-primary/15' : 'border-black/10 hover:border-black/20'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">{c.name}</span>
        {/* Picture of whoever last logged a touch — right-aligned. */}
        {c.last_contact_at && (
          c.last_contact_by_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.last_contact_by_avatar_url}
              alt={c.last_contact_by_name ?? ''}
              title={lastByTip}
              className="shrink-0 w-8 h-8 rounded-full object-cover bg-warm-bg"
            />
          ) : (
            <span
              title={lastByTip}
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-bg text-[11px] font-semibold text-foreground/55"
            >
              {(c.last_contact_by_name || '?').charAt(0).toUpperCase()}
            </span>
          )
        )}
      </button>
      {expanded && (
        <div className="border-t border-black/5">
          <ContactDetailsDrawer
            contact={c}
            accessToken={accessToken}
            onLogContact={onOpenLog}
            onClose={onToggle}
          />
        </div>
      )}
    </div>
  );
}

function SimpleContactList({
  loading,
  rows,
  expandedId,
  onToggle,
  accessToken,
  onOpenLog,
}: {
  loading: boolean;
  rows: Contact[];
  expandedId: string | null;
  onToggle: (c: Contact) => void;
  accessToken: string | null;
  onOpenLog: (c: Contact) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
            <span className="flex-1 h-3.5 w-1/3 rounded bg-foreground/8 animate-pulse" />
            <span className="w-8 h-8 rounded-full bg-foreground/8 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 bg-white px-4 py-12 text-center text-[13px] text-foreground/45">
        No contacts yet. Click <span className="font-semibold">Add contact</span> to start.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((c) => (
        <SimpleContactRow
          key={c.id}
          contact={c}
          expanded={expandedId === c.id}
          accessToken={accessToken}
          onToggle={() => onToggle(c)}
          onOpenLog={() => onOpenLog(c)}
        />
      ))}
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
  typeOptions,
  specialtyOptions,
  selectedIds,
  onToggleSelectOne,
  onToggleSelectMany,
  onBulkRenameOption,
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
  typeOptions: string[];
  specialtyOptions: string[];
  selectedIds: Set<string>;
  onToggleSelectOne: (id: string) => void;
  onToggleSelectMany: (ids: string[], on: boolean) => void;
  onBulkRenameOption: (column: 'company' | 'role' | 'specialty' | 'type', from: string, to: string | null) => Promise<void>;
}) {
  // Tracks the row whose notes-editor strip is currently expanded.
  // Click the notes cell to toggle. Persists across rerenders via a
  // simple id string; null when collapsed.
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  // Anchor for shift-click range selection — the last row id the user
  // toggled with a plain click. Shift-click on a later (or earlier)
  // row selects every row between the anchor and that row in the
  // current `rows` order. Updated on every plain row click so the
  // anchor follows the user's hand naturally.
  const lastClickedIdRef = useRef<string | null>(null);
  // Centralised row-click handler. Handles three modes:
  //   * shift-click → range-select from anchor to current row
  //   * plain click on a row → toggle just this row + update anchor
  //   * click on a checkbox or interactive cell → bubbles handled by
  //     each control; this handler bails via isInteractiveClick
  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement | HTMLDivElement>, rowId: string) => {
      if (isInteractiveClick(e.target)) return;
      // Suppress when the user is dragging to highlight text inside
      // a cell — otherwise the release click toggles selection.
      const sel = window.getSelection?.();
      if (sel && sel.toString().length > 0) return;
      if (e.shiftKey && lastClickedIdRef.current && lastClickedIdRef.current !== rowId) {
        const ids = rows.map((r) => r.id);
        const aIdx = ids.indexOf(lastClickedIdRef.current);
        const bIdx = ids.indexOf(rowId);
        if (aIdx >= 0 && bIdx >= 0) {
          const [start, end] = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
          // Clear the browser's text-range selection that shift-click
          // would otherwise paint across the table, so the visual is
          // just the row highlights.
          window.getSelection?.()?.removeAllRanges();
          onToggleSelectMany(ids.slice(start, end + 1), true);
          // Anchor stays put on shift-click so the user can refine
          // the range with a follow-up shift-click without losing
          // their starting point.
          return;
        }
      }
      onToggleSelectOne(rowId);
      lastClickedIdRef.current = rowId;
    },
    [rows, onToggleSelectMany, onToggleSelectOne],
  );
  // Stable per-row callbacks so the memoized ContactRow only re-renders
  // the row that actually changed (toggling one row's notes / action menu
  // must not re-render the other ~1100 rows). setState identities are
  // stable, so these useCallbacks never change after first render.
  const toggleNotes = useCallback((id: string) => setExpandedNotesId((p) => (p === id ? null : id)), []);
  const closeNotes = useCallback(() => setExpandedNotesId(null), []);
  const openMenu = useCallback((id: string, rect: DOMRect) => setActionMenuFor({ id, rect }), [setActionMenuFor]);
  const closeMenu = useCallback(() => setActionMenuFor(null), [setActionMenuFor]);

  // Progressive first render. The cold load mounts 1000+ rows at once —
  // and because both the desktop table AND the mobile card list render
  // (one is just CSS-hidden), that's ~2× the React reconcile cost up
  // front, the single biggest source of "sluggish load". Mount a first
  // screenful immediately, then grow the cap a chunk per animation frame
  // so the grid paints fast and the rest streams in off the critical
  // path. The cap only GROWS, so once it reaches the row count it stays
  // there — edits / search / sort (which keep or shrink the count) then
  // render in full with no flash.
  const [renderCap, setRenderCap] = useState(60);
  useEffect(() => {
    if (renderCap >= rows.length) return;
    const id = requestAnimationFrame(() => setRenderCap((n) => n + 250));
    return () => cancelAnimationFrame(id);
  }, [renderCap, rows.length]);
  const cappedRows = rows.length > renderCap ? rows.slice(0, renderCap) : rows;
  // The last-contact summary now lives inside `columns` (right after
  // Name) instead of a trailing sticky cell, so the only fixed cells
  // are the leading checkbox and the trailing 3-dot action expander.
  // +1 for the checkbox, +1 for the expander.
  const totalCols = columns.length + 2;
  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = visibleIds.some((id) => selectedIds.has(id));

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  // Mount the desktop table OR the mobile cards — never both. Rendering
  // both (CSS-hidden) doubled the React row count. Defaults to desktop on
  // the server so the admin-primary case hydrates without a flash.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // The expanded Notes editor and Contact-history panel live inside
  // <td colSpan>, which by default stretches with the horizontally
  // scrolling table — so the editor used to bleed off the right edge
  // when many columns were visible. Tracking the scroll container's
  // clientWidth lets us pin those panels to the visible viewport with
  // position:sticky + width=<viewport>, so they always read as the
  // full page width and never the full table width.
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    // Coalesce the high-frequency ResizeObserver firings into one update
    // per animation frame, and only commit when the width actually
    // changed — so a drag-resize doesn't spam setState every pixel.
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const w = el.clientWidth;
      if (w !== last) { last = w; setViewportWidth(w); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <>
      {isDesktop && <FloatingScrollbar tableRef={tableScrollRef} />}
      {isDesktop && (
      <div className="block">
      <div
        ref={tableScrollRef}
        data-outreach-table
        className="overflow-x-auto rounded-xl border border-black/10 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <table className="w-full text-[11.5px] table-fixed">
        {/* <colgroup> drives the actual column widths so resize is
            cheap (only one node per column needs its width set, not
            every cell). Default widths from `DEFAULT_COL_WIDTHS_PX`
            are overridden by the shared `column_widths` map when the
            org has saved a layout. */}
        <colgroup>
          <col style={{ width: `${SELECT_COL_WIDTH_PX}px` }} />
          {columns.map((c) => {
            const w = columnWidths[c.key] ?? DEFAULT_COL_WIDTHS_PX[c.key] ?? 180;
            return <col key={c.key} style={{ width: `${w}px` }} />;
          })}
          <col style={{ width: `${EXPANDER_COL_WIDTH_PX}px` }} />
        </colgroup>
        <thead className="bg-warm-bg/50 text-left text-[10px] uppercase tracking-wider text-foreground/55">
          <tr>
            <th className="px-2 py-2 text-center">
              <CircleCheckbox
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onToggle={() => onToggleSelectMany(visibleIds, !allSelected)}
                ariaLabel={allSelected ? 'Deselect all' : 'Select all'}
                size="sm"
              />
            </th>
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
            {/* Only the 3-dot action expander stays pinned right now —
                the last-contact summary moved into `columns` (the
                "engagement" key, right after Name) and scrolls with
                the rest of the table. */}
            <th className="sticky right-0 z-20 bg-[#faf8f5]/70 backdrop-blur-md backdrop-saturate-150 px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {loading ? (
            // Skeleton rows — gives the eye the table's structure
            // instantly instead of an empty "Loading…" line, so the
            // page feels live the moment its bundle hydrates.
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`sk-${i}`} className="align-middle">
                <td className="px-2 py-3 text-center">
                  <span className="inline-block w-[18px] h-[18px] rounded-full bg-foreground/8 animate-pulse" />
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3">
                    <span
                      className="block h-3 rounded bg-foreground/8 animate-pulse"
                      style={{ width: `${40 + ((i + col.key.length) % 5) * 12}%` }}
                    />
                  </td>
                ))}
                <td className="px-3 py-3" />
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-3 py-12 text-center text-foreground/45">
                No contacts yet. Click <span className="font-semibold">Add contact</span> to start.
              </td>
            </tr>
          ) : (
            cappedRows.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                columns={columns}
                totalCols={totalCols}
                selected={selectedIds.has(c.id)}
                isNew={isNewToUser(c)}
                notesExpanded={expandedNotesId === c.id}
                detailsExpanded={expandedDetailsId === c.id}
                menuOpen={actionMenuFor?.id === c.id}
                menuRect={actionMenuFor?.id === c.id ? actionMenuFor.rect : null}
                // Only the expanded row needs the live viewport width (for
                // its full-bleed panel). Passing it to every row would make
                // a browser resize re-render all ~1100 rows each frame; the
                // rest get a stable null so memo skips them on resize.
                viewportWidth={expandedNotesId === c.id || expandedDetailsId === c.id ? viewportWidth : null}
                accessToken={accessToken}
                companyOptions={companyOptions}
                roleOptions={roleOptions}
                typeOptions={typeOptions}
                specialtyOptions={specialtyOptions}
                onRowClick={handleRowClick}
                onToggleSelect={onToggleSelectOne}
                onContact={onContact}
                onUpgrade={onUpgrade}
                onHistory={onHistory}
                onDelete={onDelete}
                onOpenLog={onOpenLog}
                onSaveField={onSaveField}
                onSavePatch={onSavePatch}
                onSaveNotes={onSaveNotes}
                onBulkRenameOption={onBulkRenameOption}
                onToggleNotes={toggleNotes}
                onCloseNotes={closeNotes}
                onOpenMenu={openMenu}
                onCloseMenu={closeMenu}
              />
            ))
          )}
        </tbody>
      </table>
      </div>
      </div>
      )}

      {/* Mobile card layout — table is hard to scan on phones, so
          each contact gets its own stacked card with every field
          inline + the same engagement actions. Mounted only on small
          screens so the desktop table's rows aren't doubled. */}
      {!isDesktop && (
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[13px] text-foreground/45">
            Loading contacts…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[13px] text-foreground/45">
            No contacts yet. Tap <span className="font-semibold">Add contact</span> to start.
          </div>
        ) : (
          cappedRows.map((c) => (
            <ContactMobileCard
              key={c.id}
              contact={c}
              expanded={expandedDetailsId === c.id}
              accessToken={accessToken}
              selected={selectedIds.has(c.id)}
              onToggleSelect={() => onToggleSelectOne(c.id)}
              onContact={() => onContact(c)}
              onUpgrade={() => onUpgrade(c)}
              onHistory={() => onHistory(c)}
              onOpenLog={() => onOpenLog(c)}
              onDelete={() => onDelete(c)}
            />
          ))
        )}
      </div>
      )}
    </>
  );
}

// One desktop table row, memoized so a render of the grid (selection,
// opening another row's menu, expanding another row, the deferred search)
// only re-renders the rows whose own props changed — not all ~1100. The
// grid feeds it per-row PRIMITIVES (selected / isNew / notesExpanded /
// detailsExpanded / menuOpen booleans) instead of the shared Sets + ids,
// and the callbacks it takes are all stable (useCallback in the parent),
// so React.memo's shallow compare holds for every untouched row.
interface ContactRowProps {
  contact: Contact;
  columns: ColumnDef[];
  totalCols: number;
  selected: boolean;
  isNew: boolean;
  notesExpanded: boolean;
  detailsExpanded: boolean;
  menuOpen: boolean;
  menuRect: DOMRect | null;
  viewportWidth: number | null;
  accessToken: string | null;
  companyOptions: string[];
  roleOptions: string[];
  typeOptions: string[];
  specialtyOptions: string[];
  onRowClick: (e: React.MouseEvent<HTMLTableRowElement>, id: string) => void;
  onToggleSelect: (id: string) => void;
  onContact: (c: Contact) => void;
  onUpgrade: (c: Contact) => void;
  onHistory: (c: Contact) => void;
  onDelete: (c: Contact) => void;
  onOpenLog: (c: Contact) => void;
  onSaveField: (id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
  onSavePatch: (id: string, patch: Partial<Contact>) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onBulkRenameOption: (column: 'company' | 'role' | 'specialty' | 'type', from: string, to: string | null) => Promise<void>;
  onToggleNotes: (id: string) => void;
  onCloseNotes: () => void;
  onOpenMenu: (id: string, rect: DOMRect) => void;
  onCloseMenu: () => void;
}

const ContactRow = memo(function ContactRow({
  contact: c,
  columns,
  totalCols,
  selected,
  isNew,
  notesExpanded,
  detailsExpanded,
  menuOpen,
  menuRect,
  viewportWidth,
  accessToken,
  companyOptions,
  roleOptions,
  typeOptions,
  specialtyOptions,
  onRowClick,
  onToggleSelect,
  onContact,
  onUpgrade,
  onHistory,
  onDelete,
  onOpenLog,
  onSaveField,
  onSavePatch,
  onSaveNotes,
  onBulkRenameOption,
  onToggleNotes,
  onCloseNotes,
  onOpenMenu,
  onCloseMenu,
}: ContactRowProps) {
  return (
    <Fragment>
      <tr
        onMouseDown={(e) => {
          // Shift+plain-mousedown would otherwise paint a browser text-
          // selection across the table before our click handler fires.
          // Suppress only when shift is held AND the click target is
          // non-interactive, so inputs/buttons still focus.
          if (e.shiftKey && !isInteractiveClick(e.target)) e.preventDefault();
        }}
        onClick={(e) => onRowClick(e, c.id)}
        // content-visibility lets the browser skip layout + paint for rows
        // that aren't near the viewport — paint-side virtualization. The
        // memo above is the React-side counterpart (skip reconcile).
        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 44px' }}
        className={`group align-middle transition-colors cursor-pointer ${selected ? 'bg-primary/[0.06] hover:bg-primary/10' : isNew ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-warm-bg/40'}`}
      >
        <td className="px-2 py-2.5 text-center align-middle">
          <CircleCheckbox
            checked={selected}
            onToggle={() => onToggleSelect(c.id)}
            ariaLabel={`Select ${c.name}`}
            size="sm"
          />
        </td>
        {columns.map((col) => {
          if (col.key === 'engagement') {
            // Simplified last-contact cell: just the summary (click to
            // expand history) + a light chevron. The log-a-contact button
            // moved to the Name cell (hover-revealed).
            return (
              <td
                key={col.key}
                data-no-row-select
                className={`px-3 py-2.5 align-middle transition-colors ${detailsExpanded ? 'bg-warm-bg/50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onHistory(c)}
                  className="w-full min-w-0 flex items-center justify-between gap-1.5 text-left rounded-md px-1 -mx-1 hover:bg-warm-bg/60 transition-colors"
                  title={detailsExpanded ? 'Hide history' : 'Show contact history'}
                  aria-expanded={detailsExpanded}
                >
                  <span className="min-w-0 flex-1">
                    <LastContactSummaryCell contact={c} />
                  </span>
                  {/* Light chevron — no boxed border at rest; it just
                      darkens + flips when the row's history is open. */}
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-5 h-5 transition-all ${detailsExpanded ? 'text-foreground rotate-180' : 'text-foreground/35 group-hover:text-foreground/60'}`}
                    aria-hidden
                  >
                    <ChevronDownIcon />
                  </span>
                </button>
              </td>
            );
          }
          if (col.key === 'notes') {
            return (
              <td
                key={col.key}
                data-no-row-select
                className="px-3 py-2.5 align-middle cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onToggleNotes(c.id); }}
                title={c.notes ? 'Click to edit notes' : 'Click to add notes'}
              >
                <div className={`rounded-md px-2 -mx-2 py-1 transition-colors ${notesExpanded ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/40'}`}>
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
              <ContactCell column={col} contact={c} onSaveField={onSaveField} onSavePatch={onSavePatch} isNew={isNew} companyOptions={companyOptions} roleOptions={roleOptions} typeOptions={typeOptions} specialtyOptions={specialtyOptions} onBulkRenameOption={onBulkRenameOption} onLogContact={onContact} />
            </td>
          );
        })}
        {/* Only the 3-dot action menu stays pinned right; the last-contact
            panel moved into the scrolling columns above. */}
        <td className={`sticky right-0 z-10 px-2 py-2.5 text-right transition-colors ${isNew ? 'bg-[#fbf2ed] group-hover:bg-[#f7e8df]' : 'bg-white/95 group-hover:bg-white'}`}>
          <button
            type="button"
            onClick={(e) => {
              if (menuOpen) { onCloseMenu(); return; }
              onOpenMenu(c.id, (e.currentTarget as HTMLButtonElement).getBoundingClientRect());
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-foreground hover:bg-warm-bg"
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <DotsIcon />
          </button>
          {menuOpen && menuRect && (
            <ActionMenuPortal
              rect={menuRect}
              hasPartner={!!c.partner_id}
              onClose={onCloseMenu}
              onContact={() => { onCloseMenu(); onContact(c); }}
              onUpgrade={() => { onCloseMenu(); onUpgrade(c); }}
              onHistory={() => { onCloseMenu(); onHistory(c); }}
              onDelete={() => { onCloseMenu(); onDelete(c); }}
            />
          )}
        </td>
      </tr>
      {notesExpanded && (
        <tr className="bg-warm-bg/30">
          <td colSpan={totalCols} className="p-0">
            <div className="sticky left-0 px-4 py-4" style={viewportWidth ? { width: viewportWidth } : undefined}>
              <NotesEditor
                initial={c.notes ?? ''}
                onCancel={onCloseNotes}
                onSave={async (next) => { await onSaveNotes(c.id, next); onCloseNotes(); }}
              />
            </div>
          </td>
        </tr>
      )}
      {detailsExpanded && (
        <tr className="bg-warm-bg/30">
          <td colSpan={totalCols} className="p-0">
            <div className="sticky left-0 px-4 py-4" style={viewportWidth ? { width: viewportWidth } : undefined}>
              <ContactDetailsDrawer
                contact={c}
                accessToken={accessToken}
                onLogContact={() => onOpenLog(c)}
                onClose={() => onHistory(c)}
                historyOnly
              />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
});

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
      // Skip the state update when nothing measurable changed — a
      // capture-phase scroll listener fires on every scrollable
      // container, so most ticks produce identical geometry and a
      // bare setLayout({...}) would re-render the portal every time.
      setLayout((prev) =>
        prev.visible
        && prev.left === rect.left
        && prev.width === trackW
        && prev.thumbLeft === thumbLeft
        && prev.thumbWidth === thumbW
        && prev.pct === pct
          ? prev
          : { left: rect.left, width: trackW, thumbLeft, thumbWidth: thumbW, visible: true, pct },
      );
      setCurrentLabel(pickLabel(t));
    }
    // Coalesce the high-frequency scroll/resize/ResizeObserver firings
    // into at most one measure() per animation frame.
    let rafId: number | null = null;
    function scheduleMeasure() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => { rafId = null; measure(); });
    }
    measure();
    const t = tableRef.current;
    if (!t) return;
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(t);
    Array.from(t.children).forEach((c) => ro.observe(c as Element));
    document.addEventListener('scroll', scheduleMeasure, { capture: true, passive: true });
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      ro.disconnect();
      document.removeEventListener('scroll', scheduleMeasure, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('resize', scheduleMeasure);
      if (rafId != null) cancelAnimationFrame(rafId);
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

// Memoized so a render of the parent grid (e.g. the deferred search
// recompute, or any unrelated state change) only re-renders cells
// whose contact object actually changed. Row updates are immutable
// ({ ...r, ...patch }), so a changed row gets a fresh reference and
// its cells re-render; unchanged rows keep their reference and skip.
// The handler + option-array props are stabilized (useCallback /
// useMemo) in the parent so the shallow prop compare holds.
const ContactCell = memo(function ContactCell({
  column,
  contact,
  onSaveField,
  onSavePatch,
  isNew = false,
  companyOptions = [],
  roleOptions = [],
  typeOptions = [],
  specialtyOptions = [],
  onBulkRenameOption,
  onLogContact,
}: {
  column: ColumnDef;
  contact: Contact;
  onSaveField: (id: string, field: 'name' | 'company' | 'role' | 'phone' | 'phone_cell' | 'phone_office' | 'email' | 'location' | 'notes', value: string) => Promise<void>;
  onSavePatch: (id: string, patch: Partial<Contact>) => Promise<void>;
  isNew?: boolean;
  companyOptions?: string[];
  roleOptions?: string[];
  typeOptions?: string[];
  specialtyOptions?: string[];
  onBulkRenameOption?: (column: 'company' | 'role' | 'specialty' | 'type', from: string, to: string | null) => Promise<void>;
  // Log-a-contact action. On the Name cell it appears as a small button
  // next to the name, revealed on hover — the engagement column no longer
  // carries its own log button.
  onLogContact?: (c: Contact) => void;
}) {
  const renameFor = (col: 'company' | 'role' | 'specialty' | 'type') => onBulkRenameOption
    ? (from: string, to: string) => onBulkRenameOption(col, from, to)
    : undefined;
  const deleteFor = (col: 'company' | 'role' | 'specialty' | 'type') => onBulkRenameOption
    ? (v: string) => onBulkRenameOption(col, v, null)
    : undefined;
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
            {contact.unsubscribed_at && (
              <span
                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold uppercase tracking-wider"
                title={`Unsubscribed ${new Date(contact.unsubscribed_at).toLocaleDateString()}${contact.unsubscribed_source ? ` (${contact.unsubscribed_source})` : ''}. Excluded from future email campaigns.`}
              >
                <span aria-hidden>✕</span> Unsubscribed
              </span>
            )}
            {/* Log-a-contact, revealed whenever the row is highlighted
                (hovered). Replaces the always-on log button the
                engagement column used to carry. */}
            {onLogContact && (
              <button
                type="button"
                data-no-row-select
                onClick={(e) => { e.stopPropagation(); onLogContact(contact); }}
                aria-label="Log a contact"
                title="Log a contact"
                className="sa-log-button shrink-0 inline-flex items-center gap-1 h-6 px-1.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide leading-none border border-primary/20 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-primary/15 transition-opacity"
              >
                <span aria-hidden className="text-[12px]">🪵</span> Log
              </button>
            )}
          </div>
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-foreground/40 whitespace-nowrap">From partner</p>
          )}
        </div>
      );
    case 'company':
      // Click the company name → its company page (the cluster of
      // everyone at that company, their unified log history, notes and
      // promotion). Hover reveals a chevron to change the company
      // inline. With no company set there's no page to open, so the
      // cell falls back to the plain click-to-add picker.
      return (
        <SearchSelectCell
          value={contact.company}
          options={companyOptions}
          onSave={(next) => onSaveField(contact.id, 'company', next ?? '')}
          onRenameOption={renameFor('company')}
          onDeleteOption={deleteFor('company')}
          placeholder="Add company…"
          href={contact.company && contact.company.trim() ? `/feather/contacts/company/${companySlug(contact.company)}` : undefined}
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
    case 'type':
      return (
        <TypeCell
          values={contact.type ?? []}
          options={typeOptions}
          onSave={(next) => onSavePatch(contact.id, { type: next.length === 0 ? null : next })}
        />
      );
    case 'specialty':
      return (
        <SearchSelectCell
          value={contact.specialty}
          options={specialtyOptions}
          onSave={(next) => onSavePatch(contact.id, { specialty: next ?? null })}
          onRenameOption={renameFor('specialty')}
          onDeleteOption={deleteFor('specialty')}
          placeholder="Set specialty…"
        />
      );
    case 'role':
      return (
        <SearchSelectCell
          value={contact.role}
          options={roleOptions}
          onSave={(next) => onSaveField(contact.id, 'role', next ?? '')}
          onRenameOption={renameFor('role')}
          onDeleteOption={deleteFor('role')}
          placeholder="Add role…"
        />
      );
    case 'contact':
      return (
        // Cluster the three icons (cell / office / email) into a
        // single visual unit so admissions reads "this row's contact
        // surface" as one widget, not three loose buttons. Hairline
        // border + warm-bg fill behind the row, gap-0 so adjacent
        // hover states line up flush, and px-0.5 keeps the leading /
        // trailing icons from kissing the container edge.
        <div className="inline-flex items-center gap-0 px-0.5 rounded-lg border border-foreground/10 bg-foreground/[0.025]">
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
        </div>
      );
    case 'location':
      return (
        <PlaceAutocompleteCell
          contact={contact}
          onSavePlace={(patch) => onSavePatch(contact.id, patch)}
        />
      );
    case 'notes':
      return contact.notes
        ? <span className="text-foreground/75 truncate block max-w-[420px]" title={contact.notes}>{contact.notes}</span>
        : <Em />;
    case 'follow_up':
      return <FollowUpCell at={contact.follow_up_at} />;
    default:
      return null;
  }
});

// Renders a contacts.follow_up_at as a compact pill — "in N days" /
// "today" / "tomorrow" / "overdue Nd" / "—". Same tones as the
// partners grid so a contact promoted into a partner keeps the
// visual identity.
function FollowUpCell({ at }: { at: string | null }) {
  if (!at) return <Em />;
  const ms = new Date(at).getTime();
  if (Number.isNaN(ms)) return <Em />;
  const dayMs = 86400000;
  const diffDays = Math.round((ms - Date.now()) / dayMs);
  let label: string;
  let tone: string;
  if (diffDays < 0) {
    label = `Overdue ${Math.abs(diffDays)}d`;
    tone = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (diffDays === 0) {
    label = 'Today';
    tone = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (diffDays === 1) {
    label = 'Tomorrow';
    tone = 'bg-amber-50 text-amber-800 border-amber-200';
  } else {
    label = `In ${diffDays}d`;
    tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  const title = new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${tone}`} title={title}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      {label}
    </span>
  );
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

// Featured data-governance badge. Big SVG ring on the left of the
// KPI strip; the percent sits in the centre of the ring at a
// hero font size. Click toggles the breakdown panel.
//
// Colour shifts on the score itself: copper green at ≥90, amber
// 70–89, rose under 70. The empty-track is a faint warm-grey so
// even at 5% the ring still reads as a ring.
function GovernanceBadge({
  score,
  totalContacts,
  expanded,
  onClick,
}: {
  score: number | null;
  totalContacts: number;
  expanded: boolean;
  onClick: () => void;
}) {
  const ringTone =
    score == null ? '#a3a3a3' :
    score >= 90 ? '#15803d' :   // emerald-700
    score >= 70 ? '#b87333' :   // copper
    '#be123c';                  // rose-700
  const textTone =
    score == null ? 'text-foreground/45' :
    score >= 90 ? 'text-emerald-700' :
    score >= 70 ? 'text-[#8b5523]' :
    'text-rose-700';
  // Ring math. r=44 → circumference ~276. Arc length = pct * C.
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const arc = (pct / 100) * circumference;

  return (
    <button
      type="button"
      onClick={onClick}
      title="Data governance: how complete your contact records are. Click for the per-field breakdown."
      aria-expanded={expanded}
      className={`w-full group inline-flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors ${expanded ? 'bg-warm-bg/70 ring-1 ring-black/10' : 'hover:bg-warm-bg/40'}`}
    >
      <div className="relative w-[108px] h-[108px] shrink-0">
        <svg viewBox="0 0 108 108" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="54" cy="54" r={radius} fill="none" stroke="rgba(44,24,16,0.10)" strokeWidth="9" />
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke={ringTone}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-semibold tabular-nums leading-none ${textTone}`} style={{ fontFamily: 'var(--font-display)' }}>
            {score == null ? '—' : `${Math.round(score)}`}
          </span>
          {score != null && (
            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] mt-0.5 ${textTone} opacity-80`}>
              %
            </span>
          )}
        </div>
      </div>
      <div className="text-left min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/55">
          Data governance
        </p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-foreground">
          {score == null
            ? 'Calculating…'
            : score >= 90 ? 'Excellent'
            : score >= 70 ? 'Solid · room to fill'
            : 'Needs attention'}
        </p>
        <p className="mt-0.5 text-[10.5px] text-foreground/55">
          {totalContacts > 0 ? `${totalContacts.toLocaleString()} contacts · click for breakdown` : 'click for breakdown'}
          <span aria-hidden className="ml-1 text-foreground/35">{expanded ? '▾' : '▸'}</span>
        </p>
      </div>
    </button>
  );
}

// Sibling of GovernanceBadge: prominent contact-count display so
// the "how big is the book?" answer reads at first glance. No
// expansion — pure headline. Pairs with the two activity badges to
// form a three-tile health row at the top of the insights card.
function TotalContactsBadge({
  total,
  weekTouched,
  monthTouched,
}: {
  total: number;
  weekTouched: number;
  monthTouched: number;
}) {
  const weekPct = total > 0 ? Math.round((weekTouched / total) * 100) : 0;
  return (
    <div
      title={`${total.toLocaleString()} contacts on the books. ${weekTouched.toLocaleString()} touched this week (${weekPct}%); ${monthTouched.toLocaleString()} this month.`}
      className="w-full inline-flex items-center gap-3 rounded-2xl px-3 py-2 bg-warm-bg/40"
    >
      <div className="relative w-[108px] h-[108px] shrink-0 rounded-2xl bg-warm-bg/70 border border-black/10 flex items-center justify-center">
        <span aria-hidden="true" className="text-[44px] leading-none select-none">📇</span>
      </div>
      <div className="text-left min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/55">
          Total contacts
        </p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-foreground">
          <span className="text-2xl tabular-nums mr-1" style={{ fontFamily: 'var(--font-display)' }}>
            {total.toLocaleString()}
          </span>
          {total === 1 ? 'contact' : 'contacts'}
        </p>
        <p className="mt-0.5 text-[10.5px] text-foreground/55">
          {weekTouched.toLocaleString()} touched this week
          {total > 0 && <span className="text-foreground/40"> · {weekPct}%</span>}
        </p>
      </div>
    </div>
  );
}

// Sibling of GovernanceBadge: same outer shape + dimensions, but
// the left tile is a clipboard emoji and the headline is today's
// log count. Pairs with GovernanceBadge in row 1 so the two
// "is the pipeline healthy?" signals (data completeness + log
// activity) read side-by-side. Click toggles the expanded panel
// below row 1.
function LogsTodayBadge({
  count,
  weekTotal,
  expanded,
  onClick,
}: {
  count: number;
  weekTotal: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Logs today: touchpoints logged against contacts today. Click for the week / month / total breakdown."
      aria-expanded={expanded}
      className={`w-full group inline-flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors ${expanded ? 'bg-warm-bg/70 ring-1 ring-black/10' : 'hover:bg-warm-bg/40'}`}
    >
      <div className="relative w-[108px] h-[108px] shrink-0 rounded-2xl bg-warm-bg/60 border border-black/10 flex items-center justify-center">
        <span aria-hidden="true" className="text-[56px] leading-none select-none">
          🪵
        </span>
      </div>
      <div className="text-left min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/55">
          Logs today
        </p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-foreground">
          <span className="text-2xl tabular-nums mr-1" style={{ fontFamily: 'var(--font-display)' }}>{count}</span>
          {count === 1 ? 'touchpoint' : 'touchpoints'}
        </p>
        <p className="mt-0.5 text-[10.5px] text-foreground/55">
          {weekTotal.toLocaleString()} this week · click for breakdown
          <span aria-hidden className="ml-1 text-foreground/35">{expanded ? '▾' : '▸'}</span>
        </p>
      </div>
    </button>
  );
}

// Per-field breakdown + recent fill activity. Mounts inline under
// the KPI strip when the GovernanceTile is clicked. Now split into
// two labelled subsections so the reader knows which question each
// chunk answers:
//   * Missing information — which fields are blank, weighted (email
//     counts triple). Drives the data-governance score.
//   * Health information — how many of the records have actually
//     been touched (week / month / ever / never / no-email). Tells
//     you whether the book is being worked, not just filled.
function GovernancePanel({
  governance,
  health,
}: {
  governance: { score: number; totalContacts: number; breakdown: GovernanceBreakdownRow[]; activity: GovernanceActivityRow[] };
  health: {
    total: number;
    week: number;
    month: number;
    everContacted: number;
    never: number;
    missingEmail: number;
  };
}) {
  const initials = (s: string) =>
    s.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  const ago = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'just now';
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };
  const total = health.total || 1;
  // Engagement-health rows. Order matches the funnel reading:
  // touched lately → cooling → ever-contacted → never → unreachable.
  // Each row's `pct` is "share of the book this number represents"
  // so a 60%-of-book-touched-this-week reads visually.
  const healthRows: Array<{ key: string; label: string; value: number; pct: number; tone: 'good' | 'warn' | 'bad' }> = [
    { key: 'week',          label: 'Touched this week',  value: health.week,           pct: Math.round((health.week / total) * 100),           tone: 'good' },
    { key: 'month',         label: 'Touched this month', value: health.month,          pct: Math.round((health.month / total) * 100),          tone: 'good' },
    { key: 'ever',          label: 'Ever touched',       value: health.everContacted,  pct: Math.round((health.everContacted / total) * 100),  tone: 'good' },
    { key: 'never',         label: 'Never touched',      value: health.never,          pct: Math.round((health.never / total) * 100),          tone: 'warn' },
    { key: 'noEmail',       label: 'Unreachable by email', value: health.missingEmail, pct: Math.round((health.missingEmail / total) * 100),   tone: 'bad' },
  ];
  return (
    <div className="px-4 py-3 border-b border-black/5 bg-warm-bg/30 space-y-5">
      {/* ── Missing information ───────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 mb-2">
          Missing information · {governance.score}% complete
        </p>
        <p className="text-[11.5px] text-foreground/55 mb-3">
          Email counts triple — every empty email holds back the campaign pipeline. Each row shows how many of {governance.totalContacts.toLocaleString()} contacts have that field filled in.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {governance.breakdown.map((row) => {
            const pct = Math.max(2, Math.min(100, row.pctFilled));
            return (
              <li key={row.key} className="rounded-lg border border-black/5 bg-white px-3 py-2">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-foreground">
                    {row.label}
                    {row.weight > 1 && (
                      <span className="ml-1.5 text-[9.5px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 rounded px-1 py-[1px]">×{row.weight}</span>
                    )}
                  </span>
                  <span className="text-[11px] tabular-nums text-foreground/55">{row.pctFilled}% · {row.missing} missing</span>
                </div>
                <div className="h-1.5 bg-warm-bg/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.pctFilled >= 90 ? 'bg-emerald-500' : row.pctFilled >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Health information ────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 mb-2">
          Health information · how the book is being worked
        </p>
        <p className="text-[11.5px] text-foreground/55 mb-3">
          Counts of {health.total.toLocaleString()} contacts grouped by how recently they were touched. Untouched records are leads that haven&apos;t been worked yet; unreachable-by-email records can&apos;t receive a campaign at all until the gap is filled.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {healthRows.map((row) => {
            const pct = Math.max(2, Math.min(100, row.pct));
            const barColor =
              row.tone === 'good' ? 'bg-emerald-500'
              : row.tone === 'warn' ? 'bg-amber-500'
              : 'bg-rose-500';
            return (
              <li key={row.key} className="rounded-lg border border-black/5 bg-white px-3 py-2">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-foreground">{row.label}</span>
                  <span className="text-[11px] tabular-nums text-foreground/55">{row.value.toLocaleString()} · {row.pct}%</span>
                </div>
                <div className="h-1.5 bg-warm-bg/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Recent fill activity ──────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 mb-2">
          Recent fill activity
        </p>
        {governance.activity.length === 0 ? (
          <p className="text-[11.5px] italic text-foreground/45">
            Nothing logged yet — edits to a contact&apos;s email / phone / company / role / location / specialty / type will appear here as teammates fill them in.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {governance.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-[12px]">
                {a.userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.userAvatarUrl} alt="" className="shrink-0 w-5 h-5 rounded-full object-cover bg-warm-bg" />
                ) : (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-warm-bg flex items-center justify-center text-[9px] font-bold text-foreground/55">
                    {initials(a.userName)}
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-semibold text-foreground">{a.userName}</span>
                  <span className="text-foreground/55"> added </span>
                  <span className="font-semibold text-foreground">{a.fieldLabel}</span>
                  {a.contactName && (
                    <>
                      <span className="text-foreground/55"> to </span>
                      <span className="text-foreground">{a.contactName}</span>
                    </>
                  )}
                </span>
                <span className="shrink-0 text-[10.5px] text-foreground/40 tabular-nums">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Consolidated insights card. Replaces the four-tile strip with one
// card that carries: the pipeline counters across the top, today's
// touched-areas list in the middle, and three leaderboards across the
// bottom (today / this week / this month). Each leaderboard can be
// flipped between "by logs" and "by duration" so admissions can ask
// either "who logged the most touches?" or "who spent the most time
// in conversation?".
interface GovernanceBreakdownRow {
  key: string;
  label: string;
  weight: number;
  filled: number;
  missing: number;
  pctFilled: number;
}
interface GovernanceActivityRow {
  id: string;
  at: string;
  userId: string | null;
  userName: string;
  userAvatarUrl: string | null;
  contactId: string | null;
  contactName: string | null;
  fieldLabel: string;
}
interface InsightsPayload {
  counts: { week: number; month: number; total: number; never: number; missingEmail?: number };
  today: {
    areas: { area: string; count: number }[];
    leaderboard: { userId: string; name: string; avatarUrl: string | null; logs: number; durationSeconds: number }[];
  };
  week: { leaderboard: { userId: string; name: string; avatarUrl: string | null; logs: number; durationSeconds: number }[] };
  month: { leaderboard: { userId: string; name: string; avatarUrl: string | null; logs: number; durationSeconds: number }[] };
  governance?: {
    score: number;
    totalContacts: number;
    breakdown: GovernanceBreakdownRow[];
    activity: GovernanceActivityRow[];
  };
}

// Header control tray for the contacts page: three icon-only pills
// docked upper-right — Insights, Database health (a colour-by-score
// ring), and Add contact (opens the add-options dropdown).
function ContactsPillTray({
  governanceScore,
  governanceLoaded,
  governanceActive,
  viewMode,
  onSetViewMode,
  onToggleGovernance,
  onAddContact,
  onAddWithAI,
  onUploadCsv,
}: {
  governanceScore: number | null;
  governanceLoaded: boolean;
  governanceActive: boolean;
  viewMode: 'table' | 'map' | 'insights';
  onSetViewMode: (next: 'table' | 'map' | 'insights') => void;
  onToggleGovernance: () => void;
  onAddContact: () => void;
  onAddWithAI: () => void;
  onUploadCsv: () => void;
}) {
  const governanceTone =
    governanceScore == null ? '#a3a3a3' :
    governanceScore >= 90 ? '#15803d' :
    governanceScore >= 70 ? '#b87333' :
    '#be123c';
  // Three icon-only controls, left → right: Insights · Database
  // health · Add contact. No text labels — just the graphics — with
  // the same soft cascade entry as before.
  const healthLabel =
    governanceLoaded && governanceScore != null
      ? governanceScore >= 90 ? 'Healthy' : governanceScore >= 70 ? 'Fair' : 'Needs work'
      : '';
  const pills: Array<{ key: string; node: React.ReactNode }> = [
    {
      key: 'insights',
      node: (
        <StatPill
          iconOnly
          label="Insights"
          value=""
          active={viewMode === 'insights'}
          onClick={() => onSetViewMode(viewMode === 'insights' ? 'table' : 'insights')}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-6 4 4 5-9" />
            </svg>
          }
        />
      ),
    },
    {
      key: 'health',
      node: (
        <StatPill
          iconOnly
          label="Database health"
          value={healthLabel}
          active={governanceActive}
          onClick={onToggleGovernance}
          icon={<HealthRingIcon score={governanceScore} tone={governanceTone} />}
          iconBg="bg-transparent"
          iconColor=""
        />
      ),
    },
    {
      key: 'add',
      node: (
        <AddPill
          iconOnly
          onAddContact={onAddContact}
          onAddWithAI={onAddWithAI}
          onUploadCsv={onUploadCsv}
        />
      ),
    },
  ];
  return (
    <div className="sa-contacts-pill-row flex items-center justify-end gap-2">
      {pills.map((p, i) => (
        <span
          key={p.key}
          className="sa-pill-in"
          style={{ ['--pill-delay' as string]: `${i * 70}ms` }}
        >
          {p.node}
        </span>
      ))}
      <style>{`
        /* Soft cascade entry — each pill rises a few px and fades in
           from a slight scale-down, staggered via --pill-delay. */
        @keyframes sa-pill-enter {
          from { opacity: 0; transform: translateY(6px) scale(0.94); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .sa-pill-in {
          display: inline-flex;
          animation: sa-pill-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) var(--pill-delay, 0ms) backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .sa-pill-in { animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}

// Compact 32px ring icon used as the leading icon on the Database
// Health pill. Same colour-by-score scheme as the bigger
// GovernanceBadge ring; the score number sits in the centre at a
// micro font size so it reads even at this scale.
function HealthRingIcon({ score, tone }: { score: number | null; tone: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const arc = (pct / 100) * circumference;
  return (
    <span className="relative inline-flex items-center justify-center w-8 h-8">
      <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(44,24,16,0.10)" strokeWidth="2.5" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <span
        className="relative text-[9px] font-bold tabular-nums leading-none"
        style={{ color: tone, fontFamily: 'var(--font-display)' }}
      >
        {score == null ? '—' : Math.round(score)}
      </span>
    </span>
  );
}

// One stat/assist pill in the tray. Icon-on-left, two-line text
// on the right (ALL CAPS label / bold value). `active` adds an
// inset ring + slightly stronger fill so the user can see which
// expansion is currently open.
function StatPill({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  active = false,
  onClick,
  iconOnly = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  onClick?: () => void;
  // When true the pill renders just the icon graphic (no text label /
  // value). `label`/`value` still feed the accessible name + tooltip.
  iconOnly?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  const accessibleName = value ? `${label}: ${value}` : label;
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      aria-label={iconOnly ? accessibleName : undefined}
      title={iconOnly ? accessibleName : undefined}
      className={`inline-flex items-center gap-2 rounded-full transition-all ${iconOnly ? 'p-1.5' : 'pl-1.5 pr-3.5 py-1.5'} ${onClick ? 'cursor-pointer' : ''} ${
        active
          ? 'bg-white shadow-[0_8px_20px_-8px_rgba(40,30,25,0.32),0_2px_6px_-2px_rgba(40,30,25,0.15)] ring-1 ring-foreground/15'
          : onClick
          ? 'bg-white/90 supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-md hover:bg-white shadow-[0_6px_16px_-8px_rgba(40,30,25,0.24),0_1px_4px_-2px_rgba(40,30,25,0.10)] hover:shadow-[0_8px_22px_-8px_rgba(40,30,25,0.30)] ring-1 ring-black/5 hover:ring-black/10'
          : 'bg-white/90 supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-md shadow-[0_6px_16px_-8px_rgba(40,30,25,0.24),0_1px_4px_-2px_rgba(40,30,25,0.10)] ring-1 ring-black/5'
      }`}
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      {!iconOnly && (
        <span className="text-left whitespace-nowrap">
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/50 leading-tight">{label}</span>
          <span className="block text-[12.5px] font-bold leading-tight text-foreground">{value}</span>
        </span>
      )}
    </Tag>
  );
}

// Action pill — visually paired with the stat pills so the dock
// reads as one row, but its icon is the strong dark filled circle
// to telegraph "primary action." Click opens a small dropdown with
// the same three options that lived in the old header Add menu.
function AddPill({
  onAddContact,
  onAddWithAI,
  onUploadCsv,
  iconOnly = false,
}: {
  onAddContact: () => void;
  onAddWithAI: () => void;
  onUploadCsv: () => void;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? 'Add contact' : undefined}
        title={iconOnly ? 'Add contact' : undefined}
        className={`inline-flex items-center gap-2 rounded-full transition-all ${iconOnly ? 'p-1' : 'pl-1 pr-3.5 py-1'} ${
          open
            ? 'bg-white shadow-[0_8px_20px_-8px_rgba(40,30,25,0.32),0_2px_6px_-2px_rgba(40,30,25,0.15)] ring-1 ring-foreground/15'
            : 'bg-white/90 supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-md hover:bg-white shadow-[0_6px_16px_-8px_rgba(40,30,25,0.24),0_1px_4px_-2px_rgba(40,30,25,0.10)] hover:shadow-[0_8px_22px_-8px_rgba(40,30,25,0.30)] ring-1 ring-black/5 hover:ring-black/10'
        }`}
      >
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-white shrink-0 shadow-[0_2px_6px_-1px_rgba(40,30,25,0.35)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        {!iconOnly && (
          <span className="text-left whitespace-nowrap">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/50 leading-tight">Add</span>
            <span className="block text-[12.5px] font-bold leading-tight text-foreground">Contacts</span>
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 min-w-[14rem] rounded-2xl border border-black/8 bg-white/95 supports-[backdrop-filter]:bg-white/85 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_18px_40px_-18px_rgba(40,30,25,0.45)] z-50 overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onAddContact(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-foreground hover:bg-warm-bg/60 text-left transition-colors"
          >
            <PlusIcon />
            Add contact
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onAddWithAI(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-primary hover:bg-primary/5 text-left transition-colors"
          >
            <SparkleIcon />
            Add with AI
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onUploadCsv(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-foreground hover:bg-warm-bg/60 text-left border-t border-black/5 transition-colors"
          >
            <UploadIcon />
            Upload CSV
          </button>
        </div>
      )}
    </div>
  );
}

function InsightsCard({
  fallback,
  viewMode,
  onSetViewMode,
  onAddContact,
  onAddWithAI,
  onUploadCsv,
}: {
  fallback: { week: number; month: number; total: number; never: number; missingEmail: number };
  viewMode: 'table' | 'map' | 'insights';
  onSetViewMode: (next: 'table' | 'map' | 'insights') => void;
  onAddContact: () => void;
  onAddWithAI: () => void;
  onUploadCsv: () => void;
}) {
  const [data, setData] = useState<InsightsPayload | null>(null);
  // Governance-score expansion — collapsed by default; clicking the
  // Database-health pill reveals the per-field breakdown below.
  const [showGovernance, setShowGovernance] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/contacts/insights', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: InsightsPayload | null) => { if (!cancelled && json) setData(json); })
      .catch(() => { /* fall back to client-computed counts */ });
    return () => { cancelled = true; };
  }, []);

  const counts = data?.counts ?? fallback;
  const governanceScore = data?.governance?.score ?? null;
  const governanceLoaded = data?.governance != null;

  return (
    <div>
      {/* Three icon-only controls docked upper-right: Insights ·
          Database health · Add contact. */}
      <ContactsPillTray
        governanceScore={governanceScore}
        governanceLoaded={governanceLoaded}
        governanceActive={showGovernance}
        viewMode={viewMode}
        onSetViewMode={onSetViewMode}
        onToggleGovernance={() => setShowGovernance((v) => !v)}
        onAddContact={onAddContact}
        onAddWithAI={onAddWithAI}
        onUploadCsv={onUploadCsv}
      />
      {/* Database-health breakdown drops below the tray when the
          health pill is toggled open. */}
      {showGovernance && data?.governance && (
        <div className="mt-3 rounded-2xl border border-black/8 bg-white/90 supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 overflow-hidden shadow-[0_8px_24px_-12px_rgba(40,30,25,0.18)]">
          <GovernancePanel
            governance={data.governance}
            health={{
              total: data.governance.totalContacts,
              week: counts.week,
              month: counts.month,
              everContacted: counts.total,
              never: counts.never,
              missingEmail: counts.missingEmail ?? 0,
            }}
          />
        </div>
      )}
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
  onEdit,
  children,
}: {
  value: string;
  copied: boolean;
  subtitle?: string;
  // Optional edit callback. When set, the popover renders a small pencil
  // button alongside the value — clicking it fires `onEdit` and gives
  // every hover-revealed icon a single, predictable place to edit from.
  // (Per UX direction: the pencil lives inside the hover surface, not
  // floating to the right of the cell where it crowds adjacent
  // columns.) Switches the popover to pointer-events-auto so the
  // button is actually clickable; otherwise the popover stays a
  // pointer-events-none tooltip.
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  // 120ms grace window so the user can slide the cursor from the
  // trigger into the popover (where the Edit pencil lives) without the
  // popover dismissing mid-movement. Only relevant when onEdit is set —
  // the pointer-events-none branch doesn't need it.
  const closeTimer = useRef<number | null>(null);

  function enter() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setRect({ left: r.left + r.width / 2, top: r.top });
    }
    setHovering(true);
  }
  function leave() {
    if (onEdit) {
      closeTimer.current = window.setTimeout(() => setHovering(false), 120);
    } else {
      setHovering(false);
    }
  }

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
          className={`fixed z-[1000] -translate-x-1/2 -translate-y-full ${onEdit ? '' : 'pointer-events-none'}`}
          onMouseEnter={onEdit ? enter : undefined}
          onMouseLeave={onEdit ? leave : undefined}
        >
          <div className="tooltip-pop-in relative">
            <div className="whitespace-nowrap rounded-md bg-foreground text-white text-[10.5px] font-semibold px-2.5 py-1 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span>{value}</span>
                <span className="text-white/55 font-medium">{copied ? 'copied' : 'click to copy'}</span>
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(); setHovering(false); }}
                    aria-label="Edit"
                    title="Edit"
                    className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded text-white/65 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <PencilIcon />
                  </button>
                )}
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
    <div className="inline-flex items-center">
      <HoverPopover
        value={value}
        copied={copied}
        onEdit={() => setEditing(true)}
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
  // Site is a deliberately narrow column (60px default) so the editor
  // can't render in-flow — a 176px input would have crashed into the
  // adjacent Company / Rating cells (the overlap admissions hit before
  // this refactor). Instead the editor portals to document.body and
  // anchors to the trigger's viewport rect, giving it room to breathe
  // without bumping the grid layout.
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => {
    if (!editing) return;
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4 });
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  async function commit() {
    setEditing(false);
    if (draft.trim() !== (value ?? '').trim()) await onSave(draft);
  }

  const href = value ? normaliseUrl(value) : null;

  return (
    <div ref={triggerRef} className="inline-flex items-center">
      {href ? (
        <HoverPopover
          value={value ?? ''}
          copied={false}
          onEdit={() => setEditing(true)}
        >
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
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          title="Add website"
          aria-label="Add website"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-warm-bg/60 transition-colors"
        >
          <GlobeIcon />
        </button>
      )}
      {editing && pos && typeof document !== 'undefined' && createPortal(
        <div
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-[1000] tooltip-pop-in"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void commit(); }
              else if (e.key === 'Escape') { e.preventDefault(); setDraft(value ?? ''); setEditing(false); }
            }}
            placeholder="https://example.com"
            className="w-56 rounded-md border border-primary/40 bg-white px-2 py-1 text-[12px] shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>,
        document.body,
      )}
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

// Service-type tag (Detox / PHP / IOP …). Same UX as RatingCell — a
// pill that opens a portal-rendered menu of options. The options list
// is unioned with TYPE_OPTIONS so admissions can introduce new tags
// inline (typed via the modal / API) and they show up alongside the
// canonical three.
// Mirrors the partnerships page palette so a contact and its linked
// partner read with the same tag color across surfaces. PHP / IOP
// aren't in PARTNER_TYPES so they get their own distinct tones.
const TYPE_TONES: Record<string, string> = {
  Detox: 'bg-rose-50 text-rose-800 border-rose-200',
  RTC: 'bg-amber-50 text-amber-800 border-amber-200',
  Outpatient: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Extended Care': 'bg-teal-50 text-teal-800 border-teal-200',
  Interventionist: 'bg-blue-50 text-blue-800 border-blue-200',
  Therapist: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  PHP: 'bg-violet-50 text-violet-700 border-violet-200',
  IOP: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};
function TypeCell({
  values,
  options,
  onSave,
}: {
  values: string[];
  options: string[];
  onSave: (next: string[]) => Promise<void> | void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const newInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // "+ Add new" affordance — typed value commits via Enter or the
  // adjacent + button. Trimmed + de-duped against the existing list so
  // admissions can't accidentally seed "PHP " with a trailing space.
  const [newTag, setNewTag] = useState('');

  // Case-insensitive lookup so toggling "Detox" off when the row holds
  // "detox" still removes the tag (handles legacy lowercase entries).
  const has = (tag: string) => values.some((v) => v.trim().toLowerCase() === tag.trim().toLowerCase());
  const toggle = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (has(t)) {
      void onSave(values.filter((v) => v.trim().toLowerCase() !== t.toLowerCase()));
    } else {
      void onSave([...values, t]);
    }
  };

  // Unioned, deduped list — TYPE_OPTIONS first (canonical), then any
  // ad-hoc strings the page collected from `rows`. Stable ordering so
  // the menu doesn't reshuffle as new rows stream in.
  const merged = useMemo(() => {
    const set = new Set<string>(TYPE_OPTIONS);
    for (const o of options) if (o.trim()) set.add(o.trim());
    return Array.from(set);
  }, [options]);

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

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4 });
    }
    setOpen(true);
  }

  return (
    <>
      {/* Trigger renders one chip per selected tag, or a "Set type" empty
          state. Wraps if the row carries several values so the cell
          doesn't blow out horizontally. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="inline-flex items-center gap-1 flex-wrap text-left"
        title={values.length > 0 ? `Type: ${values.join(', ')}` : 'Set type'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {values.length === 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap bg-foreground/5 text-foreground/45 border-foreground/15">
            — Set type —
            <ChevronDownIcon />
          </span>
        ) : (
          <>
            {values.map((v) => (
              <span
                key={v}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${TYPE_TONES[v] ?? 'bg-foreground/5 text-foreground/70 border-foreground/15'}`}
              >
                {v}
              </span>
            ))}
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-foreground/45 hover:text-foreground/80" aria-hidden>
              <ChevronDownIcon />
            </span>
          </>
        )}
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-[1000] w-48 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden tooltip-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Multi-select: clicking a row toggles that tag without
              closing the menu, so admissions can mark a facility
              Detox + PHP in one open. Click outside (or Esc) closes. */}
          {merged.map((t) => {
            const on = has(t);
            return (
              <button
                key={t}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); toggle(t); }}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] font-semibold hover:bg-warm-bg/60 transition-colors ${on ? 'text-foreground' : 'text-foreground/70'}`}
              >
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${TYPE_TONES[t] ?? 'bg-foreground/5 text-foreground/70 border-foreground/15'} ${on ? '' : 'opacity-60'}`}>
                  {t}
                </span>
                {on && <CheckIcon />}
              </button>
            );
          })}
          {/* + Add new — admissions can introduce a new tag inline.
              Trimmed + de-duped; the new tag is appended to the row's
              array (multi-select) so existing tags stay selected. */}
          <div className="border-t border-black/5 px-2 py-1.5 bg-warm-bg/30">
            <div className="flex items-center gap-1">
              <input
                ref={newInputRef}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const t = newTag.trim();
                    if (!t) return;
                    setNewTag('');
                    if (!has(t)) void onSave([...values, t]);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setNewTag('');
                    setOpen(false);
                  }
                }}
                placeholder="+ Add new…"
                className="flex-1 min-w-0 rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const t = newTag.trim();
                  if (!t) { newInputRef.current?.focus(); return; }
                  setNewTag('');
                  if (!has(t)) void onSave([...values, t]);
                }}
                disabled={!newTag.trim()}
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary text-white text-[12px] font-bold hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary"
                aria-label="Add type"
                title="Add type"
              >
                +
              </button>
            </div>
          </div>
          {values.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); void onSave([]); }}
              className="block w-full px-2.5 py-1.5 text-left text-[10.5px] text-rose-700 hover:bg-rose-50 border-t border-black/5"
            >
              Clear all
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
  selected,
  onToggleSelect,
  onContact,
  onUpgrade,
  onHistory,
  onOpenLog,
  onDelete,
}: {
  contact: Contact;
  expanded: boolean;
  accessToken: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onContact: () => void;
  onUpgrade: () => void;
  onHistory: () => void;
  onOpenLog: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={(e) => {
        if (isInteractiveClick(e.target)) return;
        const sel = window.getSelection?.();
        if (sel && sel.toString().length > 0) return;
        onToggleSelect();
      }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
      className={`rounded-xl border bg-white p-3.5 cursor-pointer transition-colors ${selected ? 'border-primary/40 ring-1 ring-primary/20' : 'border-black/10'}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            <CircleCheckbox
              checked={selected}
              onToggle={onToggleSelect}
              ariaLabel={`Select ${contact.name}`}
              size="sm"
              className={selected ? '' : 'opacity-60'}
            />
          </span>
          <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-[13px] leading-tight">{contact.name}</p>
          {/* Rating + Type pills sit just under the name on mobile so
              the qualifier hierarchy (who → how good → what they offer)
              reads in one glance without scrolling into the field list. */}
          {(contact.rating || (contact.type && contact.type.length > 0)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {contact.rating && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${RATING_TONES[contact.rating]} ${contact.rating === 'Tier 1' ? 'sa-tier1-premium' : ''}`}>
                  {contact.rating === 'Tier 1' && <span aria-hidden className="text-amber-500">★</span>}
                  {contact.rating}
                </span>
              )}
              {(contact.type ?? []).map((t) => (
                <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_TONES[t] ?? 'bg-foreground/5 text-foreground/70 border-foreground/15'}`}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {contact.company && (
            <p className="mt-1 text-[11px] font-semibold text-foreground/70">{contact.company}</p>
          )}
          {contact.role && (
            <p className="mt-0.5 text-[11px] text-foreground/60">{contact.role}</p>
          )}
          {contact.source === 'downgrade-from-partner' && (
            <p className="mt-1 text-[9px] uppercase tracking-wider text-foreground/40">From partner</p>
          )}
          </div>
        </div>
        <TimeSinceCell contact={contact} />
      </div>

      <dl className="mt-2.5 space-y-1 text-[12px]">
        {contact.specialty && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Focus</dt>
            <dd className="text-foreground/75 min-w-0 flex-1">{contact.specialty}</dd>
          </div>
        )}
        {contact.company_website && (() => {
          const href = normaliseUrl(contact.company_website);
          return (
            <div className="flex items-baseline gap-2">
              <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Site</dt>
              <dd className="min-w-0 flex-1 break-all">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {contact.company_website}
                  </a>
                ) : (
                  <span className="text-foreground/60">{contact.company_website}</span>
                )}
              </dd>
            </div>
          );
        })()}
        {contact.phone && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Phone</dt>
            <dd className="min-w-0 flex-1">
              <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="text-foreground/85 tabular-nums hover:text-primary">
                {contact.phone}
              </a>
            </dd>
          </div>
        )}
        {contact.email && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Email</dt>
            <dd className="min-w-0 flex-1 break-all">
              <a href={`mailto:${contact.email}`} className="text-foreground/85 hover:text-primary">
                {contact.email}
              </a>
            </dd>
          </div>
        )}
        {contact.location && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Location</dt>
            <dd className="text-foreground/75 min-w-0 flex-1">{contact.location}</dd>
          </div>
        )}
        {contact.notes && (
          <div className="flex items-baseline gap-2">
            <dt className="text-[9px] font-bold tracking-[0.14em] uppercase text-foreground/45 w-14 shrink-0">Notes</dt>
            <dd className="text-foreground/75 whitespace-pre-wrap min-w-0 flex-1">{contact.notes}</dd>
          </div>
        )}
      </dl>

      {contact.last_contact_at && (
        <div className="mt-2.5 pt-2.5 border-t border-black/5 flex items-center gap-2">
          {contact.last_contact_by_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.last_contact_by_avatar_url}
              alt={contact.last_contact_by_name ?? 'User'}
              className="w-6 h-6 rounded-full object-cover bg-warm-bg"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
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

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onContact}
          aria-label="Log a contact"
          title="Log a contact"
          // Matches the mobile "New log" FAB at the bottom of the
          // page (bg-foreground + white + uppercase + 🪵 emoji) so
          // the per-card LOG button and the page-level NEW LOG read
          // as the same affordance. The HISTORY button alongside
          // stays in its neutral border-only style so we still get
          // a primary/secondary hierarchy inside each card.
          className="sa-log-button flex-1 inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)] hover:bg-foreground/90 active:bg-foreground/80 active:scale-[0.98] transition-all"
        >
          <span aria-hidden className="text-base leading-none">🪵</span>
          <span>Log</span>
        </button>
        <button
          type="button"
          onClick={onHistory}
          className={`flex-1 inline-flex items-center justify-center gap-1 px-3 h-9 rounded-md text-[11px] font-semibold uppercase tracking-wider border transition-colors ${expanded ? 'bg-foreground text-white border-foreground' : 'border-black/10 text-foreground/75 hover:bg-warm-bg/60 active:bg-warm-bg/80'}`}
          aria-expanded={expanded}
        >
          History
          <span className={`inline-flex transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-black/10 text-foreground/55 hover:bg-warm-bg/60 active:bg-warm-bg/80"
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
  // Subscribe to the one shared clock so "x ago" stays fresh without a
  // per-cell timer (see useNowTick).
  useNowTick();

  if (!contact.last_contact_at) {
    // Single line: avatar placeholder + a muted "Never" pill.
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/30 text-[11px] shrink-0">
          —
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold border bg-foreground/5 text-foreground/45 border-foreground/10 shrink-0">
          Never
        </span>
      </div>
    );
  }

  const s = staleness(contact.last_contact_at);
  const textTone =
    s === 'fresh' ? 'text-emerald-700' :
    s === 'cooling' ? 'text-amber-700' :
    'text-rose-700';

  // Everything on one line: avatar · name · method · relative time. The
  // name truncates; badge + time stay pinned to the right. Absolute time
  // lives in the title tooltip.
  return (
    <div className="flex items-center gap-2 min-w-0" title={fmtAbsolute(contact.last_contact_at) ?? ''}>
      {contact.last_contact_by_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.last_contact_by_avatar_url}
          alt=""
          className="w-6 h-6 rounded-full object-cover border border-black/10 shrink-0"
        />
      ) : (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 shrink-0">
          {(contact.last_contact_by_name || '?').charAt(0).toUpperCase()}
        </span>
      )}
      {/* First name only — keeps the cell on one tidy line instead of
          truncating "Bobby Burton" to "Bob…". Full name is on the avatar
          title + the row's history. */}
      <span className="shrink-0 whitespace-nowrap text-[11.5px] font-semibold text-foreground" title={contact.last_contact_by_name ?? undefined}>
        {(contact.last_contact_by_name || '—').trim().split(/\s+/)[0]}
      </span>
      {contact.last_contact_method && (
        <span className={`shrink-0 whitespace-nowrap inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[contact.last_contact_method]}`}>
          {contact.last_contact_method}
        </span>
      )}
      <span className={`shrink-0 whitespace-nowrap text-[10.5px] font-semibold ${textTone}`}>{fmtAgo(contact.last_contact_at)}</span>
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
  existingContacts = [],
}: {
  onClose: () => void;
  onSubmit: (payload: Partial<Contact>) => Promise<void> | void;
  // Subset of fields needed to spot duplicates as the user types.
  // Passed in by the parent so the modal doesn't need its own fetch.
  existingContacts?: Contact[];
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // The user can dismiss the duplicate banner ("Add anyway") to push
  // past it — but the banner re-arms on the NEXT round of changes, so
  // a fresh duplicate still surfaces. Tracked by the keystring of the
  // current match set so a different match triggers a new banner.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Duplicate detection. Runs on every keystroke against the contacts
  // we already have rendered (parent passes `rows`), so the warning
  // appears the moment the user has typed enough of a name / email /
  // phone to overlap with an existing record — they don't have to
  // fill out the whole card before learning it's a dupe.
  // Match rules:
  //   • Email: case-insensitive exact after trim.
  //   • Phone: digits-only match against any of phone / phone_cell
  //     / phone_office on the existing row (so "(917)714-8771" and
  //     "9177148771" both hit).
  //   • Name: case-insensitive exact name match AND (if a company is
  //     typed) case-insensitive company match — that way two unrelated
  //     "John Smith" rows at different facilities don't false-positive,
  //     but two "John Smith @ Acme" rows do.
  const matches = useMemo<Contact[]>(() => {
    const out: Contact[] = [];
    const seen = new Set<string>();
    const nName = name.trim().toLowerCase();
    const nCompany = company.trim().toLowerCase();
    const nEmail = email.trim().toLowerCase();
    const nPhoneDigits = phone.replace(/\D+/g, '');
    if (!nName && !nEmail && !nPhoneDigits.length) return out;
    for (const c of existingContacts) {
      if (seen.has(c.id)) continue;
      let hit = false;
      if (nEmail && c.email && c.email.trim().toLowerCase() === nEmail) hit = true;
      if (!hit && nPhoneDigits.length >= 7) {
        const candidates = [c.phone, c.phone_cell, c.phone_office]
          .filter((v): v is string => !!v)
          .map((v) => v.replace(/\D+/g, ''));
        if (candidates.some((d) => d && (d === nPhoneDigits || d.endsWith(nPhoneDigits) || nPhoneDigits.endsWith(d)))) hit = true;
      }
      if (!hit && nName && c.name.trim().toLowerCase() === nName) {
        // Name-only match: require a company match too (when typed)
        // so two unrelated people sharing a name don't false-flag.
        // When the user hasn't typed a company yet, name alone is
        // enough to warn — they can still proceed if it's a different
        // person.
        if (!nCompany || (c.company && c.company.trim().toLowerCase() === nCompany)) hit = true;
      }
      if (hit) {
        seen.add(c.id);
        out.push(c);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [existingContacts, name, company, email, phone]);
  const matchKey = matches.map((m) => m.id).sort().join(',');
  const showBanner = matches.length > 0 && dismissedKey !== matchKey;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        company: company.trim() || null,
        company_website: normalizeUrl(website),
        type: types.length === 0 ? null : types,
        specialty: specialty.trim() || null,
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
        {showBanner && (
          <div className="mx-6 mt-5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3" role="alert">
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-base leading-none mt-0.5">⚠️</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                  {matches.length === 1 ? 'Possible duplicate' : `Possible duplicates · ${matches.length}`}
                </p>
                <p className="text-[12.5px] text-amber-900 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {matches.length === 1
                    ? 'This contact may already exist:'
                    : 'These contacts may already exist:'}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {matches.map((m) => {
                    const why: string[] = [];
                    const nEmail = email.trim().toLowerCase();
                    const nPhoneDigits = phone.replace(/\D+/g, '');
                    const nName = name.trim().toLowerCase();
                    if (nEmail && m.email && m.email.trim().toLowerCase() === nEmail) why.push('email');
                    if (nPhoneDigits.length >= 7) {
                      const candidates = [m.phone, m.phone_cell, m.phone_office]
                        .filter((v): v is string => !!v)
                        .map((v) => v.replace(/\D+/g, ''));
                      if (candidates.some((d) => d && (d === nPhoneDigits || d.endsWith(nPhoneDigits) || nPhoneDigits.endsWith(d)))) why.push('phone');
                    }
                    if (nName && m.name.trim().toLowerCase() === nName) why.push('name');
                    return (
                      <li key={m.id} className="text-[12.5px] text-amber-900">
                        <span className="font-semibold">{m.name}</span>
                        {m.company && <span className="text-amber-900/75"> · {m.company}</span>}
                        {why.length > 0 && (
                          <span className="text-amber-900/60"> · matches {why.join(' + ')}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setDismissedKey(matchKey)}
                className="shrink-0 -mr-1 -mt-1 inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-900/55 hover:text-amber-900 hover:bg-amber-100"
                aria-label="Dismiss duplicate warning"
                title="Add anyway"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModalField label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="modal-input" />
          </ModalField>
          <ModalField label="Company">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="modal-input" placeholder="Mountain House · Lumina Recovery" />
          </ModalField>
          <ModalField label="Site">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="modal-input" placeholder="example.com" inputMode="url" autoComplete="url" />
          </ModalField>
          <ModalField label="Type" hint="Tap to toggle. Pick any combination.">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border transition-colors ${on ? (TYPE_TONES[t] ?? 'bg-foreground text-white border-foreground') : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/60'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </ModalField>
          <ModalField label="Specialty / Focus">
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="modal-input" placeholder="Trauma · Eating Disorders · Dual Diagnosis" />
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

// ─── Add-with-Claude modal ────────────────────────────────────
//
// 10-phase wizard the admissions team triggers from the "Add with
// Claude" button in the header:
//   1. Modal opens in `prompt` phase with an optional free-text
//      steer ("focus on AZ detox", "alumni referrers", etc.).
//   2. Admin clicks "Find candidates" — POST /api/contacts/suggest
//      sends the steer + the current roster to Claude, which returns
//      a JSON array of candidate contacts.
//   3. While waiting we render a soft "Claude is researching…"
//      placeholder so the click feels responsive.
//   4. Suggestions come back; we move to the `review` phase.
//   5. Each suggestion renders as a row with a checkbox (all
//      pre-checked) and the candidate's company / type / focus /
//      role / location / notes.
//   6. Admin can uncheck any rows they don't want — bulk select-all
//      and clear-all controls keep large lists wieldy.
//   7. "Continue" enables once at least one row is checked.
//   8. POST /api/contacts/bulk inserts the chosen rows server-side,
//      tagged with source='add-with-claude' for later audit.
//   9. Inserted rows return to the parent via `onInserted` so the
//      grid prepends them optimistically (realtime reconciles).
//  10. On error at any step the phase pins to `error` with a retry
//      affordance — phases 1/2 are idempotent so re-suggesting is
//      safe.

interface ClaudeSuggestion {
  name: string;
  company: string | null;
  company_website: string | null;
  type: string[] | null;
  specialty: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  missing: Array<'phone' | 'email'>;
}

function SuggestWithClaudeModal({
  token,
  onClose,
  onInserted,
}: {
  token: string | null;
  onClose: () => void;
  onInserted: (rows: Contact[]) => void;
}) {
  type Phase = 'prompt' | 'loading' | 'review' | 'submitting' | 'error';
  const [phase, setPhase] = useState<Phase>('prompt');
  const [steer, setSteer] = useState('');
  // Locked to 5 for now — Claude + web_search is cost-bounded by
  // request count, so we cap small until we've sized real-world
  // usage. The 8/10/15/25/50 options stay in the dropdown but are
  // disabled so the affordance still hints at where this goes.
  const [count, setCount] = useState(5);
  const [suggestions, setSuggestions] = useState<ClaudeSuggestion[]>([]);
  // Phase 6: per-row checked state — a Set of indices into `suggestions`.
  // Pre-populated with every index when suggestions land so admissions
  // can opt-OUT rather than opt-in (the common case is "accept most
  // of them"). Rows that came back with missing phone/email are NOT
  // pre-checked — admissions has to consciously opt them in.
  const [checked, setChecked] = useState<Set<number>>(new Set());
  // When on (default), only candidates Claude returned with BOTH a
  // phone and an email are listed. Toggling off reveals the partial
  // candidates with "Phone unknown" / "Email unknown" badges so the
  // admin can still pick them up if they want to fill the gap by
  // hand.
  const [strictContactInfo, setStrictContactInfo] = useState(true);
  // When ON (default), candidates whose `name` looks like a team /
  // org / job title (e.g. "Admissions Team", "Heather R. Hayes &
  // Associates") are filtered out of the review list. The picker
  // still posts to bulk with the user's selections — this is a
  // visibility filter, not a hard server-side gate.
  const [onlyNamedPeople, setOnlyNamedPeople] = useState(true);
  // Surface what Claude omitted vs what it returned. Lets us say
  // "Claude could not find phone+email for 12 of 25 candidates" and
  // explain why the count is short.
  const [missingCount, setMissingCount] = useState(0);
  // Provider picker — same endpoint, different backend. Claude
  // (Anthropic + hosted web_search) is the default; Gemini 2.5 Pro
  // (Google + native google_search grounding) is the alt.
  const [provider, setProvider] = useState<'claude' | 'gemini'>('claude');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function findCandidates() {
    if (!token) return;
    setPhase('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/contacts/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: steer.trim(), count, provider }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(typeof json?.error === 'string' ? json.error : `Request failed (${res.status})`);
        setPhase('error');
        return;
      }
      const list = Array.isArray(json?.contacts) ? (json.contacts as ClaudeSuggestion[]) : [];
      // Defensive — older API responses don't carry `missing`; treat
      // the absence as "complete" so the new client doesn't choke on
      // legacy payloads.
      const normalised = list.map((s) => ({ ...s, missing: Array.isArray(s.missing) ? s.missing : [] }));
      setSuggestions(normalised);
      setMissingCount(typeof json?.missingCount === 'number' ? json.missingCount : normalised.filter((s) => s.missing.length > 0).length);
      // Pre-check only the complete rows. Partials are revealed when
      // the admin toggles strict mode off; they have to opt them in.
      setChecked(new Set(normalised.map((s, i) => (s.missing.length === 0 ? i : -1)).filter((i) => i >= 0)));
      const completeCount = normalised.filter((s) => s.missing.length === 0).length;
      if (normalised.length === 0) {
        setErrorMsg(`Claude could not find any candidates with both a phone and an email. Try a different steer (specific cities, named referrer networks, or alumni-driven leads usually unstick this).`);
        setPhase('error');
      } else {
        setPhase('review');
        if (completeCount === 0) {
          // Edge case: only partials came back. Show them but flip
          // strict off so they're visible by default.
          setStrictContactInfo(false);
        }
      }
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  }

  async function continueWithChecked() {
    if (!token) return;
    const picked = suggestions.filter((_, i) => checked.has(i));
    if (picked.length === 0) return;
    setPhase('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contacts: picked }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(typeof json?.error === 'string' ? json.error : `Request failed (${res.status})`);
        setPhase('error');
        return;
      }
      onInserted(Array.isArray(json?.inserted) ? (json.inserted as Contact[]) : []);
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  }

  function toggleAll(all: boolean) {
    // Scope "Select all" / "Clear" to what the user can actually see.
    // When strict mode is on, hidden partials should not silently
    // join the selection — clicking Select-all on a 7-row list and
    // ending up posting 20 contacts to the DB is the wrong shape.
    const visibleIndices = suggestions
      .map((s, i) => (strictContactInfo && s.missing.length > 0 ? -1 : i))
      .filter((i) => i >= 0);
    if (all) {
      setChecked(new Set(visibleIndices));
    } else {
      // Clear only the visible indices; preserve any opt-in
      // selections the user made on rows that are currently hidden
      // (e.g. they toggled partials on, picked a few, then toggled
      // strict back on — those picks shouldn't disappear).
      setChecked((prev) => {
        const next = new Set(prev);
        for (const i of visibleIndices) next.delete(i);
        return next;
      });
    }
  }
  function toggleOne(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  return (
    <ModalShell title="Add with AI" eyebrow="AI-assisted outreach" onClose={onClose}>
      {phase === 'prompt' && (
        <div className="px-6 py-5 space-y-4">
          <p className="text-[12.5px] text-foreground/65 leading-relaxed">
            An AI assistant will research realistic candidate contacts the admissions team might want to track — referrers, clinical partners, alumni leads. You&apos;ll get a list with checkboxes; only the ones you keep get added.
          </p>
          {/* Provider picker — pick the model that runs the search.
              Same endpoint + same dedup; just a different backend.
              Useful for comparing outputs side-by-side. */}
          <ModalField label="Model">
            <div className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-white p-1">
              {([
                ['claude', 'Claude'],
                ['gemini', 'Gemini Pro'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProvider(key)}
                  className={`px-3 py-1 rounded text-[12px] font-semibold transition-colors ${
                    provider === key ? 'bg-foreground text-white' : 'text-foreground/65 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </ModalField>
          <ModalField label="Steer (optional)" full hint="e.g. 'Arizona detox owners', 'PHP programs we haven't reached yet'">
            <textarea
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              rows={3}
              className="modal-input resize-none"
              placeholder={`Tell ${provider === 'gemini' ? 'Gemini' : 'Claude'} what kind of contacts to look for…`}
            />
          </ModalField>
          <ModalField label="How many to suggest">
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))} className="modal-input">
              <option value={5}>5</option>
              <option value={8} disabled>8 — coming soon</option>
              <option value={10} disabled>10 — coming soon</option>
              <option value={15} disabled>15 — coming soon</option>
              <option value={25} disabled>25 — coming soon</option>
              <option value={50} disabled>50 — coming soon</option>
            </select>
          </ModalField>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/60 hover:bg-warm-bg/60">Cancel</button>
            <button
              type="button"
              onClick={() => void findCandidates()}
              disabled={!token}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40"
            >
              <SparkleIcon />
              Find candidates
            </button>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary animate-pulse">
            <SparkleIcon />
          </span>
          <p className="text-[13px] font-semibold text-foreground">Claude is researching…</p>
          <p className="text-[11px] text-foreground/55">Cross-referencing the existing roster and drafting candidates. Hang tight — this usually takes a minute.</p>
        </div>
      )}

      {phase === 'review' && (() => {
        // Build the list to render based on the two toggles. The
        // checkbox state is keyed by original index so toggling
        // either filter doesn't lose the user's selections.
        const visible = suggestions
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => {
            if (strictContactInfo && s.missing.length > 0) return false;
            if (onlyNamedPeople && !looksLikePersonName(s.name)) return false;
            return true;
          });
        const completeCount = suggestions.filter((s) => s.missing.length === 0).length;
        const orgCount = suggestions.filter((s) => !looksLikePersonName(s.name)).length;
        return (
        <div className="px-0 sm:px-0 py-0">
          <div className="px-6 pt-5 pb-3 border-b border-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-semibold text-foreground">{checked.size} of {visible.length} selected</p>
                <p className="text-[11px] text-foreground/55">Uncheck anyone you don't want to add. Click Continue when ready.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => toggleAll(true)} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60">Select all</button>
                <button type="button" onClick={() => toggleAll(false)} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60">Clear</button>
              </div>
            </div>
            {/* Contact-info gap banner. Claude was asked to surface
                phone + email for every candidate; this row tells
                admissions how many came back complete vs partial,
                with a toggle to reveal the partials. */}
            {missingCount > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-[11.5px] text-amber-900">
                <span>
                  <span className="font-semibold">{missingCount}</span> of {suggestions.length} candidates came back without a verified phone and/or email.
                  {completeCount === 0
                    ? ' All candidates below are partial — fill the missing fields by hand before adding.'
                    : ` ${completeCount} complete candidate${completeCount === 1 ? '' : 's'} ${completeCount === 1 ? 'is' : 'are'} shown by default.`}
                </span>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={!strictContactInfo}
                    onChange={(e) => setStrictContactInfo(!e.target.checked)}
                    className="accent-amber-600 w-3.5 h-3.5"
                  />
                  <span className="font-medium">Show partials</span>
                </label>
              </div>
            )}
            {missingCount === 0 && (
              <p className="mt-2 text-[11px] text-emerald-700">✓ Every candidate came back with both a phone and an email.</p>
            )}
            {/* Org / team filter — defaults ON so the review list
                doesn't surface things like 'Admissions Team' or
                'Heather R. Hayes & Associates, Inc.' (org names
                that slipped through the prompt). Toggling off
                surfaces the org-y rows too. */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 rounded-lg border border-black/10 bg-warm-bg/40 text-[11.5px] text-foreground/75">
              <span>
                {orgCount > 0 && onlyNamedPeople ? (
                  <>
                    <span className="font-semibold">{orgCount}</span> candidate{orgCount === 1 ? '' : 's'} read as team / org names (e.g. &quot;Admissions Team&quot;) and {orgCount === 1 ? 'is' : 'are'} hidden by default — we only want named people in the CRM.
                  </>
                ) : orgCount > 0 ? (
                  <>
                    <span className="font-semibold">{orgCount}</span> candidate{orgCount === 1 ? '' : 's'} read as team / org names. Turn the toggle back on to hide them.
                  </>
                ) : (
                  <>All candidates have an individual person&apos;s name. ✓</>
                )}
              </span>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={onlyNamedPeople}
                  onChange={(e) => setOnlyNamedPeople(e.target.checked)}
                  className="accent-primary w-3.5 h-3.5"
                />
                <span className="font-medium">Only add people with names</span>
              </label>
            </div>
          </div>
          <ul className="divide-y divide-black/5 max-h-[55vh] overflow-y-auto">
            {visible.map(({ s, i }) => {
              const isOn = checked.has(i);
              const phoneMissing = s.missing.includes('phone');
              const emailMissing = s.missing.includes('email');
              return (
                <li key={i} className={`px-6 py-3 transition-colors ${isOn ? 'bg-white' : 'bg-warm-bg/30'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleOne(i)}
                      className="mt-1 accent-primary w-4 h-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold text-[13px] text-foreground">{s.name}</span>
                        {(s.type ?? []).map((t) => (
                          <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border ${TYPE_TONES[t] ?? 'bg-foreground/5 text-foreground/70 border-foreground/15'}`}>{t}</span>
                        ))}
                        {s.role && <span className="text-[11px] text-foreground/55">{s.role}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
                        {s.company && <span className="font-medium">{s.company}</span>}
                        {s.company_website && (
                          <a href={normaliseUrl(s.company_website) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{s.company_website}</a>
                        )}
                        {s.location && <span>· {s.location}</span>}
                        {s.specialty && <span>· {s.specialty}</span>}
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                        {/* Phone — value if Claude found one, badge
                            if it didn't. Admissions needs this column
                            to be obvious at a glance. */}
                        {s.phone ? (
                          <span className="font-mono text-foreground/80">{s.phone}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            Phone unknown
                          </span>
                        )}
                        <span className="text-foreground/30">·</span>
                        {s.email ? (
                          <span className="font-mono text-foreground/80">{s.email}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            Email unknown
                          </span>
                        )}
                        {(phoneMissing || emailMissing) && (
                          <span className="text-[10px] text-foreground/40">· you'll need to fill the gap by hand</span>
                        )}
                      </div>
                      {s.notes && (
                        <p className="mt-1 text-[11.5px] text-foreground/70 leading-snug">{s.notes}</p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="px-6 py-3 border-t border-black/5 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setPhase('prompt')} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/60 hover:bg-warm-bg/60">Back</button>
            <button
              type="button"
              onClick={() => void continueWithChecked()}
              disabled={checked.size === 0}
              className="px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-40"
            >
              Continue · Add {checked.size}
            </button>
          </div>
        </div>
        );
      })()}

      {phase === 'submitting' && (
        <div className="px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-foreground/5 text-foreground/55 animate-pulse">
            <PlusIcon />
          </span>
          <p className="text-[13px] font-semibold text-foreground">Adding contacts…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="px-6 py-8 space-y-4 text-center">
          <p className="text-[12.5px] font-semibold text-rose-700">{errorMsg ?? 'Something went wrong.'}</p>
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/60 hover:bg-warm-bg/60">Close</button>
            <button
              type="button"
              onClick={() => setPhase('prompt')}
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Batch-edit floating bar ─────────────────────────────────
//
// Anchored to the bottom of the viewport whenever the leading
// checkboxes have a non-empty selection. Provides five quick-set
// affordances — Company / Rating / Type / Specialty/Focus / Location —
// each of which expands into a small inline picker. On Apply we fan
// out PATCH requests to /api/contacts/[id] for every selected row in
// parallel. Optimistic: the parent stamps the same patch into local
// rows so the grid reflects the change before the realtime echo lands.

type BatchField = 'company' | 'rating' | 'type' | 'specialty' | 'location';

function BatchEditBar({
  selectedIds,
  token,
  rows,
  companyOptions,
  typeOptions,
  specialtyOptions,
  onClear,
  onApplied,
}: {
  selectedIds: Set<string>;
  token: string | null;
  rows: Contact[];
  companyOptions: string[];
  typeOptions: string[];
  specialtyOptions: string[];
  onClear: () => void;
  onApplied: (patch: Partial<Contact>) => void;
}) {
  const [field, setField] = useState<BatchField | null>(null);
  const [value, setValue] = useState<string>('');
  const [rating, setRating] = useState<ContactRating | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // The number selected (out of how many on the page) — affordance for
  // a quick "you're about to change N rows" sanity check.
  const count = selectedIds.size;
  const totalOnPage = rows.length;

  function open(next: BatchField) {
    setField(next);
    setValue('');
    setRating('');
  }
  function close() {
    setField(null);
    setValue('');
    setRating('');
  }

  async function apply() {
    if (!token) return;
    let patch: Partial<Contact> = {};
    switch (field) {
      case 'company': patch = { company: value.trim() || null }; break;
      case 'rating': patch = { rating: rating || null }; break;
      case 'type': {
        // Batch type input: comma-separated string of tags. We split,
        // trim, dedupe (case-insensitive) and replace the array on
        // every selected row. Empty input clears the field.
        const parts: string[] = [];
        const seen = new Set<string>();
        for (const raw of value.split(',')) {
          const t = raw.trim();
          if (!t) continue;
          const k = t.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          parts.push(t);
        }
        patch = { type: parts.length === 0 ? null : parts };
        break;
      }
      case 'specialty': patch = { specialty: value.trim() || null }; break;
      case 'location': patch = { location: value.trim() || null }; break;
      default: return;
    }
    setSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      // Fan out PATCH per id. Server-side a real bulk endpoint would
      // be cheaper; per-row calls keep the change isolated and the
      // existing realtime channel reconciles automatically.
      await Promise.allSettled(ids.map((id) => fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      })));
      onApplied(patch);
      close();
    } finally {
      setSubmitting(false);
    }
  }

  const FIELDS: { key: BatchField; label: string }[] = [
    { key: 'company', label: 'Company' },
    { key: 'rating', label: 'Rating' },
    { key: 'type', label: 'Type' },
    { key: 'specialty', label: 'Specialty / Focus' },
    { key: 'location', label: 'Location' },
  ];

  return (
    <div className="fixed inset-x-0 bottom-10 sm:bottom-12 z-40 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="rounded-2xl border border-black/10 bg-foreground text-white shadow-2xl ring-1 ring-black/20 overflow-hidden">
          {field && (
            <div className="px-4 sm:px-5 py-3 border-b border-white/10 bg-foreground/95">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/55">Set {FIELDS.find((f) => f.key === field)?.label} for {count} {count === 1 ? 'contact' : 'contacts'}</span>
                <button type="button" onClick={close} className="ml-auto text-white/50 hover:text-white text-[11px] underline">Cancel</button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {field === 'rating' ? (
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value as ContactRating | '')}
                    className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/5 text-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">— Select —</option>
                    {RATING_OPTIONS.map((r) => <option key={r} value={r} className="text-foreground">{r}</option>)}
                  </select>
                ) : field === 'type' ? (
                  <input
                    list="batch-type-options"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Comma-separated: Detox, PHP, IOP …"
                    className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/5 text-white placeholder-white/45 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : field === 'specialty' ? (
                  <input
                    list="batch-specialty-options"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Trauma · Eating Disorders · …"
                    className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/5 text-white placeholder-white/45 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : field === 'company' ? (
                  <input
                    list="batch-company-options"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Company name"
                    className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/5 text-white placeholder-white/45 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="City, ST"
                    className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/5 text-white placeholder-white/45 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={submitting || (field === 'rating' ? rating === '' : false)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40"
                >
                  {submitting ? 'Applying…' : `Apply to ${count}`}
                </button>
              </div>
              {/* datalists feed each input's suggestion drop-down */}
              <datalist id="batch-type-options">
                {typeOptions.map((o) => <option key={o} value={o} />)}
                {TYPE_OPTIONS.filter((t) => !typeOptions.includes(t)).map((o) => <option key={o} value={o} />)}
              </datalist>
              <datalist id="batch-specialty-options">
                {specialtyOptions.map((o) => <option key={o} value={o} />)}
              </datalist>
              <datalist id="batch-company-options">
                {companyOptions.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
          )}
          <div className="px-4 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-[11.5px] font-semibold">
              {count} of {totalOnPage} selected
            </span>
            <span className="text-white/30">·</span>
            <div className="flex items-center gap-1 flex-wrap">
              {FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => open(f.key)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${field === f.key ? 'bg-primary text-white' : 'bg-white/10 text-white/85 hover:bg-white/20'}`}
                >
                  Set {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClear}
              className="ml-auto text-white/55 hover:text-white text-[11px] underline"
            >
              Clear selection
            </button>
          </div>
        </div>
      </div>
    </div>
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
  onSubmit: (method: ContactMethod, comments: string, transcript: string, durationSeconds: number, followUpDays: number | null) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<ContactMethod>('Phone');
  const [comments, setComments] = useState('');
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [followUpDays, setFollowUpDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState<string>('');
  const FOLLOW_UP_PICKS = [3, 7, 14, 30];
  // Duration captured as a single whole-minute count — reps were
  // round-tripping every entry to the nearest minute anyway and the
  // dual MIN+SEC field added a tab-stop with no real reporting value.
  // Persisted to the DB as `duration_seconds` (minutes * 60) so the
  // schema and downstream stats (avg call length, etc.) don't have
  // to change. Duration is OPTIONAL — for Text Message / Email /
  // Left Message there's no meaningful duration to type, so leaving
  // the field blank used to silently disable the Save button. The
  // server already accepts 0, so the client trusts the server's
  // contract: empty → 0 seconds, log saves, life goes on.
  const [durationMin, setDurationMin] = useState<string>('');
  const totalSeconds = (() => {
    const m = parseInt(durationMin, 10);
    return Number.isFinite(m) && m > 0 ? m * 60 : 0;
  })();

  const [submitting, setSubmitting] = useState(false);
  return (
    <ModalShell
      title={`Log a contact with ${contact.name}`}
      eyebrow="Outreach"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await onSubmit(method, comments.trim(), transcript.trim(), totalSeconds, followUpDays);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)] gap-6 items-start">
          {/* Left rail — pick the method. */}
          <ModalField label="Method" required>
            <ContactMethodPicker value={method} onChange={setMethod} columns={2} />
          </ModalField>
          {/* Right — everything else about the touch. */}
          <div className="space-y-4 min-w-0">
          <ModalField label="Duration" hint="Optional. How long was the call / conversation, in minutes? Leave blank for texts, emails, or left messages.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={720}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="0"
                className="modal-input w-24 text-center tabular-nums"
                aria-label="Minutes"
                inputMode="numeric"
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">min</span>
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

          <ModalField label="Schedule follow up">
            <div className="flex flex-wrap items-center gap-1.5">
              {FOLLOW_UP_PICKS.map((days) => {
                const active = followUpDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => { setFollowUpDays(days); setCustomDays(''); }}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-foreground/75 border-black/10 hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    In {days}d
                  </button>
                );
              })}
              <div className="inline-flex items-center rounded-lg border border-black/10 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                <span className="px-2 text-[11px] font-semibold text-foreground/45">In</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomDays(v);
                    const n = parseInt(v, 10);
                    if (Number.isFinite(n) && n > 0) setFollowUpDays(n);
                    else if (v === '') setFollowUpDays(null);
                  }}
                  placeholder="—"
                  className="w-12 py-1.5 text-center text-[12px] font-semibold text-foreground bg-transparent focus:outline-none"
                />
                <span className="pr-2 text-[11px] font-semibold text-foreground/45">d</span>
              </div>
              {followUpDays != null && (
                <button
                  type="button"
                  onClick={() => { setFollowUpDays(null); setCustomDays(''); }}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-foreground/55 hover:text-foreground hover:bg-warm-bg/60"
                >
                  Clear
                </button>
              )}
            </div>
            {followUpDays != null && followUpDays > 0 && (
              <p className="mt-1.5 text-[11px] text-foreground/55">
                Follow up on{' '}
                <span className="font-semibold text-foreground/75">
                  {new Date(Date.now() + followUpDays * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </p>
            )}
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
          </div>{/* right column */}
          </div>{/* two-column grid */}
        </div>
        <ModalFooter
          submitting={submitting}
          submitDisabled={false}
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
  campaign_id: string | null;
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
  historyOnly = false,
}: {
  contact: Contact;
  accessToken: string | null;
  onLogContact: () => void;
  onClose: () => void;
  // When true, the left "Contact details" pane is hidden and the
  // history timeline gets the full width. The sticky-right
  // "Contact history" cell on the desktop grid passes this — reps
  // open that cell to see touchpoints, not to re-read the phone
  // number that's already in the row above.
  historyOnly?: boolean;
}) {
  // Pulled from the same AuthProvider the page root uses — beats
  // threading currentUserId through three levels of grid props just
  // to gate the edit/delete buttons on history rows.
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const [logs, setLogs] = useState<ContactLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadLogs = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch(`/api/contacts/${contact.id}/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((json as { error?: string }).error || `HTTP ${r.status}`);
      setLogs((json as { rows: ContactLog[] }).rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [accessToken, contact.id]);

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
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/40">{historyOnly ? 'Contact history' : 'Contact details'}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground truncate">{contact.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLogContact}
            // Desktop-only: on mobile this panel always sits directly
            // under the card's own LOG button, so a third logging
            // affordance (card LOG + this + the NEW LOG FAB) stacked
            // in one viewport read as clutter.
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[10px] font-semibold hover:bg-primary/90 transition-colors"
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

      <div className={historyOnly ? '' : 'grid md:grid-cols-2 gap-x-6'}>
        {!historyOnly && (
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
        )}

        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            {/* Inner label drops to "Touchpoints" in history-only
                mode since the drawer's outer eyebrow already reads
                "Contact history" — avoids two identical eyebrows
                stacked on top of each other. */}
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/45">{historyOnly ? 'Touchpoints' : 'Contact history'}</p>
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
                <HistoryEntry
                  key={log.id}
                  log={log}
                  isNewest={i === 0}
                  contactId={contact.id}
                  accessToken={accessToken}
                  currentUserId={currentUserId}
                  onMutated={reloadLogs}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// One row in the Contact-history timeline, with inline edit + delete
// affordances scoped to the rep who logged the entry. The visible
// row stays read-only by default; clicking the pencil flips this
// component into an inline form (method · minutes · notes) that
// PATCHes the log, and the trash flips it into a small confirm
// prompt that DELETEs. Both paths call `onMutated` so the parent
// drawer re-fetches the timeline (cheaper than threading optimistic
// patch state through a list that's usually <20 entries long).
function HistoryEntry({
  log,
  isNewest,
  contactId,
  accessToken,
  currentUserId,
  onMutated,
}: {
  log: ContactLog;
  isNewest: boolean;
  contactId: string;
  accessToken: string | null;
  currentUserId: string | null;
  onMutated: () => void | Promise<void>;
}) {
  type Mode = 'view' | 'edit' | 'confirm-delete';
  const [mode, setMode] = useState<Mode>('view');
  const [method, setMethod] = useState<ContactMethod>(log.method);
  const [comments, setComments] = useState<string>(log.comments ?? '');
  const [durationMin, setDurationMin] = useState<string>(
    log.duration_seconds != null && log.duration_seconds > 0
      ? String(Math.round(log.duration_seconds / 60))
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canEdit = currentUserId != null && log.contacted_by === currentUserId;

  function startEdit() {
    setMethod(log.method);
    setComments(log.comments ?? '');
    setDurationMin(
      log.duration_seconds != null && log.duration_seconds > 0
        ? String(Math.round(log.duration_seconds / 60))
        : '',
    );
    setErr(null);
    setMode('edit');
  }

  async function save() {
    if (!accessToken) return;
    const minutes = parseInt(durationMin, 10);
    // Duration is optional on edit too — match the create flow.
    // Empty / NaN / negative all coerce to 0 seconds, which the
    // server accepts.
    const seconds = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/contacts/${contactId}/history/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ method, comments: comments.trim() || null, duration_seconds: seconds }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((json as { error?: string }).error || `HTTP ${r.status}`);
      setMode('view');
      await onMutated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!accessToken) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/contacts/${contactId}/history/${log.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((json as { error?: string }).error || `HTTP ${r.status}`);
      await onMutated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <li className="relative pl-4 pb-4 last:pb-0 group/log">
      <span
        className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
          isNewest ? 'bg-primary' : 'bg-foreground/30'
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
            {mode === 'edit' ? (
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as ContactMethod)}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-black/10 bg-white"
                disabled={busy}
              >
                <option value="Phone">Phone</option>
                <option value="In Person">In Person</option>
                <option value="Left Message">Left Message</option>
                <option value="Text Message">Text Message</option>
              </select>
            ) : (
              <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[log.method]}`}>
                {log.method}
              </span>
            )}
            {mode === 'edit' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-black/10 bg-white tabular-nums">
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-10 text-center bg-transparent focus:outline-none"
                  aria-label="Minutes"
                  inputMode="numeric"
                  disabled={busy}
                />
                <span className="text-foreground/55">min</span>
              </span>
            ) : (
              fmtDuration(log.duration_seconds) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold border bg-foreground/5 text-foreground/65 border-foreground/15 tabular-nums">
                  {fmtDuration(log.duration_seconds)}
                </span>
              )
            )}
            <span className="text-[10px] text-foreground/45" title={fmtAbsolute(log.contacted_at) ?? ''}>
              {fmtAgo(log.contacted_at)}
            </span>
            {/* Edit/delete — sits inline right after the ago
                timestamp so it reads as "row-level actions for THIS
                touchpoint", not "actions for the timeline." Only
                shown on rows the current rep authored (canEdit). */}
            {canEdit && mode === 'view' && (
              <span className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={startEdit}
                  className="p-1 rounded-md text-foreground/45 hover:text-foreground hover:bg-warm-bg/60"
                  aria-label="Edit entry"
                  title="Edit"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => { setErr(null); setMode('confirm-delete'); }}
                  className="p-1 rounded-md text-foreground/45 hover:text-red-700 hover:bg-red-50"
                  aria-label="Delete entry"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </span>
            )}
          </div>
          {mode === 'edit' ? (
            <div className="mt-1.5 space-y-1.5">
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 rounded-md border border-black/10 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                placeholder="Notes about this contact…"
                disabled={busy}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('view'); setErr(null); }}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-md text-foreground/65 hover:text-foreground text-[11px] font-semibold"
                >
                  Cancel
                </button>
                {err && <span className="text-[11px] text-red-700">{err}</span>}
              </div>
            </div>
          ) : (
            <>
              {log.comments && (
                log.campaign_id ? (
                  // Rich card for email-campaign touchpoints so the
                  // row reads as a real email artefact (envelope
                  // icon + subject + 'Open campaign' button) rather
                  // than just an underlined sentence. The link still
                  // routes to the campaign's finalize view.
                  <Link
                    href={`/feather/email-campaigns/${log.campaign_id}/finalize`}
                    className="group/email mt-2 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.04] hover:border-primary/45 hover:bg-primary/[0.07] active:bg-primary/[0.09] px-3 py-2 transition-colors"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary"
                    >
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary/80">
                        Email campaign
                      </span>
                      <span className="block mt-0.5 text-[12px] font-semibold text-foreground leading-snug">
                        {log.comments.replace(/^Sent email campaign(?: \(simulated\))?:\s*/i, '')}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 self-center text-[10px] font-semibold uppercase tracking-wider text-primary/70 group-hover/email:text-primary translate-x-0 group-hover/email:translate-x-0.5 transition-all"
                    >
                      Open →
                    </span>
                  </Link>
                ) : (
                  <p className="mt-1 text-[12px] text-foreground/75 whitespace-pre-wrap leading-relaxed">
                    {log.comments}
                  </p>
                )
              )}
              {(log.transcript_summary || log.transcript_storage_path) && (
                <TranscriptBlock
                  contactId={contactId}
                  logId={log.id}
                  summary={log.transcript_summary}
                  hasTranscript={!!log.transcript_storage_path}
                  accessToken={accessToken}
                />
              )}
              {mode === 'confirm-delete' && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px]">
                  <span className="text-red-800 font-semibold">Delete this entry?</span>
                  <button
                    type="button"
                    onClick={destroy}
                    disabled={busy}
                    className="px-2 py-0.5 rounded bg-red-700 text-white font-semibold disabled:opacity-50"
                  >
                    {busy ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    disabled={busy}
                    className="px-2 py-0.5 rounded text-red-800 font-semibold"
                  >
                    Cancel
                  </button>
                  {err && <span className="text-red-800">· {err}</span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10" />
      <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
      <path d="M4.5 4l.5 8.5A1.5 1.5 0 006.5 14h3a1.5 1.5 0 001.5-1.5L11.5 4" />
      <path d="M7 7v4M9 7v4" />
    </svg>
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
        website: normalizeUrl(website),
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
  wide = false,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
  // Landscape modal — a roomier max-width for two-column layouts.
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-3xl'} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 pb-[env(safe-area-inset-bottom)]`}
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
function SparkleIcon() {
  // Four-point sparkle — marks Claude-assisted affordances. Same shape
  // used elsewhere in the app so admissions reads it as "AI helper".
  return <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 2l1.6 5.6L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.4L12 2zm6.5 11l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"/></svg>;
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
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; reason: string }[];
    duplicates: { row: number; name: string; matchedOn: 'name' | 'email' | 'company_website' }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
        duplicates: Array.isArray(json.duplicates) ? json.duplicates : [],
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
            <label
              onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onFileChange(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`block rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-black/15 bg-warm-bg/30 hover:border-primary/45 hover:bg-primary/5'
              }`}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-[13px] font-semibold text-foreground">{file ? file.name : (dragOver ? 'Drop your .csv to upload' : 'Click or drag a .csv here')}</p>
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
            <div className="space-y-2">
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
              {/* Already-in-the-CRM rows. Shown distinctly from the
                  validation errors above so the user can tell 'this
                  contact already exists' from 'this row was broken'. */}
              {result.duplicates.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <p className="text-[13px] font-semibold text-amber-900">
                    {result.duplicates.length} {result.duplicates.length === 1 ? 'row' : 'rows'} already in the CRM — not imported
                  </p>
                  <p className="text-[11.5px] text-amber-900/75 mt-0.5">
                    We matched on the contact&apos;s name, email, or company website. Edit the existing record from the outreach grid instead of re-importing.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11.5px] text-amber-900/85 max-h-40 overflow-y-auto">
                    {result.duplicates.slice(0, 30).map((d, i) => (
                      <li key={i}>
                        <span className="text-amber-900/55">Row {d.row}:</span>{' '}
                        <span className="font-medium">{d.name}</span>{' '}
                        <span className="text-amber-900/55">· matched on {d.matchedOn.replace('_', ' ')}</span>
                      </li>
                    ))}
                    {result.duplicates.length > 30 && (
                      <li className="text-amber-900/55 italic">+ {result.duplicates.length - 30} more</li>
                    )}
                  </ul>
                </div>
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
