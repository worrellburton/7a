'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { supabase } from '@/lib/supabase';
import { touchMedia } from '@/lib/touchMedia';
import { PlatformIcon, type PlatformId } from './PlatformIcon';
import { MediaPicker, type PickedMedia } from './MediaPicker';
import { PostStatusToast, type PostStatus, type PerPlatformResult } from './PostStatusToast';
import { PLATFORM_SPECS, type MediaSpec, type VideoSpec } from './platform-specs';
import ScheduleDropCard, { ReadyToGoCard, PostNowDropCard, type ReadyDraft } from './ScheduleSlotsPanel';
import { useSavedDrafts, saveDraft as createDraft, setDraftReady, deleteDraft, type SavedDraft } from './saved-drafts';
import { usePendingDeletes, UndoToast } from './UndoToast';

// ── Cross-tab Send-to-Compose handoff ────────────────────────────────
//
// Library (phase 6), Templates (phase 7), and AI (phase 8) all need a
// way to ship a draft into the Compose form on the Post tab. We do
// that with a sessionStorage stash + a window CustomEvent so the
// Composer (which lives on a different sub-tab) can pick the draft up
// the moment it mounts. Phase 9 wires Composer to actually consume
// these — until then, the helpers only stash + navigate.

interface ComposeDraft {
  caption?: string;
  mediaUrls?: string[];
  source?: 'library' | 'templates' | 'ai' | 'drafts';
}
const DRAFT_KEY = 'social_media_compose_draft_v1';
function pushComposeDraft(draft: ComposeDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    window.dispatchEvent(new CustomEvent('social-media-compose-draft', { detail: draft }));
  } catch { /* sessionStorage may be unavailable in private browsing */ }
}

// Intermediate Library -> AI staging. Lives in sessionStorage under
// a separate key so the Composer's pushComposeDraft consume-and-clear
// path doesn't accidentally drop it. The AI panel reads this on
// mount to pre-populate its media context; saving to drafts copies
// the urls into the draft payload and then this stash is cleared.
interface CreativeStaging { mediaUrls: string[]; title?: string | null }
const STAGING_KEY = 'social_media_creative_staging_v1';
function pushCreativeStaging(s: CreativeStaging) {
  try { sessionStorage.setItem(STAGING_KEY, JSON.stringify(s)); } catch { /* no-op */ }
}
function readCreativeStaging(): CreativeStaging | null {
  try {
    const raw = sessionStorage.getItem(STAGING_KEY);
    return raw ? (JSON.parse(raw) as CreativeStaging) : null;
  } catch { return null; }
}
function clearCreativeStaging() {
  try { sessionStorage.removeItem(STAGING_KEY); } catch { /* no-op */ }
}

// Saved drafts now live in the shared DB-backed module (./saved-drafts):
// SavedDraft, useSavedDrafts(), and the async mutators saveDraft /
// setDraftReady / deleteDraft. They sync across devices + teammates.

// Marketing → Social Media. v1 wraps Ayrshare's API:
//   * Connected accounts strip (one button per platform → JWT popup)
//   * Compose a post (text, optional media URLs, multi-platform picker)
//   * Post now or schedule
//   * Recent history (already-posted + scheduled)
//
// All Ayrshare credentials live server-side. The client only ever
// talks to /api/social-media/* — never directly to Ayrshare.

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'gmb', label: 'Google Business' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'threads', label: 'Threads' },
  { id: 'bluesky', label: 'Bluesky' },
] as const;

type Platform = typeof PLATFORMS[number]['id'];

interface AccountsResponse {
  activeSocialAccounts?: string[];
  displayNames?: Record<string, { displayName?: string; username?: string }>;
  socialAccounts?: Record<string, unknown>;
  error?: string;
}

interface HistoryPost {
  id?: string;
  status?: string;
  post?: string;
  platforms?: string[];
  postIds?: { platform: string; postUrl?: string; status?: string; id?: string }[];
  errors?: { platform?: string; message?: string }[];
  scheduleDate?: string;
  created?: string;
  mediaUrls?: string[];
  [key: string]: unknown;
}

export default function SocialMediaContent() {
  const { user, isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [accountsErr, setAccountsErr] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryPost[]>([]);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch('/api/social-media/accounts', { credentials: 'include', cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as AccountsResponse;
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAccounts(json);
      setAccountsErr(null);
    } catch (err) {
      setAccountsErr(err instanceof Error ? err.message : String(err));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/social-media/history?lastRecords=25', { credentials: 'include', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setHistory(Array.isArray(json.posts) ? json.posts : []);
      setHistoryErr(null);
    } catch (err) {
      setHistoryErr(err instanceof Error ? err.message : String(err));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAccounts();
    refreshHistory();
  }, [refreshAccounts, refreshHistory]);

  if (!user) return null;

  // Super-admin gate. The page is wired through PageGuard's
  // adminOnly flag, but Social Media specifically requires super
  // admin. A regular admin who lands here from a deep link sees
  // the locked state instead of the composer; the API routes
  // enforce the same on the server.
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Social Media
        </h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Super-admin only.</p>
          <p>
            Posting on the Seven Arrows social accounts is restricted to
            super admins. If you need access, ask one of them to grant
            super-admin in <span className="font-mono text-[12px]">/app/admin/user-permissions</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Social Media
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Compose once, post to every connected channel.
          </p>
        </div>
        <PostingToggle />
      </header>

      <SubNav />

      <SocialTabBody
        accounts={accounts}
        accountsLoading={accountsLoading}
        accountsErr={accountsErr}
        refreshAccounts={refreshAccounts}
        history={history}
        historyLoading={historyLoading}
        historyErr={historyErr}
        refreshHistory={refreshHistory}
      />
    </div>
  );
}

// ── Sub-page tab strip ───────────────────────────────────────────
//
// Phase 1 of the 10-phase split. Three sub-pages — Overview /
// Post / Creative — wired through the `?tab=` query param so the
// state survives refresh and is shareable. Default is overview;
// anything unknown also falls back to overview so a stale link
// can't 404 the page.

type Tab = 'overview' | 'post' | 'creative';

const TABS: { id: Tab; label: string; description: string }[] = [
  // Note: the `creative` id is kept as the route key (?tab=creative) for
  // deep-link + handoff stability; only the visible label is "Compose".
  { id: 'overview', label: 'Overview', description: 'Connected accounts + analytics snapshot.' },
  { id: 'creative', label: 'Compose', description: 'Drafts and ready-to-go posts your team is building.' },
  { id: 'post', label: 'Post', description: 'Publish now or schedule across every channel.' },
];

function readTab(raw: string | null): Tab {
  if (raw === 'post' || raw === 'creative' || raw === 'overview') return raw;
  return 'overview';
}

// Phase 10: localStorage key that remembers the last top-level tab
// the user landed on. When they hit /app/social-media without a
// ?tab=, we replace the URL with their last choice so refresh +
// fresh-link behaviour both feel consistent.
const LAST_TAB_KEY = 'social_media_last_tab_v1';

function SubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabRaw = searchParams.get('tab');
  const active = readTab(tabRaw);

  // Per spec, Overview is always the default landing tab — the
  // earlier last-used-tab restoration was producing situations
  // where a user who'd briefly viewed Post once would never see
  // Overview again on subsequent visits. We still write the
  // last-used tab to localStorage for any other consumers that
  // want it but don't read it back here.
  useEffect(() => {
    if (tabRaw !== null) {
      try { localStorage.setItem(LAST_TAB_KEY, active); } catch { /* no-op */ }
    }
  }, [tabRaw, active]);

  // Top-level tabs render as <Link> so the click rides Next's
  // standard link semantics. Earlier the same fix on the Post /
  // Creative sub-navs (commit 2babb0c) resolved cases where an
  // onClick + router.push was getting swallowed by the outer
  // Suspense boundary re-suspending mid-navigation, leaving the
  // body stuck on the prior pane.
  const hrefFor = (id: Tab): string => {
    const next = new URLSearchParams(searchParams.toString());
    // Always write tab=<id> (even for overview) so the URL is
    // deterministic and router.push always sees a path-string
    // change — clicking Overview from ?tab=creative previously
    // tried to navigate to the bare path, which in some Next
    // router states didn't propagate to the SocialTabBody
    // useSearchParams consumer.
    next.set('tab', id);
    next.delete('sub');
    const qs = next.toString();
    // qs is never empty (we always set ?tab=…) so the ternary
    // from the pre-fix version is gone — leaves the URL update
    // deterministic, which is what made the Overview tab
    // reliably re-render after the previous bare-path push
    // stopped propagating.
    return `${pathname}?${qs}`;
  };

  // Arrow-key keyboard nav across the tab strip — left/right cycles,
  // home/end jump to the ends. Matches the WAI-ARIA Authoring
  // Practices recommendation for role=tablist.
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.findIndex((t) => t.id === active);
    if (idx < 0) return;
    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;
    else return;
    e.preventDefault();
    tabRefs.current[nextIdx]?.click();
    tabRefs.current[nextIdx]?.focus();
  };

  // One tab segment. `i` is the index into TABS (keeps the arrow-key
  // nav refs aligned even though the tabs are split across two rows).
  const renderTab = (t: typeof TABS[number], i: number) => {
    const selected = active === t.id;
    return (
      <Link
        key={t.id}
        ref={(el) => { tabRefs.current[i] = el; }}
        href={hrefFor(t.id)}
        scroll={false}
        role="tab"
        id={`tab-${t.id}`}
        aria-selected={selected}
        aria-controls={`tabpanel-${t.id}`}
        tabIndex={selected ? 0 : -1}
        title={t.description}
        className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
          selected
            ? 'bg-foreground text-white shadow-sm'
            : 'text-foreground/65 hover:bg-warm-bg/40'
        }`}
      >
        {t.label}
      </Link>
    );
  };

  // Overview gets its own full-width row on top; Compose + Post share
  // the row below. Still a single tablist — only one is ever selected.
  return (
    <div role="tablist" aria-label="Social media sections" onKeyDown={onKeyDown} className="mb-6 space-y-1.5">
      <div className="flex rounded-2xl border border-black/10 bg-white p-1.5">
        {renderTab(TABS[0], 0)}
      </div>
      <div className="flex gap-1.5 rounded-2xl border border-black/10 bg-white p-1.5">
        {TABS.slice(1).map((t) => renderTab(t, TABS.indexOf(t)))}
      </div>
    </div>
  );
}

interface TabBodyProps {
  accounts: AccountsResponse | null;
  accountsLoading: boolean;
  accountsErr: string | null;
  refreshAccounts: () => void;
  history: HistoryPost[];
  historyLoading: boolean;
  historyErr: string | null;
  refreshHistory: () => void;
}

function SocialTabBody(props: TabBodyProps) {
  const searchParams = useSearchParams();
  const active = readTab(searchParams.get('tab'));
  const {
    accounts, accountsLoading, accountsErr, refreshAccounts,
    history, historyLoading, historyErr, refreshHistory,
  } = props;

  if (active === 'post') {
    return (
      <div role="tabpanel" id="tabpanel-post" aria-labelledby="tab-post">
        <PostTabBody
          accounts={accounts}
          history={history}
          historyLoading={historyLoading}
          historyErr={historyErr}
          refreshHistory={refreshHistory}
        />
      </div>
    );
  }

  if (active === 'creative') {
    return (
      <div role="tabpanel" id="tabpanel-creative" aria-labelledby="tab-creative">
        <CreativeTabBody />
      </div>
    );
  }

  // Overview (default)
  return (
    <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
      <OverviewSummary connected={accounts?.activeSocialAccounts ?? []} />
      <ConnectedAccountsStrip
        accounts={accounts}
        loading={accountsLoading}
        error={accountsErr}
        onChanged={refreshAccounts}
        history={history}
      />
      <AnalyticsPanel connected={accounts?.activeSocialAccounts ?? []} />
    </div>
  );
}

// ── Overview summary tiles ──────────────────────────────────────────
//
// Phase 2 of the 10-phase split. Three roll-up tiles above the
// accounts strip: connected platforms, total followers across them,
// and the freshness of the most recent analytics snapshot. The
// follower total reads from the same /analytics/history endpoint
// the AnalyticsPanel uses, so the numbers stay consistent without a
// second cron job.

function OverviewSummary({ connected }: { connected: string[] }) {
  const [snapshots, setSnapshots] = useState<Record<string, { raw: Record<string, unknown> | null; captured_at: string | null }>>({});
  const [resyncing, setResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  // Hoist the snapshot loader so the Resync button can re-run it
  // after kicking off a fresh capture via the cron handler.
  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/social-media/analytics/history', {
        credentials: 'include', cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const latest = (json.latest ?? {}) as Record<string, { raw: Record<string, unknown>; captured_at: string }>;
      const out: Record<string, { raw: Record<string, unknown> | null; captured_at: string | null }> = {};
      for (const [platform, row] of Object.entries(latest)) {
        out[platform] = { raw: row.raw, captured_at: row.captured_at };
      }
      setSnapshots(out);
    } catch {
      /* leave empty — AnalyticsPanel will surface the real error */
    }
  }, []);

  const resync = useCallback(async () => {
    setResyncing(true);
    setResyncError(null);
    try {
      const res = await fetch('/api/social-media/analytics/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadSnapshots();
    } catch (e) {
      setResyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setResyncing(false);
    }
  }, [loadSnapshots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/social-media/analytics/history', {
          credentials: 'include', cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const latest = (json.latest ?? {}) as Record<string, { raw: Record<string, unknown>; captured_at: string }>;
        const out: typeof snapshots = {};
        for (const [platform, row] of Object.entries(latest)) {
          out[platform] = { raw: row.raw, captured_at: row.captured_at };
        }
        setSnapshots(out);
      } catch {
        /* leave empty — AnalyticsPanel will surface the real error */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalFollowers = useMemo(() => {
    let sum = 0;
    for (const platform of connected) {
      const raw = snapshots[platform]?.raw ?? null;
      const stats = extractStats(platform as PlatformId, raw);
      const followers = stats.find((s) => s.label.toLowerCase() === 'followers');
      if (followers) {
        const n = Number(followers.value.replace(/,/g, ''));
        if (Number.isFinite(n)) sum += n;
      }
    }
    return sum;
  }, [connected, snapshots]);

  const freshest = useMemo(() => {
    let max: string | null = null;
    for (const k of Object.keys(snapshots)) {
      const at = snapshots[k]?.captured_at;
      if (at && (!max || at > max)) max = at;
    }
    return max;
  }, [snapshots]);

  return (
    <section aria-label="Overview summary" className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">Connected platforms</p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5">{connected.length.toLocaleString()}</p>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          {connected.length === 0 ? 'Connect one in the strip below' : 'Sending posts on these channels'}
        </p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">Total followers</p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5">{totalFollowers.toLocaleString()}</p>
        <p className="text-[11px] text-foreground/45 mt-0.5">Sum across connected platforms</p>
      </div>

      {/* Snapshot freshness · resyncable. The cron handler captures
          a fresh snapshot every morning at 6am, but admins can
          force one out-of-band with Resync. Last-updated reads
          straight off the latest captured_at across all platforms. */}
      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">Snapshot freshness</p>
          <button
            type="button"
            onClick={() => void resync()}
            disabled={resyncing}
            title="Pull a fresh snapshot from every connected platform"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-black/10 bg-warm-bg/40 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 hover:bg-warm-bg/70 disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${resyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
            </svg>
            {resyncing ? 'Resyncing…' : 'Resync'}
          </button>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5">
          {freshest
            ? new Date(freshest).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '—'}
        </p>
        {resyncError ? (
          <p className="text-[11px] text-red-700 mt-0.5" role="alert">{resyncError}</p>
        ) : (
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Cron writes a fresh snapshot daily at 6am · pulled from DB, not live
          </p>
        )}
      </div>
    </section>
  );
}

// ── Post sub-nav (Compose / Scheduled / History) ────────────────────
//
// Phase 3 of the 10-phase split. Splits the Post tab into three
// sub-views via `?sub=` so each one is a deep-linkable surface.
// Default sub is compose. Scheduled is a placeholder shell that
// phase 4 fills in; History wraps the existing HistoryList without
// changing its props.

type PostSub = 'drafts' | 'scheduled' | 'history';

const POST_SUBS: { id: PostSub; label: string }[] = [
  { id: 'drafts', label: 'Post Now' },
  { id: 'scheduled', label: 'Schedule Posts' },
  { id: 'history', label: 'History' },
];

function readPostSub(raw: string | null): PostSub {
  if (raw === 'scheduled' || raw === 'history') return raw;
  return 'drafts';
}

function PostSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readPostSub(searchParams.get('sub'));
  const hrefFor = (id: PostSub): string => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'post');
    if (id === 'drafts') next.delete('sub');
    else next.set('sub', id);
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  };
  return (
    <div role="tablist" aria-label="Post sections" className="mb-5 flex flex-wrap gap-1 rounded-xl bg-white border border-black/10 p-1">
      {POST_SUBS.map((s) => {
        const selected = active === s.id;
        return (
          <Link
            key={s.id}
            href={hrefFor(s.id)}
            scroll={false}
            role="tab"
            aria-selected={selected}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selected ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

// The Post tab is now a single screen, top to bottom:
//   1. Ready to go — the draggable source tiles.
//   2. Post now — drag a ready draft here to publish immediately.
//   3. Schedule a post — drag a ready draft here to queue it, plus the
//      live Ayrshare scheduled queue.
//   4. History — recent posts, tucked at the bottom.
function PostTabBody({
  accounts, history, historyLoading, historyErr, refreshHistory,
}: {
  accounts: AccountsResponse | null;
  history: HistoryPost[];
  historyLoading: boolean;
  historyErr: string | null;
  refreshHistory: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Ready to go → Post now → Schedule → queue */}
      <SchedulePostsBody
        history={history}
        historyLoading={historyLoading}
        historyErr={historyErr}
        refreshHistory={refreshHistory}
        accounts={accounts}
      />

      {/* Recent history, at the bottom */}
      <HistoryList
        posts={history}
        loading={historyLoading}
        error={historyErr}
        onChanged={refreshHistory}
      />
    </div>
  );
}

// ── Post > Drafts ────────────────────────────────────────────────────
//
// Lists every saved draft (created from Creative > AI's "Save draft"
// or Templates' "Save as draft"). Each row is a card with the
// caption preview, attached media chips, and three actions — Publish
// (opens Composer prefilled inline), Duplicate (clone), Delete.
// Composer is mounted inline when activeDraftId is set so the user
// stays on the same screen through the publish flow.

function DraftsPanel({
  accounts, onPosted,
}: {
  accounts: AccountsResponse | null;
  onPosted: () => void;
}) {
  const { drafts } = useSavedDrafts();

  const removeDraft = (id: string) => {
    void deleteDraft(id);
  };

  // Toggle the per-draft "ready to go" flag. Drafts list is sorted
  // ready-first below so the admin sees at a glance which posts the
  // publish flow will offer.
  const toggleReady = (id: string) => {
    const cur = drafts.find((d) => d.id === id);
    void setDraftReady(id, !cur?.ready);
  };

  const readyDrafts = drafts.filter((d) => d.ready);
  const sortedDrafts = [...drafts].sort((a, b) => {
    if (!!a.ready === !!b.ready) return 0;
    return a.ready ? -1 : 1;
  });

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      {/* Network-first publish flow. Mounts above the drafts list once
          the admin marks at least one draft ready — keeps the picker
          out of sight until there's actually something to publish. */}
      {readyDrafts.length > 0 && (
        <PublishReadyFlow
          connected={accounts?.activeSocialAccounts ?? []}
          readyDrafts={readyDrafts}
          onPosted={(usedId) => {
            removeDraft(usedId);
            onPosted();
          }}
        />
      )}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Drafts</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          Saved posts from Creative. Mark a draft ready to go to make it pickable in the publish flow above.
        </p>
      </div>
      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 bg-warm-bg/30 px-5 py-10 text-center">
          <p className="text-sm text-foreground/55 max-w-md mx-auto">
            No drafts yet. Build one in <strong>Creative &rarr; Library &rarr; AI</strong>, or
            start from a template in <strong>Creative &rarr; Templates</strong>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedDrafts.map((d) => {
            const created = new Date(d.createdAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            });
            const preview = d.caption.length > 240
              ? `${d.caption.slice(0, 240)}…`
              : d.caption;
            return (
              <li key={d.id} className={`rounded-xl border p-4 ${d.ready ? 'border-emerald-200 bg-emerald-50/40' : 'border-black/10 bg-warm-bg/20'}`}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">
                      Saved {created}
                    </p>
                    {d.ready && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span aria-hidden>●</span> Approved
                      </span>
                    )}
                  </div>
                  {d.mediaUrls.length > 0 && (
                    <p className="text-[10px] text-foreground/45">
                      {d.mediaUrls.length} media attached
                    </p>
                  )}
                </div>
                <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                  {preview}
                </p>
                {d.mediaUrls.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {d.mediaUrls.slice(0, 6).map((url) => (
                      <li key={url} className="w-12 h-12 rounded-lg overflow-hidden border border-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Draft media" className="w-full h-full object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => removeDraft(d.id)}
                    className="text-[12px] text-foreground/55 hover:text-red-700"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleReady(d.id)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${d.ready
                      ? 'border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50'
                      : 'bg-primary text-white hover:bg-primary-dark'}`}
                  >
                    {d.ready ? 'Move back to drafts' : 'Mark ready to go'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Publish-ready flow ──────────────────────────────────────────────
//
// Three-step network-first publish flow that lives at the top of the
// Drafts panel whenever there's at least one draft marked ready:
//   1. Tick the social networks you want to publish to (seeded from
//      the connected-accounts strip so a single-channel admin can
//      send with one click).
//   2. Pick a ready draft from the radio list (caption preview +
//      media chips so you can confirm before sending).
//   3. Post now, or schedule with a datetime picker.
// The submit POSTs to /api/social-media/post — same Ayrshare endpoint
// the Composer uses — and on success removes the draft from the
// staging list and bumps the History/Scheduled panels via onPosted.

// Aggregate every unique aspect ratio the selected networks accept,
// across both image and video specs in PLATFORM_SPECS. Ratios live
// in the data as plain strings ("1:1", "9:16") but several specs
// pack a compound list ("16:9 / 1:1 / 4:5") for entries that accept
// multiple crops — we split those into atomic ratios so each one
// gets its own card. A ratio like "any" or "A4 / Letter" (Reddit
// images, LinkedIn PDFs) falls through to a "Free / document"
// bucket so the marketer still sees the deliverable surface area
// without bogus aspect numbers.
interface Deliverable {
  /** Canonical ratio key, e.g. "1:1" or "9:16". "free" for ratio-agnostic specs. */
  ratio: string;
  /** True if any spec for this ratio is video. */
  hasVideo: boolean;
  /** True if any spec for this ratio is still image. */
  hasImage: boolean;
  /** Networks that need this ratio, in display order. */
  networks: PlatformId[];
  /** A short comma-joined label of what this ratio is FOR (Feed, Story, Reel, Pin, etc). */
  uses: string[];
  /** Best recommended pixel size we've seen for this ratio (max area wins). */
  bestSize: string | null;
}

const RATIO_DISPLAY_ORDER = ['9:16', '4:5', '1:1', '5:8', '2:3', '4:3', '1.91:1', '16:9', 'free'];

function deriveDeliverables(selected: Set<PlatformId>): Deliverable[] {
  const map = new Map<string, Deliverable>();
  // Pull just the "Story (9:16)"-style use label out of "Story (9:16)";
  // gives the user a readable use chip without re-printing the ratio.
  const useFromLabel = (label: string): string => label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const atomicRatios = (raw: string): string[] => {
    // "16:9 / 1:1 / 4:5" → ["16:9","1:1","4:5"]; "any" → ["free"].
    const parts = raw.split(/\s*[/,]\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return [];
    return parts.map((p) => {
      if (/^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(p)) return p.replace(/\s+/g, '');
      return 'free';
    });
  };
  const areaOf = (size: string | undefined): number => {
    if (!size) return 0;
    const m = size.match(/(\d{2,5})\s*[×x]\s*(\d{2,5})/);
    if (!m) return 0;
    return Number(m[1]) * Number(m[2]);
  };
  const upsert = (ratio: string, p: PlatformId, spec: MediaSpec | VideoSpec, isVideo: boolean) => {
    const existing = map.get(ratio);
    const use = useFromLabel(spec.label);
    if (!existing) {
      map.set(ratio, {
        ratio,
        hasVideo: isVideo,
        hasImage: !isVideo,
        networks: [p],
        uses: [use],
        bestSize: spec.size ?? null,
      });
      return;
    }
    if (isVideo) existing.hasVideo = true; else existing.hasImage = true;
    if (!existing.networks.includes(p)) existing.networks.push(p);
    if (!existing.uses.includes(use)) existing.uses.push(use);
    if (spec.size && areaOf(spec.size) > areaOf(existing.bestSize ?? undefined)) {
      existing.bestSize = spec.size;
    }
  };

  for (const id of selected) {
    const spec = PLATFORM_SPECS[id];
    if (!spec) continue;
    for (const img of spec.images) {
      for (const r of atomicRatios(img.ratio)) upsert(r, id, img, false);
    }
    for (const vid of spec.videos) {
      for (const r of atomicRatios(vid.ratio)) upsert(r, id, vid, true);
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => {
    const ai = RATIO_DISPLAY_ORDER.indexOf(a.ratio);
    const bi = RATIO_DISPLAY_ORDER.indexOf(b.ratio);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return list;
}

function PerPlatformDeliverables({ selected }: { selected: Set<PlatformId> }) {
  // Per-network breakdown — for each selected platform, every
  // image + video spec the platform accepts as its own line item.
  // Sits ABOVE the de-duplicated union grid so a marketer can scan
  // "what does Facebook want from me?" in one column rather than
  // reverse-engineer it from the per-ratio chip's network icons.
  if (selected.size === 0) return null;
  const rows = PLATFORMS
    .filter((p) => selected.has(p.id as PlatformId))
    .map((p) => {
      const spec = PLATFORM_SPECS[p.id as PlatformId];
      if (!spec) return null;
      const lines: { kind: 'image' | 'video'; label: string; size: string | undefined }[] = [];
      for (const img of spec.images) lines.push({ kind: 'image', label: img.label, size: img.size });
      for (const vid of spec.videos) lines.push({ kind: 'video', label: vid.label, size: vid.size });
      return { id: p.id as PlatformId, label: p.label, lines };
    })
    .filter(Boolean) as { id: PlatformId; label: string; lines: { kind: 'image' | 'video'; label: string; size: string | undefined }[] }[];

  if (rows.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">
        By platform · what each network needs
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-black/10 bg-white px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/65">
                <PlatformIcon platform={r.id} size={13} />
              </span>
              <span className="text-[12px] font-semibold text-foreground">{r.label}</span>
              <span className="ml-auto text-[10px] text-foreground/40 tabular-nums">{r.lines.length}</span>
            </div>
            <ul className="space-y-0.5">
              {r.lines.map((l, i) => (
                <li key={i} className="text-[11.5px] text-foreground/65 leading-snug flex items-start gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <span aria-hidden className="text-foreground/30 mt-[1px]">•</span>
                  <span className="flex-1">
                    <span className="text-foreground/85">{l.label}</span>
                    {l.size && <span className="text-foreground/40 tabular-nums"> · {l.size}</span>}
                  </span>
                  <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${l.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {l.kind}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeliverablesPanel({ selected }: { selected: Set<PlatformId> }) {
  const items = useMemo(() => deriveDeliverables(selected), [selected]);
  if (selected.size === 0) return null;
  if (items.length === 0) return null;

  return (
    <>
      <PerPlatformDeliverables selected={selected} />
      <div className="mb-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55">
            Unique crops · {items.length}
          </p>
          <p className="text-[10.5px] text-foreground/45">Every crop the selected networks share — no duplicates.</p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {items.map((d) => <DeliverableCard key={d.ratio} d={d} />)}
        </ul>
      </div>
    </>
  );
}

function DeliverableCard({ d }: { d: Deliverable }) {
  // Visual preview — a tiny box drawn at the actual aspect ratio so
  // the marketer can eyeball "tall / wide / square" before opening
  // Canva. "free" deliverables (Reddit "any", LinkedIn PDF) get a
  // dashed frame instead.
  const previewStyle = (() => {
    if (d.ratio === 'free') return { aspectRatio: '1 / 1' };
    const m = d.ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (!m) return { aspectRatio: '1 / 1' };
    return { aspectRatio: `${m[1]} / ${m[2]}` };
  })();
  const tone = d.hasVideo && d.hasImage
    ? 'bg-violet-50 text-violet-700 border-violet-200'
    : d.hasVideo
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const typeLabel = d.hasVideo && d.hasImage ? 'Image + video' : d.hasVideo ? 'Video' : 'Image';

  return (
    <li className="rounded-lg border border-black/10 bg-white px-3 py-2.5 flex gap-2.5">
      <div className="shrink-0 w-10 flex items-center justify-center">
        <div
          className={`w-9 max-h-12 rounded-sm ${d.ratio === 'free' ? 'border-2 border-dashed border-foreground/25 bg-warm-bg/40' : 'bg-foreground/10'}`}
          style={previewStyle}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-foreground tabular-nums">
            {d.ratio === 'free' ? 'Any ratio' : d.ratio}
          </span>
          <span className={`inline-block px-1 py-0.5 rounded text-[8.5px] font-semibold border ${tone}`}>
            {typeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[10.5px] text-foreground/55 leading-snug line-clamp-2" title={d.uses.join(' · ')}>
          {d.uses.join(' · ')}
        </p>
        <div className="mt-1 flex items-center gap-1">
          {d.networks.map((n) => (
            <span
              key={n}
              className="inline-flex items-center justify-center w-4 h-4 text-foreground/60"
              title={n}
              aria-label={n}
            >
              <PlatformIcon platform={n} size={12} />
            </span>
          ))}
          {d.bestSize && <span className="ml-auto text-[9.5px] text-foreground/40 tabular-nums">{d.bestSize}</span>}
        </div>
      </div>
    </li>
  );
}

function PublishReadyFlow({
  connected,
  readyDrafts,
  onPosted,
}: {
  connected: string[];
  readyDrafts: SavedDraft[];
  onPosted: (draftId: string) => void;
}) {
  // Ready-to-go drafts lead the flow. Default to the first one so a
  // single-draft day is zero-click.
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDraftId && readyDrafts.some((d) => d.id === selectedDraftId)) return;
    setSelectedDraftId(readyDrafts[0]?.id ?? null);
  }, [readyDrafts, selectedDraftId]);

  // Networks follow the selected draft: seed from the platforms it
  // was assigned in Creative (intersected with connected accounts),
  // falling back to every connected account when the draft carries no
  // assignment. Re-seeds when the draft, its platforms, or the
  // connected set changes; manual ticks override until then.
  const [selectedNetworks, setSelectedNetworks] = useState<Set<Platform>>(() => new Set());
  const selectedDraftPlatformsKey = (readyDrafts.find((d) => d.id === selectedDraftId)?.platforms ?? []).join(',');
  const connectedKey = connected.join(',');
  useEffect(() => {
    const fallback = connected.filter((p): p is Platform => PLATFORMS.some((x) => x.id === p));
    const assigned = selectedDraftPlatformsKey
      .split(',')
      .filter(Boolean)
      .filter((p): p is Platform => PLATFORMS.some((x) => x.id === p) && connected.includes(p));
    setSelectedNetworks(new Set(assigned.length > 0 ? assigned : fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraftId, selectedDraftPlatformsKey, connectedKey]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleNetwork = (id: Platform) => {
    setSelectedNetworks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedDraft = readyDrafts.find((d) => d.id === selectedDraftId) || null;
  const canSubmit = selectedDraft !== null && selectedNetworks.size > 0;

  const submit = async () => {
    if (!selectedDraft) { setError('Pick a ready draft to publish.'); return; }
    if (selectedNetworks.size === 0) { setError('Pick at least one network.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        post: selectedDraft.caption,
        platforms: Array.from(selectedNetworks),
      };
      if (selectedDraft.mediaUrls.length > 0) body.mediaUrls = selectedDraft.mediaUrls;
      const res = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || json.message || `HTTP ${res.status}`);
      }
      onPosted(selectedDraft.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Post now</h2>
        <p className="text-[11px] text-foreground/55 mt-0.5">
          Pick a ready-to-go draft — it loads the networks you chose for it in Creative — then hit Post. To queue a post for later, use <strong>Schedule</strong> below.
        </p>
      </div>

      {/* Step 1 — ready drafts (lead the flow) */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">Ready-to-go draft</p>
        <ul className="space-y-2">
          {readyDrafts.map((d) => {
            const checked = selectedDraftId === d.id;
            const preview = d.caption.length > 180 ? `${d.caption.slice(0, 180)}…` : d.caption;
            return (
              <li key={d.id}>
                <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${checked ? 'border-primary bg-white' : 'border-black/10 bg-white/60 hover:bg-white'}`}>
                  <input
                    type="radio"
                    name="ready-draft"
                    checked={checked}
                    onChange={() => setSelectedDraftId(d.id)}
                    className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-foreground/55">Saved {new Date(d.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{d.mediaUrls.length > 0 && ` · ${d.mediaUrls.length} media`}</p>
                    <p className="mt-1 text-[13px] text-foreground/85 whitespace-pre-wrap leading-snug">{preview}</p>
                    {d.mediaUrls.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {d.mediaUrls.slice(0, 6).map((url) => (
                          <li key={url} className="w-10 h-10 rounded-md overflow-hidden border border-black/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Draft media" className="w-full h-full object-cover" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Step 2 — networks. Seeded from the chosen draft's Creative
          assignment so "where it posts" follows the draft; still
          editable for a one-off override. */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">Networks</p>
        {connected.length === 0 ? (
          <p className="text-[12px] text-foreground/55 italic">No connected accounts yet. Connect at least one channel under Overview.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {PLATFORMS.filter((p) => connected.includes(p.id)).map((p) => {
              const on = selectedNetworks.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleNetwork(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${on ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/75 border-black/10 hover:bg-warm-bg/60'}`}
                  >
                    <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${on ? 'bg-white' : 'bg-foreground/25'}`} />
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="mb-3 text-[12px] text-rose-700 font-semibold">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-primary text-white px-4 py-2 text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-40"
        >
          {submitting ? 'Sending…' : `Post now to ${selectedNetworks.size} ${selectedNetworks.size === 1 ? 'network' : 'networks'}`}
        </button>
      </div>
    </section>
  );
}

// ── Scheduled posts panel ───────────────────────────────────────────
//
// Phase 4 of the 10-phase split. Filters the same `history` payload
// the History sub-tab uses, but keeps only rows whose scheduleDate
// is in the future. Ayrshare returns scheduled rows with status
// `scheduled` or `pending`; we treat both as "queued but unsent".
// Each row renders compact: when, platforms, caption preview, and
// a Cancel button that hits /api/social-media/delete (same endpoint
// the History tab uses).

function isScheduledPending(p: HistoryPost): boolean {
  if (!p.scheduleDate) return false;
  const t = Date.parse(p.scheduleDate);
  if (!Number.isFinite(t) || t <= Date.now()) return false;
  // Anything still dated in the future that hasn't errored / been pulled
  // is queued. (Earlier we required status to be exactly scheduled/pending,
  // which silently hid posts Ayrshare returned with other status strings.)
  const status = (p.status || '').toLowerCase();
  if (status === 'error' || status === 'deleted' || status === 'canceled' || status === 'cancelled') return false;
  return true;
}

function SchedulePostsBody({
  history, historyLoading, historyErr, refreshHistory, accounts,
}: {
  history: HistoryPost[];
  historyLoading: boolean;
  historyErr: string | null;
  refreshHistory: () => void;
  accounts: AccountsResponse | null;
}) {
  // Ready drafts come from the shared DB-backed store. They're
  // draggable onto the Schedule card below, and carry the platforms
  // chosen in Creative so scheduling doesn't re-ask for networks.
  const { drafts } = useSavedDrafts();
  const readyDrafts = useMemo<ReadyDraft[]>(
    () => drafts.filter((d) => d.ready).map((d) => ({
      id: d.id,
      caption: d.caption,
      mediaUrls: d.mediaUrls,
      createdAt: d.createdAt,
      platforms: d.platforms ?? [],
    })),
    [drafts],
  );
  const connectedPlatforms = accounts?.activeSocialAccounts ?? [];

  // After a successful schedule, refresh the history (which the
  // ScheduledPanel watches to reload its authoritative list) and bring
  // the Scheduled posts card into view so the new row is right there.
  const scheduledRef = useRef<HTMLDivElement>(null);
  const handleScheduled = useCallback(() => {
    refreshHistory();
    window.setTimeout(() => {
      scheduledRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [refreshHistory]);

  // Click-path: load a Ready tile into the matching card without dragging
  // (the only way that works on touch). `n` makes each click a fresh
  // injection even for the same draft.
  const postNowRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [inject, setInject] = useState<{ draft: ReadyDraft; action: 'schedule' | 'postnow'; n: number } | null>(null);
  const quickAction = useCallback((draft: ReadyDraft, action: 'schedule' | 'postnow') => {
    setInject({ draft, action, n: Date.now() });
    window.setTimeout(() => {
      (action === 'schedule' ? scheduleRef : postNowRef).current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, []);

  return (
    <div className="space-y-4">
      <ReadyToGoCard drafts={readyDrafts} onQuickAction={quickAction} />
      <div ref={postNowRef} className="scroll-mt-4">
        <PostNowDropCard
          connectedPlatforms={connectedPlatforms}
          onPosted={refreshHistory}
          injected={inject?.action === 'postnow' ? inject : null}
        />
      </div>
      <div ref={scheduleRef} className="scroll-mt-4">
        <ScheduleDropCard
          connectedPlatforms={connectedPlatforms}
          onScheduled={handleScheduled}
          injected={inject?.action === 'schedule' ? inject : null}
        />
      </div>
      <div ref={scheduledRef} className="scroll-mt-4">
        <ScheduledPanel
          posts={history}
          loading={historyLoading}
          error={historyErr}
          onChanged={refreshHistory}
        />
      </div>
    </div>
  );
}

// Live "posts in 2d 4h 13m" countdown for a scheduled row. Ticks once a
// second so the seconds visibly move when the post is close, then coarsens
// to d/h/m further out. Self-contained interval so the parent list doesn't
// re-render every tick.
function ScheduleCountdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const t = Date.parse(target);
  if (!Number.isFinite(t)) return null;
  const ms = t - now;
  if (ms <= 0) {
    return <span className="text-[11px] font-semibold text-emerald-700">Posting now…</span>;
  }
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  // Under an hour we surface seconds; otherwise the largest two units read cleaner.
  const text = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  const soon = ms < 60 * 60 * 1000; // < 1h
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${soon ? 'text-amber-700' : 'text-foreground/60'}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" /></svg>
      posts in {text}
    </span>
  );
}

function ScheduledPanel({
  posts, loading, error, onChanged, onDropDraft,
}: {
  posts: HistoryPost[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onDropDraft?: (draft: ReadyDraft) => Promise<{ ok: boolean; when?: Date; error?: string }>;
}) {
  const modal = useModal();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropMsg, setDropMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Authoritative scheduled posts from OUR records (activity_log), so a
  // post that's queued in Ayrshare can never be silently hidden by a
  // /history quirk. Merged with the Ayrshare /history scheduled rows.
  interface LocalScheduled { logId: string; ayrshareId: string | null; scheduleDate: string | null; platforms: string[]; mediaUrls?: string[]; caption: string; createdByName: string | null }
  interface CanceledRec { at: string; caption: string; scheduleDate: string | null; canceledByName: string | null }
  const [local, setLocal] = useState<LocalScheduled[]>([]);
  const [canceledRecs, setCanceledRecs] = useState<CanceledRec[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
    try {
      const res = await fetch('/api/social-media/scheduled', { credentials: 'include', cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      setLocal(Array.isArray(j.posts) ? (j.posts as LocalScheduled[]) : []);
      setCanceledRecs(Array.isArray(j.recentlyCanceled) ? (j.recentlyCanceled as CanceledRec[]) : []);
    } catch { /* keep previous */ } finally { setLocalLoading(false); }
  }, []);
  useEffect(() => { void loadLocal(); }, [loadLocal]);
  // Reload our authoritative list whenever the Ayrshare history refreshes
  // (which the parent triggers right after a schedule / post / cancel), so
  // a freshly-scheduled post shows up here without a manual refresh.
  useEffect(() => { void loadLocal(); }, [posts, loadLocal]);

  interface SchedItem { key: string; ayrshareId: string | null; scheduleDate: string; platforms: string[]; mediaUrls: string[]; caption: string; createdByName: string | null }
  const queue = useMemo<SchedItem[]>(() => {
    const items: SchedItem[] = [];
    const seen = new Set<string>();
    const add = (it: SchedItem) => {
      const dedupe = it.ayrshareId ? `id:${it.ayrshareId}` : `dc:${it.scheduleDate}|${it.caption.slice(0, 24)}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      items.push(it);
    };
    for (const p of local) {
      if (!p.scheduleDate) continue;
      add({ key: `local:${p.logId}`, ayrshareId: p.ayrshareId, scheduleDate: p.scheduleDate, platforms: p.platforms ?? [], mediaUrls: p.mediaUrls ?? [], caption: p.caption ?? '', createdByName: p.createdByName ?? null });
    }
    for (const p of posts.filter(isScheduledPending)) {
      add({ key: `ay:${(p.id as string) ?? p.scheduleDate}`, ayrshareId: (p.id as string) ?? null, scheduleDate: p.scheduleDate as string, platforms: p.platforms ?? [], mediaUrls: p.mediaUrls ?? [], caption: p.post ?? '', createdByName: null });
    }
    return items.sort((a, b) => Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate));
  }, [local, posts]);

  const onZoneDragOver = (e: React.DragEvent) => {
    if (!onDropDraft) return;
    if (e.dataTransfer.types.includes('application/x-ready-draft')) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onZoneDrop = async (e: React.DragEvent) => {
    if (!onDropDraft) return;
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-ready-draft');
      if (!raw) return;
      const draft = JSON.parse(raw) as ReadyDraft;
      const result = await onDropDraft(draft);
      if (result.ok && result.when) {
        setDropMsg({
          kind: 'ok',
          text: `Queued for ${result.when.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`,
        });
      } else {
        setDropMsg({ kind: 'err', text: result.error ?? 'Could not schedule.' });
      }
      window.setTimeout(() => setDropMsg(null), 6000);
    } catch {
      /* malformed payload — ignore */
    }
  };

  const cancel = async (item: SchedItem) => {
    if (!item.ayrshareId) {
      await modal.alert('Can’t cancel in-app yet', {
        message: 'We couldn’t find this post’s Ayrshare id, so cancel it from the Ayrshare dashboard (Posts → Scheduled). Posts scheduled from here cancel directly.',
      });
      return;
    }
    const ok = await modal.confirm('Cancel this scheduled post?', {
      message: 'It will be pulled from the queue and won’t publish.',
      confirmLabel: 'Cancel post',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(item.key);
    try {
      const res = await fetch('/api/social-media/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.ayrshareId, caption: item.caption, scheduleDate: item.scheduleDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        await modal.alert('Couldn’t cancel the post', { message: json.error || json.message || `HTTP ${res.status}` });
        return;
      }
      await loadLocal();
      onChanged();
    } catch (err) {
      await modal.alert('Couldn’t cancel the post', { message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      onDragOver={onZoneDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onZoneDrop}
      className={`rounded-2xl border bg-white p-5 transition-colors ${
        dragOver ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]' : 'border-black/10'
      }`}
    >
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Scheduled posts</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Queued but not yet sent. Cancel any row to pull it back.
          </p>
        </div>
        {(loading || localLoading) && <span className="text-xs text-foreground/40">Loading…</span>}
      </div>
      {dropMsg && (
        <p className={`rounded-lg px-3 py-2 text-xs mb-3 ${
          dropMsg.kind === 'ok'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {dropMsg.text}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}
      {queue.length === 0 && !loading && !localLoading ? (
        <div className={`rounded-xl border-dashed bg-warm-bg/30 px-5 py-10 text-center ${
          dragOver ? 'border-2 border-primary/50' : 'border border-black/10'
        }`}>
          <p className="text-sm text-foreground/55 max-w-md mx-auto">
            Nothing scheduled yet. Drag a Ready-to-Go draft onto the <em>Schedule a post</em> card above, pick a time, and it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/5">
          {queue.map((p) => {
            const when = new Date(p.scheduleDate).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            });
            const platforms = p.platforms.join(', ');
            const caption = p.caption.slice(0, 140);
            const busy = busyId === p.key;
            const thumb = p.mediaUrls[0];
            const isVideo = typeof thumb === 'string' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(thumb);
            return (
              <li key={p.key} className="flex items-start gap-3 py-3">
                {/* Media thumbnail — mirrors the Compose row so a queued
                    post reads the same here as it did when it was Ready. */}
                <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-black/10 bg-warm-bg/40">
                  {thumb ? (
                    isVideo ? (
                      <video src={thumb} muted playsInline className="w-full h-full object-cover bg-black" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-foreground/35 text-[10px]" aria-hidden>—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      {when}
                    </span>
                    <ScheduleCountdown target={p.scheduleDate} />
                    {platforms && (
                      <span className="text-[11px] text-foreground/55 capitalize">{platforms}</span>
                    )}
                    {p.createdByName && (
                      <span className="text-[11px] text-foreground/45">by {p.createdByName}</span>
                    )}
                  </div>
                  {caption && (
                    <p className="text-[13px] text-foreground/80 line-clamp-2 leading-snug">
                      {caption}
                      {p.caption.length > 140 ? '…' : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => cancel(p)}
                  disabled={busy}
                  className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-foreground/65 hover:text-red-700 hover:border-red-300 disabled:opacity-40"
                >
                  {busy ? 'Canceling…' : 'Cancel'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {canceledRecs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-black/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-1.5">Recently canceled</p>
          <ul className="space-y-1">
            {canceledRecs.map((c, i) => (
              <li key={i} className="text-[11px] text-foreground/50 flex items-baseline gap-1.5 flex-wrap">
                <span className="line-through text-foreground/45 truncate max-w-[280px]">{c.caption || '(no caption)'}</span>
                {c.canceledByName && <span>· canceled by <span className="text-foreground/70">{c.canceledByName}</span></span>}
                <span className="text-foreground/30">· {new Date(c.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Creative sub-nav (Library / Templates / AI) ─────────────────────
//
// Phase 5 of the 10-phase split. Three sub-views via the same `?sub=`
// query param the Post tab uses, but scoped to the Creative tab so
// Compose state on the Post tab and the Library/Templates/AI state
// here can both persist independently in the URL.

type CreativeSub = 'library' | 'templates' | 'ai';

const CREATIVE_SUBS: { id: CreativeSub; label: string; description: string }[] = [
  // Renamed + reordered to mirror the creation flow:
  //   Build (gather media + raw ingredients — was "Library")
  //   Draft (write the caption — was "Templates" + the AI tools)
  //   Ready to go (a list view of every saved draft flagged as
  //     publishable, ready to be picked up by the Post tab's
  //     publish flow).
  // Sub-route IDs stay 'library' / 'templates' / 'ai' so existing
  // ?sub= deep links and the staging-key handoff (CREATIVE_TO_AI_KEY
  // etc.) keep working without a separate migration.
  { id: 'library', label: 'Build', description: 'Browse uploaded photos and videos.' },
  { id: 'templates', label: 'Draft', description: 'Reusable post drafts with placeholders, plus AI assist.' },
  { id: 'ai', label: 'Ready to go', description: 'Every saved draft signed off and queued, in a spreadsheet view.' },
];

function readCreativeSub(raw: string | null): CreativeSub {
  if (raw === 'templates' || raw === 'ai') return raw;
  return 'library';
}

function CreativeSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readCreativeSub(searchParams.get('sub'));
  // Build each sub-tab as a plain <Link> with a fully-qualified
  // href. Earlier this nav used router.push() inside an onClick
  // and the click occasionally got swallowed when the Suspense
  // boundary upstream re-suspended on navigation — leaving the
  // body stuck on the prior pane with the new pane's buttons
  // inert. <Link> hands the navigation to Next's stock link
  // semantics, which always paints a fresh client render.
  const hrefFor = (id: CreativeSub): string => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'creative');
    if (id === 'library') next.delete('sub');
    else next.set('sub', id);
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  };
  return (
    <div role="tablist" aria-label="Creative sections" className="mb-5 flex flex-wrap gap-1 rounded-xl bg-white border border-black/10 p-1">
      {CREATIVE_SUBS.map((s) => {
        const selected = active === s.id;
        return (
          <Link
            key={s.id}
            href={hrefFor(s.id)}
            scroll={false}
            role="tab"
            aria-selected={selected}
            title={s.description}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selected ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

// Creative is now a single screen: a Drafts card on top, a Ready-to-go
// card below, and an "Add new post" button that jumps to the dedicated
// create flow. The old Build / Draft / Ready-to-go sub-nav is gone —
// browsing the media library now happens inside the create flow's
// "Pick from library" overlay.
function CreativeTabBody() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-foreground/55 max-w-md">
          Everything your team is working on — drafts up top, signed-off posts ready to publish below.
        </p>
        <Link
          href="/feather/social-media/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-dark shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Add new post
        </Link>
      </div>
      <CreativeDraftsPanel />
      <ReadyToGoPanel />
    </div>
  );
}

// ── Creative > Draft ─────────────────────────────────────────────────
//
// Renamed Templates → Draft per spec. Shows every SavedDraft that
// isn't yet flagged ready: true (work-in-progress posts), with the
// same Edit / Delete / Mark-ready actions as the Post-tab drafts
// list, plus a small "Start from a template" button that flips an
// inline state to surface the original Templates panel without
// taking up a top-level tab slot.
function CreativeDraftsPanel() {
  const { drafts, loading } = useSavedDrafts();
  const [dragOver, setDragOver] = useState(false);
  const { hiddenIds, request: requestDelete, pending, undo } = usePendingDeletes(
    (ids) => ids.forEach((id) => void deleteDraft(id)),
  );

  const remove = (id: string) => {
    requestDelete([id], 'Draft deleted');
  };

  const toggleReady = (id: string) => {
    const cur = drafts.find((d) => d.id === id);
    void setDraftReady(id, !cur?.ready);
  };

  const inProgress = drafts.filter((d) => !d.ready && !hiddenIds.has(d.id));
  const ready = drafts.filter((d) => d.ready);
  const showSkeleton = loading && drafts.length === 0;

  // Drop a Ready row here → move it back to drafts (unmark ready).
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-draft-move')) { e.preventDefault(); setDragOver(true); }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-draft-move');
      if (!raw) return;
      const { id, from } = JSON.parse(raw) as { id: string; from: string };
      if (id && from === 'ready') void setDraftReady(id, false);
    } catch { /* malformed payload */ }
  };

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl border bg-white px-4 py-4 lg:px-6 lg:py-5 transition-colors ${dragOver ? 'border-primary ring-2 ring-primary/20' : 'border-black/10'}`}
    >
      <div className="mb-3">
        <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
          Drafts · {inProgress.length}
        </h2>
        <p className="text-[11px] text-foreground/45 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
          Posts your team is still working on — not yet approved. Hit <strong>Mark ready</strong> (or drag a row down to <strong>Ready</strong>) to approve one.
          {ready.length > 0 && <> {ready.length} already approved.</>}
        </p>
      </div>

      {showSkeleton ? (
        <DraftRowsSkeleton />
      ) : inProgress.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 bg-warm-bg/30 px-5 py-10 text-center">
          <p className="text-sm text-foreground/55 max-w-md mx-auto">
            No drafts in progress.{' '}
            {ready.length > 0
              ? <>The {ready.length} approved post{ready.length === 1 ? '' : 's'} sit{ready.length === 1 ? 's' : ''} under <strong>Ready</strong> below — drag one up here to edit it again.</>
              : <>Hit <strong>Add new post</strong> above to start one.</>}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/5">
          <table className="w-full text-left text-[12.5px]" style={{ fontFamily: 'var(--font-body)' }}>
            <thead className="bg-warm-bg/40 text-foreground/55">
              <tr className="border-b border-black/5">
                <th scope="col" className="px-2 py-2 w-12 text-[9.5px] font-bold uppercase tracking-[0.14em]">Media</th>
                <th scope="col" className="px-2 py-2 text-[9.5px] font-bold uppercase tracking-[0.14em]">Caption</th>
                <th scope="col" className="px-2 py-2 w-28 text-[9.5px] font-bold uppercase tracking-[0.14em]">Platforms</th>
                <th scope="col" className="px-2 py-2 w-28 text-[9.5px] font-bold uppercase tracking-[0.14em] hidden md:table-cell">Created by</th>
                <th scope="col" className="px-2 py-2 w-32 text-[9.5px] font-bold uppercase tracking-[0.14em] hidden md:table-cell">Saved</th>
                <th scope="col" className="px-2 py-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inProgress.map((d) => {
                const savedLabel = new Date(d.createdAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                });
                return (
                  <tr
                    key={d.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('application/x-draft-move', JSON.stringify({ id: d.id, from: 'draft' })); e.dataTransfer.effectAllowed = 'move'; }}
                    className="border-t border-black/5 hover:bg-warm-bg/30 cursor-grab active:cursor-grabbing">
                    <td className="px-2 py-2 align-middle">
                      {d.mediaUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.mediaUrls[0]} alt="" className="w-9 h-9 rounded object-cover border border-black/10" />
                      ) : (
                        <span className="inline-flex w-9 h-9 rounded items-center justify-center bg-warm-bg/60 text-foreground/40 text-[10px]" aria-hidden>—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle min-w-0">
                      <p className="text-foreground/85 line-clamp-2 whitespace-pre-line">
                        {d.caption || <span className="text-foreground/40 italic">(no caption)</span>}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {(d.platforms ?? []).length === 0 ? (
                          <span className="text-foreground/40 text-[11px]">—</span>
                        ) : (d.platforms ?? []).map((p) => (
                          <span key={p} className="inline-flex items-center justify-center w-4 h-4 text-foreground/70" title={p}>
                            <PlatformIcon platform={p as PlatformId} size={14} />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle text-[11px] text-foreground/55 whitespace-nowrap hidden md:table-cell">
                      {d.createdByName || <span className="text-foreground/40">—</span>}
                    </td>
                    <td className="px-2 py-2 align-middle text-[11px] text-foreground/55 tabular-nums whitespace-nowrap hidden md:table-cell">
                      {savedLabel}
                    </td>
                    <td className="px-2 py-2 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleReady(d.id)}
                          className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] font-semibold hover:bg-primary/90"
                        >
                          Mark ready
                        </button>
                        <Link
                          href={`/feather/social-media/drafts/${d.id}`}
                          className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[10px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
                        >
                          Open →
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(d.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-semibold text-foreground/45 hover:text-rose-700"
                          title="Delete draft"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pending && <UndoToast message={pending.label} onUndo={undo} />}
    </section>
  );
}

// Lightweight skeleton rows for the draft tables while the first DB load
// is in flight — keeps the layout stable instead of flashing empty.
function DraftRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-black/5 divide-y divide-black/5 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
          <div className="w-9 h-9 rounded bg-foreground/10 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-2.5 rounded bg-foreground/10 w-3/4" />
            <div className="h-2.5 rounded bg-foreground/[0.07] w-1/2" />
          </div>
          <div className="h-5 w-16 rounded bg-foreground/10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Animated round checkbox — replaces the default square ticks in the
// Ready table. Controlled (button + role=checkbox) so the tick can
// spring in/out on toggle.
function RoundCheck({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  const active = checked || !!indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ease-out ${active ? 'border-primary bg-primary scale-110 shadow-sm' : 'border-black/25 bg-white hover:border-primary/50 active:scale-90'}`}
    >
      {indeterminate ? (
        <span className="block w-2 h-0.5 rounded-full bg-white" />
      ) : (
        <svg className={`w-3 h-3 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      )}
    </button>
  );
}

// ── Creative > Ready to go ────────────────────────────────────────
//
// Spreadsheet-style list of every SavedDraft that's been flagged
// ready: true. Each row carries a checkbox so the marketer can
// multi-select; a bottom batch-action bar fades in with "Open
// first", "Unmark ready", and "Delete" once anything's selected.
// Mirrors the publish-flow picker on the Post tab but lives here
// so the marketer has a dedicated "what's queued?" surface.
function ReadyToGoPanel() {
  const { drafts, loading } = useSavedDrafts();
  // Selected draft ids — drives the batch-action bar at the bottom.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { hiddenIds, request: requestDelete, pending, undo } = usePendingDeletes(
    (ids) => ids.forEach((id) => void deleteDraft(id)),
  );

  const ready = useMemo(() => drafts.filter((d) => d.ready && !hiddenIds.has(d.id)), [drafts, hiddenIds]);
  const showSkeleton = loading && drafts.length === 0;
  // Drop selections that point at drafts that no longer exist (e.g.
  // after a parallel tab unmarks a draft).
  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(ready.map((d) => d.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [ready]);

  const allSelected = ready.length > 0 && selected.size === ready.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ready.map((d) => d.id)));
  };

  // Batch ops — the shared DB-backed mutators keep the cache + Realtime
  // in sync, so we don't write the whole list back ourselves.
  const batchUnmark = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    void Promise.all(ids.map((id) => setDraftReady(id, false)));
    setSelected(new Set());
  };
  const batchDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    requestDelete(ids, `${ids.length} post${ids.length === 1 ? '' : 's'} deleted`);
    setSelected(new Set());
  };

  const [dragOver, setDragOver] = useState(false);
  // Drop a Draft row here → approve it (mark ready).
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-draft-move')) { e.preventDefault(); setDragOver(true); }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-draft-move');
      if (!raw) return;
      const { id, from } = JSON.parse(raw) as { id: string; from: string };
      if (id && from === 'draft') void setDraftReady(id, true);
    } catch { /* malformed payload */ }
  };

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl border bg-white/65 px-4 py-4 lg:px-6 lg:py-5 pb-24 transition-colors ${dragOver ? 'border-primary ring-2 ring-primary/20' : 'border-black/10'}`}
    >
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Ready · {ready.length}
          </h2>
          <p className="text-[11px] text-foreground/45 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            Drafts your team has signed off on. Drag one up to <strong>Drafts</strong> to edit it again, or tick rows to act in bulk.
          </p>
        </div>
      </header>

      {showSkeleton ? (
        <DraftRowsSkeleton />
      ) : ready.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
          Nothing approved yet. Hit <strong>Mark ready</strong> on a draft above (or drag it down here) once it&rsquo;s final.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/5">
          <table className="w-full text-left text-[12.5px]" style={{ fontFamily: 'var(--font-body)' }}>
            <thead className="bg-warm-bg/40 text-foreground/55">
              <tr className="border-b border-black/5">
                <th scope="col" className="px-3 py-2 w-10">
                  <RoundCheck
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    label={allSelected ? 'Deselect all' : 'Select all approved posts'}
                  />
                </th>
                <th scope="col" className="px-2 py-2 w-12 text-[9.5px] font-bold uppercase tracking-[0.14em]">Media</th>
                <th scope="col" className="px-2 py-2 text-[9.5px] font-bold uppercase tracking-[0.14em]">Caption</th>
                <th scope="col" className="px-2 py-2 w-28 text-[9.5px] font-bold uppercase tracking-[0.14em]">Platforms</th>
                <th scope="col" className="px-2 py-2 w-28 text-[9.5px] font-bold uppercase tracking-[0.14em] hidden md:table-cell">Created by</th>
                <th scope="col" className="px-2 py-2 w-32 text-[9.5px] font-bold uppercase tracking-[0.14em] hidden md:table-cell">Saved</th>
                <th scope="col" className="px-2 py-2 w-16 text-[9.5px] font-bold uppercase tracking-[0.14em] text-center hidden md:table-cell">Media</th>
                <th scope="col" className="px-2 py-2 w-20 text-[9.5px] font-bold uppercase tracking-[0.14em]"></th>
              </tr>
            </thead>
            <tbody>
              {ready.map((d) => {
                const isSel = selected.has(d.id);
                const savedLabel = new Date(d.createdAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                });
                return (
                  <tr
                    key={d.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('application/x-draft-move', JSON.stringify({ id: d.id, from: 'ready' })); e.dataTransfer.effectAllowed = 'move'; }}
                    className={`border-t border-black/5 cursor-grab active:cursor-grabbing ${isSel ? 'bg-primary/5' : 'hover:bg-warm-bg/30'}`}
                  >
                    <td className="px-3 py-2 align-middle">
                      <RoundCheck checked={isSel} onChange={() => toggleOne(d.id)} label={`Select draft saved ${savedLabel}`} />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      {d.mediaUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.mediaUrls[0]}
                          alt=""
                          className="w-9 h-9 rounded object-cover border border-black/10"
                        />
                      ) : (
                        <span className="inline-flex w-9 h-9 rounded items-center justify-center bg-warm-bg/60 text-foreground/40 text-[10px]" aria-hidden>—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle min-w-0">
                      <p className="text-foreground/85 line-clamp-2 whitespace-pre-line">
                        {d.caption || <span className="text-foreground/40 italic">(no caption)</span>}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {(d.platforms ?? []).length === 0 ? (
                          <span className="text-foreground/40 text-[11px]">—</span>
                        ) : (d.platforms ?? []).map((p) => (
                          <span key={p} className="inline-flex items-center justify-center w-4 h-4 text-foreground/70" title={p}>
                            <PlatformIcon platform={p as PlatformId} size={14} />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle text-[11px] text-foreground/55 whitespace-nowrap hidden md:table-cell">
                      {d.createdByName || <span className="text-foreground/40">—</span>}
                    </td>
                    <td className="px-2 py-2 align-middle text-[11px] text-foreground/55 tabular-nums whitespace-nowrap hidden md:table-cell">
                      {savedLabel}
                    </td>
                    <td className="px-2 py-2 align-middle text-center text-[11px] text-foreground/55 tabular-nums hidden md:table-cell">
                      {d.mediaUrls.length}
                    </td>
                    <td className="px-2 py-2 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/feather/social-media/drafts/${d.id}`}
                          className="inline-flex px-2.5 py-1 rounded-md border border-black/10 bg-white text-[10px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => requestDelete([d.id], 'Post deleted')}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-black/10 bg-white text-foreground/45 hover:text-rose-700 hover:border-rose-300"
                          aria-label="Delete post"
                          title="Delete (with undo)"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Batch-action bar — fixed bottom, fades in only when at
          least one row is selected. Sits above other fixed footers
          (z-40) and reserves its own horizontal padding so it
          stays clear of the sidebar rail on desktop. */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Batch actions"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 supports-[backdrop-filter]:bg-white/85 backdrop-blur border-t border-black/10 shadow-[0_-8px_24px_-12px_rgba(60,48,42,0.18)]"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12.5px] text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-semibold text-foreground">{selected.size}</span>
              {' '}selected
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-2 text-[11px] font-semibold text-foreground/45 hover:text-foreground underline decoration-dotted"
              >
                Clear
              </button>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={batchUnmark}
                className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
                title="Move these drafts back to Draft (not approved)."
              >
                Unmark ready
              </button>
              <button
                type="button"
                onClick={batchDelete}
                className="px-3 py-1.5 rounded-md border border-rose-300 bg-white text-[11.5px] font-semibold text-rose-700 hover:bg-rose-50"
              >
                Delete · {selected.size}
              </button>
              {selected.size === 1 && (() => {
                const firstId = Array.from(selected)[0];
                return (
                  <Link
                    href={`/feather/social-media/drafts/${firstId}`}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold hover:bg-primary/90"
                  >
                    Open
                  </Link>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {pending && <UndoToast message={pending.label} onUndo={undo} />}
    </section>
  );
}

// ── Creative > Library ───────────────────────────────────────────────
//
// Phase 6 of the 10-phase split. Reads site_images directly via the
// same supabase client the MediaPicker uses (limit 200, newest first
// — same query) and renders a thumbnail grid. Multi-select with a
// running counter; a Send-to-Compose button stashes the picked URLs
// via pushComposeDraft and navigates to /app/social-media?tab=post.
// The Composer listens for the draft event in phase 9; until then,
// the URL is staged in sessionStorage and reads as a no-op on the
// Post tab (no regression for direct Compose usage).

interface LibraryAsset {
  id: string;
  url: string;
  thumbUrl: string;
  filename: string | null;
  alt: string | null;
  created_at: string;
  last_used_at: string | null;
  kind: 'image' | 'video';
}

type LibraryFilter = 'all' | 'photos' | 'videos';

// Cap on visible library tiles; the rest hides behind a Show-all
// reveal so the page doesn't feel like an infinite scroll.
const LIBRARY_VISIBLE_DEFAULT = 24;

// sessionStorage key for the working post title — survives the
// Continue jump into AI / Compose so the marketer's typed name
// carries through every step.
const POST_TITLE_KEY = 'sa-social-build-title';

function CreativeLibraryPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [showAll, setShowAll] = useState(false);
  // Working post name — persisted to sessionStorage so it carries
  // across the Continue handoff into Draft / Compose.
  const [postName, setPostName] = useState('');
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(POST_TITLE_KEY);
      if (stored) setPostName(stored);
    } catch { /* sessionStorage unavailable */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(POST_TITLE_KEY, postName); } catch { /* */ }
  }, [postName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Pull photos + videos in parallel; merge into a single
        // list ordered first by last_used_at (most-recently-picked
        // bubbles to the top across every surface) then by
        // created_at as the historical baseline.
        const [imagesRes, videosRes] = await Promise.all([
          supabase
            .from('site_images')
            .select('id, public_url, filename, alt, created_at, last_used_at')
            .order('last_used_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('site_videos')
            .select('id, video_url, thumbnail_url, filename, alt, created_at, last_used_at')
            .order('last_used_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(80),
        ]);
        if (cancelled) return;
        if (imagesRes.error) throw imagesRes.error;
        const imageRows = (imagesRes.data ?? []) as Array<{
          id: string; public_url: string; filename: string | null;
          alt: string | null; created_at: string; last_used_at: string | null;
        }>;
        const videoRows = (videosRes.error ? [] : (videosRes.data ?? [])) as Array<{
          id: string; video_url: string | null; thumbnail_url: string | null;
          filename: string | null; alt: string | null; created_at: string; last_used_at: string | null;
        }>;
        const merged: LibraryAsset[] = [
          ...imageRows.map<LibraryAsset>((r) => ({
            id: `img:${r.id}`,
            url: r.public_url,
            thumbUrl: r.public_url,
            filename: r.filename,
            alt: r.alt,
            created_at: r.created_at,
            last_used_at: r.last_used_at,
            kind: 'image',
          })),
          ...videoRows
            .filter((r) => Boolean(r.video_url))
            .map<LibraryAsset>((r) => ({
              id: `vid:${r.id}`,
              url: r.video_url as string,
              thumbUrl: r.thumbnail_url || (r.video_url as string),
              filename: r.filename,
              alt: r.alt,
              created_at: r.created_at,
              last_used_at: r.last_used_at,
              kind: 'video',
            })),
        ].sort((a, b) => {
          // Most-recently-picked first; falls back to created_at so
          // assets that have never been touched still slot in
          // chronologically below the recency band.
          const aKey = a.last_used_at ?? a.created_at;
          const bKey = b.last_used_at ?? b.created_at;
          if (a.last_used_at && !b.last_used_at) return -1;
          if (!a.last_used_at && b.last_used_at) return 1;
          return aKey > bKey ? -1 : aKey < bKey ? 1 : 0;
        });
        setAssets(merged);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((row) => {
      if (filter === 'photos' && row.kind !== 'image') return false;
      if (filter === 'videos' && row.kind !== 'video') return false;
      if (!q) return true;
      return (row.filename ?? '').toLowerCase().includes(q) ||
        (row.alt ?? '').toLowerCase().includes(q);
    });
  }, [assets, filter, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const wasSelected = next.has(id);
      if (wasSelected) {
        next.delete(id);
      } else {
        next.add(id);
        // Fire the recency bump only on PICKS (not deselects).
        // Strip the local namespace prefix so the server endpoint
        // gets the real uuid.
        const kind: 'image' | 'video' = id.startsWith('vid:') ? 'video' : 'image';
        const rawId = id.replace(/^(img|vid):/, '');
        touchMedia(kind, rawId);
      }
      return next;
    });
  };

  const continueToAi = () => {
    const urls = assets
      .filter((row) => selected.has(row.id))
      .map((row) => row.url)
      .filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;
    pushCreativeStaging({ mediaUrls: urls, title: postName.trim() || null });
    // Continue now lands on the dedicated Create page — caption +
    // platform pills + a deliverable upload slot for every crop
    // across the targeted networks, and a "Save and ready to go"
    // button that drops the result into the Ready-to-go list.
    router.push('/feather/social-media/create');
  };

  const counts = useMemo(() => {
    let photos = 0, videos = 0;
    for (const a of assets) {
      if (a.kind === 'image') photos++;
      else videos++;
    }
    return { photos, videos, all: photos + videos };
  }, [assets]);

  // Cap the visible tiles; Show all expands to the full list. Lets
  // the page feel tight on first paint while still giving access to
  // older assets when the marketer needs them.
  const visibleAssets = showAll ? filtered : filtered.slice(0, LIBRARY_VISIBLE_DEFAULT);
  const hiddenCount = Math.max(0, filtered.length - visibleAssets.length);

  return (
    <>
    <section className="rounded-2xl border border-black/10 bg-white p-5 pb-24 space-y-5">

      {/* STEP 1 · name the post. Lands at the top so the marketer
          declares intent before scrolling through media. The typed
          name persists into sessionStorage and carries forward into
          Draft / Compose. */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold tabular-nums">1</span>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Name this post</h2>
        </div>
        <input
          type="text"
          value={postName}
          onChange={(e) => setPostName(e.target.value)}
          placeholder="e.g. 'Sunset over the herd' or 'Equine therapy day 12'"
          className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-[11px] text-foreground/45 mt-1.5">
          Working title only — you can edit it later. Used to find the draft in Ready to go.
        </p>
      </div>

      {/* STEP 2 · pick media. */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap pt-1 border-t border-black/5">
        <div className="flex items-baseline gap-2 pt-4">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold tabular-nums">2</span>
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Library</h2>
            <p className="text-[11px] text-foreground/45 mt-0.5">
              Pick the media you want a post built around. Continue takes you to AI for caption generation.
            </p>
          </div>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowAll(true); }}
          placeholder="Search filename or alt"
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs w-56 max-w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Photo / Video filter — pill bar matches the tab/sub-tab idiom
          used elsewhere on the page so the control reads as a peer. */}
      <div className="mb-4 inline-flex rounded-lg border border-black/10 overflow-hidden">
        {([
          { id: 'all', label: `All (${counts.all})` },
          { id: 'photos', label: `Photos (${counts.photos})` },
          { id: 'videos', label: `Videos (${counts.videos})` },
        ] as const).map((opt) => {
          const sel = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                sel ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-foreground/45 italic">Loading library…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-foreground/55 italic">No media matches.</p>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-1.5">
          {visibleAssets.map((row) => {
            const isSelected = selected.has(row.id);
            const label = row.alt || row.filename || (row.kind === 'video' ? 'Video' : 'Image');
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => toggle(row.id)}
                  aria-pressed={isSelected}
                  className={`relative block w-full aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                    isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-foreground/20'
                  }`}
                  title={label}
                >
                  {row.kind === 'video' ? (
                    // Render the video itself with preload="metadata"
                    // so the browser paints the first frame as a
                    // native poster — works even when we don't have
                    // a separate thumbnail_url stored. muted+playsInline
                    // keeps tiles silent on hover-play.
                    <video
                      src={row.url}
                      poster={row.thumbUrl && row.thumbUrl !== row.url ? row.thumbUrl : undefined}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover bg-black"
                      aria-label={label}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.thumbUrl}
                      alt={label}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {row.kind === 'video' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
                    >
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white">
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </span>
                  )}
                  <span
                    className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                      row.kind === 'video' ? 'bg-fuchsia-600/90 text-white' : 'bg-black/55 text-white'
                    }`}
                    aria-hidden="true"
                  >
                    {row.kind === 'video' ? 'Video' : 'Photo'}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white shadow">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Show-all reveal — pages with >24 assets hide the rest
          behind a single button so the panel doesn't read as an
          endless scroll. Search auto-expands the cap so query
          results aren't accidentally hidden. */}
      {!loading && hiddenCount > 0 && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[11.5px] font-semibold uppercase tracking-wider text-primary hover:underline"
          >
            Show all {filtered.length} ↓
          </button>
        </div>
      )}

    </section>

    {/* Viewport-fixed action footer — `position: fixed bottom-0`
        spans the full window width and stays put as the user
        scrolls the panel grid, so Continue is one tap away no
        matter how far down they are. The inner column re-uses the
        same max-w-5xl + horizontal padding as the page wrapper so
        the action chrome lines up with the rest of the layout.
        Rendered as a sibling of the panel so the panel's own
        rounded-2xl border isn't broken by the bar. The panel itself
        carries pb-24 to clear scroll-room above this bar. */}
    <div
      role="region"
      aria-label="Library selection"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 supports-[backdrop-filter]:bg-white/80 backdrop-blur border-t border-black/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-foreground/55">
          <span className="font-semibold text-foreground/80">{selected.size}</span>
          {' '}selected
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className="text-[12px] text-foreground/55 hover:text-foreground disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={continueToAi}
            disabled={selected.size === 0}
            className="rounded-lg bg-primary text-white px-4 py-1.5 text-[12px] font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Creative > Templates ─────────────────────────────────────────────
//
// Phase 7 of the 10-phase split. Curated set of reusable post drafts
// the marketing team uses on a regular cadence. Templates are static
// here (TEMPLATES const below); upgrading to DB-backed rows is a
// later iteration once the team converges on a shared playbook.
// Picking a template stashes the body via pushComposeDraft and
// routes to ?tab=post — the Composer picks it up in phase 9.

interface PostTemplate {
  id: string;
  title: string;
  cadence: string;
  description: string;
  body: string;
}

const TEMPLATES: PostTemplate[] = [
  {
    id: 'wisdom-wednesday',
    title: 'Wisdom Wednesday',
    cadence: 'Weekly · Wednesday',
    description: 'A quote or reflection from the week — pairs well with a herd or sunrise photo.',
    body:
      "Wisdom Wednesday — \n\n“[insert quote / reflection]”\n\nWhat’s landing for you this week?\n\n#SevenArrowsRecovery #WisdomWednesday #Recovery",
  },
  {
    id: 'alumni-spotlight',
    title: 'Alumni Spotlight',
    cadence: 'Bi-weekly',
    description: 'Celebrate an alum at a milestone (60/90 days, 6 months, 1 year sober).',
    body:
      "Alumni Spotlight — [first name] is celebrating [milestone] today.\n\n[1–2 sentences about their journey, what they’re doing now, what they’d say to someone just starting.]\n\nWe see you. We’re proud of you.\n\n#SevenArrowsRecovery #RecoveryWorks #AlumniSpotlight",
  },
  {
    id: 'family-friday',
    title: 'Family Friday',
    cadence: 'Weekly · Friday',
    description: 'Speaks to family members watching their loved one heal — empathy, not pitch.',
    body:
      "Family Friday — \n\nIf someone you love is in treatment right now, this is for you.\n\n[1–2 sentences naming a real, common family experience: hope, fatigue, fear, relief.]\n\nYou don’t have to figure this out alone. We’re here when you’re ready.\n\n#SevenArrowsRecovery #FamilyRecovery #SupportSystem",
  },
  {
    id: 'staff-introduction',
    title: 'Staff Introduction',
    cadence: 'Monthly',
    description: 'Introduce a clinician, nurse, equine specialist, or chef to humanize the team.',
    body:
      "Meet [name] — [role at Seven Arrows].\n\n[2–3 sentences: how long they’ve been with us, one specific thing clients say about them, one thing they love outside of work.]\n\nThis is who shows up for you at Seven Arrows.\n\n#SevenArrowsRecovery #MeetTheTeam",
  },
  {
    id: 'tour-invite',
    title: 'Tour Invite',
    cadence: 'As needed',
    description: 'CTA for a virtual or in-person ranch tour. Keep it warm, not salesy.',
    body:
      "Curious what 160 acres of recovery actually feels like?\n\nWe offer guided tours of the Seven Arrows ranch — the herd, the lodges, the river, the kitchen. No commitment, no pitch. Just a real look at the place that’s helped a lot of people start over.\n\nDM us or visit the link in bio to book.\n\n#SevenArrowsRecovery #RanchTour",
  },
  {
    id: 'equine-moment',
    title: 'Equine Moment',
    cadence: 'Weekly',
    description: 'Pair with a herd photo. Frames equine work without overclaiming.',
    body:
      "[Horse name] notices the smallest shifts — a held breath, a softened jaw, a step closer.\n\nThat’s the work, in a single moment: presence answered with presence.\n\n#SevenArrowsRecovery #EquineAssistedTherapy #SomaticHealing",
  },
];

function CreativeTemplatesPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);

  const saveTemplateDraft = async (t: PostTemplate) => {
    await createDraft({ caption: t.body, mediaUrls: [] });
    const next = new URLSearchParams();
    next.set('tab', 'post');
    next.set('sub', 'drafts');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Templates</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          One-click reusable drafts. Edit the placeholders in Compose before posting.
        </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => {
          const open = openId === t.id;
          return (
            <li key={t.id} className="rounded-xl border border-black/10 bg-warm-bg/30 p-4 flex flex-col">
              <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">{t.cadence}</p>
              <p className="text-base font-bold text-foreground leading-tight mt-0.5">{t.title}</p>
              <p className="text-xs text-foreground/60 mt-1.5 leading-relaxed">{t.description}</p>
              {open && (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-[12px] text-foreground/75 bg-white rounded-lg border border-black/5 p-3 leading-relaxed">
                  {t.body}
                </pre>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="text-[11px] font-semibold text-foreground/55 hover:text-foreground"
                >
                  {open ? 'Hide preview' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => saveTemplateDraft(t)}
                  className="rounded-lg bg-primary text-white px-3 py-1.5 text-[11px] font-semibold hover:bg-primary-dark"
                >
                  Save as draft
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Creative > AI ────────────────────────────────────────────────────
//
// Phase 8 of the 10-phase split. Claude-backed caption generator that
// posts to /api/claude/social-caption and renders three draft variants
// the user can pick from. Each draft has a "Send to Compose" button
// that stashes it via pushComposeDraft and routes to the Post tab,
// matching the Library + Templates handoff. The server holds the API
// key — the browser only sends topic, tone, and platform metadata.

const TONE_OPTIONS = [
  'warm, grounded, trauma-informed',
  'celebratory but humble',
  'reflective and quiet',
  'practical and informative',
  'invitational, not salesy',
];

const LENGTH_OPTIONS: { id: 'short' | 'medium' | 'long'; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
];

function CreativeAiPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [stagedMedia, setStagedMedia] = useState<string[]>([]);

  // Pull any media the user picked in Library so the AI prompt can
  // describe what the post is built around. We peek without clearing
  // — the stash is consumed when Save fires (success path) so a back
  // navigation to Library + return still finds the same selection.
  useEffect(() => {
    const staged = readCreativeStaging();
    if (staged?.mediaUrls?.length) setStagedMedia(staged.mediaUrls);
  }, []);

  const generate = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic && stagedMedia.length === 0) {
      setError('Add a topic or pick media in Library first.');
      return;
    }
    setBusy(true);
    setError(null);
    setVariants([]);
    try {
      // Topic falls back to a media-anchored sentence so users can
      // hit Generate after only picking photos in Library — Claude
      // gets enough hint to draft something on-brand.
      const effectiveTopic = trimmedTopic
        || `A post built around ${stagedMedia.length} attached image${stagedMedia.length === 1 ? '' : 's'} from the Seven Arrows ranch.`;
      const res = await fetch('/api/claude/social-caption', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topic: effectiveTopic,
          tone,
          length,
          includeHashtags,
          mediaUrls: stagedMedia,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const list = Array.isArray(json.variants) ? (json.variants as string[]) : [];
      setVariants(list);
      if (list.length === 0) setError('Claude returned no usable variants — try a different topic.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (caption: string) => {
    await createDraft({ caption, mediaUrls: stagedMedia });
    clearCreativeStaging();
    const next = new URLSearchParams();
    next.set('tab', 'post');
    next.set('sub', 'drafts');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">AI captions</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          {stagedMedia.length > 0
            ? `Drafting around ${stagedMedia.length} piece${stagedMedia.length === 1 ? '' : 's'} of media from Library. Save the best variant to land it on Post → Drafts.`
            : 'Tell Claude what the post is about; Save the best variant and it lands on Post → Drafts.'}
        </p>
      </div>

      {stagedMedia.length > 0 && (
        <div className="mb-4 rounded-xl border border-black/10 bg-warm-bg/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-foreground/55 font-semibold mb-2">
            From Library ({stagedMedia.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {stagedMedia.map((url) => (
              <li key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Staged media" className="w-full h-full object-cover" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-foreground/55 font-semibold">Topic</span>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Wisdom Wednesday quote about presence; new chef Sandra spotlight; trail ride photo from this morning"
            rows={3}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
        </label>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-foreground/55 font-semibold">Tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-foreground/55 font-semibold">Length</span>
            <div className="mt-1 inline-flex rounded-lg border border-black/10 overflow-hidden">
              {LENGTH_OPTIONS.map((l) => {
                const selected = length === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLength(l.id)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground/65">
            <input
              type="checkbox"
              checked={includeHashtags}
              onChange={(e) => setIncludeHashtags(e.target.checked)}
              className="rounded border-black/20 text-primary focus:ring-primary/30"
            />
            Include hashtags
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <button
          type="button"
          onClick={generate}
          disabled={busy || !topic.trim()}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {busy && (
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {busy ? 'Drafting…' : 'Draft 3 variants'}
        </button>
        {error && (
          <span className="text-xs text-red-700">{error}</span>
        )}
      </div>

      {variants.length > 0 && (
        <ul className="space-y-3">
          {variants.map((v, i) => (
            <li key={i} className="rounded-xl border border-black/10 bg-warm-bg/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold mb-1.5">Draft {i + 1}</p>
              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{v}</p>
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => saveDraft(v)}
                  className="rounded-lg bg-primary text-white px-3 py-1.5 text-[11px] font-semibold hover:bg-primary-dark"
                >
                  Save draft
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Connected accounts strip ──────────────────────────────────────

// Build an outbound URL to the platform's profile/dashboard for a
// given handle. Falls back to the platform's home/dashboard if no
// handle is known — every connected pill is clickable.
function accountUrlFor(platform: string, handle: string | null): string {
  const h = (handle ?? '').replace(/^@/, '').trim();
  switch (platform) {
    case 'facebook':   return h ? `https://www.facebook.com/${encodeURIComponent(h)}` : 'https://www.facebook.com/sevenarrowsrecovery';
    case 'instagram':  return h ? `https://www.instagram.com/${encodeURIComponent(h)}/` : 'https://www.instagram.com/sevenarrowsrecovery/';
    case 'linkedin':   return h ? `https://www.linkedin.com/in/${encodeURIComponent(h)}` : 'https://www.linkedin.com/company/sevenarrowsrecovery/';
    case 'twitter':    return h ? `https://twitter.com/${encodeURIComponent(h)}` : 'https://twitter.com/home';
    case 'tiktok':     return h ? `https://www.tiktok.com/@${encodeURIComponent(h)}` : 'https://www.tiktok.com/';
    case 'youtube':    return h ? `https://www.youtube.com/@${encodeURIComponent(h)}` : 'https://studio.youtube.com/';
    case 'pinterest':  return h ? `https://www.pinterest.com/${encodeURIComponent(h)}/` : 'https://www.pinterest.com/';
    case 'gmb':        return 'https://business.google.com/';
    case 'reddit':     return h ? `https://www.reddit.com/user/${encodeURIComponent(h)}` : 'https://www.reddit.com/';
    case 'threads':    return h ? `https://www.threads.net/@${encodeURIComponent(h)}` : 'https://www.threads.net/';
    case 'bluesky':    return h ? `https://bsky.app/profile/${encodeURIComponent(h)}` : 'https://bsky.app/';
    default:           return 'https://app.ayrshare.com/';
  }
}

function ConnectedAccountsStrip({
  accounts, loading, error, onChanged, history,
}: {
  accounts: AccountsResponse | null;
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  history: HistoryPost[];
}) {
  const active = new Set(accounts?.activeSocialAccounts ?? []);
  // Which connected account's feed is expanded inline below the strip.
  const [openFeed, setOpenFeed] = useState<PlatformId | null>(null);

  // Refresh the connected-accounts list when the user returns to
  // this tab — covers the "linked an account on Ayrshare's
  // dashboard and came back" flow.
  useEffect(() => {
    const onFocus = () => onChanged();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [onChanged]);

  const openLabel = PLATFORMS.find((p) => p.id === openFeed)?.label ?? '';
  const openDisplay = openFeed
    ? (accounts?.displayNames?.[openFeed]?.displayName ?? accounts?.displayNames?.[openFeed]?.username ?? null)
    : null;

  return (
    <section className="mb-6 rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Connected accounts</h2>
        {loading && <span className="text-xs text-foreground/40">Loading…</span>}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const isActive = active.has(p.id);
          const display = accounts?.displayNames?.[p.id]?.displayName
            ?? accounts?.displayNames?.[p.id]?.username
            ?? null;
          const isOpen = openFeed === p.id;
          const pillClass = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            isActive
              ? isOpen
                ? 'border-emerald-400 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300'
              : 'border-dashed border-foreground/25 bg-white text-foreground/60'
          }`;
          const pillBody = (
            <>
              <PlatformIcon
                platform={p.id as PlatformId}
                size={14}
                color={isActive ? undefined : 'rgba(0,0,0,0.3)'}
              />
              <span>{p.label}</span>
              {isActive && (
                <span
                  aria-label="Connected"
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]"
                />
              )}
              {isActive && display && (
                <span className="text-[10px] text-emerald-700/70 font-normal">@{display.replace(/^@/, '')}</span>
              )}
              {isActive && (
                <svg className={`w-3 h-3 text-emerald-700/60 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          );
          if (isActive) {
            // Connected → click toggles an inline feed of the posts
            // Feather has published to this account (with a link out
            // to the live profile for the full external feed).
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenFeed((cur) => (cur === p.id ? null : (p.id as PlatformId)))}
                className={pillClass}
                aria-expanded={isOpen}
                title={`Show ${p.label}${display ? ` (${display})` : ''} feed`}
              >
                {pillBody}
              </button>
            );
          }
          return (
            <span
              key={p.id}
              className={pillClass}
              title={`${p.label} — not connected`}
            >
              {pillBody}
            </span>
          );
        })}
      </div>

      {openFeed && (
        <AccountFeedPanel
          platform={openFeed}
          label={openLabel}
          display={openDisplay}
          profileUrl={accountUrlFor(openFeed, openDisplay)}
          history={history}
          onClose={() => setOpenFeed(null)}
        />
      )}
    </section>
  );
}

// ── Per-account feed ─────────────────────────────────────────────────
//
// Clicking a connected account in the strip expands this inline. It
// reads the same /history payload the Post tab uses and filters to the
// posts Feather has published to that one platform — caption, media
// thumbnail, when it went out, and a link to the live post. It only
// covers posts sent through Feather (Ayrshare's history is the only
// reliable read API across all the networks); the "Open profile" link
// jumps to the full external feed for everything else.
function AccountFeedPanel({
  platform, label, display, profileUrl, history, onClose,
}: {
  platform: PlatformId;
  label: string;
  display: string | null;
  profileUrl: string;
  history: HistoryPost[];
  onClose: () => void;
}) {
  const posts = useMemo(() => {
    return history
      .filter((p) => (p.platforms ?? []).includes(platform))
      // Drop still-scheduled future posts — the feed is what's live.
      .filter((p) => !isScheduledPending(p))
      .sort((a, b) => {
        const ta = Date.parse(a.created || a.scheduleDate || '') || 0;
        const tb = Date.parse(b.created || b.scheduleDate || '') || 0;
        return tb - ta;
      });
  }, [history, platform]);

  const postUrlFor = (p: HistoryPost): string | null => {
    const match = (p.postIds ?? []).find((x) => x.platform === platform);
    return match?.postUrl ?? null;
  };

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={platform} size={18} />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">
              {label} feed
              {display && <span className="ml-1.5 text-[11px] font-normal text-foreground/50">@{display.replace(/^@/, '')}</span>}
            </p>
            <p className="text-[10px] text-foreground/45 leading-tight">Posted through Feather · newest first</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900"
            title="Open the live profile in a new tab"
          >
            Open profile
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-foreground/40 hover:bg-black/5 hover:text-foreground/70"
            aria-label="Close feed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-[12px] text-foreground/55 italic">
          No posts published to {label} through Feather yet.{' '}
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="not-italic font-semibold text-emerald-800 hover:underline">
            View the live profile →
          </a>
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.slice(0, 12).map((p, i) => {
            const url = postUrlFor(p);
            const when = p.created || p.scheduleDate;
            const whenLabel = when
              ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            const thumb = (p.mediaUrls ?? [])[0] ?? null;
            const caption = (p.post ?? '').trim();
            const preview = caption.length > 140 ? `${caption.slice(0, 140)}…` : caption;
            const Card = (
              <div className="h-full rounded-lg border border-black/10 bg-white overflow-hidden hover:shadow-sm transition-shadow">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-warm-bg/40 flex items-center justify-center text-foreground/20">
                    <PlatformIcon platform={platform} size={28} />
                  </div>
                )}
                <div className="p-2.5">
                  {whenLabel && <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold mb-0.5">{whenLabel}</p>}
                  <p className="text-[12px] text-foreground/80 leading-snug line-clamp-3">
                    {preview || <span className="italic text-foreground/40">(no caption)</span>}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={p.id ?? i}>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full" title="Open this post">{Card}</a>
                ) : Card}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────

interface SnapshotEntry {
  id: string;
  captured_at: string;
  platform: string;
  raw: Record<string, unknown> | null;
  source: string;
}

interface HistoryResponse {
  latest: Record<string, SnapshotEntry>;
  previous?: Record<string, SnapshotEntry>;
  platforms: string[];
}

function AnalyticsPanel({ connected }: { connected: string[] }) {
  const [latest, setLatest] = useState<Record<string, SnapshotEntry>>({});
  const [previous, setPrevious] = useState<Record<string, SnapshotEntry>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social-media/analytics/history', {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => ({}))) as HistoryResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setLatest(json.latest ?? {});
      setPrevious(json.previous ?? {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual Refresh: trigger a fresh snapshot via the cron handler,
  // then re-read the history table. The cron handler does the
  // Ayrshare round-trip; we just kick it off and wait for the row
  // to land.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/social-media/analytics/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadFromHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [loadFromHistory]);

  useEffect(() => { loadFromHistory(); }, [loadFromHistory]);

  if (connected.length === 0) {
    return null;
  }

  // Show every connected platform — when we don't have a snapshot
  // for one yet, the card renders an empty-state and prompts the
  // admin to click Refresh (or wait for the next cron tick).
  const hasAnySnapshot = Object.keys(latest).length > 0;

  // Pick the most recent captured_at across all connected platforms
  // for the header timestamp. The team treats the cron as a single
  // run, so a per-card timestamp would be more noise than signal.
  const headerCapturedAt = (() => {
    let max: string | null = null;
    for (const p of connected) {
      const at = latest[p]?.captured_at;
      if (at && (!max || at > max)) max = at;
    }
    return max;
  })();

  return (
    <section className="mb-6 rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Analytics</h2>
          <p className="text-[11px] text-foreground/50 mt-0.5">
            {headerCapturedAt
              ? `as of ${new Date(headerCapturedAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}`
              : 'No snapshot yet'}
            {' · auto-refreshes daily at 6am'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/55 hover:text-primary disabled:opacity-50"
        >
          <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}
      {loading && !hasAnySnapshot && !error && (
        <p className="text-xs text-foreground/45 italic">Loading…</p>
      )}
      {!loading && !hasAnySnapshot && !error && (
        <p className="text-xs text-foreground/45 italic">
          No snapshot yet — click <strong>Refresh now</strong> to capture the first one,
          then the daily cron takes over.
        </p>
      )}
      {hasAnySnapshot && (
        <div className="rounded-xl border border-black/10 overflow-hidden divide-y divide-black/5 bg-warm-bg/30">
          <div className="hidden sm:flex items-center text-[10px] uppercase tracking-wider text-foreground/45 font-semibold px-3 py-2 bg-white/60">
            <span className="w-44 shrink-0">Platform</span>
            <span>Engagement metrics</span>
          </div>
          {connected.map((p) => (
            <AnalyticsRow
              key={p}
              platform={p as PlatformId}
              raw={latest[p]?.raw ?? null}
              previousRaw={previous[p]?.raw ?? null}
              capturedAt={latest[p]?.captured_at ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyticsRow({
  platform, raw, previousRaw, capturedAt,
}: {
  platform: PlatformId;
  raw: Record<string, unknown> | null;
  /** Yesterday's snapshot for this platform (if any) — used to render
   *  +/- deltas next to each metric. Falls back to no-delta when
   *  absent. */
  previousRaw?: Record<string, unknown> | null;
  /** Snapshot captured_at — surfaces in the platform column underneath
   *  the icon + name so each row reads as data from a specific moment. */
  capturedAt?: string | null;
}) {
  const stats = useMemo(() => extractStats(platform, raw), [platform, raw]);
  const previousStats = useMemo(
    () => extractStats(platform, previousRaw ?? null),
    [platform, previousRaw],
  );
  const previousByLabel = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of previousStats) {
      const n = Number(s.value.replace(/,/g, ''));
      if (Number.isFinite(n)) m.set(s.label, n);
    }
    return m;
  }, [previousStats]);
  const platformLabel = platform.toUpperCase().replace('GMB', 'Google Biz');
  const capturedLabel = capturedAt
    ? new Date(capturedAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-3 bg-white">
      {/* Column A — platform identity. Fixed width on sm+ so every
          row's metric strip starts at the same x position and the
          rows read as a table. */}
      <div className="flex items-center gap-2 sm:w-44 sm:shrink-0">
        <PlatformIcon platform={platform} size={18} />
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wider text-foreground/85 leading-tight">
            {platformLabel}
          </p>
          {capturedLabel && (
            <p className="text-[10px] text-foreground/40 leading-tight">{capturedLabel}</p>
          )}
        </div>
      </div>

      {/* Column B — metric strip. flex-wrap so a platform with many
          metrics (Instagram, TikTok) wraps cleanly instead of forcing
          horizontal scroll. */}
      <div className="min-w-0 flex-1">
        {!raw ? (
          <p className="text-[11px] italic text-foreground/40">No data returned.</p>
        ) : stats.length === 0 ? (
          <details className="text-[11px] text-foreground/55">
            <summary className="cursor-pointer hover:text-foreground">Raw response</summary>
            <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-foreground/55 bg-warm-bg/40 rounded border border-black/5 p-2">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </details>
        ) : (
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {stats.map((s) => {
              const todayN = Number(s.value.replace(/,/g, ''));
              const yest = previousByLabel.get(s.label);
              const hasDelta = Number.isFinite(todayN) && yest !== undefined;
              const delta = hasDelta ? todayN - (yest as number) : 0;
              return (
              <li key={s.label} className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-foreground/45 leading-tight">
                  {s.label}
                </p>
                <p className="text-base font-bold text-foreground tabular-nums leading-tight">
                  {s.value}
                </p>
                {hasDelta && delta !== 0 && (
                  <p
                    className={`text-[10px] font-semibold tabular-nums leading-tight ${
                      delta > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                    title="Change vs. previous day"
                  >
                    {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                  </p>
                )}
                {hasDelta && delta === 0 && (
                  <p className="text-[10px] font-semibold tabular-nums leading-tight text-foreground/35">
                    no change
                  </p>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface Stat { label: string; value: string }

/** Walk a raw Ayrshare /analytics/social blob for a platform and pull
 *  the most-useful headline numbers. The blob shapes are platform-
 *  specific; this helper has a per-platform pattern that knows the
 *  field names. Anything we don't know about falls through to the
 *  raw-JSON details panel inside AnalyticsCard. */
function extractStats(platform: PlatformId, raw: Record<string, unknown> | null): Stat[] {
  if (!raw) return [];
  const out: Stat[] = [];
  const num = (v: unknown): string | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v.toLocaleString();
    if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) return Number(v).toLocaleString();
    return null;
  };
  const get = (path: string[]): unknown => {
    let cur: unknown = raw;
    for (const k of path) {
      if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[k];
      } else return undefined;
    }
    return cur;
  };
  const push = (label: string, paths: string[][]) => {
    for (const p of paths) {
      const v = num(get(p));
      if (v !== null) { out.push({ label, value: v }); return; }
    }
  };

  // Field paths verified against actual /analytics/social raw blobs
  // returned for the Seven Arrows account (camelCase throughout —
  // earlier snake_case attempts were Ayrshare's older shape and
  // never matched). When Ayrshare adds a field we want to surface,
  // append a path tuple to the relevant push() call; the helper
  // walks the list and uses the first path that resolves to a number.
  if (platform === 'facebook') {
    // Facebook page: fanCount and followersCount usually mirror but
    // surface both with sensible labels. About / phone / website
    // are present in the blob but aren't numbers, so they'd fall
    // through to the raw-response details panel naturally.
    push('Followers', [['analytics', 'followersCount'], ['analytics', 'fanCount'], ['fan_count']]);
    push('Page likes', [['analytics', 'fanCount']]);
    push('Posts', [['analytics', 'postCount'], ['analytics', 'mediaCount']]);
    push('Quarters tracked', [['quarters']]);
  } else if (platform === 'instagram') {
    push('Followers', [['analytics', 'followersCount'], ['followers']]);
    push('Following', [['analytics', 'followsCount'], ['follows']]);
    push('Posts', [['analytics', 'mediaCount'], ['mediaCountTotal']]);
    push('Likes', [['analytics', 'likeCount']]);
    push('Comments', [['analytics', 'commentsCount']]);
    push('Reach', [['analytics', 'reach']]);
  } else if (platform === 'linkedin') {
    push('Followers', [['analytics', 'followerCount'], ['followerCount']]);
    push('Impressions', [['analytics', 'impressionCount']]);
    push('Clicks', [['analytics', 'clickCount']]);
    push('Reactions', [['analytics', 'likeCount']]);
  } else if (platform === 'twitter') {
    push('Followers', [['analytics', 'followersCount'], ['analytics', 'followers_count'], ['public_metrics', 'followers_count']]);
    push('Following', [['analytics', 'followingCount'], ['analytics', 'following_count'], ['public_metrics', 'following_count']]);
    push('Tweets', [['analytics', 'tweetCount'], ['analytics', 'tweet_count'], ['public_metrics', 'tweet_count']]);
    push('Listed', [['analytics', 'listedCount'], ['analytics', 'listed_count']]);
  } else if (platform === 'tiktok') {
    // TikTok's /analytics/social returns engagement counters per
    // 60-day rolling window (commentCountPeriod, etc.) plus the
    // standard profile counters. Surface the headline profile
    // numbers here; the period counters land in the raw blob.
    push('Followers', [['analytics', 'followerCount'], ['analytics', 'followers_count']]);
    push('Following', [['analytics', 'followingCount']]);
    push('Videos', [['analytics', 'videoCount'], ['analytics', 'videoCountPeriod']]);
    push('Likes', [['analytics', 'likesCount'], ['analytics', 'totalLikesPeriod']]);
    push('Profile views', [['analytics', 'profileViews'], ['analytics', 'profileViewCountPeriod']]);
    push('Bio link clicks', [['analytics', 'bioLinkClicks']]);
    push('Comments (60d)', [['analytics', 'commentCountPeriod']]);
  } else if (platform === 'youtube') {
    push('Subscribers', [['analytics', 'subscriberCount'], ['subscriberCount']]);
    push('Views', [['analytics', 'viewCount'], ['viewCount']]);
    push('Videos', [['analytics', 'videoCount'], ['videoCount']]);
  } else if (platform === 'pinterest') {
    push('Followers', [['analytics', 'followerCount'], ['analytics', 'follower_count']]);
    push('Pins', [['analytics', 'pinCount'], ['analytics', 'pin_count']]);
    push('Boards', [['analytics', 'boardCount'], ['analytics', 'board_count']]);
    push('Monthly views', [['analytics', 'monthlyViews'], ['analytics', 'monthly_views']]);
  } else if (platform === 'gmb') {
    push('Views', [['analytics', 'queriesDirect'], ['analytics', 'totalImpressions']]);
    push('Searches', [['analytics', 'queriesIndirect']]);
    push('Calls', [['analytics', 'callClicks']]);
    push('Directions', [['analytics', 'directionsRequests']]);
  } else if (platform === 'reddit') {
    push('Karma', [['analytics', 'totalKarma'], ['totalKarma']]);
    push('Link karma', [['analytics', 'linkKarma']]);
    push('Comment karma', [['analytics', 'commentKarma']]);
  } else if (platform === 'threads' || platform === 'bluesky') {
    push('Followers', [['analytics', 'followersCount'], ['analytics', 'followers_count'], ['followers_count']]);
    push('Following', [['analytics', 'followsCount'], ['analytics', 'follows_count'], ['follows_count']]);
    push('Posts', [['analytics', 'mediaCount'], ['analytics', 'media_count'], ['posts_count']]);
  }
  return out;
}

// ── Composer ──────────────────────────────────────────────────────

function Composer({
  connected, onPosted,
}: {
  connected: string[];
  onPosted: () => void;
}) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<PickedMedia[]>([]);
  const [selected, setSelected] = useState<Set<Platform>>(() => new Set());
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [posting, setPosting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [draftBanner, setDraftBanner] = useState<ComposeDraft['source'] | null>(null);

  // Phase 9 of the 10-phase split: consume any draft stashed by the
  // Library / Templates / AI sub-tabs. We read the sessionStorage
  // stash on mount (covers refresh + tab-switch back), and also
  // listen for the live CustomEvent so a draft pushed while the
  // Composer is already mounted prefills the form immediately.
  useEffect(() => {
    const apply = (draft: ComposeDraft) => {
      if (draft.caption) setText((prev) => prev || draft.caption || '');
      if (draft.mediaUrls && draft.mediaUrls.length > 0) {
        const next: PickedMedia[] = draft.mediaUrls.map((url) => ({
          url,
          thumbUrl: url,
          label: url.split('/').pop() || 'Image',
          kind: 'image',
        }));
        setPicked((prev) => {
          // Merge — don't drop anything the user already added by hand.
          const seen = new Set(prev.map((m) => m.url));
          return [...prev, ...next.filter((m) => !seen.has(m.url))];
        });
      }
      setDraftBanner(draft.source ?? null);
    };
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ComposeDraft;
        apply(parsed);
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore — sessionStorage might be unavailable */ }
    const onDraft = (e: Event) => {
      const detail = (e as CustomEvent<ComposeDraft>).detail;
      if (detail) apply(detail);
    };
    window.addEventListener('social-media-compose-draft', onDraft);
    return () => window.removeEventListener('social-media-compose-draft', onDraft);
  }, []);
  // Top-right delivery toast — see PostStatusToast for the visual.
  // Holds the lifecycle of the most recent submit so the toast can
  // animate from "sending" through per-platform results.
  const [postStatus, setPostStatus] = useState<PostStatus | null>(null);

  // Default the platform picker to whichever accounts are connected
  // so a user can hit "Post now" without ticking boxes when they
  // have a single channel. We only seed once — explicit unticks should
  // stick.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (connected.length === 0) return;
    seededRef.current = true;
    setSelected(new Set(connected.filter((p): p is Platform => PLATFORMS.some((x) => x.id === p))));
  }, [connected]);

  const togglePlatform = (id: Platform) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!text.trim()) {
      setResultMsg({ kind: 'err', text: 'Write something to post.' });
      return;
    }
    if (selected.size === 0) {
      setResultMsg({ kind: 'err', text: 'Pick at least one platform.' });
      return;
    }
    if (scheduleEnabled && !scheduleDate) {
      setResultMsg({ kind: 'err', text: 'Pick a schedule date or turn scheduling off.' });
      return;
    }
    const targetPlatforms = Array.from(selected);
    setPosting(true);
    setResultMsg(null);
    // Open the top-right toast immediately so the admin sees the
    // request taking off — even slow Ayrshare round-trips give
    // visible "Pending" rows per platform while we wait.
    setPostStatus({
      phase: 'sending',
      platforms: targetPlatforms,
      scheduled: scheduleEnabled,
    });
    try {
      // Flatten the picker's selections into the simple
      // mediaUrls[] payload Ayrshare expects. Order is preserved
      // — first selected = first in the array, which controls the
      // primary thumbnail on multi-asset posts.
      const mediaUrls = picked.map((p) => p.url);
      const body: Record<string, unknown> = {
        post: text.trim(),
        platforms: targetPlatforms,
      };
      if (mediaUrls.length > 0) body.mediaUrls = mediaUrls;
      if (scheduleEnabled && scheduleDate) {
        // datetime-local input gives us "YYYY-MM-DDTHH:mm" in local
        // time. Convert to a real ISO string in UTC for the server.
        body.scheduleDate = new Date(scheduleDate).toISOString();
      }
      const res = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      // Build per-platform results from Ayrshare's response.
      // Successful posts come back under postIds[]; failures under
      // errors[]. We walk every selected platform and look it up in
      // both arrays so the toast renders one row per target.
      const results: PerPlatformResult[] = targetPlatforms.map((platform) => {
        const errEntry = Array.isArray(json.errors)
          ? (json.errors as Array<{ platform?: string; message?: string; action?: string }>).find(
              (e) => e.platform === platform || e.action === platform,
            )
          : undefined;
        const postEntry = Array.isArray(json.postIds)
          ? (json.postIds as Array<{ platform?: string; postUrl?: string; status?: string; id?: string }>).find(
              (p) => p.platform === platform,
            )
          : undefined;
        if (errEntry) {
          return {
            platform,
            ok: false,
            message: errEntry.message || 'Post failed',
          };
        }
        return {
          platform,
          ok: !!postEntry || res.ok,
          postUrl: postEntry?.postUrl,
        };
      });

      const allOk = results.every((r) => r.ok);
      const fatalError = !res.ok && results.every((r) => r.ok)
        ? json.error || json.message || `HTTP ${res.status}`
        : undefined;

      setPostStatus({
        phase: 'settled',
        platforms: targetPlatforms,
        results,
        scheduled: scheduleEnabled,
        fatalError,
      });

      if (!res.ok && fatalError) {
        setResultMsg({ kind: 'err', text: fatalError });
        return;
      }

      // Inline result line stays for accessibility / print fallback,
      // but the toast is the primary signal now.
      setResultMsg({
        kind: allOk ? 'ok' : 'err',
        text: allOk
          ? scheduleEnabled
            ? 'Scheduled. It will post automatically.'
            : 'Posted.'
          : `Posted to ${results.filter((r) => r.ok).length} of ${results.length}; see the notification for details.`,
      });
      // Only clear the composer on a clean success — leave it
      // populated when even one platform failed so the admin can
      // tweak and retry without re-typing.
      if (allOk) {
        setText('');
        setPicked([]);
        setScheduleDate('');
        setScheduleEnabled(false);
      }
      onPosted();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setResultMsg({ kind: 'err', text });
      setPostStatus({
        phase: 'settled',
        platforms: targetPlatforms,
        fatalError: text,
        scheduled: scheduleEnabled,
      });
    } finally {
      setPosting(false);
    }
  };

  const charCount = text.length;
  // Twitter/X cap is the tightest of the lot at 280; warn the user
  // when they cross it so they don't get a partial-success post.
  const overTwitter = charCount > 280 && selected.has('twitter');

  return (
    <section className="mb-6 rounded-2xl border border-black/10 bg-white p-5">
      {/* Top-right delivery toast — opens on submit, animates from
          'sending' through per-platform success/fail rows, auto-
          dismisses on full success after ~4.5s, sticks on error. */}
      <PostStatusToast
        status={postStatus}
        onClose={() => setPostStatus((s) => (s ? { ...s, phase: 'dismissed' } : null))}
      />

      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Compose</h2>

      {draftBanner && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
          <span className="font-semibold">
            Prefilled from{' '}
            {draftBanner === 'library' ? 'Library' : draftBanner === 'templates' ? 'Templates' : 'AI'}.
          </span>
          <button
            type="button"
            onClick={() => setDraftBanner(null)}
            className="text-emerald-800/70 hover:text-emerald-900"
            aria-label="Dismiss prefill notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* "Post to" picker sits at the top — picking the channels is
          the most consequential decision per post, and seeing the
          target set before writing copy keeps the admin from drafting
          a 3000-char LinkedIn essay only to discover they only have
          X connected. */}
      <div>
        {/* Header row — picker label on the left, summary count +
            select-all / clear shortcuts on the right. Makes the
            picker read as a deliberate decision the admin makes per
            post, not a passive status display. */}
        <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
            Post to
          </label>
          <div className="flex items-center gap-3 text-[11px] text-foreground/55">
            <span>
              <span className="font-semibold text-foreground/80">{selected.size}</span>
              {' '}of{' '}
              <span>{connected.length}</span>
              {' '}selected
            </span>
            <button
              type="button"
              onClick={() => {
                const all = connected.filter((c): c is Platform => PLATFORMS.some((x) => x.id === c));
                setSelected(new Set(all));
              }}
              disabled={connected.length === 0 || selected.size === connected.length}
              className="text-primary font-semibold hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="text-foreground/55 font-semibold hover:text-foreground hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Connected platforms — clickable pills with explicit
            checkbox-style affordance so the on/off intent is
            unambiguous. A green check fills when selected. */}
        {connected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.filter((p) => connected.includes(p.id)).map((p) => {
              const checked = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  aria-pressed={checked}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
                      : 'border-foreground/20 bg-white text-foreground/70 hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {/* Checkbox-style indicator. Filled circle with a
                      check when selected; hollow ring when not. Sits
                      to the LEFT of the brand glyph so the row reads
                      [check][logo][label]. */}
                  <span
                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full transition-colors ${
                      checked ? 'bg-primary text-white' : 'bg-white border border-foreground/25 text-transparent group-hover:border-primary/50'
                    }`}
                    aria-hidden="true"
                  >
                    <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <PlatformIcon platform={p.id as PlatformId} size={12} />
                  {p.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Offline platforms — rendered separately as a quiet
            "available once you connect" reference list so the admin
            can still see what they could be posting to without those
            options being mistakable for selectable picker items. */}
        {PLATFORMS.filter((p) => !connected.includes(p.id)).length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <p className="text-[10px] uppercase tracking-wider text-foreground/40 mb-1.5">Not connected</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.filter((p) => !connected.includes(p.id)).map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground/15 bg-warm-bg/40 px-2.5 py-1 text-[11px] font-medium text-foreground/40"
                  title={`${p.label} — connect in Ayrshare to post here`}
                >
                  <PlatformIcon platform={p.id as PlatformId} size={11} color="rgba(0,0,0,0.3)" />
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {connected.length === 0 && (
          <p className="mt-3 text-[11px] text-foreground/50">
            Connect at least one account above before posting.
          </p>
        )}
      </div>

      {/* Caption textarea — moved BELOW the Post to picker so the
          admin's drafting context (which channels are targeted)
          is established first. */}
      <div className="mt-5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55 block mb-1">
          Caption
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What do you want to post?"
          rows={4}
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-foreground/50">
          <span className={overTwitter ? 'text-amber-700 font-medium' : ''}>
            {charCount} characters{overTwitter ? ' · over X / Twitter limit (280)' : ''}
          </span>
        </div>
      </div>

      {/* Media picker — pulls from public.site_images +
          public.site_videos. Replaces the legacy "paste URLs one
          per line" textarea so the admin attaches assets that
          already live in the 7A media library instead of guessing
          public URLs. */}
      <div className="mt-4">
        <MediaPicker value={picked} onChange={setPicked} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-foreground/70 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="rounded border-foreground/30"
          />
          Schedule for later
        </label>
        {scheduleEnabled && (
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs">
          {resultMsg && (
            <span className={resultMsg.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}>
              {resultMsg.text}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={posting || !text.trim() || selected.size === 0 || (scheduleEnabled && !scheduleDate)}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {posting ? 'Sending…' : scheduleEnabled ? 'Schedule post' : 'Post now'}
        </button>
      </div>
    </section>
  );
}

// ── History ───────────────────────────────────────────────────────

function HistoryList({
  posts, loading, error, onChanged,
}: {
  posts: HistoryPost[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
}) {
  const modal = useModal();
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    // Newest first. Ayrshare returns mostly chronological but mixed
    // formats (created vs scheduleDate) — pick whichever the row
    // exposes.
    return [...posts].sort((a, b) => {
      const ta = Date.parse((a.scheduleDate || a.created || '') as string) || 0;
      const tb = Date.parse((b.scheduleDate || b.created || '') as string) || 0;
      return tb - ta;
    });
  }, [posts]);

  const remove = async (id: string) => {
    const ok = await modal.confirm('Delete this post?', {
      message: 'It will be removed from the post history. This can’t be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/social-media/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        await modal.alert('Couldn’t delete the post', { message: json.error || json.message || `HTTP ${res.status}` });
        return;
      }
      onChanged();
    } catch (err) {
      await modal.alert('Couldn’t delete the post', { message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent posts</h2>
        {loading && <span className="text-xs text-foreground/40">Loading…</span>}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}
      {!loading && !error && sorted.length === 0 && (
        <p className="text-sm text-foreground/50">No posts yet.</p>
      )}
      <ul className="divide-y divide-black/5">
        {sorted.map((p, i) => {
          const id = (typeof p.id === 'string' ? p.id : null) ?? `idx-${i}`;
          const when = p.scheduleDate || p.created || '';
          const isScheduled = !!p.scheduleDate && Date.parse(p.scheduleDate as string) > Date.now();
          return (
            <li key={id} className="py-3 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                    isScheduled
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : p.status === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : p.status === 'error'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {isScheduled ? 'scheduled' : (p.status ?? '—')}
                  </span>
                  {when && (
                    <span className="text-[11px] text-foreground/50">
                      {new Date(when).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  )}
                  {Array.isArray(p.platforms) && p.platforms.length > 0 && (
                    <span className="text-[11px] text-foreground/50 truncate">
                      · {p.platforms.join(', ')}
                    </span>
                  )}
                </div>
                {p.post && (
                  <p className="text-sm text-foreground/85 whitespace-pre-wrap line-clamp-3">
                    {p.post}
                  </p>
                )}
                {Array.isArray(p.errors) && p.errors.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {p.errors.map((e, ix) => (
                      <li key={ix} className="text-[11px] text-red-700">
                        {(e.platform ?? '?')}: {e.message ?? '?'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {typeof p.id === 'string' && (
                <button
                  type="button"
                  onClick={() => remove(p.id as string)}
                  disabled={busyId === p.id}
                  className="text-[11px] text-foreground/45 hover:text-red-700 underline decoration-dotted disabled:opacity-40"
                >
                  {busyId === p.id ? '…' : 'delete'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Global posting kill switch · super-admin-only flip. Reads
// /api/social-media/posting-toggle on mount, lets the admin
// pause/resume actual posting from the page header. When off,
// the server-side POST route returns 423 and refuses to send.
function PostingToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/social-media/posting-toggle', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setEnabled(!!j.enabled); });
    return () => { cancelled = true; };
  }, []);
  async function flip() {
    if (enabled === null || saving) return;
    setSaving(true);
    const next = !enabled;
    setEnabled(next);
    try {
      const r = await fetch('/api/social-media/posting-toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) setEnabled(!next);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }
  const on = enabled === true;
  return (
    <div className={`inline-flex items-center gap-3 px-3 py-2 rounded-xl border ${on ? 'border-emerald-300 bg-emerald-50/70' : 'border-amber-300 bg-amber-50/70'}`}>
      <div className="text-right">
        <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${on ? 'text-emerald-800' : 'text-amber-900'}`}>Posting</p>
        <p className={`text-[11.5px] font-semibold ${on ? 'text-emerald-900' : 'text-amber-900'}`}>
          {enabled === null ? 'Loading…' : on ? 'Live · posts will send' : 'Paused · no posts will send'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? 'Turn posting off' : 'Turn posting on'}
        onClick={() => void flip()}
        disabled={enabled === null || saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
          on ? 'bg-emerald-500' : 'bg-foreground/25'
        }`}
      >
        <span
          className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
