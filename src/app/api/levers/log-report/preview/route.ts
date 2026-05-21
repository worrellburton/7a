import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/levers/log-report/preview
//
// Phase 1 stub — returns a placeholder cohort + window summary so
// the Log Report lever can render its visual on the console.
// Phase 3 fills this with the real /api/contacts/insights data
// roll-up; Phase 4 wires the rendered HTML preview.
//
// Super-admin-only (matches the JD-reminder lever auth shape).

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return NextResponse.json({
    window: {
      startsAt: weekStart.toISOString(),
      endsAt: now.toISOString(),
      label: 'Last 7 days',
    },
    // Phase 3 replaces these with real aggregations off contact_logs.
    counts: { total: 0, byMethod: {}, uniqueContacts: 0, uniqueReps: 0 },
    leaderboard: [],
    // Phase 6 lists the default recipients here (super admins by
    // default; configurable per pull).
    defaultRecipients: [],
    phase: 1,
  });
}
