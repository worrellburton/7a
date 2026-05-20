import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/email-campaigns/[id]/analytics
//
// Pulls Resend per-email analytics for every recipient of the
// campaign and aggregates them into rate stats (delivered /
// opened / clicked / bounced). Surfaces the response under the
// expandable row on /app/email-campaigns so a marketer can see
// who opened what without leaving feather.
//
// Implementation:
//   1. Load every email_campaign_recipients + their matching
//      email_campaign_sends row (joined by recipient_id, taking
//      the most recent send per recipient so a re-send replaces
//      the prior data).
//   2. For each row that has a provider='resend' + provider_message_id,
//      fetch GET https://api.resend.com/emails/{id} concurrently
//      (capped at 10 in-flight to stay polite).
//   3. Aggregate + return.
//
// Required env: RESEND_API_KEY. Without it, returns DB-only data
// with a `simulated: true` flag so the UI still has something to
// render (just no live open / click counts).

const RESEND_BASE = 'https://api.resend.com/emails/';
const MAX_PARALLEL = 10;

interface ResendEmail {
  id: string;
  to?: string[];
  from?: string;
  subject?: string;
  created_at?: string;
  last_event?: string;
}

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
}

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
    .select('recipient_id, provider, provider_message_id, ok, sent_at')
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false });
  const sendsByRecipient = new Map<string, { provider: string | null; provider_message_id: string | null }>();
  for (const s of (sendRows ?? []) as Array<{ recipient_id: string | null; provider: string | null; provider_message_id: string | null }>) {
    if (!s.recipient_id) continue;
    if (!sendsByRecipient.has(s.recipient_id)) {
      sendsByRecipient.set(s.recipient_id, { provider: s.provider, provider_message_id: s.provider_message_id });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const simulated = !apiKey;

  // Concurrency-limited fetch of Resend GETs. Anything without a
  // provider_message_id (failed before send, or simulated mode)
  // returns null analytics.
  const inFlight: Array<Promise<void>> = [];
  const eventByRecipient = new Map<string, ResendEmail | null>();
  const queue: Array<{ recipientId: string; messageId: string }> = [];
  for (const r of recipients) {
    const s = sendsByRecipient.get(r.id);
    if (apiKey && s?.provider === 'resend' && s?.provider_message_id) {
      queue.push({ recipientId: r.id, messageId: s.provider_message_id });
    }
  }
  const runOne = async (item: { recipientId: string; messageId: string }) => {
    try {
      const res = await fetch(`${RESEND_BASE}${encodeURIComponent(item.messageId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        eventByRecipient.set(item.recipientId, null);
        return;
      }
      const data = await res.json() as ResendEmail;
      eventByRecipient.set(item.recipientId, data);
    } catch {
      eventByRecipient.set(item.recipientId, null);
    }
  };
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const idx = cursor;
      cursor += 1;
      const item = queue[idx];
      if (!item) continue;
      await runOne(item);
    }
  };
  for (let i = 0; i < Math.min(MAX_PARALLEL, queue.length); i += 1) inFlight.push(worker());
  await Promise.all(inFlight);

  const analytics: RecipientAnalytics[] = recipients.map((r) => {
    const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    const s = sendsByRecipient.get(r.id);
    const ev = eventByRecipient.get(r.id) ?? null;
    const lastEvent = (ev?.last_event ?? '').toLowerCase();
    return {
      recipientId: r.id,
      contactId: r.contact_id,
      contactName: c?.name ?? '',
      email: r.email,
      sendStatus: r.send_status,
      sendError: r.send_error,
      sentAt: r.sent_at,
      providerMessageId: s?.provider_message_id ?? null,
      lastEvent: ev?.last_event ?? null,
      delivered: ['delivered', 'opened', 'clicked'].includes(lastEvent),
      opened: ['opened', 'clicked'].includes(lastEvent),
      clicked: lastEvent === 'clicked',
      bounced: ['bounced', 'complained', 'soft_bounced', 'hard_bounced'].includes(lastEvent),
    };
  });

  const sentCount = analytics.filter((a) => a.sendStatus === 'sent').length;
  const deliveredCount = analytics.filter((a) => a.delivered).length;
  const openedCount = analytics.filter((a) => a.opened).length;
  const clickedCount = analytics.filter((a) => a.clicked).length;
  const bouncedCount = analytics.filter((a) => a.bounced).length;
  const failedCount = analytics.filter((a) => a.sendStatus === 'failed').length;
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

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
    simulated,
  });
}
