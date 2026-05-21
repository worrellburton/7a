import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/levers/log-report/pull
//
// Fires the weekly Log Report email to the configured cohort
// (Phase 6 ships the recipients picker; default is every super
// admin). Writes a row to public.lever_pulls so the activity
// feed records the attribution + recipient list.
//
// Phase 1 stub — validates auth, returns a fake-success payload.
// Phase 7 swaps in the real Resend send + lever_pulls insert.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    simulated: true,
    sent: 0,
    recipients: [],
    phase: 1,
    note: 'Phase 1 stub — Phase 7 fans out the real Resend send.',
  });
}
