import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { hasMercuryKey } from '@/lib/mercury';
import { runMercurySync } from '@/lib/mercury-sync';
import { withCronLogging } from '@/lib/cron-observability';

// GET /api/cron/mercury/sync
//
// Hourly Vercel cron. Runs the same Mercury → DB sync that the
// page's Sync button triggers, so balances + transactions never lag
// the bank by more than an hour without anyone clicking anything.
// Schedule lives in vercel.json:
//   { "path": "/api/cron/mercury/sync", "schedule": "0 * * * *" }
//
// Auth: standard Vercel cron secret check (Authorization: Bearer
// <secret>). The Mercury token itself sits in MERCURY_API_KEY env;
// CRON_SECRET keeps a curious browser from kicking the sync.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return withCronLogging('/api/cron/mercury/sync', async () => {
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret) {
      const auth = req.headers.get('authorization') || '';
      const provided = auth.replace(/^Bearer\s+/i, '');
      if (provided !== expectedSecret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!hasMercuryKey()) {
      return NextResponse.json(
        { error: 'MERCURY_API_KEY not set on this environment.' },
        { status: 412 },
      );
    }

    try {
      const admin = getAdminSupabase();
      const result = await runMercurySync(admin);
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
