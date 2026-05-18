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
