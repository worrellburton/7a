import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/api-gates';

// GET /api/email-campaigns/analytics-bulk?ids=<comma-separated-uuids>
//
// One round-trip lookup of open / click totals for many campaigns at
// once. Used by the Sent campaigns card on /feather/email-campaigns to
// render per-row open/click rate circles without firing N separate
// /api/email-campaigns/[id]/analytics requests.
//
// Returns { [campaignId]: { recipients, sent, opened, clicked,
// openRate, clickRate } }.
//
// IMPORTANT — denominator + dedupe rules match the per-campaign
// /api/email-campaigns/[id]/analytics route exactly so the row's
// glance numbers never disagree with the detail panel underneath:
//
//   * denominator = SENT count (recipients with send_status='sent'),
//     not total recipient rows. Failed / pending sends are excluded.
//   * opened / clicked = distinct recipient ids with that event,
//     limited to recipients that exist in email_campaign_recipients
//     for this campaign (so an orphaned event from a deleted
//     recipient can't inflate the numerator).
//   * click implies open, so a click without a matching open still
//     counts as opened (mirrors the inline-blocked tracking pixel
//     logic in the detail route).
//
// Both reads ALSO paginate with .range() in 1000-row pages. The
// PostgREST default page size silently capped the recipients and
// events queries at 1000 across all selected campaigns, which left
// the busiest campaign at the bottom of the .in() result with a
// recipient count of e.g. 205 instead of 489 — and so a 17%
// real-open rate rendered as 42% on the row.

export const dynamic = 'force-dynamic';

interface RecipientRow {
  id: string;
  campaign_id: string;
  send_status: string | null;
}
interface EventRow {
  campaign_id: string;
  recipient_id: string;
}

async function fetchAll<T>(
  build: (offset: number, page: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await build(offset, pageSize);
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as T[];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const { admin } = gate;

  const idsParam = (req.nextUrl.searchParams.get('ids') ?? '').trim();
  if (!idsParam) return NextResponse.json({ rows: {} });
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ rows: {} });

  // Three parallel paginated reads. recipients carries send_status
  // so we can build per-campaign sent-id sets used as both the
  // denominator AND the membership filter for the event numerators.
  let recipients: RecipientRow[];
  let openedEvents: EventRow[];
  let clickedEvents: EventRow[];
  try {
    [recipients, openedEvents, clickedEvents] = await Promise.all([
      fetchAll<RecipientRow>((offset, pageSize) =>
        admin
          .from('email_campaign_recipients')
          .select('id, campaign_id, send_status')
          .in('campaign_id', ids)
          .range(offset, offset + pageSize - 1),
      ),
      fetchAll<EventRow>((offset, pageSize) =>
        admin
          .from('email_campaign_events')
          .select('campaign_id, recipient_id')
          .in('campaign_id', ids)
          .eq('event_type', 'opened')
          .range(offset, offset + pageSize - 1),
      ),
      fetchAll<EventRow>((offset, pageSize) =>
        admin
          .from('email_campaign_events')
          .select('campaign_id, recipient_id')
          .in('campaign_id', ids)
          .eq('event_type', 'clicked')
          .range(offset, offset + pageSize - 1),
      ),
    ]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  // Per-campaign recipient bookkeeping. Two sets: every recipient id
  // (for orphan-event filtering — only opens from a recipient that
  // actually exists in the recipients table count) and the subset
  // that sent successfully (the denominator).
  const recipientIdsByCampaign = new Map<string, Set<string>>();
  const sentIdsByCampaign = new Map<string, Set<string>>();
  const totalRecipientsByCampaign = new Map<string, number>();
  for (const r of recipients) {
    if (!recipientIdsByCampaign.has(r.campaign_id)) {
      recipientIdsByCampaign.set(r.campaign_id, new Set());
      sentIdsByCampaign.set(r.campaign_id, new Set());
    }
    recipientIdsByCampaign.get(r.campaign_id)!.add(r.id);
    totalRecipientsByCampaign.set(r.campaign_id, (totalRecipientsByCampaign.get(r.campaign_id) ?? 0) + 1);
    if (r.send_status === 'sent') sentIdsByCampaign.get(r.campaign_id)!.add(r.id);
  }

  // Opened / clicked dedupe by recipient_id per campaign so an
  // opens-twice recipient still counts as one open. Orphan events
  // (recipient was deleted) are dropped at this step so they don't
  // inflate the numerator above the sent denominator.
  const openedByCampaign = new Map<string, Set<string>>();
  for (const r of openedEvents) {
    const cohort = recipientIdsByCampaign.get(r.campaign_id);
    if (!cohort || !cohort.has(r.recipient_id)) continue;
    if (!openedByCampaign.has(r.campaign_id)) openedByCampaign.set(r.campaign_id, new Set());
    openedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
  }
  const clickedByCampaign = new Map<string, Set<string>>();
  for (const r of clickedEvents) {
    const cohort = recipientIdsByCampaign.get(r.campaign_id);
    if (!cohort || !cohort.has(r.recipient_id)) continue;
    if (!clickedByCampaign.has(r.campaign_id)) clickedByCampaign.set(r.campaign_id, new Set());
    clickedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
    // A click implies an open — fold the recipient into the opened
    // bucket too so the openRate stays honest when the recipient's
    // mail client blocks the tracking pixel.
    if (!openedByCampaign.has(r.campaign_id)) openedByCampaign.set(r.campaign_id, new Set());
    openedByCampaign.get(r.campaign_id)!.add(r.recipient_id);
  }

  const rows: Record<string, {
    recipients: number;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }> = {};
  for (const id of ids) {
    const recipientsTotal = totalRecipientsByCampaign.get(id) ?? 0;
    const sent = sentIdsByCampaign.get(id)?.size ?? 0;
    const opened = openedByCampaign.get(id)?.size ?? 0;
    const clicked = clickedByCampaign.get(id)?.size ?? 0;
    rows[id] = {
      recipients: recipientsTotal,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? opened / sent : 0,
      clickRate: sent > 0 ? clicked / sent : 0,
    };
  }

  return NextResponse.json({ rows });
}
