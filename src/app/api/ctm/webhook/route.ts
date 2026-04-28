import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/ctm/webhook?token=<CTM_WEBHOOK_TOKEN>
//
// Receives a CallTrackingMetrics webhook payload and upserts the call
// into public.calls immediately, so the Calls page picks up new calls
// without waiting for the 5-minute cron. Configure in CTM under
// Settings → Webhooks → Call Completed with this URL.
//
// CTM does not sign webhook requests, so we gate on a shared token in
// the query string. Set CTM_WEBHOOK_TOKEN in Vercel env and paste the
// same value into the CTM webhook URL.

interface CtmWebhookPayload {
  // CTM sends the call payload either at the top level or nested
  // under `call` depending on the event. Accept both.
  call?: Record<string, unknown>;
  id?: number | string;
  called_at?: string;
  direction?: string;
  duration?: number;
  talk_time?: number;
  ring_time?: number;
  voicemail?: boolean;
  status?: string;
  first_call?: boolean;
  name?: string;
  caller_number?: string;
  caller_number_formatted?: string;
  receiving_number?: string;
  receiving_number_formatted?: string;
  tracking_number?: string;
  tracking_number_formatted?: string;
  source?: string;
  source_name?: string;
  tracking_label?: string;
  tag_list?: string[];
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  audio?: string;
  audio_url?: string;
  recording_url?: string;
  recording?: { url?: string } | string | null;
  transcript_url?: string;
}

// CTM has shipped recordings under several field names over the
// years; treat them all as equivalent. Same helper as in /ctm/sync.
function pickRecordingUrl(c: CtmWebhookPayload): string | null {
  const candidates: unknown[] = [
    c.audio,
    c.recording_url,
    c.audio_url,
    (c as { recording?: { url?: unknown } }).recording?.url,
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return null;
}

function mapCall(c: CtmWebhookPayload, accountId: string | null) {
  return {
    ctm_id: String(c.id),
    account_id: accountId,
    called_at: c.called_at ?? new Date().toISOString(),
    direction: c.direction ?? null,
    duration: c.duration ?? null,
    talk_time: c.talk_time ?? null,
    ring_time: c.ring_time ?? null,
    voicemail: c.voicemail ?? false,
    status: c.status ?? null,
    first_call: c.first_call ?? null,
    caller_name: c.name ?? null,
    caller_number: c.caller_number ?? null,
    caller_number_formatted: c.caller_number_formatted ?? null,
    receiving_number: c.receiving_number ?? null,
    receiving_number_formatted: c.receiving_number_formatted ?? null,
    tracking_number: c.tracking_number ?? null,
    tracking_number_formatted: c.tracking_number_formatted ?? null,
    source: c.source ?? null,
    source_name: c.source_name ?? null,
    tracking_label: c.tracking_label ?? null,
    tag_list: c.tag_list ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    country: c.country ?? null,
    zip: c.zip ?? null,
    audio_url: pickRecordingUrl(c),
    transcript_url: c.transcript_url ?? null,
    raw: c as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const expected = process.env.CTM_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'CTM_WEBHOOK_TOKEN is not configured.' }, { status: 500 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || req.headers.get('x-ctm-token') || '';
  if (token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as CtmWebhookPayload;
  const call: CtmWebhookPayload = (body.call as CtmWebhookPayload | undefined) ?? body;
  if (!call?.id) {
    return NextResponse.json({ error: 'missing call id' }, { status: 400 });
  }

  const accountId = process.env.CTM_ACCOUNT_ID ?? null;
  const row = mapCall(call, accountId);

  const supabase = getAdminSupabase();
  // Flag this call for auto-analysis. The actual scoring runs from the
  // background worker so we don't block the webhook response (CTM
  // retries aggressively on slow acks).
  const rowWithFlag = { ...row, needs_score: true };
  const { error } = await supabase.from('calls').upsert(rowWithFlag, { onConflict: 'ctm_id' });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the call now has audio (recording finalized) but a stale AI
  // score from the in-progress era is sitting in cache, drop it so
  // auto-score redoes the analysis with the actual recording.
  // We only target metadata-only rows (the score prompt forces
  // summary to start with "No audio available…" on that path) and
  // legacy "in progress" call_name placeholders. Real audio-based
  // scores stay put.
  if (row.audio_url) {
    await supabase
      .from('call_ai_scores')
      .delete()
      .eq('call_id', row.ctm_id)
      .or('summary.ilike.No audio available%,call_name.ilike.%in progress%,call_name.ilike.%in-progress%');
  }

  return NextResponse.json({ ok: true, ctm_id: row.ctm_id });
}

// Optional GET so you can hit the URL in a browser to verify the token
// without sending a full payload.
export async function GET(req: NextRequest) {
  const expected = process.env.CTM_WEBHOOK_TOKEN;
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ready: true });
}
