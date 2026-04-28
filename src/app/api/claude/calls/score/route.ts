import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

const CLAUDE_DEFAULT_MODEL = 'claude-opus-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-pro';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const INLINE_AUDIO_LIMIT = 18 * 1024 * 1024; // send inline if <= 18 MB
const MAX_AUDIO_BYTES = 200 * 1024 * 1024;   // hard cap (Files API can handle this)
const AUDIO_DOWNLOAD_TIMEOUT = 90_000;
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

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
    ? `\n\nYou have the actual audio recording of this call. Listen to the entire conversation. Identify what was actually said, the caller's tone, the operator's tone, specific phrases used, hesitations, interruptions, whether key information (program details, insurance, location) was conveyed, and how the call ended. Quote specific lines from the audio when relevant. The audio is the source of truth — the metadata below is just context.

CONSISTENCY CHECK — very important:
- If what you hear in the audio clearly contradicts the metadata (a different caller name is stated aloud, the location mentioned is different, the conversation topic has nothing to do with the tracking label, the duration you hear is vastly different from the metadata duration), treat this as a likely cross-wired recording. Say so explicitly in "summary" ("The audio appears not to match this call's metadata — …"), set sentiment to "unclear", and score conservatively. Do NOT fabricate a narrative that reconciles the two; prefer honesty about the mismatch.`
    : `\n\nNO AUDIO is available for this call. You are working from metadata ONLY.

Hard rules for this no-audio path:
- You do NOT know what was said, who answered, the caller's tone, the operator's tone, whether the call was routed through an IVR, whether the caller was transferred, what specific topics were discussed, or how engaged the conversation was. Do not invent any of these details.
- The only concrete facts you have are: direction, timestamp, caller number, city/state, marketing source, tracking label, total duration, talk time, ring time, status, tags, and any existing notes. Ground every statement in one of these.
- If you state a fact, it must map to a metadata field above. If there is no metadata signal for a claim, do NOT make the claim.
- Phrases like "suggesting a substantive discussion", "moderate-to-high engagement", "routed through the main IVR", "successfully handled the lead", "rapport was established", or anything describing what the operator did or said are FABRICATIONS when you have no audio. Do not write them.
- The "summary" field must explicitly say "No audio available; analysis is metadata-only." as its first clause, so a reader can tell they are looking at a low-confidence summary.
- Set sentiment to "unclear" unless a metadata field (e.g. voicemail=true, status=missed) directly implies otherwise.
- Score more conservatively in this path — even obviously promising lead metadata still warrants only a mid-range (50-70) score with no-audio context, because we cannot verify how the call actually went.
- "transcript" MUST be null.
- "operator_name" MUST be null.
- "operator_strengths" and "operator_weaknesses" should be empty arrays, or contain at most one item that is explicitly framed as a metadata-level observation (e.g. "Metadata only: 26s ring time is within acceptable range"). Do not invent behavioral observations about the operator.`;

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
  "client_type": <a short 2-3 word label classifying what KIND of call this is, based on the audio. Prefer one of the common categories when they fit: "Insurance", "Private Pay", "Mental Health", "Addiction", "Dual Diagnosis", "Family/Loved One". But if none of those fit cleanly, invent your own concise label that best describes the call (e.g., "Vendor Pitch", "Wrong Number", "Spam", "Staff Callback", "Alumni Check-in", "Billing Question", "Referral Partner", "Discharge Follow-up"). Return null only if the call gives zero info to classify.>,
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

async function downloadAudio(url: string): Promise<{ buffer: Buffer; mediaType: string; bytes: number } | { error: string }> {
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
      return { error: `audio too large (${contentLength} bytes, cap ${MAX_AUDIO_BYTES})` };
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_AUDIO_BYTES) {
      return { error: `audio too large (${arrayBuf.byteLength} bytes, cap ${MAX_AUDIO_BYTES})` };
    }
    if (arrayBuf.byteLength === 0) {
      return { error: 'audio empty' };
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    let mediaType = contentType.split(';')[0].trim().toLowerCase();
    if (mediaType === 'audio/x-mp3' || mediaType === 'audio/mp3') mediaType = 'audio/mpeg';
    if (mediaType === 'audio/x-wav') mediaType = 'audio/wav';

    return { buffer: Buffer.from(arrayBuf), mediaType, bytes: arrayBuf.byteLength };
  } catch (err) {
    return { error: `audio fetch threw: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Upload audio to Gemini Files API (resumable protocol) and return the
// active file URI. Used for audio too large to send inline (> ~18MB).
async function uploadAudioToGemini(
  apiKey: string,
  audio: { buffer: Buffer; mediaType: string; bytes: number },
  displayName: string,
): Promise<{ fileUri: string; mimeType: string } | { error: string }> {
  try {
    // Step 1: start resumable upload, get upload URL.
    const startRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(audio.bytes),
        'X-Goog-Upload-Header-Content-Type': audio.mediaType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    });
    if (!startRes.ok) {
      const t = await startRes.text();
      return { error: `Gemini upload start ${startRes.status}: ${t.slice(0, 300)}` };
    }
    const uploadUrl = startRes.headers.get('x-goog-upload-url') || startRes.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) return { error: 'Gemini upload start returned no upload URL' };

    // Step 2: upload bytes, finalize.
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(audio.bytes),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: new Uint8Array(audio.buffer),
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      return { error: `Gemini upload ${uploadRes.status}: ${t.slice(0, 300)}` };
    }
    const uploaded = await uploadRes.json() as { file?: { uri?: string; mimeType?: string; name?: string; state?: string } };
    const fileUri = uploaded?.file?.uri;
    const name = uploaded?.file?.name;
    if (!fileUri) return { error: 'Gemini upload returned no file URI' };

    // Step 3: poll file metadata until ACTIVE (audio files often need a few seconds).
    if (uploaded.file?.state && uploaded.file.state !== 'ACTIVE' && name) {
      const deadline = Date.now() + 45_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        const metaRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`);
        if (!metaRes.ok) break;
        const meta = await metaRes.json() as { state?: string };
        if (meta.state === 'ACTIVE') break;
        if (meta.state === 'FAILED') return { error: 'Gemini file processing FAILED' };
      }
    }

    return { fileUri, mimeType: uploaded.file?.mimeType || audio.mediaType };
  } catch (err) {
    return { error: `Gemini upload threw: ${err instanceof Error ? err.message : String(err)}` };
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
  audio: { buffer: Buffer; mediaType: string; bytes: number },
): Promise<{ result: ScoreResult; model: string } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY not configured' };

  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  const prompt = buildPrompt(call, true);

  // For small files, keep inline. For large ones, upload via Files API.
  let audioPart: Record<string, unknown>;
  if (audio.bytes <= INLINE_AUDIO_LIMIT) {
    audioPart = { inline_data: { mime_type: audio.mediaType, data: audio.buffer.toString('base64') } };
  } else {
    const uploaded = await uploadAudioToGemini(apiKey, audio, `call-${call.id || 'unknown'}.${audio.mediaType.split('/')[1] || 'mp3'}`);
    if ('error' in uploaded) return { error: uploaded.error };
    audioPart = { file_data: { mime_type: uploaded.mimeType, file_uri: uploaded.fileUri } };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              audioPart,
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          // Long calls (30+ min) produce a long JSON response —
          // especially the optional "transcript" field. 8000 tokens
          // truncates these, which Gemini reports as a parse error
          // and silently falls back to metadata-only. Give it room.
          maxOutputTokens: 16000,
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
        max_tokens: 2000,
        system: 'You are a call-center performance analyst. You MUST respond with a single valid JSON object matching the schema the user specifies. Do not output markdown, headings, prose, or explanation — JSON only. Start your response with the "{" character.',
        messages: [
          { role: 'user', content: prompt + '\n\nRespond with ONLY the JSON object. No markdown, no backticks, no explanation.' },
        ],
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
  // Accept either a signed-in Supabase user or the Vercel-Cron /
  // auto-score worker bearing CRON_SECRET. The latter lets the
  // background queue score calls without a human request.
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  const viaCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!viaCron) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  const body = (await req.json().catch(() => ({}))) as {
    callId?: string;
    call?: CallInput;
    force?: boolean;
    /**
     * When true, the route is allowed to write a metadata-only score
     * if audio download fails. Manual "Re-analyze" clicks set this
     * (the user knows they're getting a low-confidence answer);
     * auto-score sets it only after the retry budget is exhausted.
     */
    allowMetadataFallback?: boolean;
  };
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

  // In-progress guard. CTM exposes calls while they're still ringing
  // or live, but the metadata at that point is incomplete (no
  // duration, no audio URL, status=in-progress). Scoring here
  // produces nonsense like "Outbound call - in progress" which then
  // gets cached forever and never refreshes when the call ends.
  // Refuse to score until the call has actually finished — the
  // auto-score loop will retry on the next poll cycle, and the CTM
  // webhook will trigger a clean re-score once the recording lands.
  const statusStr = typeof call.status === 'string' ? call.status : '';
  const isInProgressStatus = /in.?progress|ringing|live|active/i.test(statusStr);
  // Belt-and-suspenders: some CTM accounts don't surface a status
  // string but still expose the call mid-flight with no duration.
  // Treat "no duration AND no audio AND placed within the last 30
  // minutes" as live too. We avoid the recency check on older calls
  // so a legitimately-zero-second call from days ago can still be
  // scored on the metadata-only path.
  const calledAtMs = call.called_at ? new Date(call.called_at).getTime() : NaN;
  const recentlyPlaced = Number.isFinite(calledAtMs) && Date.now() - calledAtMs < 30 * 60_000;
  const looksLiveByMissingMetadata = call.duration == null && !call.audio && recentlyPlaced;
  if (isInProgressStatus || looksLiveByMissingMetadata) {
    return NextResponse.json(
      {
        call_in_progress: true,
        reason: isInProgressStatus ? 'status' : 'no_duration_recent',
      },
      { status: 202 },
    );
  }

  const debug: { audio_status?: string; analyzer?: string; analyzer_error?: string } = {};

  // Try audio-first analysis with Gemini.
  let scored: { result: ScoreResult; model: string } | null = null;
  let audioFetchFailed = false;

  if (call.audio) {
    const dl = await downloadAudio(call.audio);
    if ('error' in dl) {
      debug.audio_status = dl.error;
      // CTM hosted recordings can take several minutes to be
      // transcoded after a long call ends. A 4xx from the CTM API
      // is almost always "not ready yet" rather than a permanent
      // failure — the caller (auto-score) decides whether to retry
      // or give up to metadata-only based on retry budget.
      const isCtm = /calltrackingmetrics\.com/i.test(call.audio);
      const looks4xx = /audio fetch (4\d\d)/i.test(dl.error);
      if (isCtm && (looks4xx || /audio empty/i.test(dl.error))) {
        audioFetchFailed = true;
      }
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

  // Audio wasn't ready — short-circuit so the caller can put us in
  // a retry queue instead of writing a low-confidence metadata-only
  // score that would mask the real call once the recording arrives.
  // body.allowMetadataFallback is set by manual "Re-analyze" clicks
  // and by auto-score after the retry budget is exhausted.
  if (!scored && audioFetchFailed && !body.allowMetadataFallback) {
    return NextResponse.json(
      { audio_pending: true, debug },
      { status: 202 },
    );
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
    debug_info: debug,
  };

  // debug_info column was added in migration
  // 20260425_call_ai_scores_debug_info.sql; older deployments without
  // the column would 400 on upsert, so retry without it on schema
  // mismatch (per CLAUDE.md "make reads resilient").
  let upsertErr = (await supabase.from('call_ai_scores').upsert(row, { onConflict: 'call_id' })).error;
  if (upsertErr && /debug_info/i.test(upsertErr.message)) {
    const { debug_info: _omit, ...legacyRow } = row;
    void _omit;
    upsertErr = (await supabase.from('call_ai_scores').upsert(legacyRow, { onConflict: 'call_id' })).error;
  }
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message, debug }, { status: 500 });
  }

  return NextResponse.json({ cached: false, result: row, debug });
}
