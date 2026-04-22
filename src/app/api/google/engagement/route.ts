import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/engagement?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Engagement + behavior data powering the Engagement section:
//   - summary:     engaged sessions, engagement rate, eventCount, avg
//                  engagement time per session, new vs returning totals
//   - heatmap:     day-of-week × hour-of-day sessions (for a heatmap grid)
//   - events:      top event names with count + unique users
//   - newVsReturning: split by newVsReturning dimension

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || '30daysAgo';
  const endDate = url.searchParams.get('endDate') || 'today';

  try {
    const [summaryRes, heatmapRes, eventsRes, nvrRes] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'engagedSessions' },
          { name: 'engagementRate' },
          { name: 'eventCount' },
          { name: 'userEngagementDuration' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViewsPerSession' },
        ],
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'dayOfWeek' }, { name: 'hour' }],
        metrics: [{ name: 'sessions' }],
        limit: 200,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
      }),
    ]);

    const s = summaryRes.rows?.[0]?.metricValues ?? [];
    const summary = {
      engagedSessions: Number(s[0]?.value ?? 0),
      engagementRate: Number(s[1]?.value ?? 0),
      eventCount: Number(s[2]?.value ?? 0),
      userEngagementDurationSec: Number(s[3]?.value ?? 0),
      avgSessionDurationSec: Number(s[4]?.value ?? 0),
      pagesPerSession: Number(s[5]?.value ?? 0),
    };

    // Heatmap grid: 7 rows (0=Sunday) × 24 cols. Fill zeros for absent cells.
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of heatmapRes.rows ?? []) {
      const dow = Number(r.dimensionValues?.[0]?.value ?? -1);
      const hr = Number(r.dimensionValues?.[1]?.value ?? -1);
      const v = Number(r.metricValues?.[0]?.value ?? 0);
      if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) heatmap[dow][hr] = v;
    }

    const events = (eventsRes.rows ?? []).map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? 'unknown',
      count: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const newVsReturning = (nvrRes.rows ?? []).map((r) => ({
      bucket: r.dimensionValues?.[0]?.value ?? '(not set)',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    return NextResponse.json({
      range: { startDate, endDate },
      summary,
      heatmap,
      events,
      newVsReturning,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
