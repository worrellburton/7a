import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

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
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Sending fans out to live contact email addresses under the Seven
  // Arrows brand, so the surface is gated to super admins. Regular
  // admins can still build / iterate / pick recipients; only the
  // final send button hits this route.
  {
    const admin = getAdminSupabase();
    const { data: userRow } = await admin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (userRow?.is_super_admin !== true) {
      return NextResponse.json(
        { error: 'Only super admins can send email campaigns.' },
        { status: 403 },
      );
    }
  }

  const body = (await req.json().catch(() => ({}))) as SendBody;
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 });

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
    .eq('send_status', 'pending');
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  const recipients = (recipientRows ?? []) as Array<{ id: string; email: string; send_status: string; contact_id: string }>;
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, simulated: false, note: 'No pending recipients.' });
  }

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const simulated = !apiKey;

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    let ok = false;
    let statusCode: number | null = null;
    let providerId: string | null = null;
    let responseText = '';
    let errText: string | null = null;

    if (simulated) {
      ok = true;
      responseText = 'simulated — RESEND_API_KEY not configured';
    } else {
      try {
        const res = await fetch(RESEND_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [r.email],
            subject: campaign.generated_subject,
            html: campaign.generated_html,
          }),
        });
        statusCode = res.status;
        const txt = await res.text();
        responseText = txt.slice(0, 2000);
        if (res.ok) {
          ok = true;
          try {
            const parsed = JSON.parse(txt) as { id?: string };
            providerId = parsed.id ?? null;
          } catch { /* non-JSON body — keep id null */ }
        } else {
          // Keep the whole response body (capped at 4k) so the
          // finalize page's Provider Response panel can show the
          // marketer the full diagnostic, not just a teaser.
          errText = `HTTP ${res.status}: ${txt.slice(0, 4000)}`;
        }
      } catch (err) {
        errText = err instanceof Error ? err.message : String(err);
        responseText = errText;
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
        contacted_by: user.id,
        contacted_at: nowIso,
      });
      await supabase.from('contacts')
        .update({
          last_contact_at: nowIso,
          last_contact_by: user.id,
          last_contact_method: 'Email Campaign',
          last_contact_comments: comment,
        })
        .eq('id', r.contact_id);
    }
  }

  const finalStatus = failed === 0 ? 'sent' : sent > 0 ? 'sent' : 'failed';
  await supabase
    .from('email_campaigns')
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return NextResponse.json({ ok: true, sent, failed, simulated });
}
