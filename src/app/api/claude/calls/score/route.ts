import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

const CLAUDE_DEFAULT_MODEL = 'claude-opus-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-pro';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
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
  call_name: string | null;
  caller_name: string | null;
  operator_name: string | null;
  caller_interest: string | null;
  client_type: string | null;
  fit_score: number | null;
  summary: string;
  operator_strengths: string[];
  operator_weaknesses: string[];
  next_steps: string | null;
  sentiment: string | null;
  transcript: string | null;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return 'unknown';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function buildPrompt(call: CallInput, hasAudio: boolean): string {
  const audioInstruction = hasAudio
    ? `\n\nYou have the actual audio recording of this call. Listen to the entire conversation. Identify what was actually said, the caller's tone, the operator's tone, specific phrases used, hesitations, interruptions, whether key information (program details, insurance, location) was conveyed, and how the call ended. Quote specific lines from the audio when relevant. The audio is the source of truth — the metadata below is just context.`
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
  "call_name": <a very short 2-5 word label summarizing this call (e.g., "Alcohol admission inquiry", "Insurance verification", "Voicemail - no message", "Family seeking help", "Wrong number"). Be specific and descriptive.>,
  "caller_name": <best-guess name of the caller${hasAudio ? ' (use the name they actually said in the conversation if available)' : ''}, or null>,
  "operator_name": <${hasAudio ? `the first name of the Seven Arrows employee on this call — i.e. whoever represents 7A, NOT the caller.

For INBOUND calls: this is whoever ANSWERED the phone. Listen to the first 10-20 seconds of the audio carefully. Common patterns:
  • "Thank you for calling Seven Arrows, this is Sarah" → "Sarah"
  • "Seven Arrows Recovery, Jessica speaking" → "Jessica"
  • "Hi, this is Mike" → "Mike"
  • "Admissions, this is Kayla, how can I help you?" → "Kayla"
  • "My name is Placida" → "Placida"
  • "[Name] speaking" / "Good morning, [Name] here" → the name

For OUTBOUND calls: this is whoever INITIATED/placed the call from 7A. Listen for patterns like:
  • "Hi, this is Gissel calling from Seven Arrows" → "Gissel"
  • "Hello, this is [Name] with Seven Arrows" → the name
  • "My name is [Name] and I'm calling from Seven Arrows" → the name

Rules:
  - Return just the first name (capitalized). If only a full name is given, return first name.
  - Do NOT return the caller's name here — that goes in caller_name.
  - If the 7A employee never says their name (e.g. voicemail, immediate hangup, caller talks over them), return null.
  - Do NOT guess. If you didn't actually hear a name spoken, return null.
  - Strip titles/greetings: "Good morning, this is Sarah" → "Sarah", not "Good Morning Sarah".
  - Normalize common misspellings (e.g. from poor audio: "Jissel" probably = "Gissel"). Pick the most likely real name.` : 'null — operator name cannot be determined from metadata alone'}>,
  "caller_interest": <one short sentence describing what the caller was interested in (e.g., "Admission inquiry for adult child with alcohol use disorder"), or null if unknowable>,
  "client_type": <classify the caller into one of these categories based on the conversation: "Insurance", "Private Pay", "Mental Health", "Addiction", "Dual Diagnosis", "Family/Loved One", "Other", or null if not determinable. A caller seeking addiction treatment covered by insurance = "Insurance". A caller asking about self-pay rates = "Private Pay". A caller primarily seeking mental health treatment = "Mental Health". A caller seeking addiction/substance abuse treatment = "Addiction". If both mental health and addiction = "Dual Diagnosis". A family member calling on behalf of someone = "Family/Loved One".>,
  "fit_score": <integer 1-100 rating how likely this caller is a good fit for Seven Arrows Recovery. Consider: Seven Arrows is a residential addiction treatment center in Arizona specializing in holistic recovery with adventure therapy, equine therapy, and individualized treatment plans. High fit (75-100): caller needs residential addiction treatment, is motivated, has insurance or ability to pay, is in the right demographic. Medium fit (40-74): caller has some matching needs but may have barriers (wrong level of care, geographic constraints, financial issues). Low fit (1-39): caller needs a different type of care entirely, is not a candidate for residential treatment, or is clearly not a prospective client (vendor, wrong number, spam). Return null only if the call provides zero information about the caller's needs.>,
  "summary": <2-3 sentence summary of the call${hasAudio ? ' based on what was actually said' : ' based on metadata'}: who called, what they wanted, how it went>,
  "operator_strengths": [<1-4 concrete positive behaviors${hasAudio ? ' observed in the actual conversation, quoting specifics' : ' inferred from the call'}>],
  "operator_weaknesses": [<1-4 concrete areas to coach${hasAudio ? ', quoting specific moments where coaching would help' : ''}>],
  "next_steps": <one short sentence recommending a specific follow-up action, or null>,
  "sentiment": <"positive" | "neutral" | "negative" | "unclear">,
  "transcript": <${hasAudio ? 'a full plain-text transcript of the call. Label each speaker turn with "Operator:" or "Caller:" prefix. Keep hesitations and meaningful filler. Separate turns with newlines. If call went to voicemail or no one spoke, return a short note like "[Voicemail — caller left no message]".' : 'null — no audio available'}>
}

Rules:
- ${hasAudio ? 'Base your analysis primarily on the actual conversation. Quote specific things that were said when relevant.' : 'Ground the analysis in the metadata. If signals are ambiguous, say so in the summary and use "unclear" sentiment.'}
- Short voicemails and missed calls should generally score lower (30-55 range) with specific coaching on callback speed.
- Long engaged inbound calls from a first-time caller with a relevant tag should score higher (75-92 range).
- Be specific and practical. Avoid generic phone-coaching platitudes.`;
}

async function downloadAudio(url: string): Promise<{ data: string; mediaType: string; bytes: number } | { error: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUDIO_DOWNLOAD_TIMEOUT);

    // CTM recording URLs require Basic auth with the CTM API token. Other
    // hosts (e.g. signed S3 URLs CTM hands out) just work with a plain GET.
    const headers: Record<string, string> = { Accept: 'audio/*' };
    const isCtm = /calltrackingmetrics\.com/i.test(url);
    if (isCtm && process.env.CTM_API_TOKEN) {
      headers['Authorization'] = `Basic ${process.env.CTM_API_TOKEN}`;
    }

    const res = await fetch(url, { signal: controller.signal, headers, redirect: 'follow' });
    clearTimeout(timeout);

    if (!res.ok) return { error: `audio fetch ${res.status}` };

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_AUDIO_BYTES) {
      return { error: `audio too large (${contentLength} bytes)` };
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      return { error: `audio too large (${buffer.byteLength} bytes)` };
    }
    if (buffer.byteLength === 0) {
      return { error: 'audio empty' };
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    let mediaType = contentType.split(';')[0].trim().toLowerCase();
    // Gemini accepts these common audio mime types. Normalize a few aliases.
    if (mediaType === 'audio/x-mp3' || mediaType === 'audio/mp3') mediaType = 'audio/mpeg';
    if (mediaType === 'audio/x-wav') mediaType = 'audio/wav';

    const base64 = Buffer.from(buffer).toString('base64');
    return { data: base64, mediaType, bytes: buffer.byteLength };
  } catch (err) {
    return { error: `audio fetch threw: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function parseScoreJson(answer: string): ScoreResult | null {
  const firstBrace = answer.indexOf('{');
  const lastBrace = answer.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(answer.slice(firstBrace, lastBrace + 1)) as ScoreResult;
  } catch {
    return null;
  }
}

async function scoreWithGeminiAudio(
  call: CallInput,
  audio: { data: string; mediaType: string },
): Promise<{ result: ScoreResult; model: string } | { error: string }> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GOOGLE_API_KEY not configured' };

  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  const prompt = buildPrompt(call, true);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: audio.mediaType, data: audio.data } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `Gemini ${res.status}: ${text.slice(0, 400)}` };
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts as Array<{ text?: string }> | undefined;
    let answer = '';
    if (Array.isArray(parts)) {
      for (const p of parts) if (typeof p.text === 'string') answer += p.text;
    }
    const parsed = parseScoreJson(answer);
    if (!parsed || typeof parsed.score !== 'number') {
      return { error: `Gemini returned unparseable response: ${answer.slice(0, 200)}` };
    }
    return { result: parsed, model: `gemini:${model}` };
  } catch (err) {
    return { error: `Gemini request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function scoreWithClaudeMetadata(
  call: CallInput,
): Promise<{ result: ScoreResult; model: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY not configured' };

  const model = process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;
  const prompt = buildPrompt(call, false);

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `Claude ${res.status}: ${text.slice(0, 400)}` };
    }

    const data = await res.json();
    const content = data?.content;
    let answer = '';
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block.text === 'string') answer += block.text;
      }
    }
    const parsed = parseScoreJson(answer);
    if (!parsed || typeof parsed.score !== 'number') {
      return { error: `Claude returned unparseable response: ${answer.slice(0, 200)}` };
    }
    return { result: parsed, model: `claude:${model}` };
  } catch (err) {
    return { error: `Claude request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();

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

  const debug: { audio_status?: string; analyzer?: string; analyzer_error?: string } = {};

  // Try audio-first analysis with Gemini.
  let scored: { result: ScoreResult; model: string } | null = null;

  if (call.audio) {
    const dl = await downloadAudio(call.audio);
    if ('error' in dl) {
      debug.audio_status = dl.error;
    } else {
      debug.audio_status = `downloaded ${dl.bytes} bytes (${dl.mediaType})`;
      const geminiResult = await scoreWithGeminiAudio(call, dl);
      if ('error' in geminiResult) {
        debug.analyzer = 'gemini';
        debug.analyzer_error = geminiResult.error;
      } else {
        scored = geminiResult;
        debug.analyzer = 'gemini-audio';
      }
    }
  } else {
    debug.audio_status = 'no audio url on call';
  }

  // Fall back to Claude metadata-only.
  if (!scored) {
    const claudeResult = await scoreWithClaudeMetadata(call);
    if ('error' in claudeResult) {
      return NextResponse.json(
        { error: claudeResult.error, debug },
        { status: 502 },
      );
    }
    scored = claudeResult;
    if (!debug.analyzer) debug.analyzer = 'claude-metadata';
  }

  const parsed = scored.result;
  const row = {
    call_id: callId,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    call_name: parsed.call_name || null,
    caller_name: parsed.caller_name || null,
    operator_name: parsed.operator_name || null,
    caller_interest: parsed.caller_interest || null,
    client_type: parsed.client_type || null,
    fit_score: parsed.fit_score != null ? Math.max(1, Math.min(100, Math.round(parsed.fit_score))) : null,
    summary: parsed.summary || '',
    operator_strengths: Array.isArray(parsed.operator_strengths) ? parsed.operator_strengths : [],
    operator_weaknesses: Array.isArray(parsed.operator_weaknesses) ? parsed.operator_weaknesses : [],
    transcript: parsed.transcript || null,
    next_steps: parsed.next_steps || null,
    sentiment: parsed.sentiment || null,
    scored_at: new Date().toISOString(),
    model: scored.model,
  };

  await supabase.from('call_ai_scores').upsert(row, { onConflict: 'call_id' });

  return NextResponse.json({ cached: false, result: row, debug });
}
