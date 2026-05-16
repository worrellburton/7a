// fal.ai image-generation helper for the content pipeline.
//
// Two providers, both gated by FAL_KEY:
//   * fal-ai/gpt-image-2  — OpenAI gpt-image-2 (image_size as a
//                           { width, height } object; supports a
//                           landscape/square/portrait aspect)
//   * fal-ai/nano-banana-2 — Google's next-gen Gemini image model
//                            (no image_size knob; only prompt + count)
//
// We submit jobs via fal's REST API directly (no SDK dependency) so
// the route stays edge-friendly. Each call returns a list of image
// URLs the caller can then upload to Supabase Storage.

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_POLL_INTERVAL_MS = 2000;
// 4 minutes — gpt-image-2 at `quality: 'high'` regularly stretches past
// 90s, especially when 10 jobs queue at once and share fal's resources.
// The route's `maxDuration` is 300s so 240s leaves a comfortable margin.
const FAL_POLL_TIMEOUT_MS = 240_000;

function loadKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not configured');
  return key;
}

interface FalQueueResponse {
  status?: string;
  request_id?: string;
  response_url?: string;
  status_url?: string;
}
interface FalStatusResponse {
  status?: string;
  queue_position?: number;
}
interface FalImageResult {
  images?: { url?: string }[];
  // gpt-image variants sometimes return a single image field at the
  // top level instead of an `images` array.
  image?: { url?: string };
}

async function falSubmit(endpoint: string, input: unknown): Promise<FalImageResult> {
  const apiKey = loadKey();
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => '');
    throw new Error(`fal submit ${endpoint} failed: ${submitRes.status} ${text.slice(0, 200)}`);
  }
  const submitted = (await submitRes.json()) as FalQueueResponse;
  const statusUrl = submitted.status_url;
  const responseUrl = submitted.response_url;
  if (!statusUrl || !responseUrl) {
    throw new Error(`fal submit ${endpoint} missing queue urls`);
  }

  // Poll until the job completes or the timeout fires.
  const deadline = Date.now() + FAL_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, FAL_POLL_INTERVAL_MS));
    const sRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${apiKey}` } });
    if (!sRes.ok) continue;
    const sJson = (await sRes.json()) as FalStatusResponse;
    if (sJson.status === 'COMPLETED') {
      const rRes = await fetch(responseUrl, { headers: { 'Authorization': `Key ${apiKey}` } });
      if (!rRes.ok) {
        const text = await rRes.text().catch(() => '');
        throw new Error(`fal fetch ${endpoint} failed: ${rRes.status} ${text.slice(0, 200)}`);
      }
      return (await rRes.json()) as FalImageResult;
    }
    if (sJson.status === 'FAILED' || sJson.status === 'CANCELLED') {
      throw new Error(`fal job ${endpoint} ended as ${sJson.status}`);
    }
  }
  throw new Error(`fal job ${endpoint} timed out after ${FAL_POLL_TIMEOUT_MS}ms (build: content-images@2026-05-16b)`);
}

export interface GeneratedImage { provider: string; url: string; prompt: string; alt: string }

export type ImageAspect = 'landscape' | 'square' | 'portrait';

const ASPECT_SIZES: Record<ImageAspect, { width: number; height: number }> = {
  // 1536×1024 — closest match to 16:9 hero framing.
  landscape: { width: 1536, height: 1024 },
  // 1024×1024 — gpt-image-2's native resolution; crops cleanly to any
  // other shape so this is the most forgiving inline default.
  square:    { width: 1024, height: 1024 },
  // 1024×1536 — portrait/sidebar option for pull quotes and 4:5-ish
  // social shares.
  portrait:  { width: 1024, height: 1536 },
};

export async function generateWithGptImage(prompt: string, alt: string, aspect: ImageAspect = 'landscape'): Promise<GeneratedImage> {
  // fal hosts gpt-image-2 directly at `fal-ai/gpt-image-2` — the
  // `/text-to-image` suffix that gpt-image-1 used doesn't exist on
  // v2 (verified via 404 "Path /text-to-image not found"). v2 also
  // tightened `image_size` from a string literal ('1536x1024') to a
  // `{ width, height }` object — passing the legacy string form 422s
  // with `model_attributes_type` because the union's object branch
  // can't read fields from a bare string.
  const res = await falSubmit('fal-ai/gpt-image-2', {
    prompt,
    image_size: ASPECT_SIZES[aspect],
    num_images: 1,
    quality: 'high',
  });
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error('gpt-image-2 returned no url');
  return { provider: 'gpt-image-2', url, prompt, alt };
}

export async function generateWithNanoBanana2(prompt: string, alt: string): Promise<GeneratedImage> {
  // fal hosts the next-gen Gemini image model at `fal-ai/nano-banana-2`.
  // The endpoint inherits v1's payload shape: prompt + num_images only,
  // no `image_size` knob (the model picks its own aspect, typically a
  // landscape-ish frame).
  const res = await falSubmit('fal-ai/nano-banana-2', {
    prompt,
    num_images: 1,
  });
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error('nano-banana-2 returned no url');
  return { provider: 'nano-banana-2', url, prompt, alt };
}
