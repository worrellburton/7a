import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { buildStubLogReportData, renderLogReportEmail, subjectFor } from '@/lib/log-report-email';

// GET /api/levers/log-report/preview-html
//
// Returns the rendered HTML body of the weekly Log Report email
// so the lever's "Preview email" popup can srcDoc it into an
// iframe. Same renderer the production send + the test-email
// endpoint will use (Phase 5), so what shows in the popup is
// literally what arrives in the inbox.
//
// Phase 2 returns the stub data from buildStubLogReportData()
// so the visual lands now; Phase 3 swaps that for the real
// /contact_logs aggregation without changing the renderer or
// the response shape.

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

  const data = buildStubLogReportData();
  const html = renderLogReportEmail(data);
  const subject = subjectFor(data);

  return NextResponse.json({
    html,
    subject,
    from: process.env.RESEND_FROM ?? 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>',
    replyTo: process.env.RESEND_REPLY_TO ?? 'hello@sevenarrowsrecovery.com',
    window: data.window,
    phase: 2,
  });
}
