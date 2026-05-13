import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/stedi/card-ocr
//   body: { vob_id }
//
// Pulls the front/back insurance-card images for a VOB row, sends
// them to Claude (vision) with a structured-extraction prompt, and
// persists the resulting fields back onto vob_requests. Returns the
// extracted JSON so the caller can show it inline.
//
// Required env:
//   ANTHROPIC_API_KEY  — used to call api.anthropic.com/v1/messages.

export const dynamic = 'force-dynamic';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

type Body = { vob_id?: string };

interface CardFields {
  member_id: string | null;
  group_number: string | null;
  payer_name: string | null;
  payer_id: string | null;
  plan_name: string | null;
  subscriber_first_name: string | null;
  subscriber_last_name: string | null;
  subscriber_dob: string | null;
  subscriber_relationship: string | null;
  rx_bin: string | null;
  rx_pcn: string | null;
  rx_group: string | null;
  effective_date: string | null;
  notes: string | null;
}

const EMPTY: CardFields = {
  member_id: null,
  group_number: null,
  payer_name: null,
  payer_id: null,
  plan_name: null,
  subscriber_first_name: null,
  subscriber_last_name: null,
  subscriber_dob: null,
  subscriber_relationship: null,
  rx_bin: null,
  rx_pcn: null,
  rx_group: null,
  effective_date: null,
  notes: null,
};

function pickString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  if (/^(n\/a|none|unknown|null)$/i.test(t)) return null;
  return t.slice(0, 200);
}

function normalizeFields(raw: unknown): CardFields {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const r = raw as Record<string, unknown>;
  return {
    member_id: pickString(r.member_id),
    group_number: pickString(r.group_number),
    payer_name: pickString(r.payer_name),
    payer_id: pickString(r.payer_id),
    plan_name: pickString(r.plan_name),
    subscriber_first_name: pickString(r.subscriber_first_name),
    subscriber_last_name: pickString(r.subscriber_last_name),
    subscriber_dob: pickString(r.subscriber_dob),
    subscriber_relationship: pickString(r.subscriber_relationship),
    rx_bin: pickString(r.rx_bin),
    rx_pcn: pickString(r.rx_pcn),
    rx_group: pickString(r.rx_group),
    effective_date: pickString(r.effective_date),
    notes: pickString(r.notes),
  };
}

async function fetchImageAsBase64(
  signedUrl: string,
): Promise<{ data: string; mediaType: string } | null> {
  const res = await fetch(signedUrl);
  if (!res.ok) return null;
  const mediaType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  // Claude vision only supports png/jpeg/gif/webp. Reject PDFs etc.
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(mediaType)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString('base64'), mediaType };
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const vobId = body.vob_id;
  if (!vobId) return NextResponse.json({ error: 'Missing vob_id' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: row, error: rowErr } = await admin
    .from('vob_requests')
    .select('id, card_front_path, card_back_path')
    .eq('id', vobId)
    .maybeSingle();
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const paths: string[] = [];
  if (row.card_front_path) paths.push(row.card_front_path as string);
  if (row.card_back_path) paths.push(row.card_back_path as string);
  if (paths.length === 0) {
    return NextResponse.json(
      { error: 'No insurance-card images on this VOB row.' },
      { status: 400 },
    );
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('vob-cards')
    .createSignedUrls(paths, 60);
  if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 });

  const images: Array<{ data: string; mediaType: string; label: 'Front' | 'Back' }> = [];
  for (const entry of signed ?? []) {
    if (!entry.signedUrl || entry.error) continue;
    const label = entry.path === row.card_front_path ? 'Front' : 'Back';
    const blob = await fetchImageAsBase64(entry.signedUrl);
    if (blob) images.push({ ...blob, label });
  }
  if (images.length === 0) {
    return NextResponse.json(
      { error: 'Card files are not readable as images (PDFs not supported for OCR).' },
      { status: 415 },
    );
  }

  const instruction = `You are extracting structured data from photographs of a U.S. health-insurance ID card so the data can drive an EDI 270 eligibility request to the Stedi healthcare API.

For each field below, copy the value EXACTLY as printed. Do not invent, infer, or normalize. If a value is not visible on either side of the card, return null.

Return ONLY a single JSON object — no markdown, no commentary — with these keys:
{
  "member_id": string|null,            // Subscriber/Member ID (sometimes "ID#", "Member #", "Policy #"). Keep all letters/digits/dashes exactly.
  "group_number": string|null,         // "Group", "Grp", "Group No." Often a short alphanumeric.
  "payer_name": string|null,           // Insurance company name (e.g. "Aetna", "Blue Cross Blue Shield of Arizona"). Use the issuer printed on the card.
  "payer_id": string|null,             // Numeric/alphanumeric payer ID if printed (e.g. "60054"). NOT the member ID.
  "plan_name": string|null,            // Plan / product name if printed (e.g. "PPO", "HMO Choice Plus").
  "subscriber_first_name": string|null,
  "subscriber_last_name": string|null,
  "subscriber_dob": string|null,       // ISO YYYY-MM-DD if printed.
  "subscriber_relationship": string|null, // One of: "self", "spouse", "child", "other" — only if the card explicitly indicates it (rare).
  "rx_bin": string|null,
  "rx_pcn": string|null,
  "rx_group": string|null,
  "effective_date": string|null,       // ISO YYYY-MM-DD if printed.
  "notes": string|null                 // 1-line note for the human reviewer: anything unusual or ambiguous about what you read.
}`;

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
  const content: ContentBlock[] = [];
  for (const img of images) {
    content.push({ type: 'text', text: `${img.label} of insurance card:` });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    });
  }
  content.push({ type: 'text', text: instruction });

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
      max_tokens: 800,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!anthroRes.ok) {
    const text = await anthroRes.text();
    return NextResponse.json(
      { error: `Anthropic API error (${anthroRes.status}): ${text}` },
      { status: anthroRes.status },
    );
  }

  const data = (await anthroRes.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('')
    .trim();

  // The model is asked for raw JSON but sometimes wraps it in code fences;
  // strip them defensively before parsing.
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); } catch {
    return NextResponse.json(
      { error: 'Claude did not return JSON', raw: text },
      { status: 502 },
    );
  }
  const fields = normalizeFields(parsed);

  // The "Payer ID" printed on a US insurance card is almost never
  // the Stedi trading-partner id (it's usually the RX BIN, a CMS id,
  // or a Change Healthcare code). Resolve the real Stedi id from
  // the payer name we just OCR'd so the eligibility 270 has a shot
  // at succeeding without manual intervention.
  let resolvedStediId: string | null = null;
  let resolvedDisplayName: string | null = null;
  if (fields.payer_name) {
    try {
      const searchUrl = new URL('https://payers.us.stedi.com/2024-04-01/payers/search');
      searchUrl.searchParams.set('query', fields.payer_name);
      searchUrl.searchParams.set('eligibilityCheck', 'SUPPORTED');
      const searchRes = await fetch(searchUrl.toString(), {
        headers: { 'Authorization': process.env.STEDI_API_KEY || '' },
      });
      if (searchRes.ok) {
        const searchJson = (await searchRes.json()) as {
          items?: Array<{ payer?: { stediId?: string; displayName?: string } }>;
        };
        const top = searchJson.items?.[0]?.payer;
        if (top?.stediId) {
          resolvedStediId = top.stediId;
          resolvedDisplayName = top.displayName || null;
        }
      }
    } catch (err) {
      console.warn('[card-ocr] Stedi payer search failed (non-fatal):', err);
    }
  }

  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    card_ocr: { ...fields, model, at: nowIso, resolvedStediId, resolvedDisplayName },
    card_ocr_at: nowIso,
  };
  if (fields.member_id) update.member_id = fields.member_id;
  if (fields.group_number) update.group_number = fields.group_number;
  // Prefer Stedi's canonical name over the OCR'd one when we matched.
  const finalPayerName = resolvedDisplayName || fields.payer_name;
  if (finalPayerName) update.payer_name = finalPayerName;
  // Stedi-resolved id wins over the OCR'd payer_id from the card.
  const finalPayerId = resolvedStediId || fields.payer_id;
  if (finalPayerId) update.payer_id = finalPayerId;
  if (fields.subscriber_first_name) update.subscriber_first_name = fields.subscriber_first_name;
  if (fields.subscriber_last_name) update.subscriber_last_name = fields.subscriber_last_name;
  if (fields.subscriber_dob) update.subscriber_dob = fields.subscriber_dob;
  if (fields.subscriber_relationship) update.subscriber_relationship = fields.subscriber_relationship;

  const { error: updErr } = await admin
    .from('vob_requests')
    .update(update)
    .eq('id', vobId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message, fields }, { status: 500 });
  }

  // Echo back the final, resolved values (not just what Claude saw)
  // so the UI's local draft state lines up with what got written.
  const responseFields = {
    ...fields,
    payer_name: finalPayerName,
    payer_id: finalPayerId,
  };
  return NextResponse.json({
    id: vobId,
    fields: responseFields,
    card_ocr_at: nowIso,
    payer_resolution: resolvedStediId
      ? { source: 'stedi', stediId: resolvedStediId, displayName: resolvedDisplayName }
      : null,
  });
}
