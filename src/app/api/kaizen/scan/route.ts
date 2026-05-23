import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';
import { runKaizenScan } from '@/lib/kaizen-scan';

// POST /api/kaizen/scan
//
// Super-admin trigger to run a kaizen scan on demand. The page's
// "Run scan now" button hits this, and the auto-fire on first
// visit (when no scan exists yet) also hits it. The daily 6 AM
// cron uses /api/cron/kaizen/scan instead.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req, 'Only super admins can run Kaizen scans.');
  if (gate instanceof NextResponse) return gate;

  const result = await runKaizenScan(gate.admin, { triggeredBy: gate.userId });
  if (result.status === 'failed') {
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result });
}
