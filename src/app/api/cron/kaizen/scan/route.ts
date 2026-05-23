import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';
import { runKaizenScan } from '@/lib/kaizen-scan';

// GET /api/cron/kaizen/scan
//
// Daily 6 AM Phoenix kaizen scan. Vercel cron fires it; we accept
// the Vercel-signed header or a CRON_SECRET bearer/query token so
// admins can trigger it manually for debugging.
//
// Cron schedule in vercel.json: '0 13 * * *' — 13:00 UTC = 06:00
// MST (Phoenix is UTC-7 year-round, no DST).

export const dynamic = 'force-dynamic';

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
