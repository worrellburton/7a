import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// POST /api/email-campaigns/schedule
// body: { campaignId: string; sendAt: string (ISO) | null }
//
// Schedules the campaign to fire automatically at `sendAt`. When
// `sendAt` is null we cancel the schedule (returns the campaign to
// finalizing). Admin-only, mirrors /send.

export const dynamic = 'force-dynamic';

interface Body {
  campaignId?: unknown;
  sendAt?: unknown;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, 'Only admins can schedule email campaigns.');
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  const body = (await req.json().catch(() => ({}))) as Body;
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 });

  const sendAtRaw = typeof body.sendAt === 'string' ? body.sendAt : null;
  if (!sendAtRaw) {
    // Cancel schedule.
    const { error: cancelErr } = await admin
      .from('email_campaigns')
      .update({ status: 'finalizing', scheduled_send_at: null })
      .eq('id', campaignId);
    if (cancelErr) return NextResponse.json({ error: cancelErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, cancelled: true });
  }

  const sendAt = new Date(sendAtRaw);
  if (Number.isNaN(sendAt.getTime())) {
    return NextResponse.json({ error: 'sendAt is not a valid date.' }, { status: 400 });
  }
  // 1-minute grace so a marketer picking "now" doesn't trip on
  // microsecond skew between their clock and ours.
  if (sendAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: 'sendAt must be in the future.' }, { status: 400 });
  }

  const { data: campaign, error: loadErr } = await admin
    .from('email_campaigns')
    .select('id, generated_html, generated_subject')
    .eq('id', campaignId)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (!campaign.generated_html || !campaign.generated_subject) {
    return NextResponse.json({ error: 'Campaign is missing body or subject — finish building before scheduling.' }, { status: 400 });
  }

  // Confirm at least one pending recipient — scheduling an empty
  // campaign is a footgun, not a feature.
  const { count } = await admin
    .from('email_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending');
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: 'Add at least one recipient before scheduling.' }, { status: 400 });
  }

  const { error: updErr } = await admin
    .from('email_campaigns')
    .update({
      status: 'scheduled',
      scheduled_send_at: sendAt.toISOString(),
      sent_at: null,
      // Snapshot "the recipient set was finalised now". The
      // sync-scheduled-recipients route uses this as the cutoff for
      // "contacts added since" so manually-managed scheduled
      // campaigns can pick up new leads added between schedule
      // time and send time.
      recipients_locked_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, scheduledFor: sendAt.toISOString() });
}
