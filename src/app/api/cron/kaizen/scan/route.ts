import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';
import { runKaizenScan } from '@/lib/kaizen-scan';

// GET /api/cron/kaizen/scan
//
// Daily 6 AM ET kaizen scan. Vercel cron fires it; we accept
// the Vercel-signed header or a CRON_SECRET bearer/query token so
// admins can trigger it manually for debugging.
//
// Cron schedule in vercel.json: '0 10 * * *' — 10:00 UTC. That's
// 06:00 EDT (UTC-4) during the ~8 months of daylight saving time
// and 05:00 EST the rest of the year. Vercel cron doesn't track
// DST, and we'd rather land slightly EARLIER than "6 AM" in
// winter than slightly later — the recommendations are meant to
// be waiting when admins start the day, not still being generated.

export const dynamic = 'force-dynamic';
// Default Vercel serverless timeout (10s on Hobby, 60s on Pro) is
// far below the time a full Claude opus call with a 6000-token max
// completion needs on a cold cron start. We were silently timing
// out mid-scan, leaving rows stuck at status='running' (see the
// 06:00:22 PHX row from 2026-05-24). 300s is the Pro-plan ceiling
// and is plenty for a single Anthropic call.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return withCronLogging('/api/cron/kaizen/scan', async () => {
    const cronHeader = req.headers.get('x-vercel-cron') === '1';
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const queryAuth = req.nextUrl.searchParams.get('secret');
    const tokenOk =
      cronSecret != null && cronSecret.length > 0 && (authHeader === cronSecret || queryAuth === cronSecret);
    if (!cronHeader && !tokenOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runKaizenScan(getAdminSupabase(), { triggeredBy: null });
    if (result.status === 'failed') {
      return NextResponse.json({ ok: false, ...result }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...result });
  });
}
