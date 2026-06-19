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
import { summariseTranscript } from '@/lib/transcript-summary';

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
// This account's Aircall plan returns TRANSCRIPTS but not summaries, so
// when a call has a transcript and no summary we generate one with Claude
// (summariseTranscript) and store it like any other summary.
//
// Auth: Vercel Cron (Authorization: Bearer CRON_SECRET) or a signed-in
// staff member (manual run). Idempotent; safe to re-run.

// Allow headroom for the per-call Claude summarisation (sequential).
export const maxDuration = 120;

const DEFAULT_CALL_CAP = 10; // calls per run (Aircall fetch + a Claude summary each)
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

  // Candidates needing AI work: no summary yet, old enough that Aircall's
  // own AI webhooks have had a chance, AND either we've never pulled
  // Aircall AI for it OR it already has a transcript we can summarise.
  // (Calls already attempted with no transcript are skipped — nothing left
  // to do for them.)
  let q = supabase
    .from('aircall_calls')
    .select('aircall_id, ai, transcript, summary, ai_synced_at')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (!force) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    q = q
      .is('summary', null)
      .lt('started_at', cutoff)
      .or('ai_synced_at.is.null,transcript.not.is.null');
  }

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let summarized = 0;
  let rateLimited = false;

  for (const row of rows ?? []) {
    const r = row as {
      aircall_id: number;
      ai: Record<string, unknown> | null;
      transcript: string | null;
      summary: string | null;
      ai_synced_at: string | null;
    };
    const callId = r.aircall_id;
    const mergedAi: Record<string, unknown> = { ...(r.ai ?? {}) };
    const patch: Record<string, unknown> = { aircall_id: callId };
    let transcript = r.transcript;
    let summary = r.summary;

    // 1) Pull Aircall's own AI endpoints once per call (or when forced).
    if (r.ai_synced_at == null || force) {
      for (const sub of AI_SUBRESOURCES) {
        const res = await fetchAi(callId, sub);
        if (res.status === 429) { rateLimited = true; break; }
        if (!res.ok || !res.data) continue; // 404 → not available for this call
        mergedAi[sub] = res.data;
        if (sub === 'transcription') {
          const t = extractTranscriptText(res.data);
          if (t) { patch.transcript = t; transcript = t; }
        } else if (sub === 'summary') {
          const s = extractSummaryText(res.data);
          if (s) { patch.summary = s; summary = s; }
        } else if (sub === 'topics') {
          const tp = extractTopics(res.data);
          if (tp) patch.topics = tp;
        } else if (sub === 'sentiments') {
          const se = extractSentiment(res.data);
          if (se) patch.sentiment = se;
        }
      }
      if (rateLimited) break; // stop WITHOUT marking — retried next run
      patch.ai = mergedAi;
      patch.ai_synced_at = new Date().toISOString();
    }

    // 2) Aircall gave a transcript but no summary → have Claude write one.
    if (!summary && transcript && transcript.trim()) {
      const generated = await summariseTranscript(transcript);
      if (generated) { patch.summary = generated; summarized += 1; }
    }

    // Nothing new to persist this pass — skip the write.
    if (Object.keys(patch).length <= 1) continue;
    patch.synced_at = new Date().toISOString();

    const { error: upErr } = await supabase.from('aircall_calls').upsert(patch, { onConflict: 'aircall_id' });
    if (upErr) {
      console.error('[aircall/backfill-ai] upsert failed', callId, upErr.message);
      continue;
    }
    processed += 1;
  }

  return NextResponse.json({ ok: true, scanned: rows?.length ?? 0, processed, summarized, rateLimited });
}

export async function POST(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}

export async function GET(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}
