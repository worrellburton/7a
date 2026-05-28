import type { SupabaseClient } from '@supabase/supabase-js';
import { buildUnsubscribeUrl } from './unsubscribe';
import { addUtmsToCampaignHtml } from './utm';

// Shared send-loop used by both the POST /api/email-campaigns/send
// handler (admin click-through send) and the cron at
// /api/cron/email-campaigns/scheduled-send (paced batch drain).
//
// Pulled out of the route file so the cron can call it as a function
// rather than HTTP-round-tripping to itself. The HTTP indirection
// was the source of the "SENDING…" stall: Vercel strips the
// x-vercel-cron header on internal calls, so the send handler was
// 401-ing every cron tick and the inflight campaign never drained.

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Seven Arrows Recovery <onboarding@resend.dev>';

export interface SendCampaignBatchOpts {
  supabase: SupabaseClient;
  campaignId: string;
  actingUserId: string | null;
  /** Drain only this many pending rows; undefined = drain all. */
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
  const { supabase, campaignId, actingUserId, batchSize } = opts;

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('id, generated_html, generated_subject, status')
    .eq('id', campaignId)
    .maybeSingle();
  if (campErr || !campaign) {
    return { ok: false, error: campErr?.message ?? 'Campaign not found.', sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }
  if (!campaign.generated_html || !campaign.generated_subject) {
    return { ok: false, error: 'Campaign is missing body or subject.', sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }

  const { data: recipientRows, error: recErr } = await supabase
    .from('email_campaign_recipients')
    .select('id, email, send_status, contact_id')
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending')
    .order('id', { ascending: true })
    .limit(batchSize != null && batchSize > 0 ? Math.floor(batchSize) : 10000);
  if (recErr) {
    return { ok: false, error: recErr.message, sent: 0, failed: 0, skipped: 0, simulated: false, stillPending: 0 };
  }
  const allPending = (recipientRows ?? []) as Array<{ id: string; email: string; send_status: string; contact_id: string }>;

  // Drop unsubscribed contacts before we hit Resend.
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
    // No work this tick. If the whole campaign is drained, flip
    // status to 'sent' so it stops sitting in the inflight queue.
    const { count: stillPending } = await supabase
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('send_status', 'pending');
    const remaining = stillPending ?? 0;
    if (remaining === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', campaignId);
    }
    return { ok: true, sent: 0, failed: 0, skipped, simulated: false, stillPending: remaining, note: 'No pending recipients.' };
  }

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const apiKey = process.env.RESEND_API_KEY;
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || DEFAULT_FROM);
  const replyToRaw = process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO;
  const replyTo = replyToRaw ? stripDisplayName(replyToRaw) : stripDisplayName(from);
  const simulated = !apiKey;

  let sent = 0;
  let failed = 0;

  const MAX_PARALLEL = 4;
  const RESEND_RPS = 4;
  const RESEND_WINDOW_MS = 1000;
  const recentSends: number[] = [];
  const acquireResendSlot = async () => {
    while (true) {
      const now = Date.now();
      while (recentSends.length > 0 && now - recentSends[0] >= RESEND_WINDOW_MS) {
        recentSends.shift();
      }
      if (recentSends.length < RESEND_RPS) {
        recentSends.push(now);
        return;
      }
      const wait = RESEND_WINDOW_MS - (now - recentSends[0]) + 5;
      await new Promise((r) => setTimeout(r, Math.max(wait, 25)));
    }
  };

  const sendViaResend = async (toEmail: string, contactId: string): Promise<Response> => {
    await acquireResendSlot();
    const unsubUrl = buildUnsubscribeUrl(contactId);
    const footerHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf6f1;">
  <tr>
    <td align="center" style="padding:24px 16px 32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8a7a6c;letter-spacing:0.04em;line-height:1.6;">
      You're receiving this because you've worked with Seven Arrows Recovery.<br />
      <a href="${unsubUrl}" style="color:#b87333;text-decoration:underline;font-weight:600;">Unsubscribe from these emails</a>
    </td>
  </tr>
</table>`;
    const taggedHtml = addUtmsToCampaignHtml(campaign.generated_html ?? '', {
      campaignId,
      subject: campaign.generated_subject,
    });
    const patchedHtml = taggedHtml
      .replace(/https:\/\/cdn\.simpleicons\.org\/linkedin\/ffffff/g, 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-white.svg')
      .replace(/https:\/\/cdn\.simpleicons\.org\/linkedin\/1a1a1a/g, 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-ink.svg');
    const html = patchedHtml.includes('</body>')
      ? patchedHtml.replace('</body>', `${footerHtml}\n</body>`)
      : `${patchedHtml}\n${footerHtml}`;
    return fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: campaign.generated_subject,
        html,
        reply_to: replyTo,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
  };

  let cursor = 0;
  const handleOne = async (r: typeof recipients[number]) => {
    let ok = false;
    let statusCode: number | null = null;
    let providerId: string | null = null;
    let responseText = '';
    let errText: string | null = null;

    if (simulated) {
      ok = true;
      responseText = 'simulated — RESEND_API_KEY not configured';
    } else {
      const MAX_ATTEMPTS = 4;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const res = await sendViaResend(r.email, r.contact_id);
          statusCode = res.status;
          const txt = await res.text();
          responseText = txt.slice(0, 2000);
          if (res.ok) {
            ok = true;
            errText = null;
            try {
              const parsed = JSON.parse(txt) as { id?: string };
              providerId = parsed.id ?? null;
            } catch { /* non-JSON body */ }
            break;
          }
          errText = `HTTP ${res.status}: ${txt.slice(0, 4000)}`;
          if (res.status !== 429 || attempt === MAX_ATTEMPTS) break;
          const retryAfterHdr = res.headers.get('retry-after');
          const retryAfterSec = retryAfterHdr ? Number(retryAfterHdr) : NaN;
          const backoffMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? Math.min(retryAfterSec * 1000, 5000)
            : 500 * 2 ** (attempt - 1);
          await new Promise((res2) => setTimeout(res2, backoffMs));
        } catch (err) {
          errText = err instanceof Error ? err.message : String(err);
          responseText = errText;
          if (attempt === MAX_ATTEMPTS) break;
          await new Promise((res2) => setTimeout(res2, 500 * 2 ** (attempt - 1)));
        }
      }
    }

    if (ok) sent += 1; else failed += 1;

    const nowIso = new Date().toISOString();
    await supabase.from('email_campaign_recipients')
      .update({
        send_status: ok ? 'sent' : 'failed',
        send_error: errText,
        sent_at: ok ? nowIso : null,
      })
      .eq('id', r.id);

    await supabase.from('email_campaign_sends').insert({
      campaign_id: campaignId,
      recipient_id: r.id,
      provider: simulated ? 'simulated' : 'resend',
      provider_message_id: providerId,
      ok,
      status_code: statusCode,
      response: responseText,
    });

    if (ok) {
      const comment = simulated
        ? `Sent email campaign (simulated): ${campaign.generated_subject}`
        : `Sent email campaign: ${campaign.generated_subject}`;
      await supabase.from('contact_logs').insert({
        contact_id: r.contact_id,
        method: 'Email Campaign',
        comments: comment,
        contacted_by: actingUserId,
        contacted_at: nowIso,
      });
      await supabase.from('contacts')
        .update({
          last_contact_at: nowIso,
          last_contact_by: actingUserId,
          last_contact_method: 'Email Campaign',
          last_contact_comments: comment,
        })
        .eq('id', r.contact_id);
    }
  };

  const worker = async () => {
    while (cursor < recipients.length) {
      const idx = cursor;
      cursor += 1;
      const r = recipients[idx];
      if (!r) continue;
      await handleOne(r);
    }
  };
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(MAX_PARALLEL, recipients.length); i += 1) workers.push(worker());
  await Promise.all(workers);

  const { count: stillPending } = await supabase
    .from('email_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending');
  const havePending = (stillPending ?? 0) > 0;

  if (havePending) {
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);
  } else {
    const finalStatus = failed === 0 ? 'sent' : sent > 0 ? 'sent' : 'failed';
    await supabase
      .from('email_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }

  return {
    ok: true,
    sent,
    failed,
    skipped,
    simulated,
    stillPending: stillPending ?? 0,
  };
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
