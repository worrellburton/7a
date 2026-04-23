import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { SEVEN_ARROWS_PLACE_ID } from '@/lib/places';

// GET /api/google/places-debug
// Admin-only. Calls the Places Details endpoint with a minimal field
// mask and returns the raw status so we can tell at a glance whether
// GOOGLE_PLACES_API_KEY is missing, invalid, restricted, or Places
// API is disabled on the project. The key itself is never echoed —
// we only surface its presence and length.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const env = {
    GOOGLE_PLACES_API_KEY_set: Boolean(apiKey),
    GOOGLE_PLACES_API_KEY_length: apiKey?.length ?? 0,
    place_id: SEVEN_ARROWS_PLACE_ID,
  };

  if (!apiKey) {
    return NextResponse.json({ env, error: 'GOOGLE_PLACES_API_KEY not set in this environment' }, { status: 412 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', SEVEN_ARROWS_PLACE_ID);
  url.searchParams.set('fields', 'name,rating,user_ratings_total');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const bodyText = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText.slice(0, 500);
    }
    const parsed = body as { status?: string; error_message?: string; result?: { name?: string; rating?: number; user_ratings_total?: number } };
    return NextResponse.json({
      env,
      http: res.status,
      status: parsed?.status ?? null,
      error_message: parsed?.error_message ?? null,
      result: parsed?.result ?? null,
      raw: typeof body === 'string' ? body : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ env, error: `fetch threw: ${message}` }, { status: 502 });
  }
}
