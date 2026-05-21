import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/email-campaigns/webhook
//
// Resend webhook ingestion. Resend POSTs every state change for a
// previously-sent email (delivered / opened / clicked / bounced /
// complained / failed / delivery_delayed) to this endpoint, signed
// via Svix. We verify the signature, store the raw event, and link
// it to the email_campaign_recipients row by provider_message_id
// (== data.email_id). The analytics route then aggregates straight
// out of email_campaign_events instead of polling Resend's
// per-email retrieve endpoint (which lags reality badly).
//
// Configuration:
//   1. In the Resend dashboard, go to Webhooks → Add Endpoint.
//      Endpoint URL: https://<your-domain>/api/email-campaigns/webhook
//      Subscribe to: every email.* event (or at minimum delivered,
//      opened, clicked, bounced, complained, failed).
//   2. Copy the Signing Secret (starts with whsec_) and set the
//      RESEND_WEBHOOK_SECRET env var on Vercel / .env.local.
//
// Idempotency: Resend retries the same delivery until it gets a 2xx,
// so the svix-id header is stored as a unique key and duplicate
// deliveries are no-ops. Opens and clicks also fire repeatedly per
// recipient — those are stored as separate rows (one event = one
// row), so analytics aggregations should `count(distinct
// recipient_id)` not `count(*)`.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TOLERANCE_SECONDS = 5 * 60;

interface ResendEventEnvelope {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    // Each event carries an envelope of email metadata plus, on
    // open / click / bounce, additional event-specific payload
    // (e.g. data.click.url). We store the whole `data` blob as
    // jsonb so the analytics layer can read whatever it needs
    // without us pre-projecting every field.
    [key: string]: unknown;
  };
}

function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  signaturesHeader: string,
  rawBody: string,
): boolean {
  // Reject if the timestamp is too far skewed — protects against
  // a captured-and-replayed signed payload.
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSec > TOLERANCE_SECONDS) return false;

  // Svix secrets are base64 prefixed with "whsec_".
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let secretBuf: Buffer;
  try {
    secretBuf = Buffer.from(rawSecret, 'base64');
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretBuf).update(signedPayload).digest('base64');

  // svix-signature: "v1,<base64sig> v1,<base64sig> …"
  const parts = signaturesHeader.split(' ').filter(Boolean);
  for (const p of parts) {
    const [, sig] = p.split(',', 2);
    if (!sig) continue;
    try {
      const sigBuf = Buffer.from(sig, 'base64');
      const expBuf = Buffer.from(expected, 'base64');
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const rawBody = await req.text();
  if (!verifySvixSignature(secret, svixId, svixTimestamp, svixSignature, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ResendEventEnvelope;
  try {
    event = JSON.parse(rawBody) as ResendEventEnvelope;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.type;
  const data = event.data;
  const providerMessageId = data?.email_id;
  // Resend ships type like "email.delivered" — strip the namespace
  // prefix so the stored event_type matches the column convention
  // used elsewhere (delivered / opened / clicked / bounced / ...).
  const shortType = eventType?.startsWith('email.') ? eventType.slice('email.'.length) : eventType;

  if (!shortType || !providerMessageId) {
    return NextResponse.json({ ok: true, skipped: 'missing type or email_id' });
  }

  const occurredAt = (typeof event.created_at === 'string' && event.created_at)
    || (typeof data?.created_at === 'string' && data.created_at)
    || new Date().toISOString();

  const admin = getAdminSupabase();

  // Resolve recipient + campaign from the message id via
  // email_campaign_sends. There can be more than one send row for a
  // re-sent recipient; take the most recent.
  const { data: sendRow } = await admin
    .from('email_campaign_sends')
    .select('campaign_id, recipient_id')
    .eq('provider_message_id', providerMessageId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertErr } = await admin
    .from('email_campaign_events')
    .insert({
      provider_message_id: providerMessageId,
      recipient_id: sendRow?.recipient_id ?? null,
      campaign_id: sendRow?.campaign_id ?? null,
      event_type: shortType,
      occurred_at: occurredAt,
      payload: data ?? {},
      svix_id: svixId,
    });
  // Duplicate (Resend retry) — treat as success. Postgres error
  // 23505 is unique_violation on svix_id; everything else is real.
  if (insertErr && insertErr.code !== '23505') {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Best-effort: keep the denormalised send_status on the
  // recipients row in lockstep with terminal events. Useful for
  // grid / list views that don't want to re-aggregate the events
  // table per row.
  if (sendRow?.recipient_id && (shortType === 'bounced' || shortType === 'complained')) {
    await admin
      .from('email_campaign_recipients')
      .update({
        send_status: 'failed',
        send_error: shortType === 'bounced' ? 'Bounced (per Resend webhook).' : 'Marked as spam (per Resend webhook).',
      })
      .eq('id', sendRow.recipient_id);
  }

  return NextResponse.json({ ok: true });
}
