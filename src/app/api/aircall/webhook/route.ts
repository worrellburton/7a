import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import {
  mapAircallCall,
  mapAircallMessage,
  extractCallId,
  extractTranscriptText,
  extractSummaryText,
  extractTopics,
  extractSentiment,
  type AircallCall,
  type AircallMessageObj,
} from '@/lib/aircall';

// POST /api/aircall/webhook
//
// Receives Aircall webhook events and mirrors them into
// public.aircall_calls so the Calls page (and its Supabase Realtime
// subscription) updates the instant something happens — no polling.
//
// Configure in the Aircall Dashboard → Integrations → Webhooks with this
// URL and a shared secret. Aircall echoes that secret back in the
// payload's `token` field, which we verify against AIRCALL_WEBHOOK_TOKEN.
//
// Two families of events are handled:
//   - call.*          → upsert the Call object (created / answered /
//                       ended / tagged / commented / assigned / …)
//   - *.created (AI)  → transcription / summary / topics / sentiment land
//                       after the call ends; merged onto the call row.

interface AircallWebhookBody {
  resource?: string;
  event?: string;
  timestamp?: number;
  token?: string;
  data?: Record<string, unknown>;
}

const AI_EVENTS = new Set([
  'transcription.created',
  'summary.created',
  'topics.created',
  'sentiment.created',
  'action_item.created',
  'call_evaluation.created',
  'call_evaluation.updated',
  'custom_summary.result_created',
  'custom_summary.result_updated',
]);

export async function POST(req: NextRequest) {
  const expected = process.env.AIRCALL_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'AIRCALL_WEBHOOK_TOKEN is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as AircallWebhookBody | null;
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  // Aircall includes the configured secret in the payload `token`. Also
  // accept it via query/header for flexibility during setup.
  const url = new URL(req.url);
  const token = body.token || url.searchParams.get('token') || req.headers.get('x-aircall-token') || '';
  if (token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = body.event ?? '';
  const data = body.data ?? {};
  const supabase = getAdminSupabase();

  // --- Call lifecycle events -------------------------------------------
  if (event.startsWith('call.')) {
    const call = data as unknown as AircallCall;
    if (!call?.id) return NextResponse.json({ error: 'missing call id' }, { status: 400 });
    const row = mapAircallCall(call);
    const { error } = await supabase.from('aircall_calls').upsert(row, { onConflict: 'aircall_id' });
    if (error) {
      console.error('[aircall/webhook] call upsert failed', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, event, aircall_id: call.id });
  }

  // --- SMS / text message events ---------------------------------------
  // message.received / message.sent / message.status_updated (+ group_*).
  // Aircall nests the resource under `data` (sometimes data.message); the
  // mapper tolerates either. Persisted into aircall_messages, which the
  // Calls page streams via Realtime.
  if (event.startsWith('message.') || event.startsWith('group_message.')) {
    const m = ((data.message ?? data) as unknown) as AircallMessageObj;
    if (m?.id === undefined || m?.id === null) {
      return NextResponse.json({ error: 'missing message id' }, { status: 400 });
    }
    const row = mapAircallMessage(m);
    const { error } = await supabase
      .from('aircall_messages')
      .upsert(row, { onConflict: 'aircall_message_id' });
    if (error) {
      console.error('[aircall/webhook] message upsert failed', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, event, aircall_message_id: row.aircall_message_id });
  }

  // --- Conversation-Intelligence (AI) events ---------------------------
  if (AI_EVENTS.has(event)) {
    const callId = extractCallId(data);
    if (!callId) return NextResponse.json({ error: 'missing call id on AI event' }, { status: 400 });

    // Read-modify-write the `ai` jsonb so multiple AI events accrete
    // rather than overwrite. Tolerate the call row not existing yet
    // (AI event can race ahead of the backfill) by inserting a stub.
    const { data: existing } = await supabase
      .from('aircall_calls')
      .select('ai')
      .eq('aircall_id', callId)
      .maybeSingle();

    const mergedAi = { ...(existing?.ai ?? {}), [event]: data };
    const patch: Record<string, unknown> = { aircall_id: callId, ai: mergedAi, synced_at: new Date().toISOString() };

    if (event === 'transcription.created') {
      const t = extractTranscriptText(data);
      if (t) patch.transcript = t;
    } else if (event === 'summary.created' || event.startsWith('custom_summary.')) {
      const s = extractSummaryText(data);
      if (s) patch.summary = s;
    } else if (event === 'topics.created') {
      const topics = extractTopics(data);
      if (topics) patch.topics = topics;
    } else if (event === 'sentiment.created') {
      const s = extractSentiment(data);
      if (s) patch.sentiment = s;
    }

    const { error } = await supabase.from('aircall_calls').upsert(patch, { onConflict: 'aircall_id' });
    if (error) {
      console.error('[aircall/webhook] AI upsert failed', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, event, aircall_id: callId });
  }

  // Unknown / unhandled event — acknowledge so Aircall doesn't retry.
  return NextResponse.json({ ok: true, event, ignored: true });
}

// GET so the URL can be verified in a browser without a full payload.
export async function GET(req: NextRequest) {
  const expected = process.env.AIRCALL_WEBHOOK_TOKEN;
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ready: true });
}
