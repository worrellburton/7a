import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

// POST /api/calls/auto-score
//
// Picks up to N calls flagged needs_score=true and whose audio has
// been published (audio_url present), runs the scoring route on each,
// and clears the flag. Runs after every CTM sync tick so every new
// call that came in via the webhook or the cron gets analyzed
// without a human pressing Analyze.

const BATCH = 10;
const MAX_ATTEMPTS = 5;

// Pull a usable error message out of the scoring response. Prefer
// the JSON `error` / `detail` field; fall back to raw text.
async function extractErrorText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { error?: string; detail?: string };
      return parsed.error || parsed.detail || text.slice(0, 500);
    } catch {
      return text.slice(0, 500);
    }
  } catch {
    return '(no body)';
  }
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  const viaCron = !!(expectedSecret && authHeader === `Bearer ${expectedSecret}`);
  if (!viaCron) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  // Only pick calls whose audio URL is present — otherwise Gemini
  // can't score them properly. Calls without audio fall back to
  // Claude metadata scoring eventually once a user opens the page.
  const { data: queue, error } = await supabase
    .from('calls')
    .select('ctm_id, caller_number_formatted, caller_number, receiving_number_formatted, tracking_number_formatted, direction, source, source_name, city, state, duration, talk_time, ring_time, called_at, tracking_label, audio_url, tag_list, status, voicemail, first_call, score_attempts')
    .eq('needs_score', true)
    .lt('score_attempts', MAX_ATTEMPTS)
    .not('audio_url', 'is', null)
    .order('called_at', { ascending: false })
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = queue ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, remaining: 0 });
  }

  const base = new URL(req.url);
  const scoreUrl = `${base.origin}/api/claude/calls/score`;

  let processed = 0;
  let failed = 0;
  for (const c of rows) {
    const callPayload = {
      id: c.ctm_id,
      caller_number_formatted: c.caller_number_formatted,
      caller_number: c.caller_number,
      receiving_number_formatted: c.receiving_number_formatted,
      tracking_number_formatted: c.tracking_number_formatted,
      direction: c.direction,
      source: c.source,
      source_name: c.source_name,
      city: c.city,
      state: c.state,
      duration: c.duration,
      talk_time: c.talk_time,
      ring_time: c.ring_time,
      called_at: c.called_at,
      tracking_label: c.tracking_label,
      audio: c.audio_url,
      tag_list: c.tag_list,
      status: c.status,
      voicemail: c.voicemail,
      first_call: c.first_call,
    };

    try {
      const res = await fetch(scoreUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expectedSecret ?? ''}`,
        },
        body: JSON.stringify({ callId: c.ctm_id, call: callPayload }),
      });
      if (!res.ok) {
        failed++;
        const errText = await extractErrorText(res);
        await supabase
          .from('calls')
          .update({
            score_attempts: (c.score_attempts ?? 0) + 1,
            score_attempted_at: new Date().toISOString(),
            score_error: `HTTP ${res.status}: ${errText}`.slice(0, 2000),
            score_errored_at: new Date().toISOString(),
          })
          .eq('ctm_id', c.ctm_id);
        continue;
      }
      // Clear any prior error on a successful score.
      await supabase
        .from('calls')
        .update({
          needs_score: false,
          score_attempts: (c.score_attempts ?? 0) + 1,
          score_attempted_at: new Date().toISOString(),
          score_error: null,
          score_errored_at: null,
        })
        .eq('ctm_id', c.ctm_id);
      processed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from('calls')
        .update({
          score_attempts: (c.score_attempts ?? 0) + 1,
          score_attempted_at: new Date().toISOString(),
          score_error: `fetch threw: ${message}`.slice(0, 2000),
          score_errored_at: new Date().toISOString(),
        })
        .eq('ctm_id', c.ctm_id);
    }
  }

  const { count: remaining } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .eq('needs_score', true)
    .lt('score_attempts', MAX_ATTEMPTS);

  return NextResponse.json({ ok: true, processed, failed, remaining: remaining ?? 0 });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
