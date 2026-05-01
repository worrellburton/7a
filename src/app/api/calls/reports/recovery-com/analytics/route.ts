import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/calls/reports/recovery-com/analytics
//   ?startDate=YYYY-MM-DD
//   &endDate=YYYY-MM-DD
//
// Pulls the GA4 slice of traffic that arrived from Recovery.com so
// we can pair it with the call-side report. We filter on
// sessionSource ~= "recovery.com" (CONTAINS, case-insensitive) so a
// referrer host of "recovery.com", "www.recovery.com", or
// "recovery.com / referral" all flow into the same bucket.
//
// Returns:
//   summary    site metrics for the window (sessions, users, ...)
//   previous   same metrics for the prior period of equal length
//   daily      per-day sessions + users so the report can chart it
//   landing    top landing pages by sessions
//   countries  top sessionCountry rows
//   devices    deviceCategory breakdown (desktop / mobile / tablet)
//   events     conversion / event totals (event_count by name)

export const dynamic = 'force-dynamic';

const RECOVERY_FILTER = {
  filter: {
    fieldName: 'sessionSource',
    stringFilter: { value: 'recovery.com', matchType: 'CONTAINS' as const },
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
      // Summary for the report window.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: SUMMARY_METRICS,
        dimensionFilter: RECOVERY_FILTER,
      }),
      // Prior-period summary for delta pills.
      prevStart && prevEnd
        ? ga4Run({
            dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
            metrics: SUMMARY_METRICS,
            dimensionFilter: RECOVERY_FILTER,
          })
        : Promise.resolve(null),
      // Daily counts.
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
      // Top landing pages.
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
      // Countries.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // Devices.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 10,
      }),
      // Conversion events / event totals.
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        dimensionFilter: RECOVERY_FILTER,
        limit: 25,
      }),
    ];

    const [summaryRes, prevSummaryRes, dailyRes, landingRes, countriesRes, devicesRes, eventsRes] = await Promise.all(requests);

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

    const events = (eventsRes?.rows ?? []).map((row) => ({
      name: row.dimensionValues?.[0]?.value ?? '(not set)',
      count: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    return NextResponse.json({
      configured: true,
      range: { startDate, endDate, prevStart, prevEnd },
      summary,
      previous,
      daily,
      landing,
      countries,
      devices,
      events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[recovery-com analytics] failed:', message);
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
