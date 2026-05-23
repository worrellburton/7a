'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

// Dedicated "Daily logs" surface, rewritten 2026-05-23 to fit a
// 360-390px phone viewport without any element forcing horizontal
// overflow. Mobile-first layout: every section is a single column
// at the device width, the all-time weekly line chart sits at the
// top of the page (invariant — does NOT respond to the window
// pills), and the range pills below it filter only the
// scoreboard / feed / breakdown / records cards.

type RangeKey = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all_time';

const RANGES: Array<{ key: RangeKey; label: string; short: string }> = [
  { key: 'today',      label: 'Today',      short: 'Today' },
  { key: 'this_week',  label: 'This week',  short: 'Wk' },
  { key: 'last_week',  label: 'Last week',  short: 'Last wk' },
  { key: 'this_month', label: 'This month', short: 'Mo' },
  { key: 'last_month', label: 'Last month', short: 'Last mo' },
  { key: 'all_time',   label: 'All time',   short: 'All' },
];

interface LogRow {
  id: string;
  contactedAt: string;
  method: string | null;
  durationSeconds: number | null;
  userId: string | null;
  userName: string;
  userAvatarUrl: string | null;
  contactId: string;
  contactName: string;
  contactCompany: string | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  logs: number;
  durationSeconds: number;
}

interface RecordsBlock {
  dayBest: { count: number; date: string } | null;
  weekBest: { count: number; weekStart: string } | null;
  dayBestByUser: { count: number; date: string; userId: string; name: string; avatarUrl: string | null } | null;
}

interface WeeklyPoint {
  weekStart: string;
  count: number;
}

interface DailyLogsPayload {
  range: RangeKey;
  rangeLabel: string;
  logs: LogRow[];
  leaderboard: LeaderboardEntry[];
  total: number;
  record: { count: number; date: string } | null;
  records: RecordsBlock;
  weeklySeries: WeeklyPoint[];
}

function fmtTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Phoenix',
  });
}

function fmtDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Phoenix',
  });
}

function fmtRecordDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtWeekRange(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  if (!y || !m || !d) return weekStart;
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sameMonth = start.getMonth() === end.getMonth();
  const endLabel = sameMonth
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function fmtWeekTick(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  if (!y || !m || !d) return weekStart;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function initialsOf(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function methodTone(method: string | null): { bg: string; text: string; ring: string; bar: string } {
  switch (method) {
    case 'Phone':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/70', bar: 'bg-emerald-400' };
    case 'In Person':
      return { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200/70', bar: 'bg-sky-400' };
    case 'Email':
    case 'Email Campaign':
      return { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200/70', bar: 'bg-violet-400' };
    case 'Text Message':
      return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200/70', bar: 'bg-amber-400' };
    case 'Left Message':
      return { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200/70', bar: 'bg-rose-400' };
    case 'New Contact':
      return { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/30', bar: 'bg-primary' };
    case 'Data Entry':
      return { bg: 'bg-foreground/5', text: 'text-foreground/70', ring: 'ring-foreground/15', bar: 'bg-foreground/40' };
    default:
      return { bg: 'bg-warm-bg/70', text: 'text-foreground/70', ring: 'ring-foreground/15', bar: 'bg-foreground/30' };
  }
}

function parseRange(raw: string | null | undefined): RangeKey {
  switch (raw) {
    case 'this_week':
    case 'last_week':
    case 'this_month':
    case 'last_month':
    case 'all_time':
    case 'today':
      return raw;
    default:
      return 'today';
  }
}

export default function DailyLogsContent() {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DailyLogsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo<RangeKey>(
    () => parseRange(searchParams?.get('range') ?? null),
    [searchParams],
  );
  const setRange = useCallback(
    (next: RangeKey) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next === 'today') params.delete('range');
      else params.set('range', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );
  const [counter, setCounter] = useState(0);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const r = await fetch(`/api/contacts/logs-today?range=${range}`, { credentials: 'include' });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as DailyLogsPayload;
      setData(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [session?.access_token, range]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    function onFocus() { refresh(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Animated number ticker for the headline counter.
  useEffect(() => {
    if (!data) return;
    setCounter(0);
    if (data.total === 0) return;
    const start = performance.now();
    const duration = 900;
    let rafId = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCounter(Math.round(eased * data.total));
      if (t < 1) rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [data]);

  const records = data?.records;
  const isToday = range === 'today';
  const isLiveWindow = range === 'today' || range === 'this_week' || range === 'this_month';
  const countLabel = isLiveWindow ? 'Logs so far' : 'Total logs';

  const logs = useMemo(() => data?.logs ?? [], [data]);

  const byMethod = useMemo(() => {
    if (logs.length === 0) return [];
    const agg = new Map<string, number>();
    for (const l of logs) {
      const m = (l.method || 'Other').trim() || 'Other';
      agg.set(m, (agg.get(m) ?? 0) + 1);
    }
    const total = logs.length;
    return Array.from(agg.entries())
      .map(([method, count]) => ({ method, count, share: count / total }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  return (
    <div
      className="w-full bg-warm-bg/40"
      // width: 100vw is a HARD pin (max-width can be overridden by
      // intrinsic min-content sizing of children in some flex/grid
      // contexts; width: 100vw can't be exceeded by anything but
      // explicit > 100vw children). overflow-x: hidden traps any
      // residual horizontal scroll. touchAction: manipulation kills
      // iOS Safari's double-tap-to-zoom on the rain/cards/pills.
      style={{
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden',
        touchAction: 'manipulation',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Page wrapper — single column on every viewport, capped at
          max-w-3xl so the page reads as a column rather than a
          stretched-out dashboard on wide screens. No nested
          max-width / margin patterns that could leak a wider
          intrinsic width upward. */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        {/* Header */}
        <header className="pt-6 sm:pt-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
            Marketing &amp; Admissions
          </p>
          <h1
            className="mt-1 text-xl sm:text-3xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Daily logs{' '}
            <em className="not-italic text-primary">
              {isToday ? 'today' : data?.rangeLabel ?? 'today'}
            </em>
          </h1>
          <p className="mt-1.5 text-[12px] text-foreground/55 mx-auto max-w-md">
            One <span aria-hidden>🪵</span> for every touchpoint — phone, in-person, text,
            email, new contact, or field fill.
          </p>
          {error && (
            <p className="mt-2 text-[11px] text-rose-700">Couldn&apos;t load logs · {error}</p>
          )}
        </header>

        {/* All-time weekly trend — INVARIANT. Does not respond to the
            range pills below. Always shows the full historical weekly
            curve from the first log forward, so the eye reads the
            trajectory before picking a window for the cards. */}
        {data && data.weeklySeries.length > 0 && (
          <div className="mt-5">
            <WeeklyLineChart series={data.weeklySeries} />
          </div>
        )}

        {/* Counter + back-link */}
        <div className="mt-5 text-center">
          <div
            className="text-4xl sm:text-5xl font-bold text-emerald-700 tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
            aria-live="polite"
          >
            {counter}
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            {countLabel}
          </p>
          <Link
            href="/app"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        {/* Range pills — wraps onto multiple rows on mobile so the
            row's intrinsic width never exceeds the device width.
            Previously this was an inline-flex with overflow-x-auto,
            but iOS Safari uses the WIDEST element's intrinsic width
            (not the visible content width) to compute the layout
            viewport, so even a contained-scroll inline-flex of
            ~400px was forcing the whole page to render at ~400px
            zoom. flex-wrap fixes that at the source. */}
        <div className="mt-4">
          <div
            className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-black/10 bg-white/85 backdrop-blur-sm p-1.5 shadow-[0_8px_22px_-16px_rgba(60,48,42,0.35)]"
            role="tablist"
            aria-label="Date range"
          >
            {RANGES.map((r) => {
              const active = range === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-full whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-foreground text-white shadow-sm'
                      : 'text-foreground/60 hover:text-foreground hover:bg-warm-bg/70'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stacked cards: scoreboard, feed, breakdown, records. Single
            column so nothing forces a wider intrinsic width. */}
        <div className="mt-4 space-y-3">
          <ScoreboardCard data={data} />
          <FeedCard data={data} logs={logs} isToday={isToday} />
          <BreakdownCard data={data} byMethod={byMethod} rangeLabel={data?.rangeLabel} />
          <RecordsCard records={records ?? null} />
        </div>
      </div>
    </div>
  );
}

// ── ScoreboardCard ─────────────────────────────────────────────
function ScoreboardCard({ data }: { data: DailyLogsPayload | null }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">
            Scoreboard
          </p>
          <h2
            className="mt-0.5 text-[15px] font-bold text-foreground truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Log leaders
          </h2>
        </div>
        <span className="text-[10px] tabular-nums text-foreground/45 whitespace-nowrap shrink-0">
          {data?.leaderboard.length ?? 0}{' '}
          {(data?.leaderboard.length ?? 0) === 1 ? 'teammate' : 'teammates'}
        </span>
      </header>
      {!data ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">Loading…</p>
      ) : data.leaderboard.length === 0 ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">
          No logs in this window yet.
        </p>
      ) : (
        <ol className="divide-y divide-black/5">
          {data.leaderboard.map((row, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            const topShare = data.leaderboard[0]?.logs ?? 1;
            const barPct = Math.max(6, Math.round((row.logs / topShare) * 100));
            return (
              <li
                key={row.userId}
                className="flex items-center gap-2 px-3 py-2.5"
              >
                <span
                  className="shrink-0 w-5 text-center text-[11px] font-bold tabular-nums text-foreground/55"
                  aria-label={`Rank ${idx + 1}`}
                >
                  {medal ?? `${idx + 1}.`}
                </span>
                {row.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.avatarUrl}
                    alt=""
                    className="shrink-0 w-7 h-7 rounded-full object-cover border border-white shadow-sm"
                  />
                ) : (
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center border border-white shadow-sm">
                    {initialsOf(row.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-foreground truncate">
                    {row.name}
                  </p>
                  <div className="mt-1 h-1.5 bg-warm-bg/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                      style={{ width: `${barPct}%`, maxWidth: '100%' }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-[15px] font-bold text-foreground tabular-nums leading-none"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {row.logs}
                  </p>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-wider text-foreground/45">
                    {fmtDuration(row.durationSeconds)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ── FeedCard ───────────────────────────────────────────────────
function FeedCard({
  data, logs, isToday,
}: {
  data: DailyLogsPayload | null;
  logs: LogRow[];
  isToday: boolean;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">
            Every touchpoint
          </p>
          <h2
            className="mt-0.5 text-[15px] font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Logs
          </h2>
        </div>
        <span className="text-[10px] tabular-nums text-foreground/45 whitespace-nowrap shrink-0">
          {logs.length} {logs.length === 1 ? 'log' : 'logs'}
        </span>
      </header>
      {!data ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">
          No 🪵 in this window — be the first to land one on the board.
        </p>
      ) : (
        <ol className="divide-y divide-black/5 max-h-[420px] overflow-y-auto">
          {logs.slice().reverse().map((log) => {
            const tone = methodTone(log.method);
            return (
              <li key={log.id} className="flex items-start gap-2 px-3 py-2.5">
                {log.userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={log.userAvatarUrl}
                    alt=""
                    className="shrink-0 w-6 h-6 rounded-full object-cover border border-white shadow-sm mt-0.5"
                  />
                ) : (
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center border border-white shadow-sm mt-0.5">
                    {initialsOf(log.userName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-foreground truncate">
                    <span className="font-semibold">{log.userName}</span>
                    <span className="text-foreground/55"> · </span>
                    <span className="font-medium text-foreground/80">{log.contactName}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-foreground/45 tabular-nums">
                    {isToday
                      ? fmtTimeOfDay(log.contactedAt)
                      : `${fmtDayMonth(log.contactedAt)} · ${fmtTimeOfDay(log.contactedAt)}`}
                    {log.durationSeconds ? ` · ${fmtDuration(log.durationSeconds)}` : ''}
                  </p>
                </div>
                {log.method && (
                  <span
                    className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ring-1 whitespace-nowrap ${tone.bg} ${tone.text} ${tone.ring}`}
                  >
                    {log.method}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ── BreakdownCard ──────────────────────────────────────────────
function BreakdownCard({
  data, byMethod, rangeLabel,
}: {
  data: DailyLogsPayload | null;
  byMethod: Array<{ method: string; count: number; share: number }>;
  rangeLabel: string | undefined;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55 truncate">
            Mix · {rangeLabel ?? 'today'}
          </p>
          <h2
            className="mt-0.5 text-[15px] font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Breakdown by type
          </h2>
        </div>
        <span className="text-[10px] tabular-nums text-foreground/45 whitespace-nowrap shrink-0">
          {byMethod.length} {byMethod.length === 1 ? 'type' : 'types'}
        </span>
      </header>
      {!data ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">Loading…</p>
      ) : byMethod.length === 0 ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">
          No logs to break down yet.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {byMethod.map((m) => {
            const tone = methodTone(m.method);
            const pct = Math.round(m.share * 100);
            return (
              <li key={m.method} className="px-3 py-2.5 flex items-center gap-2">
                <span
                  className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 whitespace-nowrap ${tone.bg} ${tone.text} ${tone.ring}`}
                >
                  {m.method}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="h-2 bg-warm-bg/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${Math.max(4, pct)}%`, maxWidth: '100%' }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p
                    className="text-[13px] font-bold text-foreground leading-none"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {m.count}
                  </p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-foreground/45">
                    {pct}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── RecordsCard ────────────────────────────────────────────────
function RecordsCard({ records }: { records: RecordsBlock | null }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">
          Hall of fame · all time
        </p>
        <h2
          className="mt-0.5 text-[15px] font-bold text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Records
        </h2>
      </header>
      <ul className="divide-y divide-black/5">
        <RecordRow
          label="Most logs in one day"
          value={records?.dayBest?.count ?? null}
          caption={records?.dayBest ? fmtRecordDate(records.dayBest.date) : 'No history yet'}
        />
        <RecordRow
          label="Most logs in one week"
          value={records?.weekBest?.count ?? null}
          caption={records?.weekBest ? `Week of ${fmtWeekRange(records.weekBest.weekStart)}` : 'No history yet'}
        />
        <RecordRow
          label="Most logs in one day · by user"
          value={records?.dayBestByUser?.count ?? null}
          caption={
            records?.dayBestByUser
              ? `${records.dayBestByUser.name} · ${fmtRecordDate(records.dayBestByUser.date)}`
              : 'No history yet'
          }
          avatar={records?.dayBestByUser?.avatarUrl ?? null}
          avatarFallback={records?.dayBestByUser ? initialsOf(records.dayBestByUser.name) : null}
        />
      </ul>
    </section>
  );
}

function RecordRow({
  label, value, caption, avatar, avatarFallback,
}: {
  label: string;
  value: number | null;
  caption: string;
  avatar?: string | null;
  avatarFallback?: string | null;
}) {
  return (
    <li className="px-3 py-3 flex items-center gap-3">
      {avatar || avatarFallback ? (
        avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="shrink-0 w-9 h-9 rounded-full object-cover border border-white shadow-sm"
          />
        ) : (
          <span className="shrink-0 w-9 h-9 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-white shadow-sm">
            {avatarFallback}
          </span>
        )
      ) : (
        <span
          className="shrink-0 w-9 h-9 rounded-full bg-warm-bg/70 border border-black/10 flex items-center justify-center text-base"
          aria-hidden
        >
          🪵
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 truncate">
          {label}
        </p>
        <p
          className="mt-0.5 text-xl font-bold text-foreground tabular-nums leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value ?? '—'}
        </p>
        <p className="mt-0.5 text-[10.5px] text-foreground/55 truncate">{caption}</p>
      </div>
    </li>
  );
}

// ── WeeklyLineChart ────────────────────────────────────────────
//
// Always shows the all-time weekly trend (independent of the range
// pill selection). Renders an SVG line chart sized to a measured
// container width so iOS Safari can never use the SVG's viewBox
// dimensions as intrinsic width and blow up the layout viewport.
function WeeklyLineChart({ series }: { series: WeeklyPoint[] }) {
  // Measure the actual rendered container width so the SVG can use
  // pixel coordinates that exactly match the container, eliminating
  // any reliance on viewBox / aspect-ratio that could feed back into
  // layout. ResizeObserver keeps it in sync on rotation.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(160, Math.floor(entry.contentRect.width));
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const HEIGHT = 180;
  const PAD_L = 32;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;

  const innerW = Math.max(40, width - PAD_L - PAD_R);
  const innerH = HEIGHT - PAD_T - PAD_B;

  const n = series.length;
  const max = Math.max(1, ...series.map((p) => p.count));
  const xAt = (i: number) => (n <= 1 ? PAD_L + innerW / 2 : PAD_L + (i * innerW) / (n - 1));
  const yAt = (v: number) => PAD_T + innerH - (v / max) * innerH;
  const points = series.map((p, i) => ({ x: xAt(i), y: yAt(p.count), v: p.count, w: p.weekStart }));

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    return parts.join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${linePath} L ${last.x} ${PAD_T + innerH} L ${first.x} ${PAD_T + innerH} Z`;
  }, [linePath, points, innerH]);

  const pathLen = useMemo(() => {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.ceil(len) + 8;
  }, [points]);

  const [active, setActive] = useState<number | null>(null);
  const yTicks = useMemo(() => [0, 0.5, 1].map((f) => Math.round(max * f)), [max]);

  // Choose a tick stride so the x-axis isn't crowded. Aim for ~4-6
  // visible labels.
  const tickStride = Math.max(1, Math.ceil(n / 5));

  const total = useMemo(() => series.reduce((acc, p) => acc + p.count, 0), [series]);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  return (
    <section
      className="rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden"
      aria-label="All-time weekly log trend"
    >
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">
            Weekly trend · all time
          </p>
          <h2
            className="mt-0.5 text-[15px] font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Logs by week
          </h2>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-foreground/45">Total</p>
          <p
            className="text-[15px] font-bold text-foreground tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {total}
          </p>
        </div>
      </header>
      <div ref={containerRef} className="px-3 pt-2 pb-1 min-w-0 max-w-full">
        {/*
          The SVG uses the container's measured width as its pixel
          coordinate space and has explicit width + height attributes
          plus display:block. There's no viewBox in play, so iOS
          Safari can't fall back to a viewBox aspect ratio for
          intrinsic sizing.
        */}
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', width: '100%', height: `${HEIGHT}px`, maxWidth: '100%' }}
          role="img"
          aria-label={`Weekly log totals across ${n} weeks`}
        >
          <defs>
            <linearGradient id="wlc-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b87333" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="wlc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.30)" />
              <stop offset="60%" stopColor="rgba(184, 115, 51, 0.12)" />
              <stop offset="100%" stopColor="rgba(184, 115, 51, 0)" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => {
            const y = yAt(v);
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  x2={width - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="rgba(60, 48, 42, 0.08)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? '0' : '2 4'}
                />
                <text
                  x={PAD_L - 4}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  fill="rgba(60, 48, 42, 0.45)"
                >
                  {v}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#wlc-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#wlc-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="wlc-line"
            style={{ strokeDasharray: pathLen, strokeDashoffset: pathLen }}
          />

          {points.map((p, i) => {
            const isActive = active === i;
            const rectW = innerW / Math.max(1, n - 1);
            return (
              <g key={i}>
                {isActive && (
                  <circle cx={p.x} cy={p.y} r={4.5} fill="#fff" stroke="url(#wlc-stroke)" strokeWidth={2.2} />
                )}
                <rect
                  x={p.x - rectW / 2}
                  y={PAD_T}
                  width={rectW}
                  height={innerH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
                  onTouchStart={() => setActive(i)}
                />
              </g>
            );
          })}

          {active !== null && points[active] && (
            <g pointerEvents="none">
              <line
                x1={points[active].x}
                x2={points[active].x}
                y1={PAD_T}
                y2={PAD_T + innerH}
                stroke="rgba(184, 115, 51, 0.4)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {(() => {
                const labelW = 92;
                const labelH = 34;
                const flip = points[active].x > width * 0.6;
                const lx = Math.max(2, Math.min(width - labelW - 2, flip ? points[active].x - labelW - 8 : points[active].x + 8));
                const ly = Math.max(PAD_T, points[active].y - labelH - 6);
                const v = points[active].v;
                const wk = fmtWeekTick(points[active].w);
                return (
                  <g transform={`translate(${lx}, ${ly})`}>
                    <rect
                      x={0} y={0} rx={6} ry={6} width={labelW} height={labelH}
                      fill="rgba(255, 255, 255, 0.97)"
                      stroke="rgba(184, 115, 51, 0.25)"
                      strokeWidth={1}
                    />
                    <text x={7} y={13} fontSize={9} fill="rgba(60, 48, 42, 0.5)" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      Wk · {wk}
                    </text>
                    <text x={7} y={27} fontSize={12} fontWeight={700} fill="#10b981" style={{ fontFamily: 'var(--font-display)' }}>
                      {v} {v === 1 ? 'log' : 'logs'}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {points.map((p, i) => {
            if (i % tickStride !== 0 && i !== n - 1) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(60, 48, 42, 0.45)"
              >
                {fmtWeekTick(p.w)}
              </text>
            );
          })}
        </svg>
      </div>
      {last && (
        <div className="px-4 py-2 border-t border-black/5 flex items-center justify-between text-[10.5px] text-foreground/55">
          <span>
            This week · <span className="font-semibold text-foreground">{last.count}</span>
          </span>
          {prev && (
            <span>
              vs last · <span className="font-semibold text-foreground">{prev.count}</span>{' '}
              <span className={last.count >= prev.count ? 'text-emerald-700' : 'text-rose-700'}>
                {last.count >= prev.count ? '▲' : '▼'} {Math.abs(last.count - prev.count)}
              </span>
            </span>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes wlc-draw { to { stroke-dashoffset: 0; } }
        :global(.wlc-line) {
          animation: wlc-draw 1400ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.wlc-line) {
            animation: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
