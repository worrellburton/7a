import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_DOWNLOAD_TIMEOUT = 30_000;

interface CallInput {
  id: string;
  name?: string | null;
  caller_number_formatted?: string | null;
  caller_number?: string | null;
  tracking_number_formatted?: string | null;
  receiving_number_formatted?: string | null;
  direction?: string | null;
  source?: string | null;
  source_name?: string | null;
  city?: string | null;
  state?: string | null;
  duration?: number | null;
  talk_time?: number | null;
  ring_time?: number | null;
  called_at?: string | null;
  tracking_label?: string | null;
  audio?: string | null;
  tag_list?: string[] | null;
  status?: string | null;
  voicemail?: boolean | null;
  first_call?: boolean | null;
  score?: number | null;
  notes?: string | null;
}

interface ScoreResult {
  score: number;
  caller_name: string | null;
  caller_interest: string | null;
  summary: string;
  operator_strengths: string[];
  operator_weaknesses: string[];
  next_steps: string | null;
  sentiment: string | null;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return 'unknown';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function buildPrompt(call: CallInput, hasAudio: boolean): string {
  const audioInstruction = hasAudio
    ? `\n\nYou also have the actual audio recording of this call. Listen to it carefully and use the conversation content to inform your analysis — identify what the caller wanted, how the operator handled it, and any specific dialogue strengths or weaknesses. The audio is the primary source of truth; use the metadata to supplement.`
    : '';

  return `You are an expert call-center performance analyst for Seven Arrows Recovery, an addiction treatment facility. You are reviewing a single inbound or outbound phone call. Produce a realistic, grounded assessment.

Call metadata:
- Direction: ${call.direction || 'unknown'}
- Called at: ${call.called_at || 'unknown'}
- Caller: ${call.name || 'unknown'} (${call.caller_number_formatted || call.caller_number || 'unknown number'})
- From: ${[call.city, call.state].filter(Boolean).join(', ') || 'unknown'}
- Marketing source: ${call.source_name || call.source || 'direct'}
- Tracking label: ${call.tracking_label || 'n/a'}
- Total duration: ${fmtDuration(call.duration)} (talk: ${fmtDuration(call.talk_time)}, ring: ${fmtDuration(call.ring_time)})
- Status: ${call.status || 'unknown'}${call.voicemail ? ' (voicemail)' : ''}${call.first_call ? ' (first-time caller)' : ''}
- Tags: ${(call.tag_list || []).join(', ') || 'none'}
- Existing notes: ${call.notes || 'none'}${audioInstruction}

Respond with a single JSON object matching this schema exactly (no markdown, no prose outside the JSON):
{
  "score": <integer 0-100 reflecting overall call handling quality, lead quality, and conversion likelihood>,
  "caller_name": <best-guess name of the caller based on ${hasAudio ? 'the conversation and ' : ''}the metadata, or null>,
  "caller_interest": <one short sentence describing what the caller was interested in (e.g., "Admission inquiry for adult child with alcohol use disorder"), or null if unknowable>,
  "summary": <2-3 sentence summary of the call${hasAudio ? ' based on what was said' : ' based on metadata'}: who called, likely reason, how it went>,
  "operator_strengths": [<1-4 concrete positive behaviors${hasAudio ? ' observed in the conversation' : ' inferred from the call'}, e.g. "Kept talk time under 5 minutes — efficient intake">],
  "operator_weaknesses": [<1-4 concrete areas to coach, e.g. "Long ring time (17s) before pickup risks losing the lead">],
  "next_steps": <one short sentence recommending a specific follow-up action, or null>,
  "sentiment": <"positive" | "neutral" | "negative" | "unclear">
}

Rules:
- ${hasAudio ? 'Base your analysis primarily on the actual conversation content. Quote specific things said when relevant.' : 'Ground the analysis in the metadata. If signals are ambiguous, say so in the summary and use "unclear" sentiment.'}
- Short voicemails and missed calls should generally score lower (30-55 range) with specific coaching on callback speed.
- Long engaged inbound calls from a first-time caller with a relevant tag should score higher (75-92 range).
- Be specific and practical. Avoid generic phone-coaching platitudes.`;
}

async function downloadAudio(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUDIO_DOWNLOAD_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'audio/*' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_AUDIO_BYTES) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_AUDIO_BYTES) return null;

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const mediaType = contentType.split(';')[0].trim();

    const base64 = Buffer.from(buffer).toString('base64');
    return { data: base64, mediaType };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();

  const { data: userRow } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
  if (!userRow?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { callId?: string; call?: CallInput; force?: boolean };
  const callId = body.callId;
  const call = body.call;
  if (!callId || !call) {
    return NextResponse.json({ error: 'callId and call are required' }, { status: 400 });
  }

  if (!body.force) {
    const { data: cached } = await supabase.from('call_ai_scores').select('*').eq('call_id', callId).single();
    if (cached) {
      return NextResponse.json({ cached: true, result: cached });
    }
  }

  let audioBlock: { type: string; source: { type: string; media_type: string; data: string } } | null = null;
  if (call.audio) {
    const audio = await downloadAudio(call.audio);
    if (audio) {
      audioBlock = {
        type: 'audio',
        source: {
          type: 'base64',
          media_type: audio.mediaType,
          data: audio.data,
        },
      };
    }
  }

  const hasAudio = !!audioBlock;
  const prompt = buildPrompt(call, hasAudio);
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const messageContent: unknown[] = [];
  if (audioBlock) messageContent.push(audioBlock);
  messageContent.push({ type: 'text', text: prompt });

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (hasAudio && res.status === 400) {
        const fallbackPrompt = buildPrompt(call, false);
        const fallbackRes = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': API_VERSION,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            messages: [{ role: 'user', content: fallbackPrompt }],
          }),
        });
        if (!fallbackRes.ok) {
          const fallbackText = await fallbackRes.text();
          return NextResponse.json({ error: `Anthropic API error (${fallbackRes.status}): ${fallbackText}` }, { status: fallbackRes.status });
        }
        const fallbackData = await fallbackRes.json();
        return handleResponse(fallbackData, callId, model, supabase);
      }
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return handleResponse(data, callId, model, supabase);
  } catch (err) {
    return NextResponse.json({ error: `Request failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}

function handleResponse(
  data: Record<string, unknown>,
  callId: string,
  model: string,
  supabase: ReturnType<typeof getAdminSupabase>,
) {
  const content = data?.content;
  let answer = '';
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && typeof block.text === 'string') answer += block.text;
    }
  }

  let parsed: ScoreResult | null = null;
  const firstBrace = answer.indexOf('{');
  const lastBrace = answer.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      parsed = JSON.parse(answer.slice(firstBrace, lastBrace + 1)) as ScoreResult;
    } catch {
      /* fallthrough */
    }
  }
  if (!parsed || typeof parsed.score !== 'number') {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: answer }, { status: 502 });
  }

  const row = {
    call_id: callId,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    caller_name: parsed.caller_name || null,
    caller_interest: parsed.caller_interest || null,
    summary: parsed.summary || '',
    operator_strengths: Array.isArray(parsed.operator_strengths) ? parsed.operator_strengths : [],
    operator_weaknesses: Array.isArray(parsed.operator_weaknesses) ? parsed.operator_weaknesses : [],
    next_steps: parsed.next_steps || null,
    sentiment: parsed.sentiment || null,
    scored_at: new Date().toISOString(),
    model,
  };

  supabase.from('call_ai_scores').upsert(row, { onConflict: 'call_id' });

  return NextResponse.json({ cached: false, result: row });
}
