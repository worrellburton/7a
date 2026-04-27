'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

// Home row: three stat cards for meaningful calls — today, this week,
// this month — each with a comparison vs the previous period. Counts
// come from /api/calls/insights, which aggregates the full canonical
// set from public.calls + call_ai_scores (not a paginated slice), so
// the numbers match whatever the Calls page shows.

interface InsightsResponse {
  meaningful?: number;
  error?: string;
}

interface MeaningfulError {
  short: string;
  full: string;
}

// Returns the meaningful count or throws a typed error so the parent
// useEffect can surface "what broke" instead of silently treating
// every failure as 0 (which made a revoked token + a real zero look
// indistinguishable on the home dashboard).
async function fetchMeaningful(token: string, from: Date, to: Date): Promise<number> {
  const url = `/api/calls/insights?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as InsightsResponse | null;
    const message = body?.error ?? `HTTP ${res.status}`;
    const short =
      res.status === 401 ? 'Sign in again'
      : res.status === 403 ? 'Permission denied'
      : res.status === 429 ? 'Rate-limited'
      : `HTTP ${res.status}`;
    const err = new Error(message) as Error & { short?: string };
    err.short = short;
    throw err;
  }
  const data: InsightsResponse = await res.json();
  return data.meaningful ?? 0;
}

// Build a Date representing a Phoenix (MST, UTC-7) wall-clock moment.
// MST has no DST so the offset is constant year-round.
function phoenixDate(year: number, monthIndex: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
  return new Date(Date.UTC(year, monthIndex, day, hour + 7, minute, second, ms));
}

function phoenixNow(): { y: number; m: number; d: number } {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function startOfDay(y: number, m: number, d: number): Date {
  return phoenixDate(y, m - 1, d, 0, 0, 0, 0);
}
function endOfDay(y: number, m: number, d: number): Date {
  return phoenixDate(y, m - 1, d, 23, 59, 59, 999);
}

// Monday = 0 … Sunday = 6, normalized so the week starts on Monday.
function dowMondayBase(y: number, m: number, d: number): number {
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  // JS: Sun=0 … Sat=6 → shift to Mon=0 … Sun=6
  return (utc.getUTCDay() + 6) % 7;
}

function addDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

interface Windows {
  todayFrom: Date; todayTo: Date;
  yesterdayFrom: Date; yesterdayTo: Date;
  thisWeekFrom: Date; thisWeekTo: Date;
  lastWeekFrom: Date; lastWeekTo: Date;
  thisMonthFrom: Date; thisMonthTo: Date;
  lastMonthFrom: Date; lastMonthTo: Date;
}

function buildWindows(): Windows {
  const { y, m, d } = phoenixNow();
  const dow = dowMondayBase(y, m, d);

  const weekStart = addDays(y, m, d, -dow);
  const lastWeekStart = addDays(weekStart.y, weekStart.m, weekStart.d, -7);
  const lastWeekEnd = addDays(weekStart.y, weekStart.m, weekStart.d, -1);

  const yest = addDays(y, m, d, -1);

  const firstThisMonth = { y, m, d: 1 };
  const lastMonthDate = new Date(Date.UTC(y, m - 1, 0, 12)); // day 0 of month m = last day of prior month
  const lastMonthEnd = { y: lastMonthDate.getUTCFullYear(), m: lastMonthDate.getUTCMonth() + 1, d: lastMonthDate.getUTCDate() };
  const lastMonthStart = { y: lastMonthEnd.y, m: lastMonthEnd.m, d: 1 };

  return {
    todayFrom: startOfDay(y, m, d),
    todayTo: endOfDay(y, m, d),
    yesterdayFrom: startOfDay(yest.y, yest.m, yest.d),
    yesterdayTo: endOfDay(yest.y, yest.m, yest.d),
    thisWeekFrom: startOfDay(weekStart.y, weekStart.m, weekStart.d),
    thisWeekTo: endOfDay(y, m, d),
    lastWeekFrom: startOfDay(lastWeekStart.y, lastWeekStart.m, lastWeekStart.d),
    lastWeekTo: endOfDay(lastWeekEnd.y, lastWeekEnd.m, lastWeekEnd.d),
    thisMonthFrom: startOfDay(firstThisMonth.y, firstThisMonth.m, firstThisMonth.d),
    thisMonthTo: endOfDay(y, m, d),
    lastMonthFrom: startOfDay(lastMonthStart.y, lastMonthStart.m, lastMonthStart.d),
    lastMonthTo: endOfDay(lastMonthEnd.y, lastMonthEnd.m, lastMonthEnd.d),
  };
}

interface Totals {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}

export default function HomeMeaningfulCallsRow() {
  const { session } = useAuth();
  const router = useRouter();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<MeaningfulError | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    let cancelled = false;
    setError(null);
    setTotals(null);
    (async () => {
      const w = buildWindows();
      try {
        const [today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
          fetchMeaningful(token, w.todayFrom, w.todayTo),
          fetchMeaningful(token, w.yesterdayFrom, w.yesterdayTo),
          fetchMeaningful(token, w.thisWeekFrom, w.thisWeekTo),
          fetchMeaningful(token, w.lastWeekFrom, w.lastWeekTo),
          fetchMeaningful(token, w.thisMonthFrom, w.thisMonthTo),
          fetchMeaningful(token, w.lastMonthFrom, w.lastMonthTo),
        ]);
        if (cancelled) return;
        setTotals({ today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth });
      } catch (e) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[meaningful-calls] fetch failed', e);
        const short = (e as Error & { short?: string })?.short ?? 'Failed to load';
        const full = e instanceof Error ? e.message : 'Failed to load';
        setError({ short, full });
      }
    })();
    return () => { cancelled = true; };
  }, [session, retryNonce]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Meaningful calls
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MeaningfulCard
          label="Today"
          value={totals?.today ?? null}
          previous={totals?.yesterday ?? null}
          previousLabel="yesterday"
          error={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
          onClick={() => router.push('/app/calls')}
        />
        <MeaningfulCard
          label="This Week"
          value={totals?.thisWeek ?? null}
          previous={totals?.lastWeek ?? null}
          previousLabel="last week"
          error={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
          onClick={() => router.push('/app/calls')}
        />
        <MeaningfulCard
          label="This Month"
          value={totals?.thisMonth ?? null}
          previous={totals?.lastMonth ?? null}
          previousLabel="last month"
          error={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
          onClick={() => router.push('/app/calls')}
        />
      </div>
    </div>
  );
}

function MeaningfulCard({
  label,
  value,
  previous,
  previousLabel,
  error,
  onRetry,
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  previousLabel: string;
  error: MeaningfulError | null;
  onRetry: () => void;
  onClick: () => void;
}) {
  const loading = !error && (value == null || previous == null);
  const ready = !error && !loading;
  const delta = ready ? (value as number) - (previous as number) : 0;
  const up = ready && delta > 0;
  const down = ready && delta < 0;
  const pct = ready && (previous ?? 0) > 0 ? Math.round((delta / (previous as number)) * 100) : null;
  const animated = useAnimatedNumber(ready ? (value as number) : null);

  return (
    <div
      className="min-w-0 px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-center"
      >
        <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</p>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span
            className={`text-3xl font-bold tabular-nums ${
              error ? 'text-foreground/30' : 'text-blue-600'
            }`}
          >
            {error ? '—' : loading ? '—' : (animated ?? 0).toLocaleString()}
          </span>
          {ready && (
            <span className={`text-[11px] font-medium ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-foreground/40'}`}>
              {up ? '▲' : down ? '▼' : '·'} {Math.abs(delta)}
              {pct != null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
            </span>
          )}
        </div>
        {!error && (
          <p className="text-[10px] text-foreground/40 mt-0.5">
            {loading
              ? 'Loading…'
              : previous === 0 && value === 0
                ? `None ${previousLabel}`
                : `vs ${previous} ${previousLabel}`}
          </p>
        )}
      </button>
      {error && (
        <div className="mt-1.5 flex flex-col items-center gap-1.5">
          <span
            title={error.full}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700 max-w-full truncate"
          >
            <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span className="truncate">{error.short}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="text-[10px] font-semibold text-foreground/55 hover:text-foreground hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
