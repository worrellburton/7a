import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// POST /api/hardware/extract-from-image
//
// Decodes a single product-page screenshot (Amazon, Apple Store,
// Best Buy, …) into the structured fields the "Add hardware" modal
// pre-fills. Sends the image to Claude vision with a tight
// JSON-only prompt; returns { type, model, value_price_cents,
// is_personal_computer, notes }. Every field can be null when the
// model isn't confident, so the modal can fall back to manual
// entry without flagging an error.
//
// Body: { image: { data: string /* base64 */; mediaType: string } }
//
// Required env: ANTHROPIC_API_KEY.

export const dynamic = 'force-dynamic';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB after base64 decode

interface ExtractedFields {
  type: string | null;
  model: string | null;
  value_price_cents: number | null;
  is_personal_computer: boolean;
  notes: string | null;
}

function pickString(v: unknown, max = 240): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  if (/^(n\/a|none|unknown|null)$/i.test(t)) return null;
  return t.slice(0, max);
}

function pickPriceCents(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Trust the model to return cents; clamp to a sensible range.
    if (v < 0 || v > 5_000_000) return null;
    return Math.round(v);
  }
  return null;
}

function normalize(raw: unknown): ExtractedFields {
  if (!raw || typeof raw !== 'object') {
    return { type: null, model: null, value_price_cents: null, is_personal_computer: false, notes: null };
  }
  const r = raw as Record<string, unknown>;
  return {
    type: pickString(r.type, 60),
    model: pickString(r.model, 240),
    value_price_cents: pickPriceCents(r.value_price_cents),
    is_personal_computer: r.is_personal_computer === true,
    notes: pickString(r.notes, 600),
  };
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  let body: { image?: { data?: string; mediaType?: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 }); }
  const data = body.image?.data;
  const mediaType = body.image?.mediaType || 'image/jpeg';
  if (typeof data !== 'string' || data.length === 0) {
    return NextResponse.json({ error: 'image.data (base64) is required.' }, { status: 400 });
  }
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(mediaType)) {
    return NextResponse.json({ error: `Unsupported image type ${mediaType}. PNG, JPEG, GIF, and WebP are accepted.` }, { status: 415 });
  }
  // Rough size guard so a too-big paste doesn't blow past Anthropic's
  // request-size limits (which present as opaque 400s).
  const approxBytes = (data.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: `Image is too large (${Math.round(approxBytes / 1024 / 1024)}MB). Please upload an image under 5MB.` }, { status: 413 });
  }

  const instruction = `You are extracting structured hardware-inventory data from a screenshot of a product page (Amazon, Apple Store, Best Buy, Newegg, etc.).

Return ONLY a single JSON object — no markdown, no commentary — with these keys, all nullable:
{
  "type": string|null,                 // Short category for grouping the item on an internal inventory page. Examples: "Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Dock", "Webcam", "Headset", "Tablet", "iPad", "Printer", "Scanner", "Phone", "Cable", "Adapter", "Hard drive", "Other". Use TitleCase. If the page is clearly a single product, infer the best category from the product name + page chrome.
  "model": string|null,                // Full product title as printed — brand + model + key specs (e.g. "Apple MacBook Pro 14-inch, M3 Pro, 18GB RAM, 512GB SSD"). Keep it concise; trim marketing fluff like "BRAND NEW!!! 2024 RELEASE".
  "value_price_cents": number|null,    // Listed price in CENTS (integer). For example $1,499.99 → 149999. Use the primary buy-it-now price; ignore strikethrough "list" prices and Subscribe & Save tiers.
  "is_personal_computer": boolean,     // true if and only if this item is a laptop, desktop, or workstation that an individual employee would log into directly. Tablets / iPads / phones are NOT personal computers for this flag. Default false when unsure.
  "notes": string|null                 // One short line for the human reviewer: anything unusual or ambiguous about what you read, plus key specs that didn't fit in model (color, generation, ports). Skip marketing copy. Leave null if you have nothing useful to add.
}`;

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
  const content: ContentBlock[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
    { type: 'text', text: instruction },
  ];

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const anthroRes = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!anthroRes.ok) {
    const text = await anthroRes.text();
    return NextResponse.json({ error: `Anthropic API error (${anthroRes.status}): ${text.slice(0, 500)}` }, { status: 502 });
  }

  const payload = (await anthroRes.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (payload.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('')
    .trim();

  // Defensive code-fence strip — Claude sometimes wraps JSON in
  // triple backticks despite the "no markdown" instruction.
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); }
  catch {
    return NextResponse.json({ error: "Claude didn't return JSON.", raw: text.slice(0, 500) }, { status: 502 });
  }

  return NextResponse.json({ fields: normalize(parsed) });
}
