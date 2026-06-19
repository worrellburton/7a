import { NextResponse } from 'next/server';
import { requireAdminOrDepartment, MARKETING_DEPT_ID } from '@/lib/api-gates';

// GET /api/email-campaigns/recipients-analytics
//
// Cross-campaign view: one row per contact who has ever received
// an email-campaign send, with their lifetime stats. Powers the
// 'By recipient' tab in /feather/email-campaigns. The frontend renders
// it as a sortable spreadsheet.
//
// Output per row:
//   * contact_id, name, email, role, company, location
//   * sent_count          — number of campaigns whose recipient row
//                           was send_status ∈ sent/delivered/opened/clicked
//   * opened_count        — distinct campaigns with an 'opened' event
//   * clicked_count       — distinct campaigns with a 'clicked' event
//   * bounced_count       — distinct campaigns with a 'bounced' or 'failed'
//   * last_sent_at        — most recent send timestamp
//   * open_rate           — opened / sent (0..1)
//   * click_rate          — clicked / sent (0..1)
//   * click_through       — clicked / opened (0..1, NaN guarded)
//
// Marketing & Admissions members + admins only.

export const dynamic = 'force-dynamic';

const DELIVERED_STATES = ['sent', 'delivered', 'opened', 'clicked'] as const;

// PostgREST caps any single response at db-max-rows (1000 in this
// project — see analytics-bulk/route.ts), so a `.limit(50000)` request
// still came back truncated to 1000 rows. With ~8k engagement events
// and ~3k delivered recipient rows project-wide, that silently dropped
// most of the data and every lifetime open/click rate read low. Page
// through with .range() so the full set is aggregated.
async function fetchAllPaged<T>(
  build: (offset: number, pageSize: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
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

export async function GET() {
  const gate = await requireAdminOrDepartment(MARKETING_DEPT_ID);
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  // 1) Recipient rows that actually shipped — gives us sent_count
  //    per contact and the last_sent_at watermark. Paged so a long
  //    history is fully included (a single request caps at 1000).
  let recipients: unknown[];
  let events: unknown[];
  try {
    [recipients, events] = await Promise.all([
      fetchAllPaged((offset, pageSize) =>
        admin
          .from('email_campaign_recipients')
          .select('id, contact_id, email, send_status, sent_at, campaign_id, contacts(name, role, company, location, unsubscribed_at)')
          .in('send_status', DELIVERED_STATES as unknown as string[])
          .order('sent_at', { ascending: false })
          .range(offset, offset + pageSize - 1),
      ),
      // 2) Engagement events (open / click / bounce) grouped by
      //    recipient_id. We'll pivot to contact-level downstream.
      fetchAllPaged((offset, pageSize) =>
        admin
          .from('email_campaign_events')
          .select('recipient_id, campaign_id, event_type, occurred_at')
          .in('event_type', ['opened', 'clicked', 'bounced', 'failed', 'complained'])
          .range(offset, offset + pageSize - 1),
      ),
    ]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  type ContactLite = {
    name: string | null;
    role: string | null;
    company: string | null;
    location: string | null;
    unsubscribed_at: string | null;
  };
  type RecipientRow = {
    id: string;
    contact_id: string | null;
    email: string | null;
    sent_at: string | null;
    campaign_id: string;
    contacts: ContactLite | Array<ContactLite> | null;
  };
  type EventRow = {
    recipient_id: string;
    campaign_id: string;
    event_type: string;
  };

  // recipient_id → contact_id so we can roll events up to contacts.
  const recipientToContact = new Map<string, string>();
  for (const r of (recipients ?? []) as unknown as RecipientRow[]) {
    if (r.contact_id) recipientToContact.set(r.id, r.contact_id);
  }

  // contact_id → aggregator
  interface Agg {
    contact_id: string;
    name: string;
    email: string;
    role: string | null;
    company: string | null;
    location: string | null;
    unsubscribed_at: string | null;
    sent_count: number;
    last_sent_at: string | null;
    // distinct-campaign sets so a campaign that fires both
    // 'delivered' and 'opened' doesn't double-count.
    openedCampaigns: Set<string>;
    clickedCampaigns: Set<string>;
    bouncedCampaigns: Set<string>;
  }
  const byContact = new Map<string, Agg>();
  for (const r of (recipients ?? []) as unknown as RecipientRow[]) {
    if (!r.contact_id) continue;
    const c = Array.isArray(r.contacts) ? r.contacts[0] ?? null : r.contacts;
    const slot = byContact.get(r.contact_id) ?? {
      contact_id: r.contact_id,
      name: c?.name ?? '(unknown)',
      email: r.email ?? '',
      role: c?.role ?? null,
      company: c?.company ?? null,
      location: c?.location ?? null,
      unsubscribed_at: c?.unsubscribed_at ?? null,
      sent_count: 0,
      last_sent_at: null,
      openedCampaigns: new Set<string>(),
      clickedCampaigns: new Set<string>(),
      bouncedCampaigns: new Set<string>(),
    };
    slot.sent_count += 1;
    if (r.sent_at && (!slot.last_sent_at || r.sent_at > slot.last_sent_at)) {
      slot.last_sent_at = r.sent_at;
    }
    byContact.set(r.contact_id, slot);
  }

  for (const e of (events ?? []) as EventRow[]) {
    const contactId = recipientToContact.get(e.recipient_id);
    if (!contactId) continue;
    const slot = byContact.get(contactId);
    if (!slot) continue;
    if (e.event_type === 'opened') slot.openedCampaigns.add(e.campaign_id);
    else if (e.event_type === 'clicked') slot.clickedCampaigns.add(e.campaign_id);
    else if (e.event_type === 'bounced' || e.event_type === 'failed' || e.event_type === 'complained') {
      slot.bouncedCampaigns.add(e.campaign_id);
    }
  }

  const rows = Array.from(byContact.values()).map((a) => {
    const opened = a.openedCampaigns.size;
    const clicked = a.clickedCampaigns.size;
    const bounced = a.bouncedCampaigns.size;
    const open_rate = a.sent_count > 0 ? opened / a.sent_count : 0;
    const click_rate = a.sent_count > 0 ? clicked / a.sent_count : 0;
    const click_through = opened > 0 ? clicked / opened : 0;
    return {
      contact_id: a.contact_id,
      name: a.name,
      email: a.email,
      role: a.role,
      company: a.company,
      location: a.location,
      unsubscribed_at: a.unsubscribed_at,
      sent_count: a.sent_count,
      opened_count: opened,
      clicked_count: clicked,
      bounced_count: bounced,
      last_sent_at: a.last_sent_at,
      open_rate,
      click_rate,
      click_through,
    };
  });

  return NextResponse.json({ rows, total: rows.length });
}
