import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/email-campaigns/recipients-analytics
//
// Cross-campaign view: one row per contact who has ever received
// an email-campaign send, with their lifetime stats. Powers the
// 'By recipient' tab in /app/email-campaigns. The frontend renders
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

const MARKETING_DEPT = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';
const DELIVERED_STATES = ['sent', 'delivered', 'opened', 'clicked'] as const;

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: meRow } = await supabase
    .from('users')
    .select('is_admin, department_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!meRow?.is_admin && meRow?.department_id !== MARKETING_DEPT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminSupabase();

  // 1) Recipient rows that actually shipped — gives us sent_count
  //    per contact and the last_sent_at watermark. Cap large so a
  //    long history is included.
  const { data: recipients, error: recErr } = await admin
    .from('email_campaign_recipients')
    .select('id, contact_id, email, send_status, sent_at, campaign_id, contacts(name, role, company, location)')
    .in('send_status', DELIVERED_STATES as unknown as string[])
    .order('sent_at', { ascending: false })
    .limit(20000);
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });

  // 2) Engagement events (open / click / bounce) grouped by
  //    recipient_id. We'll pivot to contact-level downstream.
  const { data: events, error: evtErr } = await admin
    .from('email_campaign_events')
    .select('recipient_id, campaign_id, event_type, occurred_at')
    .in('event_type', ['opened', 'clicked', 'bounced', 'failed', 'complained'])
    .limit(50000);
  if (evtErr) return NextResponse.json({ error: evtErr.message }, { status: 500 });

  type RecipientRow = {
    id: string;
    contact_id: string | null;
    email: string | null;
    sent_at: string | null;
    campaign_id: string;
    contacts:
      | { name: string | null; role: string | null; company: string | null; location: string | null }
      | Array<{ name: string | null; role: string | null; company: string | null; location: string | null }>
      | null;
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
