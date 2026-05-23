'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Dedicated "Daily logs" surface — a leaderboard on the left + the
// per-log feed on the right, scoped to a date range the viewer
// picks (today / this week / last week / this month / last month /
// all time). Below the two columns, an Apple-minimal "Records"
// card surfaces the all-time bests so a quiet day still has
// something for the eye to rest on.

type RangeKey = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all_time';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'last_week', label: 'Last week' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'all_time', label: 'All time' },
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

interface DailyLogsPayload {
  range: RangeKey;
  rangeLabel: string;
  logs: LogRow[];
  leaderboard: LeaderboardEntry[];
  total: number;
  record: { count: number; date: string } | null;
  records: RecordsBlock;
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

// "YYYY-MM-DD" → "Fri, May 22, 2026"
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

// Week-start (Monday) "YYYY-MM-DD" → "May 18 – 24"
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

// Soft per-method tint for the right-column log pills. Falls back to
// the warm-bg neutral if the method isn't in the lookup.
function methodTone(method: string | null): { bg: string; text: string; ring: string } {
  switch (method) {
    case 'Phone':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/70' };
    case 'In Person':
      return { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200/70' };
    case 'Email':
    case 'Email Campaign':
      return { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200/70' };
    case 'Text Message':
      return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200/70' };
    case 'Left Message':
      return { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200/70' };
    case 'New Contact':
      return { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/30' };
    case 'Data Entry':
      return { bg: 'bg-foreground/5', text: 'text-foreground/70', ring: 'ring-foreground/15' };
    default:
      return { bg: 'bg-warm-bg/70', text: 'text-foreground/70', ring: 'ring-foreground/15' };
  }
}

export default function DailyLogsContent() {
  const { session } = useAuth();
  const [data, setData] = useState<DailyLogsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('today');
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

  // Animate the counter from 0 → window total once the payload
  // lands. ~30 frames over 900ms so the number races up.
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
  // "Logs so far" only reads right while the window is still
  // accruing (today / this week / this month). Closed windows
  // (last week, last month, all time) read better as "Total logs".
  const isLiveWindow = range === 'today' || range === 'this_week' || range === 'this_month';
  const countLabel = isLiveWindow ? 'Logs so far' : 'Total logs';

  const logs = useMemo(() => data?.logs ?? [], [data]);

  return (
    <div className="min-h-[100svh] bg-warm-bg/40">
      {/* Page header — eyebrow + headline + counter + date filter +
          back-to-home. Centered up top so the eye reads "what + when"
          before diving into the two columns below. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/45">
          Marketing &amp; Admissions
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Daily logs <em className="not-italic text-primary">{isToday ? 'today' : data?.rangeLabel ?? 'today'}</em>
        </h1>
        <p className="mt-2 text-[12.5px] text-foreground/55 max-w-xl mx-auto">
          One <span aria-hidden>🪵</span> for every touchpoint logged in the selected window — phone,
          in-person, text, email, new contact, or field fill.
        </p>

        {/* Range pills */}
        <div
          className="mt-5 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white/80 backdrop-blur-sm p-1 shadow-[0_8px_22px_-16px_rgba(60,48,42,0.35)]"
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

        <div className="mt-6 flex flex-col items-center">
          <span
            className="text-5xl sm:text-6xl font-bold text-emerald-700 tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
            aria-live="polite"
          >
            {counter}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            {countLabel}
          </span>
        </div>

        <Link
          href="/app"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>

        {error && (
          <p className="mt-3 text-[11px] text-rose-700">Couldn&apos;t load logs · {error}</p>
        )}
      </div>

      {/* Two-column body — leaderboard left, logs right. Stacks on
          mobile (single column) so neither side feels squashed. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontFamily: 'var(--font-body)' }}>
        {/* Leaderboard */}
        <section className="rounded-2xl border border-black/10 bg-white/85 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
          <header className="px-5 py-4 border-b border-black/5 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
                Scoreboard
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Log leaders
              </h2>
            </div>
            <span className="text-[10.5px] tabular-nums text-foreground/45">
              {data?.leaderboard.length ?? 0} {(data?.leaderboard.length ?? 0) === 1 ? 'teammate' : 'teammates'}
            </span>
          </header>

          {!data ? (
            <p className="px-5 py-8 text-[12px] italic text-foreground/45 text-center">Loading…</p>
          ) : data.leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-[12.5px] italic text-foreground/45 text-center">
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
                    className="flex items-center gap-3 px-5 py-3 hover:bg-warm-bg/40 transition-colors"
                  >
                    <span
                      className="shrink-0 w-7 text-center text-[12px] font-bold tabular-nums text-foreground/55"
                      aria-label={`Rank ${idx + 1}`}
                    >
                      {medal ?? `${idx + 1}.`}
                    </span>
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className="shrink-0 w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                      />
                    ) : (
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center border border-white shadow-sm">
                        {initialsOf(row.name)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{row.name}</p>
                      <div className="mt-1 h-1.5 bg-warm-bg/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className="text-[18px] font-bold text-foreground tabular-nums leading-none"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {row.logs}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/45">
                        {fmtDuration(row.durationSeconds)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Logs feed */}
        <section className="rounded-2xl border border-black/10 bg-white/85 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
          <header className="px-5 py-4 border-b border-black/5 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
                Every touchpoint
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Logs
              </h2>
            </div>
            <span className="text-[10.5px] tabular-nums text-foreground/45">
              {logs.length} {logs.length === 1 ? 'log' : 'logs'}
            </span>
          </header>

          {!data ? (
            <p className="px-5 py-8 text-[12px] italic text-foreground/45 text-center">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="px-5 py-8 text-[12.5px] italic text-foreground/45 text-center">
              No 🪵 in this window — be the first to land one on the board.
            </p>
          ) : (
            <ol className="divide-y divide-black/5 max-h-[640px] overflow-y-auto">
              {logs
                .slice()
                .reverse()
                .map((log) => {
                  const tone = methodTone(log.method);
                  return (
                    <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                      {log.userAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={log.userAvatarUrl}
                          alt=""
                          className="shrink-0 w-7 h-7 rounded-full object-cover border border-white shadow-sm mt-0.5"
                        />
                      ) : (
                        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center border border-white shadow-sm mt-0.5">
                          {initialsOf(log.userName)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-foreground truncate">
                          <span className="font-semibold">{log.userName}</span>
                          <span className="text-foreground/55"> · </span>
                          <span className="font-medium text-foreground/80">{log.contactName}</span>
                          {log.contactCompany ? (
                            <span className="text-foreground/45 truncate"> · {log.contactCompany}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-foreground/45 tabular-nums">
                          {isToday ? fmtTimeOfDay(log.contactedAt) : `${fmtDayMonth(log.contactedAt)} · ${fmtTimeOfDay(log.contactedAt)}`}
                          {log.durationSeconds ? ` · ${fmtDuration(log.durationSeconds)}` : ''}
                        </p>
                      </div>
                      {log.method && (
                        <span
                          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
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
      </div>

      {/* Records — its own card directly under the two columns, with
          the three all-time stats laid out in equal cells. Each cell
          stands on its own so a missing record (e.g. before any
          history exists) doesn't unbalance the row. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12" style={{ fontFamily: 'var(--font-body)' }}>
        <section className="rounded-2xl border border-black/10 bg-white/85 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
          <header className="px-5 py-4 border-b border-black/5 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
                Hall of fame · all time
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Records
              </h2>
            </div>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black/5">
            <RecordCell
              label="Most logs in one day"
              value={records?.dayBest?.count ?? null}
              caption={records?.dayBest ? fmtRecordDate(records.dayBest.date) : 'No history yet'}
            />
            <RecordCell
              label="Most logs in one week"
              value={records?.weekBest?.count ?? null}
              caption={records?.weekBest ? `Week of ${fmtWeekRange(records.weekBest.weekStart)}` : 'No history yet'}
            />
            <RecordCell
              label="Most logs in one day · by user"
              value={records?.dayBestByUser?.count ?? null}
              caption={records?.dayBestByUser ? `${records.dayBestByUser.name} · ${fmtRecordDate(records.dayBestByUser.date)}` : 'No history yet'}
              avatar={records?.dayBestByUser?.avatarUrl ?? null}
              avatarFallback={records?.dayBestByUser ? initialsOf(records.dayBestByUser.name) : null}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function RecordCell({
  label,
  value,
  caption,
  avatar,
  avatarFallback,
}: {
  label: string;
  value: number | null;
  caption: string;
  avatar?: string | null;
  avatarFallback?: string | null;
}) {
  return (
    <div className="px-5 py-5 flex items-center gap-4">
      {avatar || avatarFallback ? (
        avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="shrink-0 w-12 h-12 rounded-full object-cover border border-white shadow-sm"
          />
        ) : (
          <span className="shrink-0 w-12 h-12 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center border border-white shadow-sm">
            {avatarFallback}
          </span>
        )
      ) : (
        <span className="shrink-0 w-12 h-12 rounded-full bg-warm-bg/70 border border-black/10 flex items-center justify-center text-xl" aria-hidden>
          🪵
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
        <p
          className="mt-1 text-3xl font-bold text-foreground tabular-nums leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value ?? '—'}
        </p>
        <p className="mt-1 text-[11px] text-foreground/55 truncate">{caption}</p>
      </div>
    </div>
  );
}
