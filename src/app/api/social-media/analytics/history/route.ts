import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/social-media/analytics/history
//
// Returns the latest snapshot per platform from
// social_media_analytics_snapshots. The AnalyticsPanel reads this
// instead of hitting Ayrshare on every page load — Ayrshare bills
// per call, and the daily cron at /api/cron/social-media/analytics
// keeps the table fresh.
//
// `?platform=foo` scopes to one platform's history (newest 30
// snapshots) for future trend-line visualizations. Default returns
// the latest row per platform, keyed by platform name.

export const dynamic = 'force-dynamic';

interface SnapshotRow {
  id: string;
  captured_at: string;
  platform: string;
  raw: Record<string, unknown> | null;
  source: string;
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  const admin = getAdminSupabase();

  // ── Single-platform history mode ──────────────────────────────
  if (platform) {
    const { data, error } = await admin
      .from('social_media_analytics_snapshots')
      .select('id, captured_at, platform, raw, source')
      .eq('platform', platform)
      .order('captured_at', { ascending: false })
      .limit(30);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ snapshots: (data ?? []) as SnapshotRow[] });
  }

  // ── Latest-per-platform mode ──────────────────────────────────
  // Pull the most recent rows (cap at a generous batch) and reduce
  // client-side to one row per platform. A SQL DISTINCT ON would
  // be ideal but supabase-js doesn't expose it cleanly; the row
  // count is small enough that the JS reduce is cheap.
  const { data, error } = await admin
    .from('social_media_analytics_snapshots')
    .select('id, captured_at, platform, raw, source')
    .order('captured_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latest = new Map<string, SnapshotRow>();
  for (const row of (data ?? []) as SnapshotRow[]) {
    if (!latest.has(row.platform)) latest.set(row.platform, row);
  }

  return NextResponse.json({
    latest: Object.fromEntries(latest),
    platforms: Array.from(latest.keys()),
  });
}
