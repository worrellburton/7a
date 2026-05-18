// ElevenLabs text-to-speech helper for blog audio.
//
// Each blog row in /app/content can be turned into an MP3 by feeding
// `body_markdown` into ElevenLabs' Text-to-Speech endpoint. This file
// holds the API wrapper; the route at /api/content/[id]/audio drives
// the persistence + storage upload. UI is intentionally not wired up
// yet — once a publishing flow is decided (auto-on-publish vs manual
// button) the route can be invoked from there without changing this
// helper.
//
// Env contract:
//   ELEVENLABS_API_KEY — required. Server-only secret from the
//                        ElevenLabs dashboard (xi-api-key header).
//   ELEVENLABS_VOICE_ID — optional. Falls back to ElevenLabs' default
//                         "Rachel" voice id when unset so a missing
//                         override doesn't break the call.
//   ELEVENLABS_MODEL_ID — optional. Defaults to eleven_multilingual_v2
//                         which strikes a balance between latency and
//                         naturalness for long-form prose.

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
// ElevenLabs' canonical "Rachel" voice — neutral female narration that
// matches the editorial tone of the Recovery Roadmap series. Easy to
// override per-call or via env once a custom voice is cloned.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

function loadKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not configured');
  return key;
}

export function isAudioConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export interface SynthesizeOptions {
  /** Override the voice id used for this call. Defaults to env or Rachel. */
  voiceId?: string;
  /** Override the model id used for this call. Defaults to env or
   *  eleven_multilingual_v2. */
  modelId?: string;
  /** Optional voice settings tuned per call. Values clamp 0..1. */
  stability?: number;
  similarityBoost?: number;
}

export interface SynthesizeResult {
  /** Raw MP3 bytes the caller can upload to storage. */
  audio: ArrayBuffer;
  /** Content type echoed back by ElevenLabs — always audio/mpeg today. */
  contentType: string;
  /** Voice + model actually used so a successful call can be audited. */
  voiceId: string;
  modelId: string;
}

// ElevenLabs' v1 TTS endpoint accepts up to ~5000 characters per call.
// We chunk at paragraph boundaries with a generous safety margin so
// markdown formatting (lists, blockquotes, headers) doesn't push a
// chunk over the wire limit. MP3 frames are self-contained, so the
// resulting chunks can be concatenated as raw bytes and any standard
// player will treat the result as one stream.
const CHUNK_LIMIT = 4500;

// Splits a long markdown body into ~4500-char chunks, preferring
// paragraph breaks (`\n\n`) and then sentence boundaries (`. `,
// `! `, `? `) when a single paragraph blows past the limit. Pure
// function — exported so callers can preview chunk boundaries before
// committing to TTS.
export function chunkForTts(text: string, limit = CHUNK_LIMIT): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';
  for (const para of paragraphs) {
    // A single oversize paragraph: split at sentence boundaries.
    if (para.length > limit) {
      if (buffer) { chunks.push(buffer); buffer = ''; }
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceBuf = '';
      for (const s of sentences) {
        if ((sentenceBuf + (sentenceBuf ? ' ' : '') + s).length > limit) {
          if (sentenceBuf) chunks.push(sentenceBuf);
          // Sentence still too long — hard-split on the limit. Rare,
          // but better to ship a chunk than to throw.
          if (s.length > limit) {
            for (let i = 0; i < s.length; i += limit) {
              chunks.push(s.slice(i, i + limit));
            }
            sentenceBuf = '';
          } else {
            sentenceBuf = s;
          }
        } else {
          sentenceBuf = sentenceBuf ? `${sentenceBuf} ${s}` : s;
        }
      }
      if (sentenceBuf) chunks.push(sentenceBuf);
      continue;
    }
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length > limit) {
      chunks.push(buffer);
      buffer = para;
    } else {
      buffer = candidate;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

// Sends `text` to ElevenLabs and returns the MP3 bytes. The endpoint
// accepts up to ~5000 characters per call; callers planning to TTS a
// full blog should pre-chunk into smaller windows and stitch the
// resulting audio together (a separate concern from this helper).
export async function synthesizeSpeech(text: string, opts: SynthesizeOptions = {}): Promise<SynthesizeResult> {
  const key = loadKey();
  const voiceId = opts.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
  const modelId = opts.modelId ?? process.env.ELEVENLABS_MODEL_ID ?? DEFAULT_MODEL_ID;

  const body: Record<string, unknown> = {
    text,
    model_id: modelId,
  };
  if (opts.stability !== undefined || opts.similarityBoost !== undefined) {
    body.voice_settings = {
      stability: opts.stability ?? 0.5,
      similarity_boost: opts.similarityBoost ?? 0.75,
    };
  }

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // ElevenLabs returns a JSON envelope on error; surface the message
    // so the caller can pass it through to the editor banner.
    const detail = await res.text().catch(() => '');
    throw new Error(`elevenlabs TTS failed (${res.status}): ${detail || res.statusText}`);
  }

  const audio = await res.arrayBuffer();
  return {
    audio,
    contentType: res.headers.get('content-type') ?? 'audio/mpeg',
    voiceId,
    modelId,
  };
}

// Long-form helper — chunks `text`, synthesizes each piece, and
// concatenates the MP3 bytes into a single buffer the route can
// upload to storage. Calls run sequentially so ElevenLabs' per-key
// rate limit isn't tripped by 3+ parallel jobs.
export async function synthesizeLongForm(text: string, opts: SynthesizeOptions = {}): Promise<SynthesizeResult> {
  const chunks = chunkForTts(text);
  if (chunks.length === 0) throw new Error('no text to synthesize');
  if (chunks.length === 1) return synthesizeSpeech(chunks[0], opts);

  const parts: ArrayBuffer[] = [];
  let voiceId = '';
  let modelId = '';
  let contentType = 'audio/mpeg';
  for (const chunk of chunks) {
    const result = await synthesizeSpeech(chunk, opts);
    parts.push(result.audio);
    voiceId = result.voiceId;
    modelId = result.modelId;
    contentType = result.contentType;
  }

  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    merged.set(new Uint8Array(p), offset);
    offset += p.byteLength;
  }
  return {
    audio: merged.buffer,
    contentType,
    voiceId,
    modelId,
  };
}
