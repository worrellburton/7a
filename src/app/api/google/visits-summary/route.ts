import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, GoogleApiError, hasGoogleOAuth } from '@/lib/google';

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
  /** Sessions over the last full Mon-Sun week. Apples-to-oranges
   *  vs thisWeek mid-week — kept around for context. */
  lastWeek: number;
  /** Apples-to-apples: sessions from last week's Monday through the
   *  same day-of-week we're on now. Drives the pacing comparison
   *  ("on track / ahead / behind") so a Tuesday Tue-of-this-week
   *  vs Mon+Tue-of-last-week is a fair fight. */
  lastWeekToDate: number;
  thisMonth: number;
  /** Sessions over the last full calendar month. */
  lastMonth: number;
  /** Apples-to-apples: sessions from day 1 of last month through
   *  the same day-of-month we're on now. */
  lastMonthToDate: number;
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

  // Pacing windows: last week / month summed only through the same
  // day-offset we're on this week / month, so the % delta is a
  // fair comparison instead of "partial week vs full week".
  // dow = days into this week (Mon=0..Sun=6).
  // Last-week-to-date = lastWeekStart through lastWeekStart + dow.
  const lastWeekToDateEnd = addDays(lastWeekStart.y, lastWeekStart.m, lastWeekStart.d, dow);
  // Last-month-to-date = day 1 of last month through min(d, last
  // day of last month) — clamps when 'today' is the 31st but last
  // month ended on the 30th, etc.
  const lastMonthToDateRawDay = Math.min(d, lastMonthEnd.d);

  const ranges = [
    { name: 'today', startDate: ymd(y, m, d), endDate: ymd(y, m, d) },
    { name: 'yesterday', startDate: ymd(yest.y, yest.m, yest.d), endDate: ymd(yest.y, yest.m, yest.d) },
    { name: 'thisWeek', startDate: ymd(weekStart.y, weekStart.m, weekStart.d), endDate: ymd(y, m, d) },
    { name: 'lastWeek', startDate: ymd(lastWeekStart.y, lastWeekStart.m, lastWeekStart.d), endDate: ymd(lastWeekEnd.y, lastWeekEnd.m, lastWeekEnd.d) },
    { name: 'lastWeekToDate', startDate: ymd(lastWeekStart.y, lastWeekStart.m, lastWeekStart.d), endDate: ymd(lastWeekToDateEnd.y, lastWeekToDateEnd.m, lastWeekToDateEnd.d) },
    { name: 'thisMonth', startDate: ymd(y, m, 1), endDate: ymd(y, m, d) },
    { name: 'lastMonth', startDate: ymd(lastMonthStart.y, lastMonthStart.m, lastMonthStart.d), endDate: ymd(lastMonthEnd.y, lastMonthEnd.m, lastMonthEnd.d) },
    { name: 'lastMonthToDate', startDate: ymd(lastMonthStart.y, lastMonthStart.m, 1), endDate: ymd(lastMonthStart.y, lastMonthStart.m, lastMonthToDateRawDay) },
  ];

  try {
    // GA4 caps dateRanges at 4 per request. Eight ranges split into
    // two parallel calls — current windows in one batch, prior +
    // prior-to-date in the other. The response adds an implicit
    // `dateRange` dimension whose value matches the `name` we set,
    // so merging is a simple by-name lookup.
    const currentRanges = ranges.filter((r) =>
      ['today', 'yesterday', 'thisWeek', 'thisMonth'].includes(r.name),
    );
    const previousRanges = ranges.filter((r) =>
      ['lastWeek', 'lastWeekToDate', 'lastMonth', 'lastMonthToDate'].includes(r.name),
    );
    const [currentRes, previousRes] = await Promise.all([
      ga4Run({
        dateRanges: currentRanges.map(({ startDate, endDate, name }) => ({ startDate, endDate, name })),
        metrics: [{ name: 'sessions' }],
      }),
      ga4Run({
        dateRanges: previousRanges.map(({ startDate, endDate, name }) => ({ startDate, endDate, name })),
        metrics: [{ name: 'sessions' }],
      }),
    ]);

    const out: Record<string, number> = {};
    for (const row of [...(currentRes.rows ?? []), ...(previousRes.rows ?? [])]) {
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
      lastWeekToDate: out.lastWeekToDate ?? 0,
      thisMonth: out.thisMonth ?? 0,
      lastMonth: out.lastMonth ?? 0,
      lastMonthToDate: out.lastMonthToDate ?? 0,
      fetched_at: new Date().toISOString(),
    };
    cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    // Structured error path — GoogleApiError carries the Google
    // status code (e.g. PERMISSION_DENIED, UNAUTHENTICATED) so the
    // client can drive a smarter UX without string-matching.
    if (err instanceof GoogleApiError) {
      // Verbose log so an admin in Vercel can see the full body, but
      // the response payload only carries the structured fields.
      console.warn('[visits-summary] GA4 error', {
        status: err.status,
        code: err.code,
        endpoint: err.endpoint,
        body: err.rawBody.slice(0, 600),
      });
      // Quota exhaustion: degrade to last cached value when we have
      // one, otherwise 429 with the structured envelope.
      if (err.code === 'RESOURCE_EXHAUSTED' || err.status === 429) {
        if (cached) {
          return NextResponse.json({ ...cached.data, cached: true, quota_exhausted: true });
        }
        return NextResponse.json(
          { ...err.toJSON(), quota_exhausted: true },
          { status: 429 },
        );
      }
      // Auth failure: surface so the client can show the Reconnect
      // CTA. 401 + 403 with PERMISSION_DENIED both qualify — the
      // first means the token's dead, the second means the connected
      // account doesn't have access to the configured property.
      const reconnect =
        err.status === 401 ||
        err.code === 'UNAUTHENTICATED' ||
        err.code === 'PERMISSION_DENIED';
      return NextResponse.json(
        { ...err.toJSON(), reconnect },
        { status: err.status === 401 ? 401 : 502 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
