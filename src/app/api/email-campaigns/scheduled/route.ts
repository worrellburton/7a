import { NextResponse } from 'next/server';
import { requireAdminOrDepartment, MARKETING_DEPT_ID } from '@/lib/api-gates';

// GET /api/email-campaigns/scheduled
//
// Returns every email campaign currently in status='scheduled' with
// its subject, scheduled send time, recipient counts, and the
// creator's display info. Powers the Sending Schedule view.

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdminOrDepartment(MARKETING_DEPT_ID);
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;
  const { data: campaigns, error } = await admin
    .from('email_campaigns')
    .select('id, generated_subject, generated_html, scheduled_send_at, status, created_by, created_at, updated_at')
    .eq('status', 'scheduled')
    .order('scheduled_send_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const campaignRows = (campaigns ?? []) as Array<{
    id: string;
    generated_subject: string | null;
    generated_html: string | null;
    scheduled_send_at: string | null;
    status: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>;

  if (campaignRows.length === 0) {
    return NextResponse.json({ rows: [], total: 0 });
  }

  const campaignIds = campaignRows.map((c) => c.id);
  const creatorIds = Array.from(new Set(campaignRows.map((c) => c.created_by).filter((v): v is string => !!v)));

  const [creatorsRes, recipientsRes] = await Promise.all([
    creatorIds.length > 0
      ? admin.from('users').select('id, full_name, avatar_url, email').in('id', creatorIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('email_campaign_recipients')
      .select('campaign_id, send_status')
      .in('campaign_id', campaignIds),
  ]);
  const creatorsById = new Map<string, { name: string; avatar_url: string | null }>();
  for (const u of (creatorsRes.data ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null; email: string }>) {
    creatorsById.set(u.id, { name: (u.full_name?.trim() || u.email || '').toString(), avatar_url: u.avatar_url ?? null });
  }
  const recipientCounts = new Map<string, number>();
  for (const r of (recipientsRes.data ?? []) as Array<{ campaign_id: string; send_status: string }>) {
    recipientCounts.set(r.campaign_id, (recipientCounts.get(r.campaign_id) ?? 0) + 1);
  }

  const rows = campaignRows.map((c) => ({
    id: c.id,
    subject: c.generated_subject,
    html: c.generated_html,
    scheduled_send_at: c.scheduled_send_at,
    status: c.status,
    created_by: c.created_by,
    creator: c.created_by ? creatorsById.get(c.created_by) ?? null : null,
    recipient_count: recipientCounts.get(c.id) ?? 0,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  return NextResponse.json({ rows, total: rows.length });
}
