import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { generateHorseBling } from '@/lib/equine-bling';

// POST /api/equine/bling/[horseId]
//
// Sends the horse's photo through Google's Gemini image-editing
// model with the bling prompt and returns the resulting public
// image URL. Cached in equine_bling_images keyed by horse_id +
// source URL — toggling bling mode on/off doesn't re-bill the API.
//
// Body: { force?: boolean } — set to true to bypass the cache.
//
// Auth: requires a signed-in user. The actual generation logic lives
// in /lib/equine-bling.ts so the bulk preheat endpoint shares the
// exact same pipeline.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const force = await req
    .json()
    .then((b) => !!(b as { force?: boolean })?.force)
    .catch(() => false);

  const result = await generateHorseBling(getAdminSupabase(), horseId, { apiKey, force });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({
    url: result.url,
    cached: result.cached,
    source_image_url: result.sourceUrl,
  });
}
