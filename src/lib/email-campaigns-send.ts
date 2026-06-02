import type { SupabaseClient } from '@supabase/supabase-js';
import { addUtmsToCampaignHtml } from './utm';
import {
  addContactsToAudience,
  createAudience,
  createBroadcast,
  getBroadcastsApiKey,
  prepareBroadcastHtml,
  sendBroadcast,
} from './resend-broadcasts';

// Shared send-loop used by both the POST /api/email-campaigns/send
// handler (admin click-through send) and the cron at
// /api/cron/email-campaigns/scheduled-send.
//
// Implementation note: this used to loop the recipient list and POST
// one transactional email per row. That path burned the Resend Free
// transactional quota (100/day) and had to be paced across cron
// ticks. The new path creates a Resend audience + broadcast per
// campaign and Resend fans it out server-side — a single API trip
// no matter how big the list, and it counts against the Marketing
// quota instead of Transactional. See ./resend-broadcasts.ts for
// the wrapper.

const DEFAULT_FROM = 'Seven Arrows Recovery <onboarding@resend.dev>';

export interface SendCampaignBatchOpts {
  supabase: SupabaseClient;
  campaignId: string;
  actingUserId: string | null;
  /** Retained for API compatibility with the old transactional path,
   *  but the Broadcasts path sends the whole list in one call so this
   *  is effectively ignored. */
  batchSize?: number;
}

export interface SendCampaignBatchResult {
  ok: boolean;
  error?: string;
  sent: number;
  failed: number;
  skipped: number;
  simulated: boolean;
  stillPending: number;
  note?: string;
}

export async function sendCampaignBatch(opts: SendCampaignBatchOpts): Promise<SendCampaignBatchResult> {
  const { supabase, campaignId, actingUserId } = opts;

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('id, generated_html, generated_subject, status, resend_audience_id, resend_broadcast_id')
    .eq('id', campaignId)
    .maybeSingle();
  if (campErr || !campaign) {
    return { ok: false, error: campErr?.message ?? 'Campaign not found.', sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }
  if (!campaign.generated_html || !campaign.generated_subject) {
    return { ok: false, error: 'Campaign is missing body or subject.', sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }

  // Pull every pending recipient — Broadcasts sends in one shot, so
  // there's no batching to do. We still respect send_status so a
  // resend-failed click on /finalize only re-targets the failed rows
  // that were just reset to pending.
  const { data: recipientRows, error: recErr } = await supabase
    .from('email_campaign_recipients')
    .select('id, email, send_status, contact_id')
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending')
    .order('id', { ascending: true })
    .limit(10000);
  if (recErr) {
    return { ok: false, error: recErr.message, sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }
  const allPending = (recipientRows ?? []) as Array<{ id: string; email: string; send_status: string; contact_id: string }>;

  // Drop unsubscribed contacts before we even hit Resend.
  let recipients = allPending;
  let skipped = 0;
  if (allPending.length > 0) {
    const contactIds = Array.from(new Set(allPending.map((r) => r.contact_id).filter((v): v is string => !!v)));
    const { data: unsubRows } = await supabase
      .from('contacts')
      .select('id, unsubscribed_at')
      .in('id', contactIds.length > 0 ? contactIds : ['00000000-0000-0000-0000-000000000000'])
      .not('unsubscribed_at', 'is', null);
    const unsubSet = new Set<string>((unsubRows ?? []).map((r) => r.id as string));
    const toSkip = allPending.filter((r) => unsubSet.has(r.contact_id));
    if (toSkip.length > 0) {
      await supabase
        .from('email_campaign_recipients')
        .update({ send_status: 'skipped', send_error: 'Contact has unsubscribed.', sent_at: null })
        .in('id', toSkip.map((r) => r.id));
      skipped = toSkip.length;
    }
    recipients = allPending.filter((r) => !unsubSet.has(r.contact_id));
  }
  if (recipients.length === 0) {
    await supabase
      .from('email_campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaignId);
    return { ok: true, sent: 0, failed: 0, skipped, simulated: false, stillPending: 0, note: 'No pending recipients.' };
  }

  // Hydrate names off the contacts so the audience entries carry
  // first/last name (Resend stores them; useful for the marketing
  // dashboard and any future personalization).
  const contactIds = Array.from(new Set(recipients.map((r) => r.contact_id).filter((v): v is string => !!v)));
  const nameById = new Map<string, { first?: string; last?: string }>();
  if (contactIds.length > 0) {
    const { data: nameRows } = await supabase
      .from('contacts')
      .select('id, name')
      .in('id', contactIds);
    for (const r of (nameRows ?? []) as Array<{ id: string; name: string | null }>) {
      const n = (r.name ?? '').trim();
      if (!n) { nameById.set(r.id, {}); continue; }
      const parts = n.split(/\s+/);
      nameById.set(r.id, { first: parts[0], last: parts.slice(1).join(' ') || undefined });
    }
  }

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const apiKey = getBroadcastsApiKey();
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || DEFAULT_FROM);
  const replyToRaw = process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO;
  const replyTo = replyToRaw ? stripDisplayName(replyToRaw) : stripDisplayName(from);
  const simulated = !apiKey;

  if (simulated) {
    // No-Resend dev path: pretend everything sent so the rest of the
    // pipeline (recipient rows, contact_logs, status flip) exercises
    // end-to-end.
    return await markAllSent(supabase, recipients, campaign, actingUserId, campaignId, true, skipped);
  }

  // Step 1: always create a FRESH audience per send invocation. We
  // can't reuse a prior audience because Resend Broadcasts send to
  // every non-unsubscribed contact in the linked audience — if a
  // first send delivered to A+B then bounced C, the audience still
  // holds A+B+C and a retry-of-failed would re-email A+B. Fresh
  // audience per send means it always contains exactly the rows we
  // intend to email this trip.
  const audName = `${(campaign.generated_subject as string).slice(0, 80)} · ${new Date().toISOString().slice(0, 19)}`;
  const a = await createAudience(apiKey, audName);
  if (!a.ok) {
    await markCampaignFailed(supabase, campaignId, `Resend audience creation failed: ${a.error}`);
    return { ok: false, error: `Resend audience creation failed: ${a.error}`, sent: 0, failed: recipients.length, skipped, simulated: false, stillPending: recipients.length };
  }
  const audienceId = a.id;
  await supabase.from('email_campaigns').update({ resend_audience_id: audienceId, resend_broadcast_id: null }).eq('id', campaignId);

  // Step 2: upsert each recipient into the audience. Duplicates are
  // a no-op (Resend's API returns 409/422 which we treat as success).
  const contactsForAudience = recipients.map((r) => {
    const n = nameById.get(r.contact_id) ?? {};
    return { email: r.email, firstName: n.first, lastName: n.last };
  });
  const upsert = await addContactsToAudience(apiKey, audienceId, contactsForAudience);
  if (upsert.failed > 0 && upsert.added + upsert.alreadyIn === 0) {
    await markCampaignFailed(supabase, campaignId, `Resend audience upsert failed: ${upsert.firstError ?? 'unknown'}`);
    return { ok: false, error: upsert.firstError ?? 'Resend audience upsert failed.', sent: 0, failed: recipients.length, skipped, simulated: false, stillPending: recipients.length };
  }

  // Step 3: create a fresh broadcast tied to the new audience. We
  // never reuse a prior broadcast either — the broadcast→audience
  // binding is set on create and re-sending the same broadcast would
  // re-target whatever Resend currently has in that audience.
  const taggedHtml = addUtmsToCampaignHtml(campaign.generated_html as string, {
    campaignId,
    subject: campaign.generated_subject as string,
  });
  const patchedHtml = taggedHtml
    .replace(/https:\/\/cdn\.simpleicons\.org\/linkedin\/ffffff/g, 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-white.svg')
    .replace(/https:\/\/cdn\.simpleicons\.org\/linkedin\/1a1a1a/g, 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-ink.svg');
  const broadcastHtml = prepareBroadcastHtml(patchedHtml);
  const b = await createBroadcast(apiKey, audienceId, {
    subject: campaign.generated_subject as string,
    html: broadcastHtml,
    from,
    replyTo,
    // Resend caps broadcast `name` at 70 chars. createBroadcast
    // re-truncates defensively too — keep both in sync.
    name: (campaign.generated_subject as string).slice(0, 70),
  });
  if (!b.ok) {
    await markCampaignFailed(supabase, campaignId, `Resend broadcast creation failed: ${b.error}`);
    return { ok: false, error: `Resend broadcast creation failed: ${b.error}`, sent: 0, failed: recipients.length, skipped, simulated: false, stillPending: recipients.length };
  }
  const broadcastId = b.id;
  await supabase.from('email_campaigns').update({ resend_broadcast_id: broadcastId }).eq('id', campaignId);

  // Step 4: fire the broadcast. Resend queues internally and the
  // events table fills in over the next minutes via the webhook.
  const sendRes = await sendBroadcast(apiKey, broadcastId);
  if (!sendRes.ok) {
    await markCampaignFailed(supabase, campaignId, `Resend broadcast send failed: ${sendRes.error}`);
    return { ok: false, error: sendRes.error, sent: 0, failed: recipients.length, skipped, simulated: false, stillPending: recipients.length };
  }

  // Step 5: flip recipient rows to 'sent' optimistically. The
  // webhook will overwrite to 'failed' / 'bounced' as terminal
  // events arrive. We also write the contact_logs touchpoint here
  // because we already have actingUserId in scope.
  return await markAllSent(supabase, recipients, campaign, actingUserId, campaignId, false, skipped);
}

// Optimistic post-send bookkeeping shared between the simulated dev
// path and the live broadcast path. Webhook events will refine the
// per-recipient state (failed/bounced) as they arrive.
async function markAllSent(
  supabase: SupabaseClient,
  recipients: Array<{ id: string; email: string; contact_id: string }>,
  campaign: { generated_subject: string | null },
  actingUserId: string | null,
  campaignId: string,
  simulated: boolean,
  skipped: number,
): Promise<SendCampaignBatchResult> {
  const nowIso = new Date().toISOString();
  // Bulk-update recipient status. Postgrest doesn't support a single
  // UPDATE with WHERE id IN (...) returning per-row data, but we
  // don't need per-row data here.
  await supabase
    .from('email_campaign_recipients')
    .update({ send_status: 'sent', send_error: null, sent_at: nowIso })
    .in('id', recipients.map((r) => r.id));

  // Insert the send-log + contact-log rows in bulk. These power the
  // per-rep leaderboard + the contact's recent touchpoints list.
  const comment = simulated
    ? `Sent email campaign (simulated): ${campaign.generated_subject ?? ''}`
    : `Sent email campaign: ${campaign.generated_subject ?? ''}`;
  if (recipients.length > 0) {
    await supabase.from('email_campaign_sends').insert(
      recipients.map((r) => ({
        campaign_id: campaignId,
        recipient_id: r.id,
        provider: simulated ? 'simulated' : 'resend',
        provider_message_id: null,
        ok: true,
        status_code: simulated ? 0 : 200,
        response: simulated ? 'simulated' : 'broadcast queued',
      })),
    );
    await supabase.from('contact_logs').insert(
      recipients.map((r) => ({
        contact_id: r.contact_id,
        method: 'Email Campaign',
        comments: comment,
        contacted_by: actingUserId,
        contacted_at: nowIso,
      })),
    );
    // last_contact_* is denormalised onto contacts for the cards on
    // /app/contacts. Bulk-update one contact_id at a time isn't
    // possible in a single PostgREST call, so we batch with .in() —
    // the last_contact_comments will be the same for every row in
    // this campaign which is the desired UX.
    const contactIds = Array.from(new Set(recipients.map((r) => r.contact_id).filter((v): v is string => !!v)));
    if (contactIds.length > 0) {
      await supabase
        .from('contacts')
        .update({
          last_contact_at: nowIso,
          last_contact_by: actingUserId,
          last_contact_method: 'Email Campaign',
          last_contact_comments: comment,
        })
        .in('id', contactIds);
    }
  }

  await supabase
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: nowIso })
    .eq('id', campaignId);

  return {
    ok: true,
    sent: recipients.length,
    failed: 0,
    skipped,
    simulated,
    stillPending: 0,
  };
}

async function markCampaignFailed(supabase: SupabaseClient, campaignId: string, error: string): Promise<void> {
  // Flip status back to 'failed' so the UI surfaces an actionable
  // error and so the cron stops retrying every minute. The send
  // route's per-recipient send_error stays untouched — the campaign-
  // level error sits on the toast / banner.
  await supabase
    .from('email_campaigns')
    .update({ status: 'failed' })
    .eq('id', campaignId);
  // Best-effort tag every still-pending row with the broadcast error
  // so the per-row analytics view can render the cause.
  await supabase
    .from('email_campaign_recipients')
    .update({ send_status: 'failed', send_error: error.slice(0, 1000) })
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending');
}

function normalizeFrom(raw: string): string {
  const trimmed = raw.trim();
  const angle = trimmed.indexOf('<');
  if (angle === -1) return trimmed;
  const namePart = trimmed.slice(0, angle).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const addrPart = trimmed.slice(angle);
  return namePart ? `${namePart} ${addrPart}` : addrPart;
}

function stripDisplayName(raw: string): string {
  const trimmed = raw.trim();
  const open = trimmed.indexOf('<');
  const close = trimmed.lastIndexOf('>');
  if (open !== -1 && close > open) return trimmed.slice(open + 1, close).trim();
  return trimmed;
}
