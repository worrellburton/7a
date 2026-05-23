import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-gates';

// POST /api/email-campaigns/backfill-events
//
// One-off seeder for the email_campaign_events table. Resend only
// pushes webhook events going forward from the moment you register
// the endpoint, so any campaign sent before that has zero events
// stored locally and the analytics card still reads 0% across the
// board. This route fixes that by polling Resend's GET /emails/{id}
// once per recipient that has a provider_message_id, then writing
// a single synthetic event row capturing whatever terminal state
// Resend currently knows about ('delivered', 'opened', 'clicked',
// 'bounced', 'complained', ...).
//
// The synthetic event row gets a stable svix_id of the form
//   "backfill:<message_id>:<event_type>"
// so re-running the backfill is a no-op (the existing webhook
// route already treats svix_id unique violations as success).
//
// Gating: super-admin only. The route is intentionally exposed via
// POST (not GET) so it can't be triggered by a stray prefetch.
//
// Required env: RESEND_API_KEY. If missing, returns 400.

const RESEND_BASE = 'https://api.resend.com/emails/';
const MAX_PARALLEL = 6;
// Anything past 'sent' is a real terminal state worth seeding; 'sent'
// is just "we accepted the POST" and would be a no-op vs. what
// email_campaign_sends already records.
const SEED_EVENTS = new Set(['delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'delivery_delayed']);

interface ResendEmail {
  id: string;
  to?: string[];
  from?: string;
  subject?: string;
  created_at?: string;
  last_event?: string;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, 'Only admins can run the backfill.');
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 400 });
  }

  // Pull the latest provider_message_id per recipient (a re-send
  // creates a newer email_campaign_sends row; we only seed the
  // freshest one to avoid double-counting against a stale id).
  const { data: sendRows, error: sendsErr } = await admin
    .from('email_campaign_sends')
    .select('campaign_id, recipient_id, provider, provider_message_id, sent_at')
    .eq('provider', 'resend')
    .not('provider_message_id', 'is', null)
    .order('sent_at', { ascending: false });
  if (sendsErr) return NextResponse.json({ error: sendsErr.message }, { status: 500 });

  type SendRow = { campaign_id: string | null; recipient_id: string | null; provider_message_id: string; sent_at: string };
  const latestByRecipient = new Map<string, SendRow>();
  for (const s of (sendRows ?? []) as Array<SendRow & { provider: string | null }>) {
    if (!s.recipient_id || !s.provider_message_id) continue;
    if (!latestByRecipient.has(s.recipient_id)) latestByRecipient.set(s.recipient_id, s);
  }
  const targets = Array.from(latestByRecipient.values());
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, polled: 0, seeded: 0, skipped: 0, errors: [] });
  }

  let polled = 0;
  let seeded = 0;
  let skipped = 0;
  const errors: Array<{ messageId: string; reason: string }> = [];

  const runOne = async (s: SendRow) => {
    polled += 1;
    try {
      const res = await fetch(`${RESEND_BASE}${encodeURIComponent(s.provider_message_id)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        errors.push({ messageId: s.provider_message_id, reason: `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as ResendEmail;
      const lastEvent = (data.last_event ?? '').toLowerCase();
      if (!SEED_EVENTS.has(lastEvent)) {
        skipped += 1;
        return;
      }
      const svixId = `backfill:${s.provider_message_id}:${lastEvent}`;
      const occurredAt = (typeof data.created_at === 'string' && data.created_at) || new Date().toISOString();
      const { error: insertErr } = await admin
        .from('email_campaign_events')
        .insert({
          id: randomUUID(),
          provider_message_id: s.provider_message_id,
          recipient_id: s.recipient_id,
          campaign_id: s.campaign_id,
          event_type: lastEvent,
          occurred_at: occurredAt,
          payload: { ...data, _backfilled: true },
          svix_id: svixId,
        });
      if (insertErr) {
        // 23505 is unique_violation — we already backfilled this row;
        // count it as success rather than as a real error.
        if (insertErr.code === '23505') {
          skipped += 1;
        } else {
          errors.push({ messageId: s.provider_message_id, reason: insertErr.message });
        }
        return;
      }
      seeded += 1;
      // Mirror the webhook path: terminal-bad events should also
      // flip the recipients row so the grid surfaces it.
      if ((lastEvent === 'bounced' || lastEvent === 'complained') && s.recipient_id) {
        await admin
          .from('email_campaign_recipients')
          .update({
            send_status: 'failed',
            send_error: lastEvent === 'bounced'
              ? 'Bounced (per Resend backfill).'
              : 'Marked as spam (per Resend backfill).',
          })
          .eq('id', s.recipient_id);
      }
    } catch (e) {
      errors.push({ messageId: s.provider_message_id, reason: e instanceof Error ? e.message : String(e) });
    }
  };

  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const idx = cursor;
      cursor += 1;
      const t = targets[idx];
      if (!t) continue;
      await runOne(t);
    }
  };
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(MAX_PARALLEL, targets.length); i += 1) workers.push(worker());
  await Promise.all(workers);

  return NextResponse.json({ ok: true, polled, seeded, skipped, errors });
}
