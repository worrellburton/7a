import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/email-campaigns/recent-recipients?days=7
//
// Returns the contact_ids that have been emailed by ANY email
// campaign whose recipient row hit send_status in
// ('sent','delivered','opened','clicked') within the last `days`
// window. Used by the campaign recipients picker to warn the
// marketer when they're about to re-send to someone who got an
// email recently.
//
// Marketing & Admissions members + admins only — same gate as the
// rest of /api/email-campaigns.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase
    .from('users')
    .select('is_admin, department_id')
    .eq('id', user.id)
    .maybeSingle();
  const MARKETING_DEPT = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';
  if (!row?.is_admin && row?.department_id !== MARKETING_DEPT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const requestedDays = Number(url.searchParams.get('days') ?? '7');
  const days = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(90, requestedDays) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = getAdminSupabase();
  // Pull recipient rows that landed (or made it past Resend's queue)
  // in the window. We exclude 'queued'/'failed' so a campaign that
  // never actually sent doesn't generate a false-positive warning.
  const { data, error } = await admin
    .from('email_campaign_recipients')
    .select('contact_id, email, sent_at, campaign_id, send_status, email_campaigns!inner(id, generated_subject, sent_at)')
    .gte('sent_at', since)
    .in('send_status', ['sent', 'delivered', 'opened', 'clicked'])
    .order('sent_at', { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    contact_id: string | null;
    email: string | null;
    sent_at: string | null;
    campaign_id: string;
    send_status: string;
    // Supabase types !inner joins as an array; we use the first row.
    email_campaigns:
      | { id: string; generated_subject: string | null; sent_at: string | null }
      | Array<{ id: string; generated_subject: string | null; sent_at: string | null }>
      | null;
  };
  // Collapse to one entry per contact_id (most-recent send wins).
  const byContact = new Map<string, {
    contact_id: string;
    last_sent_at: string;
    last_subject: string | null;
    last_campaign_id: string;
  }>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.contact_id || !r.sent_at) continue;
    if (!byContact.has(r.contact_id)) {
      const campaignSlot = Array.isArray(r.email_campaigns)
        ? r.email_campaigns[0] ?? null
        : r.email_campaigns;
      byContact.set(r.contact_id, {
        contact_id: r.contact_id,
        last_sent_at: r.sent_at,
        last_subject: campaignSlot?.generated_subject ?? null,
        last_campaign_id: r.campaign_id,
      });
    }
  }

  return NextResponse.json({
    days,
    sinceIso: since,
    recipients: Array.from(byContact.values()),
  });
}
