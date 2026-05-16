// fal.ai image-generation helper for the content pipeline.
//
// Single provider, gated by FAL_KEY:
//   * fal-ai/gpt-image-2 — OpenAI gpt-image-2 hosted on fal (requires
//                          explicit pixel sizes like '1536x1024')
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
  throw new Error(`fal job ${endpoint} timed out after ${FAL_POLL_TIMEOUT_MS}ms`);
}

export interface GeneratedImage { provider: string; url: string; prompt: string; alt: string }

export async function generateWithGptImage(prompt: string, alt: string): Promise<GeneratedImage> {
  // fal hosts gpt-image-2 directly at `fal-ai/gpt-image-2` — the
  // `/text-to-image` suffix that gpt-image-1 used doesn't exist on
  // v2 (verified via 404 "Path /text-to-image not found"). The model
  // accepts the same explicit pixel sizes: 'auto' | '1024x1024' |
  // '1536x1024' | '1024x1536'. 1536x1024 is the landscape option,
  // closest to the 16:9 framing we want for blog hero / inline images.
  const res = await falSubmit('fal-ai/gpt-image-2', {
    prompt,
    image_size: '1536x1024',
    num_images: 1,
    quality: 'high',
  });
  const url = res.images?.[0]?.url ?? res.image?.url;
  if (!url) throw new Error('gpt-image-2 returned no url');
  return { provider: 'gpt-image-2', url, prompt, alt };
}
