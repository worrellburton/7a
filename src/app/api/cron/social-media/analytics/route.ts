import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { ayrshareGet, ayrsharePost, AyrshareNotConfigured, extractAyrshareError } from '@/lib/ayrshare';

// Daily Ayrshare analytics snapshot writer. Vercel cron hits this
// once a day with `Authorization: Bearer ${CRON_SECRET}`; we fan
// out to /user (to discover which platforms are connected), then
// /analytics/social with that list, and write one row per platform
// to social_media_analytics_snapshots.
//
// Idempotent for the day: if the cron fires twice in the same UTC
// day we just write a second row — the time-series stays intact
// and the "latest snapshot" query picks the freshest row by
// captured_at desc anyway.
//
// Manual triggers (the Refresh button in the AnalyticsPanel) hit
// the same handler with `source=manual` so the team can force a
// fresh write outside the daily window.

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  const viaCron = !!(expectedSecret && authHeader === `Bearer ${expectedSecret}`);
  // Manual trigger from the Social Media admin page — we don't
  // require an auth session here because the page itself is
  // already gated by the Marketing & Admissions dept; the manual
  // POST passes the same CRON_SECRET via a server-side proxy
  // route at /api/social-media/analytics/refresh (phase 5).
  if (!viaCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const source = url.searchParams.get('source') === 'manual' ? 'manual' : 'cron';
  const admin = getAdminSupabase();

  try {
    // Step 1: discover connected platforms via /user.
    const userResp = await ayrshareGet('/user');
    if (userResp.status >= 400) {
      const err = extractAyrshareError(userResp.body, userResp.status, '/user');
      return NextResponse.json({ error: `Failed to load /user: ${err}` }, { status: 502 });
    }
    const activeRaw = (userResp.body as { activeSocialAccounts?: unknown }).activeSocialAccounts;
    const platforms = Array.isArray(activeRaw)
      ? activeRaw.filter((v): v is string => typeof v === 'string')
      : [];
    if (platforms.length === 0) {
      return NextResponse.json({ ok: true, written: 0, note: 'no platforms connected' });
    }

    // Step 2: fetch /analytics/social for the connected set.
    const analyticsResp = await ayrsharePost('/analytics/social', { platforms });
    if (analyticsResp.status >= 400) {
      const err = extractAyrshareError(analyticsResp.body, analyticsResp.status, '/analytics/social');
      return NextResponse.json({ error: `Analytics fetch failed: ${err}` }, { status: 502 });
    }

    // Step 3: write one row per platform.
    const blob = analyticsResp.body as Record<string, unknown>;
    const rows = platforms
      .filter((p) => blob[p] && typeof blob[p] === 'object')
      .map((p) => ({
        platform: p,
        raw: blob[p] as Record<string, unknown>,
        source,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, written: 0, note: 'no platform data in response' });
    }

    const { error: insertErr } = await admin
      .from('social_media_analytics_snapshots')
      .insert(rows);
    if (insertErr) {
      return NextResponse.json({ error: `Insert failed: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      written: rows.length,
      platforms,
      source,
    });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
