import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { buildLogReportData } from '@/lib/log-report-data';

// GET /api/levers/log-report/preview
//
// Returns the cohort summary the lever's badge + UI surface from.
// Phase 4 reads from real /contact_logs aggregations (Phase 3
// builder) so the badge count matches what the email will say.
//
// Cookie-session-gated (matches the JD-reminder lever auth shape)
// so the lever's plain `fetch('/api/levers/...')` calls
// authenticate via the browser cookie without an explicit
// Authorization header.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: meRow } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const admin = getAdminSupabase();

  // Eligible recipients = every active staff member with an email
  // on file. The picker on the lever defaults to super admins
  // checked + everyone else unchecked, so the existing one-click
  // pull behaviour is preserved while admissions / leadership can
  // opt anyone else in.
  const { data: allStaff } = await admin
    .from('users')
    .select('id, full_name, email, is_super_admin, is_admin')
    .eq('status', 'active')
    .not('email', 'is', null)
    .order('full_name', { ascending: true });
  const defaultRecipients = ((allStaff ?? []) as Array<{ id: string; full_name: string | null; email: string | null; is_super_admin: boolean; is_admin: boolean }>)
    .filter((u) => !!u.email)
    .map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email as string,
      isSuperAdmin: u.is_super_admin === true,
      isAdmin: u.is_admin === true,
    }));

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
