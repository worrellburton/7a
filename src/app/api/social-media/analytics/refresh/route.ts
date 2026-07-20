import { NextResponse } from 'next/server';

import { requireSocialViewAccess } from '@/lib/social-media-auth';

// POST /api/social-media/analytics/refresh
//
// Manual trigger for the daily analytics cron. The Refresh button
// in the AnalyticsPanel hits this; we proxy server-side to
// /api/cron/social-media/analytics?source=manual using the
// CRON_SECRET so the cron handler's auth gate stays intact.
//
// Why a proxy: the cron handler accepts `Authorization: Bearer
// $CRON_SECRET` (matches every other cron route) and the secret
// can't be exposed to the browser. Forwarding here lets the team
// trigger an on-demand snapshot without us widening the cron's
// auth surface.

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireSocialViewAccess();
  if (auth.response) return auth.response;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured. Set it in Vercel env.' },
      { status: 503 },
    );
  }

  // Build the absolute URL to the cron handler. Vercel sets
  // x-forwarded-proto + host on every incoming request; falling
  // back to req.url means dev servers still resolve correctly.
  const origin = new URL(req.url).origin;
  const target = `${origin}/api/cron/social-media/analytics?source=manual`;

  let res: Response;
  try {
    res = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
  } catch (e) {
    // A connection failure to the cron handler shouldn't surface as an
    // uncaught 500 / stack trace — return a friendly error instead.
    console.error('[social-media/analytics/refresh] cron proxy failed', e);
    return NextResponse.json(
      { error: 'Could not reach the analytics job. Try again.' },
      { status: 502 },
    );
  }
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
