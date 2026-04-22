import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { gscSearchAnalytics, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/search-console?days=28
// Admin-only. Returns site-wide totals, top queries, and top pages from
// Search Console for the last N days. Wired into /app/seo.

export const dynamic = 'force-dynamic';

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GSC_SITE_URL) {
    return NextResponse.json(
      { error: 'Search Console not configured (GOOGLE_OAUTH_* and GSC_SITE_URL required)' },
      { status: 412 }
    );
  }

  const url = new URL(req.url);
  const qStart = url.searchParams.get('startDate');
  const qEnd = url.searchParams.get('endDate');
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '28')));
  // Search Console data lags ~2 days. When the caller supplies explicit
  // dates we still clamp the end to "today - 2" so queries for very recent
  // ranges don't come back empty.
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - 2);
  const gscCap = today.toISOString().slice(0, 10);
  const startDate = qStart || daysAgo(days + 2);
  const endDate = qEnd && qEnd < gscCap ? qEnd : qEnd ? gscCap : daysAgo(2);

  try {
    const [totals, topQueries, topPages] = await Promise.all([
      gscSearchAnalytics({ startDate, endDate, rowLimit: 1 }),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 25,
      }),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 25,
      }),
    ]);

    const siteTotals = totals.rows?.[0] ?? {};
    const summaryOut = {
      clicks: Number(siteTotals.clicks ?? 0),
      impressions: Number(siteTotals.impressions ?? 0),
      ctr: Number(siteTotals.ctr ?? 0),
      position: Number(siteTotals.position ?? 0),
    };

    const queryRows = (topQueries.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? '',
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    const pageRows = (topPages.rows ?? []).map((r) => ({
      page: r.keys?.[0] ?? '',
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    return NextResponse.json({
      range: { startDate, endDate, days },
      site: process.env.GSC_SITE_URL,
      summary: summaryOut,
      topQueries: queryRows,
      topPages: pageRows,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
