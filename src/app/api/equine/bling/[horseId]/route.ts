import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/equine/bling/[horseId]
//
// Sends the horse's photo through Google's Gemini 2.5 Flash Image
// model ("nano-banana") with the prompt "give all these horses bling
// and sunglasses" and returns the resulting public image URL. Cached
// in equine_bling_images keyed by horse_id + source URL — toggling
// bling mode on/off doesn't re-bill the API every time, and re-
// uploading a horse photo invalidates the cache automatically because
// the source URL no longer matches the cached row.
//
// Body: { force?: boolean } — set to true to bypass the cache.
//
// Returns:
//   { url: string, cached: boolean, source_image_url: string }
//   { error: string } on failure.
//
// Auth: requires a signed-in user. Service-role client only used to
// upload to storage + upsert the cache; not exposed to the browser.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL = 'gemini-2.5-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROMPT = 'give all these horses bling and sunglasses';
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ horseId: string }> },
) {
  const { horseId } = await params;
  if (!horseId) return NextResponse.json({ error: 'Missing horseId' }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  const force = await req.json().then((b) => !!(b as { force?: boolean })?.force).catch(() => false);

  const admin = getAdminSupabase();

  // Look up the horse + the cached bling row in parallel.
  const [horseRes, cacheRes] = await Promise.all([
    admin.from('equine').select('id, name, image_url').eq('id', horseId).maybeSingle(),
    admin.from('equine_bling_images').select('source_image_url, bling_image_url, generated_at').eq('horse_id', horseId).maybeSingle(),
  ]);

  if (horseRes.error) {
    return NextResponse.json({ error: `Horse lookup failed: ${horseRes.error.message}` }, { status: 500 });
  }
  const horse = horseRes.data as { id: string; name: string | null; image_url: string | null } | null;
  if (!horse) return NextResponse.json({ error: 'Horse not found' }, { status: 404 });
  const sourceUrl = (horse.image_url || '').trim();
  if (!sourceUrl) return NextResponse.json({ error: 'Horse has no source image to transform' }, { status: 400 });

  // Cache hit — return the cached URL unless the caller forced a regen
  // OR the source URL has changed since we last generated.
  const cached = cacheRes.data as { source_image_url: string; bling_image_url: string; generated_at: string } | null;
  if (!force && cached && cached.source_image_url === sourceUrl) {
    return NextResponse.json({
      url: cached.bling_image_url,
      cached: true,
      source_image_url: sourceUrl,
    });
  }

  // Pull the source image bytes. Public bucket URLs are fine to fetch
  // without auth; we still pass a generic UA + accept image so CDNs
  // serve a real binary instead of an HTML preview.
  let sourceBuffer: Buffer;
  let sourceMime: string;
  try {
    const res = await fetch(sourceUrl, { headers: { Accept: 'image/*' } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Source image fetch failed: HTTP ${res.status}` },
        { status: 502 },
      );
    }
    sourceMime = res.headers.get('content-type') || 'image/jpeg';
    const arr = await res.arrayBuffer();
    sourceBuffer = Buffer.from(arr);
  } catch (err) {
    return NextResponse.json(
      { error: `Source image fetch threw: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  // Call Gemini's image-editing endpoint. The model returns a new
  // image inline (base64). We request IMAGE response modality
  // explicitly so a chatty text response can't sneak through.
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: sourceMime, data: sourceBuffer.toString('base64') } },
        ],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const url = `${API_BASE}/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let json: GeminiResponse;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    json = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: `Gemini HTTP ${res.status}: ${json.error?.message || 'unknown'}` },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Gemini call threw: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  if (json.promptFeedback?.blockReason) {
    return NextResponse.json(
      { error: `Gemini refused the prompt: ${json.promptFeedback.blockReason}` },
      { status: 502 },
    );
  }

  // Find the first inline image part in the response. The API uses
  // both camelCase (`inlineData`) and snake_case (`inline_data`)
  // depending on transport, so we accept either.
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  const imageMime =
    imagePart?.inlineData?.mimeType ||
    imagePart?.inline_data?.mime_type ||
    'image/png';
  if (!imageData) {
    return NextResponse.json(
      { error: 'Gemini returned no image data in the response.' },
      { status: 502 },
    );
  }

  const generatedBuffer = Buffer.from(imageData, 'base64');
  const ext = imageMime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  const path = `equine/bling/${horseId}-${Date.now()}.${ext}`;

  const upload = await admin.storage
    .from(BUCKET)
    .upload(path, generatedBuffer, {
      contentType: imageMime,
      upsert: false,
      cacheControl: '604800',
    });
  if (upload.error) {
    return NextResponse.json(
      { error: `Storage upload failed: ${upload.error.message}` },
      { status: 502 },
    );
  }
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    return NextResponse.json(
      { error: 'Storage returned no public URL.' },
      { status: 502 },
    );
  }

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

  return NextResponse.json({
    url: publicUrl,
    cached: false,
    source_image_url: sourceUrl,
  });
}
