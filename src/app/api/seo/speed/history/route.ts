import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// GET /api/seo/speed/history?url=<url>
//
// Admin-only. Returns the time-series for one URL across both
// strategies — performance score + LCP — for the sparkline charts on
// the Speed page. Capped at the last 60 runs per strategy so a
// long-running URL doesn't bloat the response.

export const dynamic = 'force-dynamic';

const MAX_POINTS = 60;

interface HistoryPoint {
  ran_at: string;
  strategy: 'mobile' | 'desktop';
  performance: number | null;
  lcp: number | null;
  cls: number | null;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url).searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing `url` query param.' }, { status: 400 });
  }

  const { data, error } = await gate.admin
    .from('seo_speed_runs')
    .select('ran_at, strategy, performance, lcp, cls')
    .eq('url', url)
    .order('ran_at', { ascending: true })
    .limit(MAX_POINTS * 2);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const points = (data ?? []) as HistoryPoint[];
  const mobile = points.filter((p) => p.strategy === 'mobile').slice(-MAX_POINTS);
  const desktop = points.filter((p) => p.strategy === 'desktop').slice(-MAX_POINTS);

  return NextResponse.json({ url, mobile, desktop });
}
