'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { PlatformIcon, type PlatformId } from './PlatformIcon';
import { MediaPicker, type PickedMedia } from './MediaPicker';
import { PostStatusToast, type PostStatus, type PerPlatformResult } from './PostStatusToast';

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
  { id: 'post', label: 'Post', description: 'Compose and schedule across every channel.' },
  { id: 'creative', label: 'Creative', description: 'Library, templates, and AI-assisted drafts.' },
];

function readTab(raw: string | null): Tab {
  if (raw === 'post' || raw === 'creative') return raw;
  return 'overview';
}

function SubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readTab(searchParams.get('tab'));
  const select = (id: Tab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };
  return (
    <div role="tablist" aria-label="Social media sections" className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-black/10 bg-white p-1.5">
      {TABS.map((t) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`tabpanel-${t.id}`}
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
        <CreativeTabPlaceholder />
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

type PostSub = 'compose' | 'scheduled' | 'history';

const POST_SUBS: { id: PostSub; label: string }[] = [
  { id: 'compose', label: 'Compose' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'history', label: 'History' },
];

function readPostSub(raw: string | null): PostSub {
  if (raw === 'scheduled' || raw === 'history') return raw;
  return 'compose';
}

function PostSubNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readPostSub(searchParams.get('sub'));
  const select = (id: PostSub) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'post');
    if (id === 'compose') next.delete('sub');
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
  return (
    <Composer
      connected={accounts?.activeSocialAccounts ?? []}
      onPosted={refreshHistory}
    />
  );
}

function ScheduledPanel({
  posts, loading, error,
}: {
  posts: HistoryPost[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
}) {
  void posts; void loading; void error;
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-foreground/40 mb-2">Scheduled</p>
      <p className="text-sm text-foreground/55 max-w-md mx-auto">
        Phase 4 wires the queued-but-unsent posts into this panel with a
        cancel-or-edit affordance per row.
      </p>
    </div>
  );
}

function CreativeTabPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-foreground/40 mb-2">Creative</p>
      <p className="text-base font-semibold text-foreground/85 mb-1">Library, templates, and AI drafts land here.</p>
      <p className="text-sm text-foreground/55 max-w-md mx-auto">
        Browse uploaded media, pick from saved templates, or draft a caption
        with Claude — then send it straight to the Post tab.
      </p>
    </div>
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
  platforms: string[];
}

function AnalyticsPanel({ connected }: { connected: string[] }) {
  const [latest, setLatest] = useState<Record<string, SnapshotEntry>>({});
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
              capturedAt={latest[p]?.captured_at ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyticsRow({
  platform, raw, capturedAt,
}: {
  platform: PlatformId;
  raw: Record<string, unknown> | null;
  /** Snapshot captured_at — surfaces in the platform column underneath
   *  the icon + name so each row reads as data from a specific moment. */
  capturedAt?: string | null;
}) {
  const stats = useMemo(() => extractStats(platform, raw), [platform, raw]);
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
            {stats.map((s) => (
              <li key={s.label} className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-foreground/45 leading-tight">
                  {s.label}
                </p>
                <p className="text-base font-bold text-foreground tabular-nums leading-tight">
                  {s.value}
                </p>
              </li>
            ))}
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
