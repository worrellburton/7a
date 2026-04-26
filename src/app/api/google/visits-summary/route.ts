import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/visits-summary
//
// Returns total GA4 sessions for six rolling windows the home
// dashboard cares about — today / yesterday / this week / last
// week / this month / last month — in a single GA4 Data API
// request. Single call (multiple dateRanges) keeps quota usage
// minimal versus six independent ga4Run() calls.
//
// Cache the result in-memory for 5 minutes so multiple admins on
// the home page share one GA4 hit. Sessions don't need second-
// granularity — the cards round-trip on a slow timer anyway.

export const dynamic = 'force-dynamic';

interface VisitsSummary {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  fetched_at: string;
}

const CACHE_TTL_MS = 5 * 60_000;
let cached: { data: VisitsSummary; expiresAt: number } | null = null;

function phoenixNow(): { y: number; m: number; d: number } {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}
function addDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
function dowMondayBase(y: number, m: number, d: number): number {
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  return (utc.getUTCDay() + 6) % 7;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  const { y, m, d } = phoenixNow();
  const yest = addDays(y, m, d, -1);
  const dow = dowMondayBase(y, m, d);
  const weekStart = addDays(y, m, d, -dow);
  const lastWeekStart = addDays(weekStart.y, weekStart.m, weekStart.d, -7);
  const lastWeekEnd = addDays(weekStart.y, weekStart.m, weekStart.d, -1);
  // Day-0 of the current month → last day of prior month.
  const lastMonthEndDt = new Date(Date.UTC(y, m - 1, 0, 12));
  const lastMonthEnd = {
    y: lastMonthEndDt.getUTCFullYear(),
    m: lastMonthEndDt.getUTCMonth() + 1,
    d: lastMonthEndDt.getUTCDate(),
  };
  const lastMonthStart = { y: lastMonthEnd.y, m: lastMonthEnd.m, d: 1 };

  const ranges = [
    { name: 'today', startDate: ymd(y, m, d), endDate: ymd(y, m, d) },
    { name: 'yesterday', startDate: ymd(yest.y, yest.m, yest.d), endDate: ymd(yest.y, yest.m, yest.d) },
    { name: 'thisWeek', startDate: ymd(weekStart.y, weekStart.m, weekStart.d), endDate: ymd(y, m, d) },
    { name: 'lastWeek', startDate: ymd(lastWeekStart.y, lastWeekStart.m, lastWeekStart.d), endDate: ymd(lastWeekEnd.y, lastWeekEnd.m, lastWeekEnd.d) },
    { name: 'thisMonth', startDate: ymd(y, m, 1), endDate: ymd(y, m, d) },
    { name: 'lastMonth', startDate: ymd(lastMonthStart.y, lastMonthStart.m, lastMonthStart.d), endDate: ymd(lastMonthEnd.y, lastMonthEnd.m, lastMonthEnd.d) },
  ];

  try {
    // GA4 multi-range report: one call, six values. The response
    // adds an implicit `dateRange` dimension so each row maps to
    // one of the named ranges (in input order).
    const res = await ga4Run({
      dateRanges: ranges.map(({ startDate, endDate, name }) => ({ startDate, endDate, name })),
      metrics: [{ name: 'sessions' }],
    });

    const out: Record<string, number> = {};
    for (const row of res.rows ?? []) {
      // The dateRange dimension is appended LAST when there's no
      // explicit dimensions array. Read it via dimensionValues.
      const rangeName = row.dimensionValues?.[0]?.value ?? '';
      const sessions = Number(row.metricValues?.[0]?.value ?? 0);
      if (rangeName) out[rangeName] = sessions;
    }

    const data: VisitsSummary = {
      today: out.today ?? 0,
      yesterday: out.yesterday ?? 0,
      thisWeek: out.thisWeek ?? 0,
      lastWeek: out.lastWeek ?? 0,
      thisMonth: out.thisMonth ?? 0,
      lastMonth: out.lastMonth ?? 0,
      fetched_at: new Date().toISOString(),
    };
    cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
      // Same self-soothing pattern as the realtime route — return
      // cached data with a quota flag if we have any, else 429.
      if (cached) {
        return NextResponse.json({ ...cached.data, cached: true, quota_exhausted: true });
      }
      return NextResponse.json(
        { error: 'GA4 rate-limited; try again in <60 min', quota_exhausted: true },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
