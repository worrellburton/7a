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
import { summariseTranscript, extractCallSource } from '@/lib/transcript-summary';

// POST|GET /api/aircall/backfill-ai — pull Conversation-Intelligence
// (transcript / summary / sentiment / topics) from Aircall's REST AI
// endpoints for calls that don't have it yet, and mirror it into
// public.aircall_calls. Complements the webhook (which PUSHES AI for new
// calls) by filling gaps: the window right after AI Assist was switched
// on, or any AI webhook we missed.
//
// AI data only exists for calls Aircall processed under an ACTIVE AI
// Assist license, so calls from before AI Assist was enabled simply
// return nothing.
//
// Readiness is gated on when the call ENDED (ended_at), not when it
// started: Aircall only generates Conversation Intelligence after a call
// finishes, so a window measured from started_at would make a long call a
// candidate while it's still in progress — we'd pull an empty blob and,
// historically, stamp ai_synced_at and never look again, permanently
// losing the transcript (and summary) of a 15-20 minute admissions call.
// Now we wait 15 min after ended_at, and bound retries with ai_attempts:
// a call still missing a transcript is re-pulled up to MAX_AI_ATTEMPTS
// times (so a slow Aircall transcription is recovered) and then left
// alone (so a call Aircall never transcribes isn't re-fetched forever).
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

// How many times we'll re-pull Aircall AI for a call that still has no
// transcript before giving up. Cron runs every 5 min and readiness opens
// 15 min after the call ends, so 5 attempts covers ~25 min of Aircall
// processing lag — well beyond its usual few-minutes turnaround — without
// re-fetching no-CI calls (missed, short, IVR) forever.
const MAX_AI_ATTEMPTS = 5;

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

  // Candidates needing AI work, considered only once the call has been
  // OVER for 15 minutes (ended_at, not started_at — so we never pull AI
  // for a call that's still in progress). Rows with a null ended_at (not
  // yet finalized) are excluded by the .lt below.
  let q = supabase
    .from('aircall_calls')
    .select('aircall_id, ai, transcript, summary, source, ai_synced_at, ai_attempts')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (!force) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    // Needs work = never pulled Aircall AI, OR has a transcript but no
    // summary, OR has a transcript but no source-detection pass yet, OR
    // still has no transcript but is under the retry budget (so a
    // transcript Aircall produced late still gets picked up).
    q = q
      .lt('ended_at', cutoff)
      .or(
        [
          'ai_synced_at.is.null',
          'and(transcript.not.is.null,summary.is.null)',
          'and(transcript.not.is.null,source.is.null)',
          `and(transcript.is.null,ai_attempts.lt.${MAX_AI_ATTEMPTS})`,
        ].join(','),
      );
  }

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let summarized = 0;
  let sourced = 0;
  let rateLimited = false;

  for (const row of rows ?? []) {
    const r = row as {
      aircall_id: number;
      ai: Record<string, unknown> | null;
      transcript: string | null;
      summary: string | null;
      source: string | null;
      ai_synced_at: string | null;
      ai_attempts: number | null;
    };
    const callId = r.aircall_id;
    const attempts = r.ai_attempts ?? 0;
    const mergedAi: Record<string, unknown> = { ...(r.ai ?? {}) };
    const patch: Record<string, unknown> = { aircall_id: callId };
    let transcript = r.transcript;
    let summary = r.summary;

    // 1) Pull Aircall's own AI endpoints: the first time we see the call,
    // when forced, or — for a call still missing a transcript — until we
    // exhaust the retry budget (covers Aircall transcribing after our
    // first look).
    const hasTranscript = !!(transcript && transcript.trim());
    if (force || r.ai_synced_at == null || (!hasTranscript && attempts < MAX_AI_ATTEMPTS)) {
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
      // Still no transcript after this pull → count the attempt so we
      // eventually stop re-fetching a call Aircall never transcribes.
      if (!(transcript && transcript.trim())) patch.ai_attempts = attempts + 1;
    }

    // 2) Aircall gave a transcript but no summary → have Claude write one.
    if (!summary && transcript && transcript.trim()) {
      const generated = await summariseTranscript(transcript);
      if (generated) { patch.summary = generated; summarized += 1; }
    }

    // 3) Detect the "how did you hear about us?" source from the
    // transcript, once per call. Store '' (empty) when it wasn't asked /
    // answered so we don't re-ask Claude every run; '' renders blank.
    if (transcript && transcript.trim() && r.source == null) {
      const src = await extractCallSource(transcript);
      patch.source = src ?? '';
      if (src) sourced += 1;
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

  return NextResponse.json({ ok: true, scanned: rows?.length ?? 0, processed, summarized, sourced, rateLimited });
}

export async function POST(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}

export async function GET(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill-ai', () => handleBackfillAi(req));
}
