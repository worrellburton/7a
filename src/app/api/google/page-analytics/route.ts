import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, ga4RunRealtime, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/page-analytics?path=/who-we-are/blog/<slug>&days=30
//
// Per-page deep dive used by /app/content's per-row "Analytics"
// expander. Returns everything you'd want at a glance for one blog:
//
//   - totals:      pageViews / activeUsers / avgEngagementSec /
//                  bounceRate / engagementRate / scroll signal
//   - daily:       30-day sparkline (date + pageViews + activeUsers)
//   - sources:     channel grouping (organic, social, direct, …) +
//                  raw source/medium pairs
//   - countries:   top countries the page reaches
//   - devices:     desktop / mobile / tablet split
//   - referrers:   top external referrers
//   - realtime:    activeUsers right now on the page
//
// Admin-only. The path filter is exact-match on `pagePath` so a slug
// like /who-we-are/blog/foo is unambiguous.

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase
    .from('users')
    .select('is_admin, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin && !row?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? '30')));
  const startDate = `${days}daysAgo`;
  const endDate = 'today';

  const pageFilter = {
    filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: path } },
  } as const;

  try {
    const [totalsRes, dailyRes, channelRes, sourceRes, countryRes, deviceRes, referrerRes, realtimeRes] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
          { name: 'sessions' },
          { name: 'newUsers' },
        ],
        dimensionFilter: pageFilter,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        dimensionFilter: pageFilter,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 15,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 8,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'engagementRate' }],
        dimensionFilter: pageFilter,
        limit: 6,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pageReferrer' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 10,
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 1,
      }).catch(() => ({ rows: [] })),
    ]);

    const tv = totalsRes.rows?.[0]?.metricValues ?? [];
    const num = (i: number) => Number(tv[i]?.value ?? 0);
    const pageViews = num(0);
    const activeUsers = num(1);
    const totalEngagement = num(2);
    const totals = {
      pageViews,
      activeUsers,
      avgEngagementSec: activeUsers ? totalEngagement / activeUsers : 0,
      bounceRate: num(3),
      engagementRate: num(4),
      sessions: num(5),
      newUsers: num(6),
    };

    const daily = (dailyRes.rows ?? []).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      pageViews: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const channels = (channelRes.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? '(unset)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      pageViews: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    const sources = (sourceRes.rows ?? []).map((r) => ({
      source: r.dimensionValues?.[0]?.value ?? '(direct)',
      medium: r.dimensionValues?.[1]?.value ?? '(none)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const countries = (countryRes.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? '(unknown)',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      pageViews: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const devices = (deviceRes.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? '(unknown)',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      pageViews: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    const referrers = (referrerRes.rows ?? [])
      .map((r) => ({
        referrer: r.dimensionValues?.[0]?.value ?? '(direct)',
        sessions: Number(r.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      }))
      .filter((r) => r.referrer && r.referrer !== '(not set)');

    // Realtime is property-wide rather than per-page (GA4 realtime
    // doesn't expose pagePath in the same shape as standard reports
    // for arbitrary properties); we still surface property-wide
    // active users as a "site live" indicator alongside the card.
    const realtimeActiveUsers = Number(realtimeRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);

    return NextResponse.json({
      path,
      range: { startDate, endDate, days },
      totals,
      daily,
      channels,
      sources,
      countries,
      devices,
      referrers,
      realtimeActiveUsers,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
