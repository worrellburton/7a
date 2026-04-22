import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/pages?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Content performance for the Pages section:
//   - allPages:     pagePath with views + users + avg engagement time +
//                   scroll/exit signals
//   - landingPages: entry pages with bounce/engagement/pages-per-session
//   - exitPages:    sessions ending on a given page
//   - groups:       rollups by top-level path segment (/admissions,
//                   /our-program, /what-we-treat, /who-we-are, /treatment,
//                   /insurance, /locations, / blog, …)

export const dynamic = 'force-dynamic';

function pageGroup(path: string): string {
  if (!path || path === '/') return '/ (home)';
  const first = path.split('?')[0].split('#')[0].split('/').filter(Boolean)[0];
  if (!first) return '/ (home)';
  return `/${first}`;
}

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
    const [allPagesRes, landingRes, exitRes] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 200,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViewsPerSession' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 50,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'bounceRate' }, desc: true }],
        limit: 30,
      }),
    ]);

    const allPages = (allPagesRes.rows ?? []).map((r) => {
      const path = r.dimensionValues?.[0]?.value ?? '';
      const pageViews = Number(r.metricValues?.[0]?.value ?? 0);
      const activeUsers = Number(r.metricValues?.[1]?.value ?? 0);
      const totalEngagementSec = Number(r.metricValues?.[2]?.value ?? 0);
      const engagementRate = Number(r.metricValues?.[3]?.value ?? 0);
      return {
        path,
        pageViews,
        activeUsers,
        avgEngagementSec: activeUsers ? totalEngagementSec / activeUsers : 0,
        engagementRate,
      };
    });

    const landing = (landingRes.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(r.metricValues?.[2]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[3]?.value ?? 0),
      avgDurationSec: Number(r.metricValues?.[4]?.value ?? 0),
      pagesPerSession: Number(r.metricValues?.[5]?.value ?? 0),
    }));

    // Exit-rate proxy: rank by bounce rate × sessions so we surface real
    // problem pages, not one-visit outliers.
    const exits = (exitRes.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      bounceRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));
    const highBounce = exits
      .filter((e) => e.sessions >= 10)
      .sort((a, b) => b.bounceRate * b.sessions - a.bounceRate * a.sessions)
      .slice(0, 10);

    // Page groups: sum page views / users / total engagement by top-level
    // path segment.
    const groupMap = new Map<string, { pageViews: number; users: number; engagementSec: number }>();
    for (const p of allPages) {
      const g = pageGroup(p.path);
      const prev = groupMap.get(g) ?? { pageViews: 0, users: 0, engagementSec: 0 };
      groupMap.set(g, {
        pageViews: prev.pageViews + p.pageViews,
        users: prev.users + p.activeUsers,
        engagementSec: prev.engagementSec + p.avgEngagementSec * p.activeUsers,
      });
    }
    const groups = Array.from(groupMap.entries())
      .map(([group, v]) => ({
        group,
        pageViews: v.pageViews,
        activeUsers: v.users,
        avgEngagementSec: v.users ? v.engagementSec / v.users : 0,
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    return NextResponse.json({
      range: { startDate, endDate },
      allPages: allPages.slice(0, 50),
      landing,
      highBounce,
      groups,
      totalPageViews: allPages.reduce((s, p) => s + p.pageViews, 0),
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
