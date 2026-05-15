// fal.ai image-generation helpers for the content pipeline.
//
// Two provider endpoints, both gated by FAL_KEY:
//   * fal-ai/gpt-image-1        — OpenAI gpt-image-1 hosted on fal
//   * fal-ai/nano-banana/pro    — Gemini 3 Pro Image preview ("nano
//                                 banana pro") hosted on fal
//
// We submit jobs via fal's REST API directly (no SDK dependency) so
// the route stays edge-friendly. Each call returns a list of image
// URLs the caller can then upload to Supabase Storage.

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_POLL_INTERVAL_MS = 1500;
const FAL_POLL_TIMEOUT_MS = 90_000;

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
  // gpt-image-1 sometimes returns a single image field at top level
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
  throw new Error(`fal job ${endpoint} timed out after ${FAL_POLL_TIMEOUT_MS}ms`);
}

export interface GeneratedImage { provider: string; url: string; prompt: string; alt: string }

export async function generateWithGptImage(prompt: string, alt: string): Promise<GeneratedImage> {
  const res = await falSubmit('fal-ai/gpt-image-1/text-to-image', {
    prompt,
    image_size: 'landscape_16_9',
    num_images: 1,
    quality: 'high',
  });
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error('gpt-image-1 returned no url');
  return { provider: 'gpt-image-1', url, prompt, alt };
}

export async function generateWithNanoBananaPro(prompt: string, alt: string): Promise<GeneratedImage> {
  const res = await falSubmit('fal-ai/nano-banana/pro', {
    prompt,
    image_size: 'landscape_16_9',
    num_images: 1,
  });
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error('nano-banana-pro returned no url');
  return { provider: 'nano-banana-pro', url, prompt, alt };
}
