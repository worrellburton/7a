import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/email-campaigns/[id]/analytics
//
// Reads delivered / opened / clicked / bounced state straight out
// of email_campaign_events (populated by Resend webhooks at
// /api/email-campaigns/webhook). Earlier versions polled Resend's
// GET /emails/{id} endpoint per recipient, but Resend's per-email
// retrieve endpoint lags reality badly — the supported path is
// webhook event ingestion. See supabase/migrations/
// 20260520_email_campaign_events.sql.
//
// `simulated: true` is now set when there are zero events stored
// for a sent campaign, which usually means the Resend webhook isn't
// configured yet. The UI surfaces a one-liner pointing to the
// dashboard so the marketer knows what to do.

export const dynamic = 'force-dynamic';

interface RecipientAnalytics {
  recipientId: string;
  contactId: string;
  contactName: string;
  email: string;
  sendStatus: string;
  sendError: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  lastEvent: string | null;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  openedAt: string | null;
  clickedAt: string | null;
}

const TERMINAL_BAD = new Set(['bounced', 'complained', 'failed']);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: campaignId } = await ctx.params;

  const admin = getAdminSupabase();

  const { data: campaign } = await admin
    .from('email_campaigns')
    .select('id, generated_subject, sent_at, status, created_at')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  const { data: recipientRows } = await admin
    .from('email_campaign_recipients')
    .select('id, contact_id, email, send_status, send_error, sent_at, contacts(name)')
    .eq('campaign_id', campaignId)
    .order('email', { ascending: true });

  const recipients = (recipientRows ?? []) as Array<{
    id: string;
    contact_id: string;
    email: string;
    send_status: string;
    send_error: string | null;
    sent_at: string | null;
    contacts: { name: string } | { name: string }[] | null;
  }>;

  // Latest provider_message_id per recipient (a re-send creates a
  // newer email_campaign_sends row, we want only the freshest one).
  const { data: sendRows } = await admin
    .from('email_campaign_sends')
    .select('recipient_id, provider, provider_message_id, sent_at')
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false });
  const sendsByRecipient = new Map<string, { provider: string | null; provider_message_id: string | null }>();
  for (const s of (sendRows ?? []) as Array<{ recipient_id: string | null; provider: string | null; provider_message_id: string | null }>) {
    if (!s.recipient_id) continue;
    if (!sendsByRecipient.has(s.recipient_id)) {
      sendsByRecipient.set(s.recipient_id, { provider: s.provider, provider_message_id: s.provider_message_id });
    }
  }

  // Pull every event tied to this campaign in one query, then index
  // by recipient_id so we don't fan out N round-trips. Ordered
  // ascending so the first matching open/click we see is the
  // earliest one (which is the meaningful timestamp).
  const { data: eventRows } = await admin
    .from('email_campaign_events')
    .select('recipient_id, event_type, occurred_at')
    .eq('campaign_id', campaignId)
    .order('occurred_at', { ascending: true });

  type EventBundle = {
    types: Set<string>;
    firstOpenedAt: string | null;
    firstClickedAt: string | null;
    lastEvent: string | null;
  };
  const eventsByRecipient = new Map<string, EventBundle>();
  for (const ev of (eventRows ?? []) as Array<{ recipient_id: string | null; event_type: string; occurred_at: string }>) {
    if (!ev.recipient_id) continue;
    let bundle = eventsByRecipient.get(ev.recipient_id);
    if (!bundle) {
      bundle = { types: new Set(), firstOpenedAt: null, firstClickedAt: null, lastEvent: null };
      eventsByRecipient.set(ev.recipient_id, bundle);
    }
    bundle.types.add(ev.event_type);
    if (ev.event_type === 'opened' && !bundle.firstOpenedAt) bundle.firstOpenedAt = ev.occurred_at;
    if (ev.event_type === 'clicked' && !bundle.firstClickedAt) bundle.firstClickedAt = ev.occurred_at;
    bundle.lastEvent = ev.event_type;
  }

  const analytics: RecipientAnalytics[] = recipients.map((r) => {
    const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    const s = sendsByRecipient.get(r.id);
    const bundle = eventsByRecipient.get(r.id);
    const types = bundle?.types ?? new Set<string>();
    // A click implies an open (Resend doesn't always fire `opened`
    // before `clicked` since some clients block tracking pixels);
    // similarly any of opened/clicked imply delivered.
    const clicked = types.has('clicked');
    const opened = clicked || types.has('opened');
    const delivered = opened || types.has('delivered');
    const bounced = types.has('bounced') || types.has('complained') || types.has('failed');
    return {
      recipientId: r.id,
      contactId: r.contact_id,
      contactName: c?.name ?? '',
      email: r.email,
      sendStatus: r.send_status,
      sendError: r.send_error,
      sentAt: r.sent_at,
      providerMessageId: s?.provider_message_id ?? null,
      lastEvent: bundle?.lastEvent ?? null,
      delivered,
      opened,
      clicked,
      bounced,
      openedAt: bundle?.firstOpenedAt ?? null,
      clickedAt: bundle?.firstClickedAt ?? null,
    };
  });

  const sentCount = analytics.filter((a) => a.sendStatus === 'sent').length;
  const deliveredCount = analytics.filter((a) => a.delivered).length;
  const openedCount = analytics.filter((a) => a.opened).length;
  const clickedCount = analytics.filter((a) => a.clicked).length;
  const bouncedCount = analytics.filter((a) => a.bounced).length;
  const failedCount = analytics.filter((a) => a.sendStatus === 'failed' && !TERMINAL_BAD.has(a.lastEvent ?? '')).length;
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

  // If the campaign has been sent for more than 5 minutes and we
  // have zero events stored for it, the webhook almost certainly
  // isn't pointed at us yet. Flag it so the UI can prompt the user
  // to configure the webhook in the Resend dashboard.
  const totalEvents = eventRows?.length ?? 0;
  const ageMs = campaign.sent_at ? Date.now() - new Date(campaign.sent_at).getTime() : 0;
  const webhookSilent = sentCount > 0 && totalEvents === 0 && ageMs > 5 * 60 * 1000;

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      subject: campaign.generated_subject,
      status: campaign.status,
      sent_at: campaign.sent_at,
      created_at: campaign.created_at,
    },
    totals: {
      recipients: analytics.length,
      sent: sentCount,
      delivered: deliveredCount,
      opened: openedCount,
      clicked: clickedCount,
      bounced: bouncedCount,
      failed: failedCount,
      deliveryRate: pct(deliveredCount, sentCount),
      openRate: pct(openedCount, sentCount),
      clickRate: pct(clickedCount, sentCount),
      bounceRate: pct(bouncedCount, sentCount),
    },
    recipients: analytics,
    simulated: webhookSilent,
    webhookSilent,
  });
}
