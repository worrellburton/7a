import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { renderLogReportEmail, subjectFor, buildStubLogReportData } from '@/lib/log-report-email';
import { buildLogReportData } from '@/lib/log-report-data';

// GET /api/levers/log-report/preview-html?demo=1
//
// Returns the rendered HTML of the weekly Log Report so the
// lever's Preview popup can srcDoc it. Phase 4 reads real data
// from buildLogReportData(); `?demo=1` switches back to the stub
// for empty-week previews (handy on a fresh staging env).
//
// Cookie-session-gated (matches the JD-reminder lever auth shape).

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const demo = new URL(req.url).searchParams.get('demo') === '1';
  const data = demo ? buildStubLogReportData() : await buildLogReportData(admin);
  const html = renderLogReportEmail(data);
  const subject = subjectFor(data);

  return NextResponse.json({
    html,
    subject,
    from: process.env.RESEND_FROM ?? 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>',
    replyTo: process.env.RESEND_REPLY_TO ?? 'hello@sevenarrowsrecovery.com',
    window: data.window,
    demo,
    phase: 4,
  });
}
