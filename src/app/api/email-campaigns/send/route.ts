import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { buildUnsubscribeUrl } from '@/lib/unsubscribe';
import { requireAdmin } from '@/lib/api-gates';
import { addUtmsToCampaignHtml } from '@/lib/utm';

// POST /api/email-campaigns/send
//
// Phase 10 — fan out the campaign to every pending recipient via
// Resend's HTTP API. Updates each recipient row with send_status,
// writes a public.contact_logs entry (method='Email Campaign') so
// the contact's activity log shows the send, bumps the contact's
// last_contact_* columns, and flips the campaign row to
// status='sent' once the loop completes. Every write hits a table
// that's in the supabase_realtime publication, so any other admin
// with the page open sees rows arrive live.
//
// If RESEND_API_KEY isn't configured we still mark each row as
// 'sent' so the full UX flow can be exercised, recording
// provider='simulated' on the audit row. The response includes a
// `simulated` flag so the UI can surface this state.
//
// Default sender uses Resend's sandbox domain (onboarding@resend.dev)
// so sends work out of the box. Set EMAIL_FROM to a verified Resend
// sender ("Seven Arrows Recovery <hello@sevenarrowsrecoveryarizona.com>",
// etc.) once you've verified the domain in https://resend.com/domains.
//
// Required env (real send): RESEND_API_KEY
// Optional env: EMAIL_FROM (defaults to
//   "Seven Arrows Recovery <onboarding@resend.dev>")

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Seven Arrows Recovery <onboarding@resend.dev>';

interface SendBody {
  campaignId?: unknown;
  /** Optional · how many of the pending recipients this call should
   *  drain. Used by the scheduled-send cron to pace a big campaign
   *  across multiple 1-minute ticks so we stay under Resend's daily
   *  100-email free-tier ceiling AND the per-second rate. Default
   *  (undefined) drains every pending row, matching the original
   *  click-Send-now behaviour. */
  batchSize?: unknown;
}

export async function POST(req: NextRequest) {
  // Two callers: an admin clicking Send in the UI, and the
  // scheduled-send cron firing a queued campaign. The cron presents
  // either Vercel's signed `x-vercel-cron` header or an internal
  // `x-cron-secret` matching CRON_SECRET so it can bypass the
  // user-bound auth check. Everything else needs an admin/super-admin
  // user.
  const cronHeader = req.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;
  const cronAuth = req.headers.get('x-cron-secret');
  const isCron = cronHeader || (cronSecret != null && cronSecret.length > 0 && cronAuth === cronSecret);
  let actingUserId: string | null = null;

  if (!isCron) {
    const gate = await requireAdmin(req, 'Only admins can send email campaigns.');
    if (gate instanceof NextResponse) return gate;
    actingUserId = gate.userId;
  }

  const body = (await req.json().catch(() => ({}))) as SendBody & { actingUserId?: string };
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 });
  // For cron sends, fall back to the campaign's created_by so the
  // contact_logs rows still get attributed to a real teammate.
  if (!actingUserId && typeof body.actingUserId === 'string') actingUserId = body.actingUserId;

  const supabase = getAdminSupabase();
  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('id, generated_html, generated_subject, status')
    .eq('id', campaignId)
    .maybeSingle();
  if (campErr || !campaign) {
    return NextResponse.json({ error: campErr?.message ?? 'Campaign not found.' }, { status: 404 });
  }
  if (!campaign.generated_html || !campaign.generated_subject) {
    return NextResponse.json({ error: 'Campaign is missing body or subject.' }, { status: 400 });
  }

  const { data: recipientRows, error: recErr } = await supabase
    .from('email_campaign_recipients')
    .select('id, email, send_status, contact_id')
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending')
    // Optional batching — when the cron passes batchSize, drain
    // only that many pending rows per call so a big campaign
    // spreads across multiple cron ticks instead of bursting.
    .order('id', { ascending: true })
    .limit(typeof body.batchSize === 'number' && body.batchSize > 0
      ? Math.floor(body.batchSize)
      : 10000);
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  const allPending = (recipientRows ?? []) as Array<{ id: string; email: string; send_status: string; contact_id: string }>;

  // Drop unsubscribed contacts before we hit Resend. Mark each one
  // 'skipped' so the per-row UI shows "unsubscribed" instead of an
  // ambiguous failed/pending. One round-trip pulls every flagged
  // contact in this batch.
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
    return NextResponse.json({ ok: true, sent: 0, failed: 0, skipped, simulated: false, note: 'No pending recipients.' });
  }

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const apiKey = process.env.RESEND_API_KEY;
  // RESEND_FROM is the canonical name (matches what Resend's own
  // dashboard/docs use); EMAIL_FROM is kept as a fallback for older
  // configs. Falls all the way back to onboarding@resend.dev so a
  // dev environment without a verified domain can still send.
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || DEFAULT_FROM);
  // Reply-To: where replies actually land. Defaults to the same
  // mailbox as From if not set; the From display name is stripped
  // since Resend expects a bare address in reply_to.
  const replyToRaw = process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO;
  const replyTo = replyToRaw ? stripDisplayName(replyToRaw) : stripDisplayName(from);
  const simulated = !apiKey;

  let sent = 0;
  let failed = 0;

  // Concurrent worker pool — matches the pattern used in
  // /api/email-campaigns/backfill-events. Sending 100 recipients
  // sequentially blocks wall time on Resend latency × N (a 500ms
  // round-trip × 100 = 50 seconds of dead time); a pool of 6 keeps
  // total wall time to roughly ~N/6 × latency without tripping
  // Resend's rate limit. Each worker still does its own writeback
  // sequentially so a single recipient's three writes
  // (recipients update + sends insert + contact_logs insert +
  // contacts update) remain ordered for that contact.
  const MAX_PARALLEL = 4;

  // Resend's free / default-tier limit is 5 requests/sec. The
  // worker pool can fire faster than that under low latency, so we
  // gate every Resend fetch through a sliding-window limiter that
  // keeps the moving rate at ≤ RESEND_RPS per second. The buffer
  // (subtracting one from the configured cap) leaves headroom for
  // any retries we kick on a 429 so a retry doesn't immediately
  // race back into the same limit.
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
    // Per-recipient HTML — append a small unsubscribe footer just
    // before </body> if it's there, otherwise tack it onto the end.
    // We always do this so older campaign HTML (built before the
    // template's own footer was updated) still ships with an
    // unsubscribe link. The eyebrow + link uses the email template's
    // Copper accent so it blends with the existing footer.
    const footerHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf6f1;">
  <tr>
    <td align="center" style="padding:24px 16px 32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#8a7a6c;letter-spacing:0.04em;line-height:1.6;">
      You're receiving this because you've worked with Seven Arrows Recovery.<br />
      <a href="${unsubUrl}" style="color:#b87333;text-decoration:underline;font-weight:600;">Unsubscribe from these emails</a>
    </td>
  </tr>
</table>`;
    // Rewrite every link pointing at the marketing site to carry
    // GA4 UTM parameters so Google Analytics attributes the click
    // back to this specific campaign. Done at send time (not at
    // build time) so the stored generated_html stays UTM-free —
    // preview / iterate cycles read clean and the rewrite reflects
    // the campaign's current subject even after a rename.
    const taggedHtml = addUtmsToCampaignHtml(campaign.generated_html ?? '', {
      campaignId,
      subject: campaign.generated_subject,
    });
    const html = taggedHtml.includes('</body>')
      ? taggedHtml.replace('</body>', `${footerHtml}\n</body>`)
      : `${taggedHtml}\n${footerHtml}`;
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
        // RFC 8058 one-click unsubscribe + RFC 2369 inline link.
        // Gmail / Apple Mail surface a dedicated Unsubscribe button
        // in the header when these are present, which improves
        // deliverability + keeps us out of spam folders.
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
      // Resend will still occasionally return 429 even with the
      // local 5-req/sec limiter (clock skew, retries colliding with
      // a concurrent campaign, etc). Retry transient 429s with
      // exponential backoff before declaring the recipient failed.
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
            } catch { /* non-JSON body — keep id null */ }
            break;
          }
          // Keep the whole response body (capped at 4k) so the
          // finalize page's Provider Response panel can show the
          // marketer the full diagnostic, not just a teaser.
          errText = `HTTP ${res.status}: ${txt.slice(0, 4000)}`;
          if (res.status !== 429 || attempt === MAX_ATTEMPTS) break;
          // Respect Retry-After if Resend sends one; otherwise back
          // off 500ms · 1s · 2s before retrying.
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

    // Write a contact-side log entry so the contact's activity
    // stream shows the email, and bump the denormalized
    // last_contact_* columns the outreach grid reads. Skipped
    // on a failed send so we don't claim contact happened.
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

  // If this was a batched call, there may still be pending rows
  // waiting on a future cron tick. Re-query before flipping the
  // campaign so we don't prematurely close out a paced campaign.
  const { count: stillPending } = await supabase
    .from('email_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('send_status', 'pending');
  const havePending = (stillPending ?? 0) > 0;

  if (havePending) {
    // Keep status='sending'; the cron will pick this campaign up
    // again on the next tick and drain the next batch.
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

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skipped,
    simulated,
    stillPending: stillPending ?? 0,
  });
}

// Vercel's "Sensitive" env-var editor sometimes stores spaces as
// underscores in display names (we've seen "Seven_Arrows_Recovery
// <hello@…>" round-trip from copy-paste). That's harmless to the
// SMTP envelope but recipients see the ugly underscore name in
// their inbox. Normalize: any run of underscores in the part of
// the header BEFORE the first "<" becomes a single space. Email
// addresses inside the angle brackets are left untouched so a
// real underscore-bearing local-part (rare but legal) survives.
function normalizeFrom(raw: string): string {
  const trimmed = raw.trim();
  const angle = trimmed.indexOf('<');
  if (angle === -1) return trimmed;
  const namePart = trimmed.slice(0, angle).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const addrPart = trimmed.slice(angle);
  return namePart ? `${namePart} ${addrPart}` : addrPart;
}

// Resend's `reply_to` field expects a bare email address (no
// display name, no angle brackets). Accepts either an already-bare
// address or a "Name <addr@host>" string and returns just the
// address.
function stripDisplayName(raw: string): string {
  const trimmed = raw.trim();
  const open = trimmed.indexOf('<');
  const close = trimmed.lastIndexOf('>');
  if (open !== -1 && close > open) return trimmed.slice(open + 1, close).trim();
  return trimmed;
}
