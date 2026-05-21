import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { buildLogReportData } from '@/lib/log-report-data';

// GET /api/levers/log-report/preview
//
// Returns the cohort summary the lever's badge + UI surface from.
// Phase 4 reads from real /contact_logs aggregations (Phase 3
// builder) so the badge count matches what the email will say.

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

  // Default recipients = every super admin, since the report
  // is admissions / leadership ops. The Phase-6 recipients
  // picker on the lever lets the puller override per-send.
  const { data: superAdmins } = await admin
    .from('users')
    .select('id, full_name, email')
    .eq('is_super_admin', true)
    .not('email', 'is', null)
    .order('full_name', { ascending: true });
  const defaultRecipients = ((superAdmins ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>)
    .filter((u) => !!u.email)
    .map((u) => ({ id: u.id, name: u.full_name, email: u.email as string }));

  try {
    const data = await buildLogReportData(admin);
    return NextResponse.json({
      window: data.window,
      counts: {
        total: data.counts.total,
        byMethod: Object.fromEntries(data.byMethod.map((m) => [m.method, m.count])),
        uniqueContacts: data.counts.uniqueContacts,
        uniqueReps: data.counts.uniqueReps,
      },
      leaderboard: data.leaderboard.map((r) => ({ userId: r.userId, name: r.name, logs: r.logs })),
      defaultRecipients,
      phase: 4,
    });
  } catch (e) {
    return NextResponse.json({
      window: null,
      counts: { total: 0, byMethod: {}, uniqueContacts: 0, uniqueReps: 0 },
      leaderboard: [],
      defaultRecipients,
      error: e instanceof Error ? e.message : String(e),
      phase: 4,
    }, { status: 503 });
  }
}
