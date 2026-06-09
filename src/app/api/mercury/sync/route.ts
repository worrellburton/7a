import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';
import { hasMercuryKey, MercuryError } from '@/lib/mercury';
import { runMercurySync } from '@/lib/mercury-sync';

// POST /api/mercury/sync — manual sync from the page's Sync button.
// Pulls every Mercury account + every transaction on the org token
// and upserts both. Idempotent. Super-admin only; the data is
// org-financials.
//
// The actual sync work lives in /lib/mercury-sync.ts so the hourly
// Vercel cron at /api/cron/mercury/sync can run the same logic
// without duplicating it.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 5 min cap — first sync on a fresh DB has to walk every page of
// every account. Subsequent runs return in seconds because the
// upsert no-ops on unchanged rows.
export const maxDuration = 300;

export async function POST() {
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;

  if (!hasMercuryKey()) {
    return NextResponse.json(
      { error: 'MERCURY_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  try {
    const result = await runMercurySync(gate.admin);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof MercuryError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
