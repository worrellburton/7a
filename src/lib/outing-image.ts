// Generation pipeline for the experiential-therapy outings catalog.
//
// Two-stage:
//   1. Research — calls Claude to enrich the per-outing prompt with
//      specific landmarks, lighting moments, and visual cues
//      grounded in what makes that place actually feel like that
//      place. Produces a documentary-photo-grade prompt.
//   2. Generate — sends the enriched prompt to Gemini's nano-banana
//      Pro image model (gemini-3-pro-image-preview) and uploads the
//      resulting PNG to the public-images bucket.
//
// Result URL is cached in outings_images keyed by slug + the
// final prompt that produced it. If the prompt changes, the cache
// row's source_prompt no longer matches and the next preheat run
// regenerates.

import type { SupabaseClient } from '@supabase/supabase-js';
import { Outing } from './outings';

export const OUTING_DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const CLAUDE_VERSION = '2023-06-01';
const BUCKET = 'public-images';

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

export type OutingImageResult =
  | { ok: true; url: string; cached: boolean; prompt: string; researched: boolean }
  | { ok: false; error: string; httpStatus: number };

// Ask Claude to take the seed prompt, research the named place, and
// return a richer photographic prompt. Drops back to the seed if the
// API key is missing or the call fails — generation still works,
// just with a less-specific prompt.
async function researchPrompt(outing: Outing): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return outing.prompt;

  const userPrompt = `You are writing a documentary-photograph prompt for an image generation model. The subject is a real place in southeastern Arizona that we take residential treatment clients to as part of experiential therapy outings. Your job is to take the seed prompt below and rewrite it as a single dense paragraph that:

- Names specific landmarks or features that are unique to this place (e.g. specific rock formations, named structures, geological details, signage, etc.)
- Specifies time of day and atmospheric conditions that flatter the location
- Describes the lighting in photographic terms (golden hour, blue hour, hard noon, soft overcast, etc.)
- Mentions textures, foliage, ground cover specific to that elevation and biome
- Avoids any people in the frame
- Stays photographic and editorial in tone (not painterly, not illustrative)
- Names the location explicitly so the model anchors on the right reference
- Returns ONLY the prompt prose. No headings, no preamble, no quotation marks.

PLACE: ${outing.name}
REGION: ${outing.region}
SEED PROMPT: ${outing.prompt}`;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`[outings] Claude research HTTP ${res.status}; falling back to seed prompt for ${outing.slug}`);
      return outing.prompt;
    }
    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const block = json.content?.find((b) => b.type === 'text');
    const text = (block?.text ?? '').trim();
    return text || outing.prompt;
  } catch (err) {
    console.warn('[outings] Claude research threw:', err);
    return outing.prompt;
  }
}

export async function generateOutingImage(
  admin: SupabaseClient,
  outing: Outing,
  opts: { force?: boolean; apiKey: string; model?: string } = { force: false, apiKey: '' },
): Promise<OutingImageResult> {
  if (!opts.apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY not set on this environment', httpStatus: 412 };
  }

  // Step 1: research-enhance the prompt (best effort).
  const researched = await researchPrompt(outing);
  const researchedDifferent = researched !== outing.prompt;
  const finalPrompt = researched;

  // Step 2: cache check. If the existing row was generated from the
  // exact same prompt we're about to use, skip the API call.
  if (!opts.force) {
    const { data: cached } = await admin
      .from('outings_images')
      .select('image_url, source_prompt')
      .eq('slug', outing.slug)
      .maybeSingle();
    if (cached && cached.source_prompt === finalPrompt) {
      return { ok: true, url: cached.image_url, cached: true, prompt: finalPrompt, researched: researchedDifferent };
    }
  }

  // Step 3: generate.
  const model = opts.model || process.env.GEMINI_IMAGE_MODEL || OUTING_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: finalPrompt }] }],
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
    return { ok: false, error: `Gemini refused the prompt: ${json.promptFeedback.blockReason}`, httpStatus: 502 };
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  const imageMime = imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || 'image/png';
  if (!imageData) return { ok: false, error: 'Gemini returned no image data in the response.', httpStatus: 502 };

  const buffer = Buffer.from(imageData, 'base64');
  const ext = imageMime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  const path = `outings/${outing.slug}-${Date.now()}.${ext}`;

  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: imageMime,
    upsert: false,
    cacheControl: '604800',
  });
  if (upload.error) {
    return { ok: false, error: `Storage upload failed: ${upload.error.message}`, httpStatus: 502 };
  }
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) return { ok: false, error: 'Storage returned no public URL.', httpStatus: 502 };

  await admin
    .from('outings_images')
    .upsert(
      {
        slug: outing.slug,
        image_url: publicUrl,
        source_prompt: finalPrompt,
        model,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' },
    );

  return { ok: true, url: publicUrl, cached: false, prompt: finalPrompt, researched: researchedDifferent };
}
