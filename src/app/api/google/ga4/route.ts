import { NextResponse } from 'next/server';
import { requirePageAccess } from '@/lib/page-access';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/ga4?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&compare=prev
// Admin-only. Returns:
//   - summary:     site-wide metrics for the range
//   - previous:    same metrics for the prior period of equal length (when
//                  ?compare=prev is set — used by the Overview %Δ pills)
//   - daily:       per-day sessions / users / pageviews (powers the trend
//                  chart and sparklines)
//   - channels:    default channel grouping, sessions descending
//   - topPages:    landing pages ranked by sessions
//
// Backward compat: ?days=N still works. startDate/endDate win when both
// query styles are present.

export const dynamic = 'force-dynamic';

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function parseIsoUtc(dateStr: string): Date {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(yy, mo - 1, dd));
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

const SUMMARY_METRICS = [
  { name: 'sessions' },
  { name: 'activeUsers' },
  { name: 'newUsers' },
  { name: 'screenPageViews' },
  { name: 'averageSessionDuration' },
  { name: 'bounceRate' },
];

interface SummaryValues {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
}

function readSummary(rowValues: { value?: string }[] | undefined): SummaryValues {
  const v = rowValues ?? [];
  return {
    sessions: Number(v[0]?.value ?? 0),
    activeUsers: Number(v[1]?.value ?? 0),
    newUsers: Number(v[2]?.value ?? 0),
    pageViews: Number(v[3]?.value ?? 0),
    avgSessionDurationSec: Number(v[4]?.value ?? 0),
    bounceRate: Number(v[5]?.value ?? 0),
  };
}

export async function GET(req: Request) {
  const { error: authError } = await requirePageAccess('/app/analytics');
  if (authError) return authError;

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json(
      { error: 'GA4 not configured (GOOGLE_OAUTH_* and GA4_PROPERTY_ID required)' },
      { status: 412 }
    );
  }

  const url = new URL(req.url);
  const qStart = url.searchParams.get('startDate');
  const qEnd = url.searchParams.get('endDate');
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '28')));
  const startDate = qStart || daysAgo(days);
  const endDate = qEnd || daysAgo(0);
  const withCompare = url.searchParams.get('compare') === 'prev';

  const rangeDays = diffDays(startDate, endDate);
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(prevEnd, -(rangeDays - 1));

  try {
    const fetches: Promise<unknown>[] = [
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: SUMMARY_METRICS,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'newUsers' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 400,
      }),
      // Per-day organic-search breakdown. Same date dimension as the
      // totals query above, but filtered to sessionDefaultChannelGroup
      // = 'Organic Search' and pulling the full metric set so the
      // chart can overlay sessions / users / new users / page views /
      // engagement rate without forcing client-side re-aggregation
      // (cross-channel sums of activeUsers would double-count people
      // who arrived via multiple channels in the same day).
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: { value: 'Organic Search' },
          },
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 400,
      }),
    ];
    if (withCompare) {
      fetches.push(
        ga4Run({
          dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
          metrics: SUMMARY_METRICS,
        })
      );
    }

    const results = await Promise.all(fetches);
    const summaryRes = results[0] as { rows?: { metricValues?: { value?: string }[] }[] };
    const channelsRes = results[1] as { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };
    const topPagesRes = results[2] as { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };
    const dailyRes = results[3] as { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };
    const organicDailyRes = results[4] as { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };
    const prevRes = withCompare
      ? (results[5] as { rows?: { metricValues?: { value?: string }[] }[] })
      : null;

    // Per-day organic-search facets, keyed by YYYYMMDD. Dates with no
    // organic traffic aren't returned by GA4 — fall through to 0.
    // Engagement rate comes back as 0.0–1.0 (e.g. 0.62 = 62%).
    interface OrganicFacets {
      sessions: number;
      activeUsers: number;
      newUsers: number;
      pageViews: number;
      engagementRate: number;
    }
    const organicByDate = new Map<string, OrganicFacets>();
    for (const r of organicDailyRes.rows ?? []) {
      const d = r.dimensionValues?.[0]?.value ?? '';
      if (!/^\d{8}$/.test(d)) continue;
      organicByDate.set(d, {
        sessions: Number(r.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
        newUsers: Number(r.metricValues?.[2]?.value ?? 0),
        pageViews: Number(r.metricValues?.[3]?.value ?? 0),
        engagementRate: Number(r.metricValues?.[4]?.value ?? 0),
      });
    }

    const summary = readSummary(summaryRes.rows?.[0]?.metricValues);
    const previous = prevRes ? readSummary(prevRes.rows?.[0]?.metricValues) : null;

    const channels = (channelsRes.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? 'unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const topPages = (topPagesRes.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const dailyRaw = (dailyRes.rows ?? [])
      .map((r) => ({
        date: r.dimensionValues?.[0]?.value ?? '',
        sessions: Number(r.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
        pageViews: Number(r.metricValues?.[2]?.value ?? 0),
        newUsers: Number(r.metricValues?.[3]?.value ?? 0),
        // Flat organic columns the chart reads. Older callers that
        // only knew about `organicSearch` keep the alias intact.
        organicSearch: 0,
        organicSessions: 0,
        organicActiveUsers: 0,
        organicNewUsers: 0,
        organicPageViews: 0,
        organicEngagementRate: 0,
      }))
      .filter((d) => /^\d{8}$/.test(d.date))
      .map((d) => {
        const o = organicByDate.get(d.date);
        return {
          ...d,
          organicSearch: o?.sessions ?? 0,
          organicSessions: o?.sessions ?? 0,
          organicActiveUsers: o?.activeUsers ?? 0,
          organicNewUsers: o?.newUsers ?? 0,
          organicPageViews: o?.pageViews ?? 0,
          // Store the GA-native 0–1 rate so the chart can format as %.
          organicEngagementRate: o?.engagementRate ?? 0,
          date: `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      range: { startDate, endDate, days: rangeDays },
      previousRange: withCompare ? { startDate: prevStart, endDate: prevEnd, days: rangeDays } : null,
      summary,
      previous,
      daily: dailyRaw,
      channels,
      topPages,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
