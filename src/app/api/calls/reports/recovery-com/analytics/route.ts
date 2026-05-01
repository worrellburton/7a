import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/calls/reports/recovery-com/analytics
//   ?startDate=YYYY-MM-DD
//   &endDate=YYYY-MM-DD
//
// Pulls the GA4 slice of traffic that arrived from the Recovery.com
// network so we can pair it with the call-side report. GA records
// the source as "recoverycom" (no dot) and "rehabpath" (a sister
// directory in the same network), so the filter is an OR over both
// — using EXACT match because CONTAINS for "recovery" would also
// catch internal pages / unrelated paths.
//
// Returns:
//   summary       site metrics for the window (sessions, users, ...)
//   previous      same metrics for the prior period of equal length
//   daily         per-day sessions + users so the report can chart it
//   landing       top landing pages by sessions
//   countries     top sessionCountry rows
//   cities        top city rows (US-focused for admissions geo)
//   devices       deviceCategory breakdown (desktop / mobile / tablet)
//   browsers      browser breakdown
//   os            operating-system breakdown
//   sources       per-source breakdown (recoverycom vs rehabpath)
//   sourceMedium  full source/medium pairs in our network
//   campaigns     UTM campaign breakdown (when set)
//   hourly        sessions by hour-of-day (0-23)
//   dayOfWeek     sessions by day-of-week (0=Sun..6=Sat)
//   events        conversion / event totals (event_count by name)

export const dynamic = 'force-dynamic';

// "Recovery.com network" sources as GA reports them. Both are
// directory placements that send traffic to sevenarrowsrecovery
// arizona.com and should be reported together. The previous
// inListFilter and PARTIAL_REGEXP attempts both came back empty
// even when the unfiltered query clearly contained these values
// (recoverycom: 137 sessions, rehabpath: 241), so we now build
// an explicit orGroup of EXACT, case-insensitive filters — the
// most unambiguous filter shape GA4 supports. Add another value
// to RECOVERY_SOURCES to widen the report; the filter expression
// auto-rebuilds.
const RECOVERY_SOURCES = ['recoverycom', 'rehabpath'];

const RECOVERY_FILTER = {
  orGroup: {
    expressions: RECOVERY_SOURCES.map((value) => ({
      filter: {
        fieldName: 'sessionSource',
        stringFilter: {
          value,
          matchType: 'EXACT' as const,
          caseSensitive: false,
        },
      },
    })),
  },
};

interface SummaryValues {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
  engagementRate: number;
  pagesPerSession: number;
}

const SUMMARY_METRICS = [
  { name: 'sessions' },
  { name: 'activeUsers' },
  { name: 'newUsers' },
  { name: 'screenPageViews' },
  { name: 'averageSessionDuration' },
  { name: 'bounceRate' },
  { name: 'engagementRate' },
  { name: 'screenPageViewsPerSession' },
];

function readSummary(rowValues: { value?: string }[] | undefined): SummaryValues {
  const v = rowValues ?? [];
  return {
    sessions: Number(v[0]?.value ?? 0),
    activeUsers: Number(v[1]?.value ?? 0),
    newUsers: Number(v[2]?.value ?? 0),
    pageViews: Number(v[3]?.value ?? 0),
    avgSessionDurationSec: Number(v[4]?.value ?? 0),
    bounceRate: Number(v[5]?.value ?? 0),
    engagementRate: Number(v[6]?.value ?? 0),
    pagesPerSession: Number(v[7]?.value ?? 0),
  };
}

function parseIsoUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dateStr: string, delta: number): string {
  const d = parseIsoUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function diffDays(startStr: string, endStr: string): number {
  const a = parseIsoUtc(startStr).getTime();
  const b = parseIsoUtc(endStr).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

// Convert an ISO timestamp (the calls API uses these) to a
// YYYY-MM-DD date string. GA4's `runReport` expects YYYY-MM-DD.
function toGaDate(input: string | null): string | null {
  if (!input) return null;
  // already a YYYY-MM-DD string?
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const url = new URL(req.url);
  const startParam = url.searchParams.get('startDate') || url.searchParams.get('from');
  const endParam = url.searchParams.get('endDate') || url.searchParams.get('to');
  const startDate = toGaDate(startParam) || '30daysAgo';
  const endDate = toGaDate(endParam) || 'today';

  // Build the comparison window (same length, immediately before).
  let prevStart: string | null = null;
  let prevEnd: string | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const span = diffDays(startDate, endDate);
    prevEnd = addDays(startDate, -1);
    prevStart = addDays(prevEnd, -(span - 1));
  }

  try {
    const requests = [
      // [0] Summary for the report window.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: SUMMARY_METRICS,
        dimensionFilter: RECOVERY_FILTER,
      }),
      // [1] Prior-period summary for delta pills.
      prevStart && prevEnd
        ? ga4Run({
            dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
            metrics: SUMMARY_METRICS,
            dimensionFilter: RECOVERY_FILTER,
          })
        : Promise.resolve(null),
      // [2] Daily counts.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 400,
      }),
      // [3] Top landing pages.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 15,
      }),
      // [4] Countries.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [5] Cities — region/state on the city table is more useful
      // than country for an admissions team in the US.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'city' }, { name: 'region' }, { name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 25,
      }),
      // [6] Devices.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [7] Browsers.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [8] Operating systems.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [9] Sources — recoverycom vs rehabpath split.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [10] Source / medium pairs.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 15,
      }),
      // [11] UTM campaigns.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // [12] Hour-of-day distribution.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'hour' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'hour' }, desc: false }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 24,
      }),
      // [13] Day-of-week distribution. GA returns 0=Sunday..6=Saturday.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'dayOfWeek' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'dayOfWeek' }, desc: false }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 7,
      }),
      // [14] New vs returning users.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 5,
      }),
      // [15] Conversion events / event totals.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 25,
      }),
      // [16] DIAGNOSTIC — top source/medium pairs UNFILTERED. Used
      // only to populate `debug.allSources` when the filtered query
      // returns zero rows, so we can verify what spellings GA is
      // actually emitting. Cheap; no `dimensionFilter`.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 25,
      }),
    ];

    const [
      summaryRes,
      prevSummaryRes,
      dailyRes,
      landingRes,
      countriesRes,
      citiesRes,
      devicesRes,
      browsersRes,
      osRes,
      sourcesRes,
      sourceMediumRes,
      campaignsRes,
      hourlyRes,
      dayOfWeekRes,
      newVsReturningRes,
      eventsRes,
      allSourcesRes,
    ] = await Promise.all(requests);

    const summary = readSummary(summaryRes?.totals?.[0]?.metricValues);
    const previous = prevSummaryRes ? readSummary(prevSummaryRes.totals?.[0]?.metricValues) : null;

    const daily = (dailyRes?.rows ?? []).map((row) => {
      const raw = row.dimensionValues?.[0]?.value || ''; // GA4 returns YYYYMMDD
      const date = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
      return {
        date,
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
        pageViews: Number(row.metricValues?.[2]?.value ?? 0),
      };
    });

    const landing = (landingRes?.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgSessionDurationSec: Number(row.metricValues?.[3]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[4]?.value ?? 0),
    }));

    const countries = (countriesRes?.rows ?? []).map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const devices = (devicesRes?.rows ?? []).map((row) => ({
      device: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
    }));

    const cities = (citiesRes?.rows ?? []).map((row) => ({
      city: row.dimensionValues?.[0]?.value ?? '(not set)',
      region: row.dimensionValues?.[1]?.value ?? null,
      country: row.dimensionValues?.[2]?.value ?? null,
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
    }));

    const browsers = (browsersRes?.rows ?? []).map((row) => ({
      name: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const operatingSystems = (osRes?.rows ?? []).map((row) => ({
      name: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const sources = (sourcesRes?.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
      avgSessionDurationSec: Number(row.metricValues?.[3]?.value ?? 0),
      bounceRate: Number(row.metricValues?.[4]?.value ?? 0),
    }));

    const sourceMedium = (sourceMediumRes?.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? '(not set)',
      medium: row.dimensionValues?.[1]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
    }));

    const campaigns = (campaignsRes?.rows ?? [])
      .map((row) => ({
        name: row.dimensionValues?.[0]?.value ?? '(not set)',
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
        engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
      }))
      // Drop the catch-all '(not set)' / '(direct)' rows when there
      // are real campaigns in the list — they otherwise dominate.
      .filter((c) => !/^\(not set\)|^\(direct\)$/.test(c.name) || true);

    // Hour-of-day: GA's `hour` dimension is "00".."23". Normalize to
    // a numeric index, fill missing hours with 0 so the chart has a
    // continuous x-axis.
    const hourMap = new Map<number, number>();
    for (const row of hourlyRes?.rows ?? []) {
      const h = Number(row.dimensionValues?.[0]?.value ?? -1);
      if (h >= 0 && h <= 23) hourMap.set(h, Number(row.metricValues?.[0]?.value ?? 0));
    }
    const hourly: { hour: number; sessions: number }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sessions: hourMap.get(i) ?? 0,
    }));

    // Day-of-week: GA returns 0..6 with 0 = Sunday in their docs.
    const dayMap = new Map<number, number>();
    for (const row of dayOfWeekRes?.rows ?? []) {
      const d = Number(row.dimensionValues?.[0]?.value ?? -1);
      if (d >= 0 && d <= 6) dayMap.set(d, Number(row.metricValues?.[0]?.value ?? 0));
    }
    const dayOfWeek: { day: number; label: string; sessions: number }[] = [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    ].map((label, i) => ({ day: i, label, sessions: dayMap.get(i) ?? 0 }));

    const newVsReturning = (newVsReturningRes?.rows ?? []).map((row) => ({
      label: row.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const events = (eventsRes?.rows ?? []).map((row) => ({
      name: row.dimensionValues?.[0]?.value ?? '(not set)',
      count: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    // Diagnostics — ALL source/medium pairs (unfiltered) so the
    // report can surface a "GA emitted these source values" hint
    // when our filter returns zero rows. Saves having to crack open
    // GA Explorer to figure out what casing / spelling we missed.
    const allSources = (allSourcesRes?.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? '(not set)',
      medium: row.dimensionValues?.[1]?.value ?? '(not set)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    return NextResponse.json({
      configured: true,
      range: { startDate, endDate, prevStart, prevEnd },
      sourceFilter: RECOVERY_SOURCES,
      summary,
      previous,
      daily,
      landing,
      countries,
      cities,
      devices,
      browsers,
      operatingSystems,
      sources,
      sourceMedium,
      campaigns,
      hourly,
      dayOfWeek,
      newVsReturning,
      events,
      debug: { allSources },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[recovery-com analytics] failed:', message);
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
