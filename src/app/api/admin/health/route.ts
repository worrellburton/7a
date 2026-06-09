import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// GET /api/admin/health
//
// Surfaces operational health that we previously only learned about
// from user reports: stuck campaigns, recent failed cron runs, recent
// 5xx-ish activity-log entries, slow-running queues. Pure read-only.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { admin } = gate;

  const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const [
    stuckCampaignsRes,
    scheduledCampaignsRes,
    recentCronFailsRes,
    cronRunsRes,
    failedRecipientsRes,
    contactSubmissionsRes,
    unresolvedFailsRes,
  ] = await Promise.all([
    admin.from('email_campaigns')
      .select('id, generated_subject, status, updated_at, resend_broadcast_id')
      .eq('status', 'sending')
      .lt('updated_at', tenMinAgo)
      .limit(20),
    admin.from('email_campaigns')
      .select('id, generated_subject, scheduled_send_at')
      .eq('status', 'scheduled')
      .gte('scheduled_send_at', new Date().toISOString())
      .order('scheduled_send_at', { ascending: true })
      .limit(10),
    admin.from('cron_runs')
      .select('id, path, status, error, started_at, finished_at')
      .eq('status', 'error')
      .gte('started_at', dayAgo)
      .order('started_at', { ascending: false })
      .limit(15),
    admin.from('cron_runs')
      .select('id, path, status, started_at')
      .gte('started_at', dayAgo)
      .order('started_at', { ascending: false })
      .limit(50),
    admin.from('email_campaign_recipients')
      .select('id, campaign_id', { count: 'exact', head: true })
      .eq('send_status', 'failed'),
    admin.from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .is('spam_at', null),
    admin.from('email_campaigns')
      .select('id, generated_subject, status, updated_at')
      .eq('status', 'failed')
      .gte('updated_at', weekAgo)
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    stuck_campaigns: stuckCampaignsRes.data ?? [],
    scheduled_campaigns: scheduledCampaignsRes.data ?? [],
    recent_cron_fails: recentCronFailsRes.data ?? [],
    cron_24h_total: (cronRunsRes.data ?? []).length,
    cron_24h_error: (cronRunsRes.data ?? []).filter((r) => (r as { status: string }).status === 'error').length,
    failed_recipients_total: failedRecipientsRes.count ?? 0,
    contact_submissions_last_7d: contactSubmissionsRes.count ?? 0,
    failed_campaigns_last_7d: unresolvedFailsRes.data ?? [],
    generated_at: new Date().toISOString(),
  });
}
