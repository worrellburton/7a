import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/ga4?days=28
// Admin-only. Returns a summary of site-wide GA4 metrics for the last N days
// plus the top landing pages by sessions. Wired into /app/analytics.

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

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json(
      { error: 'GA4 not configured (GOOGLE_OAUTH_* and GA4_PROPERTY_ID required)' },
      { status: 412 }
    );
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '28')));
  const startDate = daysAgo(days);
  const endDate = 'today';

  try {
    const [summary, channels, topPages] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
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
    ]);

    const totals = summary.totals?.[0]?.metricValues ?? [];
    const summaryOut = {
      sessions: Number(totals[0]?.value ?? 0),
      activeUsers: Number(totals[1]?.value ?? 0),
      pageViews: Number(totals[2]?.value ?? 0),
      avgSessionDurationSec: Number(totals[3]?.value ?? 0),
      bounceRate: Number(totals[4]?.value ?? 0),
    };

    const channelRows = (channels.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? 'unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const pageRows = (topPages.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    return NextResponse.json({
      range: { startDate, endDate, days },
      summary: summaryOut,
      channels: channelRows,
      topPages: pageRows,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
