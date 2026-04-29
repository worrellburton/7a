'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { PlatformIcon, type PlatformId } from './PlatformIcon';
import { MediaPicker, type PickedMedia } from './MediaPicker';

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
  const { user } = useAuth();
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Social Media
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Compose once, post to every connected channel.
        </p>
      </header>

      <ConnectedAccountsStrip
        accounts={accounts}
        loading={accountsLoading}
        error={accountsErr}
        onChanged={refreshAccounts}
      />

      <AnalyticsPanel connected={accounts?.activeSocialAccounts ?? []} />

      <Composer
        connected={accounts?.activeSocialAccounts ?? []}
        onPosted={() => { refreshHistory(); }}
      />

      <HistoryList
        posts={history}
        loading={historyLoading}
        error={historyErr}
        onChanged={refreshHistory}
      />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {connected.map((p) => (
            <AnalyticsCard
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

function AnalyticsCard({
  platform, raw, capturedAt,
}: {
  platform: PlatformId;
  raw: Record<string, unknown> | null;
  /** Snapshot captured_at — surfaces in the card footer so each
   *  platform tile reads as data from a specific moment. */
  capturedAt?: string | null;
}) {
  void capturedAt; // used in the footer below — see render block
  const stats = useMemo(() => extractStats(platform, raw), [platform, raw]);
  return (
    <div className="rounded-xl border border-black/10 bg-warm-bg/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <PlatformIcon platform={platform} size={16} />
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/65">
          {platform.toUpperCase().replace('GMB', 'Google Biz')}
        </p>
      </div>
      {!raw ? (
        <p className="text-[11px] italic text-foreground/40">No data returned.</p>
      ) : stats.length === 0 ? (
        <details className="text-[11px] text-foreground/55">
          <summary className="cursor-pointer hover:text-foreground">Raw response</summary>
          <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-foreground/55 bg-white rounded border border-black/5 p-2">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] uppercase tracking-wider text-foreground/45">{s.label}</dt>
              <dd className="text-base font-bold text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
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

  if (platform === 'facebook') {
    push('Followers', [['analytics', 'followers_count'], ['fan_count'], ['followers_count']]);
    push('Page likes', [['analytics', 'page_fans'], ['analytics', 'fan_count']]);
    push('Engagements', [['analytics', 'page_post_engagements']]);
    push('Impressions', [['analytics', 'page_impressions']]);
  } else if (platform === 'instagram') {
    push('Followers', [['followers'], ['analytics', 'followers_count']]);
    push('Following', [['follows'], ['analytics', 'follows_count']]);
    push('Posts', [['mediaCountTotal'], ['analytics', 'media_count']]);
    push('Reach', [['analytics', 'reach']]);
  } else if (platform === 'linkedin') {
    push('Followers', [['analytics', 'followerCount'], ['followerCount']]);
    push('Impressions', [['analytics', 'impressionCount']]);
    push('Clicks', [['analytics', 'clickCount']]);
    push('Reactions', [['analytics', 'likeCount']]);
  } else if (platform === 'twitter') {
    push('Followers', [['analytics', 'followers_count'], ['public_metrics', 'followers_count']]);
    push('Following', [['analytics', 'following_count'], ['public_metrics', 'following_count']]);
    push('Tweets', [['analytics', 'tweet_count'], ['public_metrics', 'tweet_count']]);
    push('Listed', [['analytics', 'listed_count']]);
  } else if (platform === 'tiktok') {
    push('Followers', [['analytics', 'follower_count']]);
    push('Following', [['analytics', 'following_count']]);
    push('Videos', [['analytics', 'video_count']]);
    push('Likes', [['analytics', 'likes_count']]);
  } else if (platform === 'youtube') {
    push('Subscribers', [['analytics', 'subscriberCount'], ['subscriberCount']]);
    push('Views', [['analytics', 'viewCount'], ['viewCount']]);
    push('Videos', [['analytics', 'videoCount'], ['videoCount']]);
  } else if (platform === 'pinterest') {
    push('Followers', [['analytics', 'follower_count']]);
    push('Pins', [['analytics', 'pin_count']]);
    push('Boards', [['analytics', 'board_count']]);
    push('Monthly views', [['analytics', 'monthly_views']]);
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
    push('Followers', [['analytics', 'followers_count'], ['followers_count']]);
    push('Following', [['analytics', 'follows_count'], ['follows_count']]);
    push('Posts', [['analytics', 'media_count'], ['posts_count']]);
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
    setPosting(true);
    setResultMsg(null);
    try {
      // Flatten the picker's selections into the simple
      // mediaUrls[] payload Ayrshare expects. Order is preserved
      // — first selected = first in the array, which controls the
      // primary thumbnail on multi-asset posts.
      const mediaUrls = picked.map((p) => p.url);
      const body: Record<string, unknown> = {
        post: text.trim(),
        platforms: Array.from(selected),
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
      if (!res.ok) {
        // Ayrshare often surfaces per-platform errors even on a 4xx.
        const detail = Array.isArray(json.errors) && json.errors.length > 0
          ? json.errors.map((e: { platform?: string; message?: string }) => `${e.platform ?? '?'}: ${e.message ?? '?'}`).join(' · ')
          : (json.error || json.message || `HTTP ${res.status}`);
        setResultMsg({ kind: 'err', text: detail });
        return;
      }
      setResultMsg({
        kind: 'ok',
        text: scheduleEnabled
          ? 'Scheduled. It will post automatically.'
          : 'Posted.',
      });
      setText('');
      setPicked([]);
      setScheduleDate('');
      setScheduleEnabled(false);
      onPosted();
    } catch (err) {
      setResultMsg({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
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
