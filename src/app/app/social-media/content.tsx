'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { PlatformIcon, type PlatformId } from './PlatformIcon';
import { MediaPicker, type PickedMedia } from './MediaPicker';
import { PostStatusToast, type PostStatus, type PerPlatformResult } from './PostStatusToast';
import { PLATFORM_SPECS, type MediaSpec, type VideoSpec } from './platform-specs';

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
interface CreativeStaging { mediaUrls: string[] }
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

// Saved drafts — phase B/C of the wizard. Persisted in localStorage
// so they survive refresh and tab close. List rendered under
// Creative > Drafts; each has Edit / Send to Compose / Delete.
interface SavedDraft {
  id: string;
  createdAt: string;
  caption: string;
  mediaUrls: string[];
  // "Mark ready to go" flag. False on save (the default — drafts
  // start as work-in-progress); true once the admin signs off that
  // the draft is publishable as-is. The Post tab's publish flow only
  // shows ready drafts, keeping in-progress text out of the picker.
  ready?: boolean;
}
const DRAFTS_KEY = 'social_media_saved_drafts_v1';
function readSavedDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDraft[]) : [];
  } catch { return []; }
}
function writeSavedDrafts(drafts: SavedDraft[]) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('social-media-drafts-changed'));
  } catch { /* no-op */ }
}

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
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Social Media
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Compose once, post to every connected channel.
        </p>
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
  { id: 'overview', label: 'Overview', description: 'Connected accounts + analytics snapshot.' },
  { id: 'creative', label: 'Creative', description: 'Library, templates, and AI-assisted drafts.' },
  { id: 'post', label: 'Post', description: 'Compose and schedule across every channel.' },
];

function readTab(raw: string | null): Tab {
  if (raw === 'post' || raw === 'creative') return raw;
  return 'overview';
}

// Phase 10: localStorage key that remembers the last top-level tab
// the user landed on. When they hit /app/social-media without a
// ?tab=, we replace the URL with their last choice so refresh +
// fresh-link behaviour both feel consistent.
const LAST_TAB_KEY = 'social_media_last_tab_v1';

function SubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabRaw = searchParams.get('tab');
  const active = readTab(tabRaw);

  // Restore the last-used tab on first paint when no ?tab= is set.
  // We replace (not push) so the back button still leaves the page.
  useEffect(() => {
    if (tabRaw !== null) {
      try { localStorage.setItem(LAST_TAB_KEY, active); } catch { /* no-op */ }
      return;
    }
    try {
      const saved = localStorage.getItem(LAST_TAB_KEY);
      if (saved && saved !== 'overview' && (saved === 'post' || saved === 'creative')) {
        const next = new URLSearchParams(searchParams.toString());
        next.set('tab', saved);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }
    } catch { /* no-op */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabRaw]);

  const select = (id: Tab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    // Clear sub on top-level tab change so a stale ?sub=ai from
    // Creative doesn't render an empty state under Post.
    next.delete('sub');
    const qs = next.toString();
    try { localStorage.setItem(LAST_TAB_KEY, id); } catch { /* no-op */ }
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  // Arrow-key keyboard nav across the tab strip — left/right cycles,
  // home/end jump to the ends. Matches the WAI-ARIA Authoring
  // Practices recommendation for role=tablist.
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
    select(TABS[nextIdx].id);
    tabRefs.current[nextIdx]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Social media sections"
      onKeyDown={onKeyDown}
      className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-black/10 bg-white p-1.5"
    >
      {TABS.map((t, i) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(t.id)}
            title={t.description}
            className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              selected
                ? 'bg-foreground text-white shadow-sm'
                : 'text-foreground/65 hover:bg-warm-bg/40'
            }`}
          >
            {t.label}
          </button>
        );
      })}
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
        <PostSubNav />
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
        <CreativeSubNav />
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

  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Connected platforms',
      value: connected.length.toLocaleString(),
      sub: connected.length === 0 ? 'Connect one in the strip below' : 'Sending posts on these channels',
    },
    {
      label: 'Total followers',
      value: totalFollowers.toLocaleString(),
      sub: 'Sum across connected platforms',
    },
    {
      label: 'Snapshot freshness',
      value: freshest
        ? new Date(freshest).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '—',
      sub: 'Auto-refreshes daily at 6am',
    },
  ];

  return (
    <section aria-label="Overview summary" className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">{t.label}</p>
          <p className="text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5">{t.value}</p>
          {t.sub && <p className="text-[11px] text-foreground/45 mt-0.5">{t.sub}</p>}
        </div>
      ))}
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
  { id: 'drafts', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'history', label: 'History' },
];

function readPostSub(raw: string | null): PostSub {
  if (raw === 'scheduled' || raw === 'history') return raw;
  return 'drafts';
}

function PostSubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readPostSub(searchParams.get('sub'));
  const select = (id: PostSub) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'post');
    if (id === 'drafts') next.delete('sub');
    else next.set('sub', id);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };
  return (
    <div role="tablist" aria-label="Post sections" className="mb-5 flex flex-wrap gap-1 rounded-xl bg-white border border-black/10 p-1">
      {POST_SUBS.map((s) => {
        const selected = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(s.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selected ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function PostTabBody({
  accounts, history, historyLoading, historyErr, refreshHistory,
}: {
  accounts: AccountsResponse | null;
  history: HistoryPost[];
  historyLoading: boolean;
  historyErr: string | null;
  refreshHistory: () => void;
}) {
  const searchParams = useSearchParams();
  const sub = readPostSub(searchParams.get('sub'));

  if (sub === 'scheduled') {
    return <ScheduledPanel posts={history} loading={historyLoading} error={historyErr} onChanged={refreshHistory} />;
  }
  if (sub === 'history') {
    return (
      <HistoryList
        posts={history}
        loading={historyLoading}
        error={historyErr}
        onChanged={refreshHistory}
      />
    );
  }
  // Default sub = drafts. Compose lives inside DraftsPanel and only
  // mounts when the user clicks Publish on a specific draft.
  return (
    <DraftsPanel
      accounts={accounts}
      onPosted={refreshHistory}
    />
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
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);

  useEffect(() => {
    setDrafts(readSavedDrafts());
    const onChange = () => setDrafts(readSavedDrafts());
    window.addEventListener('social-media-drafts-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('social-media-drafts-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const removeDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    writeSavedDrafts(next);
  };

  // Toggle the per-draft "ready to go" flag. Stays in localStorage
  // alongside the rest of the draft so the marker survives refresh.
  // Drafts list is sorted ready-first below so the admin can see at
  // a glance which posts the publish flow will offer.
  const toggleReady = (id: string) => {
    const next = drafts.map((d) => (d.id === id ? { ...d, ready: !d.ready } : d));
    setDrafts(next);
    writeSavedDrafts(next);
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
                        <span aria-hidden>●</span> Ready to go
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

function DeliverablesPanel({ selected }: { selected: Set<PlatformId> }) {
  const items = useMemo(() => deriveDeliverables(selected), [selected]);
  if (selected.size === 0) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55">
          Deliverables · {items.length} {items.length === 1 ? 'crop' : 'crops'}
        </p>
        <p className="text-[10.5px] text-foreground/45">Every unique crop the selected networks accept.</p>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((d) => <DeliverableCard key={d.ratio} d={d} />)}
      </ul>
    </div>
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
  // Step 1: networks. Seeded once with every connected platform so
  // the common single-account case is one click. Explicit ticks
  // afterwards override.
  const seededRef = useRef(false);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<Platform>>(() => new Set());
  useEffect(() => {
    if (seededRef.current) return;
    if (connected.length === 0) return;
    seededRef.current = true;
    setSelectedNetworks(new Set(connected.filter((p): p is Platform => PLATFORMS.some((x) => x.id === p))));
  }, [connected]);

  // Step 2: which ready draft. Defaults to the first one so the
  // admin doesn't have to scroll-select on a single-draft day.
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedDraftId && readyDrafts.some((d) => d.id === selectedDraftId)) return;
    setSelectedDraftId(readyDrafts[0]?.id ?? null);
  }, [readyDrafts, selectedDraftId]);

  // Step 3: scheduling. `mode` toggles the datetime input on; the
  // local string is converted to UTC at submit time.
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
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
  const canSubmit =
    selectedDraft !== null
    && selectedNetworks.size > 0
    && (mode === 'now' || (mode === 'schedule' && scheduleAt.trim().length > 0));

  const submit = async () => {
    if (!selectedDraft) { setError('Pick a ready draft to publish.'); return; }
    if (selectedNetworks.size === 0) { setError('Pick at least one network.'); return; }
    if (mode === 'schedule' && !scheduleAt) { setError('Pick a schedule date or switch to Post now.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        post: selectedDraft.caption,
        platforms: Array.from(selectedNetworks),
      };
      if (selectedDraft.mediaUrls.length > 0) body.mediaUrls = selectedDraft.mediaUrls;
      if (mode === 'schedule') body.scheduleDate = new Date(scheduleAt).toISOString();
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
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 mb-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Publish</h2>
        <p className="text-[11px] text-foreground/55 mt-0.5">
          Pick the networks, choose a ready-to-go draft, then post now or schedule.
        </p>
      </div>

      {/* Step 1 — networks */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">Step 1 · Networks</p>
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

      {/* Deliverables — every unique aspect ratio the selected
          networks accept. Surfaced here (between Networks and Draft)
          so a marketer picking 5 channels can see at a glance the
          full matrix of crops they need to produce, not just whatever
          one ratio the chosen draft happens to ship with. */}
      <DeliverablesPanel selected={selectedNetworks} />

      {/* Step 2 — ready drafts */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">Step 2 · Ready-to-go draft</p>
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

      {/* Step 3 — post now or schedule */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2">Step 3 · When</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMode('now')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${mode === 'now' ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/75 border-black/10 hover:bg-warm-bg/60'}`}
          >
            Post now
          </button>
          <button
            type="button"
            onClick={() => setMode('schedule')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${mode === 'schedule' ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/75 border-black/10 hover:bg-warm-bg/60'}`}
          >
            Schedule
          </button>
          {mode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="ml-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </div>
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
          {submitting ? 'Sending…' : mode === 'schedule' ? `Schedule to ${selectedNetworks.size} ${selectedNetworks.size === 1 ? 'network' : 'networks'}` : `Post now to ${selectedNetworks.size} ${selectedNetworks.size === 1 ? 'network' : 'networks'}`}
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
  const status = (p.status || '').toLowerCase();
  if (status && status !== 'scheduled' && status !== 'pending') return false;
  const t = Date.parse(p.scheduleDate);
  return Number.isFinite(t) && t > Date.now();
}

function ScheduledPanel({
  posts, loading, error, onChanged,
}: {
  posts: HistoryPost[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const queue = useMemo(() => {
    return posts
      .filter(isScheduledPending)
      .sort((a, b) => Date.parse(a.scheduleDate || '') - Date.parse(b.scheduleDate || ''));
  }, [posts]);

  const cancel = async (id: string) => {
    if (!confirm('Cancel this scheduled post?')) return;
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
        alert(json.error || json.message || `HTTP ${res.status}`);
        return;
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Scheduled posts</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Queued but not yet sent. Cancel any row to pull it back.
          </p>
        </div>
        {loading && <span className="text-xs text-foreground/40">Loading…</span>}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3">
          {error}
        </p>
      )}
      {queue.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-black/10 bg-warm-bg/30 px-5 py-10 text-center">
          <p className="text-sm text-foreground/55 max-w-md mx-auto">
            Nothing scheduled. Use Compose &rarr; <em>Schedule for later</em> to queue a post.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/5">
          {queue.map((p) => {
            const id = (p.id ?? '') as string;
            const when = p.scheduleDate
              ? new Date(p.scheduleDate).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })
              : '—';
            const platforms = (p.platforms ?? []).join(', ');
            const caption = (p.post ?? '').slice(0, 140);
            return (
              <li key={id || `${p.scheduleDate}-${p.post?.slice(0, 12)}`} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      {when}
                    </span>
                    {platforms && (
                      <span className="text-[11px] text-foreground/55">{platforms}</span>
                    )}
                  </div>
                  {caption && (
                    <p className="text-[13px] text-foreground/80 line-clamp-2 leading-snug">
                      {caption}
                      {(p.post ?? '').length > 140 ? '…' : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => id && cancel(id)}
                  disabled={!id || busyId === id}
                  className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-foreground/65 hover:text-red-700 hover:border-red-300 disabled:opacity-40"
                >
                  {busyId === id ? 'Canceling…' : 'Cancel'}
                </button>
              </li>
            );
          })}
        </ul>
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
  { id: 'library', label: 'Library', description: 'Browse uploaded photos and videos.' },
  { id: 'templates', label: 'Templates', description: 'Reusable post drafts with placeholders.' },
  { id: 'ai', label: 'AI', description: 'Draft captions with Claude.' },
];

function readCreativeSub(raw: string | null): CreativeSub {
  if (raw === 'templates' || raw === 'ai') return raw;
  return 'library';
}

function CreativeSubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readCreativeSub(searchParams.get('sub'));
  const select = (id: CreativeSub) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'creative');
    if (id === 'library') next.delete('sub');
    else next.set('sub', id);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };
  return (
    <div role="tablist" aria-label="Creative sections" className="mb-5 flex flex-wrap gap-1 rounded-xl bg-white border border-black/10 p-1">
      {CREATIVE_SUBS.map((s) => {
        const selected = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(s.id)}
            title={s.description}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selected ? 'bg-foreground text-white' : 'text-foreground/60 hover:bg-warm-bg/40'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function CreativeTabBody() {
  const searchParams = useSearchParams();
  const sub = readCreativeSub(searchParams.get('sub'));
  if (sub === 'templates') return <CreativeTemplatesPanel />;
  if (sub === 'ai') return <CreativeAiPanel />;
  return <CreativeLibraryPanel />;
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
  kind: 'image' | 'video';
}

type LibraryFilter = 'all' | 'photos' | 'videos';

function CreativeLibraryPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Pull photos + videos in parallel; merge into a single
        // chronological list so the filter is a pure client-side
        // toggle once data lands.
        const [imagesRes, videosRes] = await Promise.all([
          supabase
            .from('site_images')
            .select('id, public_url, filename, alt, created_at')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('site_videos')
            .select('id, video_url, thumbnail_url, filename, alt, created_at')
            .order('created_at', { ascending: false })
            .limit(80),
        ]);
        if (cancelled) return;
        if (imagesRes.error) throw imagesRes.error;
        const imageRows = (imagesRes.data ?? []) as Array<{
          id: string; public_url: string; filename: string | null;
          alt: string | null; created_at: string;
        }>;
        const videoRows = (videosRes.error ? [] : (videosRes.data ?? [])) as Array<{
          id: string; video_url: string | null; thumbnail_url: string | null;
          filename: string | null; alt: string | null; created_at: string;
        }>;
        const merged: LibraryAsset[] = [
          ...imageRows.map<LibraryAsset>((r) => ({
            id: `img:${r.id}`,
            url: r.public_url,
            thumbUrl: r.public_url,
            filename: r.filename,
            alt: r.alt,
            created_at: r.created_at,
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
              kind: 'video',
            })),
        ].sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const continueToAi = () => {
    const urls = assets
      .filter((row) => selected.has(row.id))
      .map((row) => row.url)
      .filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;
    pushCreativeStaging({ mediaUrls: urls });
    const next = new URLSearchParams();
    next.set('tab', 'creative');
    next.set('sub', 'ai');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const counts = useMemo(() => {
    let photos = 0, videos = 0;
    for (const a of assets) {
      if (a.kind === 'image') photos++;
      else videos++;
    }
    return { photos, videos, all: photos + videos };
  }, [assets]);

  return (
    <>
    <section className="rounded-2xl border border-black/10 bg-white p-5 pb-24">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Library</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Pick the media you want a post built around. Continue takes you to AI for caption generation.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filtered.map((row) => {
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.thumbUrl}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {row.kind === 'video' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-black/20"
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

  const saveTemplateDraft = (t: PostTemplate) => {
    const draft: SavedDraft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      caption: t.body,
      mediaUrls: [],
    };
    const existing = readSavedDrafts();
    writeSavedDrafts([draft, ...existing]);
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

  const saveDraft = (caption: string) => {
    const draft: SavedDraft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      caption,
      mediaUrls: stagedMedia,
    };
    const existing = readSavedDrafts();
    writeSavedDrafts([draft, ...existing]);
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

function ConnectedAccountsStrip({
  accounts, loading, error, onChanged,
}: {
  accounts: AccountsResponse | null;
  loading: boolean;
  error: string | null;
  onChanged: () => void;
}) {
  const active = new Set(accounts?.activeSocialAccounts ?? []);

  // Refresh the connected-accounts list when the user returns to
  // this tab — covers the "linked an account on Ayrshare's
  // dashboard and came back" flow. (Account linking happens in
  // Ayrshare's own UI; the strip here is a status indicator
  // only — it stays in sync without a click handler.)
  useEffect(() => {
    const onFocus = () => onChanged();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [onChanged]);

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
          // Pill is presentational only — no click handler. Connecting
          // accounts happens in the Ayrshare dashboard, so the strip
          // is a status indicator rather than an action surface.
          return (
            <span
              key={p.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-dashed border-foreground/25 bg-white text-foreground/60'
              }`}
              title={isActive
                ? `Connected${display ? ` as ${display}` : ''}`
                : `${p.label} — not connected`}
            >
              <PlatformIcon
                platform={p.id as PlatformId}
                size={14}
                // Mute the brand color when not yet connected so the
                // dashed-border pill reads as "available" rather than
                // a live channel.
                color={isActive ? undefined : 'rgba(0,0,0,0.3)'}
              />
              <span>{p.label}</span>
              {/* Green dot for connected pills — sits to the right of
                  the label so the brand glyph stays the primary visual
                  anchor and the dot reads as a discrete "live" cue. */}
              {isActive && (
                <span
                  aria-label="Connected"
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]"
                />
              )}
              {isActive && display && (
                <span className="text-[10px] text-emerald-700/70 font-normal">@{display.replace(/^@/, '')}</span>
              )}
            </span>
          );
        })}
      </div>
    </section>
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
    if (!confirm('Delete this post?')) return;
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
        alert(json.error || json.message || `HTTP ${res.status}`);
        return;
      }
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
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
