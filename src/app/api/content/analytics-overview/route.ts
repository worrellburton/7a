import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { EPISODES, episodeHref } from '@/lib/episodes';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/content/analytics-overview?days=30
//
// One-shot GA4 roll-up for /feather/content/analytics. Pulls per-page
// metrics across every blog the site is allowed to publish:
//
//   · AI-pipeline rows from public.blogs (any status; we still want
//     drafts to show 0 so the editor can see what isn't published).
//   · The static EPISODES catalogue (hand-coded posts).
//
// Calls GA4 once with `inListFilter` on `pagePath`, dimension
// `pagePath`, metrics `screenPageViews`, `activeUsers`, `sessions`,
// `userEngagementDuration`, `engagementRate`, `bounceRate`,
// `newUsers`. Cheaper than N round-trips (one per blog), and the
// per-row Analytics expander still hits /api/google/page-analytics
// for the deeper detail.
//
// Plus a property-wide top channels + countries breakdown so the
// page has aggregate context next to the per-blog table.
//
// Admin-only. Quiet-fails to {ok:false, configured:false} when
// GA4 isn't wired up (so the page can render a clear "configure
// GA4" empty state instead of a generic 500).

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface BlogMeta {
  path: string;
  title: string;
  slug: string;
  source: 'ai' | 'static';
  status?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  episodeNumber?: number | null;
  authorSlug?: string;
}

interface Totals {
  pageViews: number;
  activeUsers: number;
  sessions: number;
  newUsers: number;
  avgEngagementSec: number;
  engagementRate: number;
  bounceRate: number;
}

interface BlogRow extends BlogMeta {
  pageViews: number;
  activeUsers: number;
  sessions: number;
  avgEngagementSec: number;
  engagementRate: number;
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(365, Number(url.searchParams.get('days') ?? '30')));
  const startDate = `${days}daysAgo`;
  const endDate = 'today';

  // Compose the blog catalogue first — even when GA4 isn't
  // configured the page still wants to render the list of blogs
  // with zeroed metrics.
  const admin = getAdminSupabase();
  const { data: dbRows, error: dbErr } = await admin
    .from('blogs')
    .select('id, slug, title, status, published_at, updated_at')
    .order('updated_at', { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const maxStatic = EPISODES.reduce((m, e) => Math.max(m, e.number), 0);
  const publishedAiSorted = (dbRows ?? [])
    .filter((r) => r.status === 'published' && r.published_at)
    .sort((a, b) => (a.published_at! < b.published_at! ? -1 : 1));
  const aiEpisodeNumber = new Map<string, number>();
  publishedAiSorted.forEach((r, idx) => aiEpisodeNumber.set(r.id, maxStatic + idx + 1));

  const catalogue: BlogMeta[] = [];
  for (const ep of EPISODES) {
    catalogue.push({
      path: episodeHref(ep.slug),
      title: ep.title,
      slug: ep.slug,
      source: 'static',
      episodeNumber: ep.number,
      authorSlug: ep.authorSlug,
    });
  }
  for (const r of dbRows ?? []) {
    catalogue.push({
      path: `/who-we-are/blog/${r.slug}`,
      title: (r.title as string | null) ?? '(Untitled)',
      slug: r.slug as string,
      source: 'ai',
      status: r.status as string,
      publishedAt: (r.published_at as string | null) ?? null,
      updatedAt: (r.updated_at as string | null) ?? null,
      episodeNumber: aiEpisodeNumber.get(r.id as string) ?? null,
    });
  }

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({
      configured: false,
      range: { startDate, endDate, days },
      totals: zeroTotals(),
      blogs: catalogue.map((b): BlogRow => ({ ...b, pageViews: 0, activeUsers: 0, sessions: 0, avgEngagementSec: 0, engagementRate: 0 })),
      channels: [],
      countries: [],
      devices: [],
    });
  }

  const paths = Array.from(new Set(catalogue.map((b) => b.path)));
  // GA4's inListFilter expects up to ~10k values; 200 blog paths
  // is well under that ceiling.
  const pageFilter = {
    filter: { fieldName: 'pagePath', inListFilter: { values: paths } },
  } as const;

  try {
    const [perPageRes, totalsRes, channelRes, countryRes, deviceRes] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 500,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
        ],
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
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        dimensionFilter: pageFilter,
        limit: 12,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'engagementRate' }],
        dimensionFilter: pageFilter,
        limit: 6,
      }),
    ]);

    const perPageByPath = new Map<string, { pageViews: number; activeUsers: number; sessions: number; engagementSec: number; engagementRate: number }>();
    for (const row of perPageRes.rows ?? []) {
      const p = row.dimensionValues?.[0]?.value ?? '';
      if (!p) continue;
      perPageByPath.set(p, {
        pageViews: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
        sessions: Number(row.metricValues?.[2]?.value ?? 0),
        engagementSec: Number(row.metricValues?.[3]?.value ?? 0),
        engagementRate: Number(row.metricValues?.[4]?.value ?? 0),
      });
    }

    const blogs: BlogRow[] = catalogue.map((b) => {
      const m = perPageByPath.get(b.path);
      const activeUsers = m?.activeUsers ?? 0;
      return {
        ...b,
        pageViews: m?.pageViews ?? 0,
        activeUsers,
        sessions: m?.sessions ?? 0,
        avgEngagementSec: activeUsers > 0 && m ? m.engagementSec / activeUsers : 0,
        engagementRate: m?.engagementRate ?? 0,
      };
    });

    const tv = totalsRes.rows?.[0]?.metricValues ?? [];
    const num = (i: number) => Number(tv[i]?.value ?? 0);
    const totalsActiveUsers = num(1);
    const totalsEngSec = num(4);
    const totals: Totals = {
      pageViews: num(0),
      activeUsers: totalsActiveUsers,
      sessions: num(2),
      newUsers: num(3),
      avgEngagementSec: totalsActiveUsers > 0 ? totalsEngSec / totalsActiveUsers : 0,
      engagementRate: num(5),
      bounceRate: num(6),
    };

    const channels = (channelRes.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? '(unset)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      pageViews: Number(r.metricValues?.[2]?.value ?? 0),
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

    return NextResponse.json({
      configured: true,
      range: { startDate, endDate, days },
      totals,
      blogs,
      channels,
      countries,
      devices,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      error: e instanceof Error ? e.message : String(e),
      range: { startDate, endDate, days },
      totals: zeroTotals(),
      blogs: catalogue.map((b): BlogRow => ({ ...b, pageViews: 0, activeUsers: 0, sessions: 0, avgEngagementSec: 0, engagementRate: 0 })),
      channels: [],
      countries: [],
      devices: [],
    }, { status: 503 });
  }
}

function zeroTotals(): Totals {
  return { pageViews: 0, activeUsers: 0, sessions: 0, newUsers: 0, avgEngagementSec: 0, engagementRate: 0, bounceRate: 0 };
}
