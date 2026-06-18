import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireStaff } from '@/lib/api-gates';
import { withCronLogging } from '@/lib/cron-observability';
import {
  aircallFetch,
  aircallConfigured,
  extractTranscriptText,
  extractSummaryText,
  extractTopics,
  extractSentiment,
} from '@/lib/aircall';

// POST|GET /api/aircall/backfill-ai — pull Conversation-Intelligence
// (transcript / summary / sentiment / topics) from Aircall's REST AI
// endpoints for calls that don't have it yet, and mirror it into
// public.aircall_calls. Complements the webhook (which PUSHES AI for new
// calls) by filling gaps: the window right after AI Assist was switched
// on, or any AI webhook we missed.
//
// AI data only exists for calls Aircall processed under an ACTIVE AI
// Assist license, so calls from before AI Assist was enabled simply
// return nothing. We stamp every call we try with ai_synced_at and never
// retry it — otherwise we'd re-ask Aircall's four AI endpoints for those
// calls on every cron run and burn through the rate limit.
//
// Auth: Vercel Cron (Authorization: Bearer CRON_SECRET) or a signed-in
// staff member (manual run). Idempotent; safe to re-run.

const DEFAULT_CALL_CAP = 15; // calls per run (× up to 4 AI requests each)
const MAX_CALL_CAP = 50;

const AI_SUBRESOURCES = ['transcription', 'summary', 'sentiments', 'topics'] as const;

interface AiFetch { ok: boolean; status: number; data: Record<string, unknown> | null }

// Non-throwing wrapper around aircallFetch — a missing resource (404,
// i.e. no AI for this call) is a normal "skip", not an error. The status
// is parsed back out of aircallFetch's `Aircall <status>: …` message so
// the caller can special-case 429 (rate limit).
async function fetchAi(callId: number, sub: string): Promise<AiFetch> {
  try {
    const data = await aircallFetch<Record<string, unknown>>(`/calls/${callId}/${sub}`);
    return { ok: true, status: 200, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const m = msg.match(/Aircall (\d+)/);
    return { ok: false, status: m ? Number(m[1]) : 0, data: null };
  }
}

async function handleBackfillAi(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  const viaCron = !!(expectedSecret && authHeader === `Bearer ${expectedSecret}`);
  if (!viaCron) {
    // Manual runs are staff-only — same boundary as the rest of /aircall.
    const gate = await requireStaff(req);
    if (gate instanceof NextResponse) return gate;
  }

  if (!aircallConfigured()) {
    return NextResponse.json(
      { error: 'Aircall is not configured — set AIRCALL_API_ID and AIRCALL_API_TOKEN.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';
  const limit = Math.max(1, Math.min(MAX_CALL_CAP, Number(url.searchParams.get('limit')) || DEFAULT_CALL_CAP));

  const supabase = getAdminSupabase();

  // Candidates: calls with no AI yet that we haven't already attempted.
  // Give the webhook a 15-minute head start before we pull (unless the
  // caller forces a re-scan of the most recent calls).
  let q = supabase
    .from('aircall_calls')
    .select('aircall_id, ai')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (!force) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    q = q.is('summary', null).is('transcript', null).is('ai_synced_at', null).lt('started_at', cutoff);
  }

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let withAi = 0;
  let rateLimited = false;

  for (const row of rows ?? []) {
    const callId = (row as { aircall_id: number }).aircall_id;
    const existingAi = ((row as { ai: Record<string, unknown> | null }).ai) ?? {};
    const mergedAi: Record<string, unknown> = { ...existingAi };
    const patch: Record<string, unknown> = { aircall_id: callId };
    let got = false;

    for (const sub of AI_SUBRESOURCES) {
      const res = await fetchAi(callId, sub);
      if (res.status === 429) { rateLimited = true; break; }
      if (!res.ok || !res.data) continue; // 404 → no AI for this sub-resource
      mergedAi[sub] = res.data;
      got = true;
      if (sub === 'transcription') {
        const t = extractTranscriptText(res.data);
        if (t) patch.transcript = t;
      } else if (sub === 'summary') {
        const s = extractSummaryText(res.data);
        if (s) patch.summary = s;
      } else if (sub === 'topics') {
        const tp = extractTopics(res.data);
        if (tp) patch.topics = tp;
      } else if (sub === 'sentiments') {
        const se = extractSentiment(res.data);
        if (se) patch.sentiment = se;
      }
    }

    // Hit the rate limit mid-call — stop the whole run WITHOUT marking
    // this call, so it's retried cleanly on the next pass.
    if (rateLimited) break;

    const now = new Date().toISOString();
    patch.ai = mergedAi;
    patch.ai_synced_at = now; // attempted — don't re-ask Aircall for this call
    patch.synced_at = now;

    const { error: upErr } = await supabase.from('aircall_calls').upsert(patch, { onConflict: 'aircall_id' });
    if (upErr) {
      console.error('[aircall/backfill-ai] upsert failed', callId, upErr.message);
      continue;
    }
    processed += 1;
    if (got) withAi += 1;
  }

  return NextResponse.json({ ok: true, scanned: rows?.length ?? 0, processed, withAi, rateLimited });
}

export async function POST(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}

export async function GET(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}
