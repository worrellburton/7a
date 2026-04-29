// Shared core for the equine bling-mode pipeline. The per-horse
// route handler and the bulk preheat endpoint both call into here so
// the model name, prompt, storage bucket, and cache semantics live in
// one place.
//
// Pipeline:
//   1. Resolve the horse + cached bling row.
//   2. Cache hit (and source URL still matches) → return cached URL.
//   3. Cache miss / forced regen → fetch source bytes, send to Gemini
//      image-editing endpoint, upload result to public-images, upsert
//      cache row, return new URL.

import type { SupabaseClient } from '@supabase/supabase-js';

export const BLING_PROMPT = 'give all these horses bling and sunglasses';
// Nano Banana Pro / Pro 2 — the v3 Pro image model. The original
// route used `gemini-2.5-flash-image-preview` (Nano Banana 1) which
// 404'd in v1beta because the GA name dropped the suffix. Default
// here is the Pro variant; override via GEMINI_IMAGE_MODEL if Google
// changes the id again or we want to try a different family.
export const BLING_DEFAULT_MODEL = 'gemini-3-pro-image-preview';
export const BLING_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const BLING_BUCKET = 'public-images';

export type BlingResult =
  | { ok: true; url: string; cached: boolean; sourceUrl: string }
  | { ok: false; error: string; httpStatus: number };

interface GeminiPart {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export async function generateHorseBling(
  admin: SupabaseClient,
  horseId: string,
  opts: { force?: boolean; apiKey: string; model?: string } = { force: false, apiKey: '' },
): Promise<BlingResult> {
  if (!opts.apiKey) return { ok: false, error: 'GEMINI_API_KEY not set on this environment', httpStatus: 412 };

  const [horseRes, cacheRes] = await Promise.all([
    admin.from('equine').select('id, name, image_url').eq('id', horseId).maybeSingle(),
    admin
      .from('equine_bling_images')
      .select('source_image_url, bling_image_url, generated_at')
      .eq('horse_id', horseId)
      .maybeSingle(),
  ]);
  if (horseRes.error) return { ok: false, error: `Horse lookup failed: ${horseRes.error.message}`, httpStatus: 500 };
  const horse = horseRes.data as { id: string; name: string | null; image_url: string | null } | null;
  if (!horse) return { ok: false, error: 'Horse not found', httpStatus: 404 };
  const sourceUrl = (horse.image_url || '').trim();
  if (!sourceUrl) return { ok: false, error: 'Horse has no source image to transform', httpStatus: 400 };

  const cached = cacheRes.data as { source_image_url: string; bling_image_url: string; generated_at: string } | null;
  if (!opts.force && cached && cached.source_image_url === sourceUrl) {
    return { ok: true, url: cached.bling_image_url, cached: true, sourceUrl };
  }

  let sourceBuffer: Buffer;
  let sourceMime: string;
  try {
    const res = await fetch(sourceUrl, { headers: { Accept: 'image/*' } });
    if (!res.ok) return { ok: false, error: `Source image fetch failed: HTTP ${res.status}`, httpStatus: 502 };
    sourceMime = res.headers.get('content-type') || 'image/jpeg';
    const arr = await res.arrayBuffer();
    sourceBuffer = Buffer.from(arr);
  } catch (err) {
    return {
      ok: false,
      error: `Source image fetch threw: ${err instanceof Error ? err.message : String(err)}`,
      httpStatus: 502,
    };
  }

  const model = opts.model || process.env.GEMINI_IMAGE_MODEL || BLING_DEFAULT_MODEL;
  const url = `${BLING_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  const body = {
    contents: [
      {
        parts: [
          { text: BLING_PROMPT },
          { inline_data: { mime_type: sourceMime, data: sourceBuffer.toString('base64') } },
        ],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  let json: GeminiResponse;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    json = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: `Gemini HTTP ${res.status}: ${json.error?.message || 'unknown'}`,
        httpStatus: 502,
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Gemini call threw: ${err instanceof Error ? err.message : String(err)}`,
      httpStatus: 502,
    };
  }

  if (json.promptFeedback?.blockReason) {
    return {
      ok: false,
      error: `Gemini refused the prompt: ${json.promptFeedback.blockReason}`,
      httpStatus: 502,
    };
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  const imageMime =
    imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || 'image/png';
  if (!imageData) return { ok: false, error: 'Gemini returned no image data in the response.', httpStatus: 502 };

  const generatedBuffer = Buffer.from(imageData, 'base64');
  const ext = imageMime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  const path = `equine/bling/${horseId}-${Date.now()}.${ext}`;

  const upload = await admin.storage.from(BLING_BUCKET).upload(path, generatedBuffer, {
    contentType: imageMime,
    upsert: false,
    cacheControl: '604800',
  });
  if (upload.error) {
    return { ok: false, error: `Storage upload failed: ${upload.error.message}`, httpStatus: 502 };
  }
  const { data: urlData } = admin.storage.from(BLING_BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) return { ok: false, error: 'Storage returned no public URL.', httpStatus: 502 };

  await admin
    .from('equine_bling_images')
    .upsert(
      {
        horse_id: horseId,
        source_image_url: sourceUrl,
        bling_image_url: publicUrl,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'horse_id' },
    );

  return { ok: true, url: publicUrl, cached: false, sourceUrl };
}
