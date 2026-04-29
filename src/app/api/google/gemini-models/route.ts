import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/google/gemini-models
// Admin-only. Calls the Gemini API's ListModels endpoint and
// returns the model names + supported generation methods. Use this
// to confirm the exact model id to pass via GEMINI_IMAGE_MODEL when
// the bling pipeline 404s with "model is not found for API version
// v1beta" (Google rotates preview names quickly).

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
        description?: string;
      }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: `Gemini ListModels HTTP ${res.status}: ${json.error?.message || 'unknown'}` },
        { status: 502 },
      );
    }
    // Surface every model with its generation methods so we can
    // pick one that supports generateContent for image output.
    // The image-edit ("nano-banana") model lists `generateContent`
    // among its methods and has a name like models/gemini-3-pro-
    // image-preview (or similar).
    const models = (json.models ?? []).map((m) => ({
      name: (m.name || '').replace(/^models\//, ''),
      methods: m.supportedGenerationMethods ?? [],
      description: m.description ?? null,
    }));
    const imageCandidates = models.filter((m) =>
      m.name.toLowerCase().includes('image') ||
      m.name.toLowerCase().includes('imagen') ||
      m.name.toLowerCase().includes('nano-banana'),
    );
    return NextResponse.json({
      total: models.length,
      image_candidates: imageCandidates,
      configured: process.env.GEMINI_IMAGE_MODEL || '(default in /lib/equine-bling.ts)',
      all_models: models,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `fetch threw: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
