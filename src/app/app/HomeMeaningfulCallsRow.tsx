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

async function fetchMeaningful(token: string, from: Date, to: Date): Promise<number> {
  try {
    const url = `/api/calls/insights?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return 0;
    const data: InsightsResponse = await res.json();
    return data.meaningful ?? 0;
  } catch {
    return 0;
  }
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

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    let cancelled = false;
    (async () => {
      const w = buildWindows();
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
    })();
    return () => { cancelled = true; };
  }, [session]);

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
          onClick={() => router.push('/app/calls')}
        />
        <MeaningfulCard
          label="This Week"
          value={totals?.thisWeek ?? null}
          previous={totals?.lastWeek ?? null}
          previousLabel="last week"
          onClick={() => router.push('/app/calls')}
        />
        <MeaningfulCard
          label="This Month"
          value={totals?.thisMonth ?? null}
          previous={totals?.lastMonth ?? null}
          previousLabel="last month"
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
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  previousLabel: string;
  onClick: () => void;
}) {
  const loading = value == null || previous == null;
  const delta = !loading ? (value as number) - (previous as number) : 0;
  const up = delta > 0;
  const down = delta < 0;
  const pct = !loading && (previous ?? 0) > 0 ? Math.round((delta / (previous as number)) * 100) : null;
  const animated = useAnimatedNumber(loading ? null : (value as number));

  return (
    <button
      onClick={onClick}
      className="text-center px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span className="text-3xl font-bold text-blue-600 tabular-nums">
          {loading ? '—' : (animated ?? 0).toLocaleString()}
        </span>
        {!loading && (
          <span className={`text-[11px] font-medium ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-foreground/40'}`}>
            {up ? '▲' : down ? '▼' : '·'} {Math.abs(delta)}
            {pct != null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
          </span>
        )}
      </div>
      <p className="text-[10px] text-foreground/40 mt-0.5">
        {loading
          ? 'Loading…'
          : previous === 0 && value === 0
            ? `None ${previousLabel}`
            : `vs ${previous} ${previousLabel}`}
      </p>
    </button>
  );
}
