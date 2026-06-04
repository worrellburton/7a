import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/api-gates';

// GET /api/email-campaigns/analytics-bulk?ids=<comma-separated-uuids>
//
// One round-trip lookup of open / click totals for many campaigns at
// once. Used by the Sent campaigns card on /app/email-campaigns to
// render per-row open/click rate circles without firing N separate
// /api/email-campaigns/[id]/analytics requests.
//
// Returns { [campaignId]: { recipients, opened, clicked, openRate,
// clickRate } } — recipients is the count of all rows in
// email_campaign_recipients for the campaign (the denominator the
// rates are computed against); opened / clicked are the count of
// distinct recipients who have at least one event of that type.
// Click implies open, so a click without a matching open still
// counts as opened (mirrors the per-campaign analytics route's
// logic for inline-blocked tracking pixels).

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { admin } = gate;

  const idsParam = (req.nextUrl.searchParams.get('ids') ?? '').trim();
  if (!idsParam) return NextResponse.json({ rows: {} });
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ rows: {} });

  // Three parallel queries:
  //   (a) recipients count per campaign (the denominator)
  //   (b) distinct opened recipient ids per campaign
  //   (c) distinct clicked recipient ids per campaign
  // Then aggregate in JS — cheaper than three Postgres GROUP BYs +
  // distinct counts under a thousand-row constraint, and keeps the
  // route portable when we eventually swap the events store.
  const [recRes, openedRes, clickedRes] = await Promise.all([
    admin
      .from('email_campaign_recipients')
      .select('campaign_id')
      .in('campaign_id', ids),
    admin
      .from('email_campaign_events')
      .select('campaign_id, recipient_id')
      .in('campaign_id', ids)
      .eq('event_type', 'opened'),
    admin
      .from('email_campaign_events')
      .select('campaign_id, recipient_id')
      .in('campaign_id', ids)
      .eq('event_type', 'clicked'),
  ]);

  const recipientCount = new Map<string, number>();
  for (const r of (recRes.data ?? []) as Array<{ campaign_id: string }>) {
    recipientCount.set(r.campaign_id, (recipientCount.get(r.campaign_id) ?? 0) + 1);
  }

  // Opened + clicked dedupe by recipient_id per campaign so an
  // opens-twice recipient still counts as one open.
  const openedByCampaign = new Map<string, Set<string>>();
  for (const r of (openedRes.data ?? []) as Array<{ campaign_id: string; recipient_id: string }>) {
    if (!openedByCampaign.has(r.campaign_id)) openedByCampaign.set(r.campaign_id, new Set());
    openedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
  }
  const clickedByCampaign = new Map<string, Set<string>>();
  for (const r of (clickedRes.data ?? []) as Array<{ campaign_id: string; recipient_id: string }>) {
    if (!clickedByCampaign.has(r.campaign_id)) clickedByCampaign.set(r.campaign_id, new Set());
    clickedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
    // A click implies an open — fold the recipient into the opened
    // bucket too, so the openRate denominator stays honest even when
    // the recipient's mail client blocks the tracking pixel.
    if (!openedByCampaign.has(r.campaign_id)) openedByCampaign.set(r.campaign_id, new Set());
    openedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
  }

  const rows: Record<string, { recipients: number; opened: number; clicked: number; openRate: number; clickRate: number }> = {};
  for (const id of ids) {
    const recipients = recipientCount.get(id) ?? 0;
    const opened = openedByCampaign.get(id)?.size ?? 0;
    const clicked = clickedByCampaign.get(id)?.size ?? 0;
    rows[id] = {
      recipients,
      opened,
      clicked,
      openRate: recipients > 0 ? opened / recipients : 0,
      clickRate: recipients > 0 ? clicked / recipients : 0,
    };
  }

  return NextResponse.json({ rows });
}
