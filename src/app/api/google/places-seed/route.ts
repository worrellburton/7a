import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { fetchPlaceDetails, SEVEN_ARROWS_PLACE_ID } from '@/lib/places';

// POST /api/google/places-seed
// Admin-only. One-shot manual trigger that calls Places Details once
// and upserts the returned reviews into public.google_reviews. Useful
// for the very first population of the cache, and for re-running
// after a place_id change. The hourly sync cron in phase 3 will do
// the same thing automatically going forward.

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const place = await fetchPlaceDetails();
  if (!place) {
    return NextResponse.json({ error: 'Places API returned no result — check /api/google/places-debug' }, { status: 502 });
  }

  if (place.reviews.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, note: 'Places returned 0 reviews to seed' });
  }

  const admin = getAdminSupabase();
  const rows = place.reviews.map((r) => ({
    place_id: SEVEN_ARROWS_PLACE_ID,
    author_name: r.authorName,
    profile_photo_url: r.profilePhotoUrl,
    rating: Math.round(r.rating),
    relative_time: r.relativeTime,
    text: r.text,
    review_time: new Date(r.time * 1000).toISOString(),
    language: 'en',
    fetched_at: new Date().toISOString(),
  }));

  const { error, data } = await admin
    .from('google_reviews')
    .upsert(rows, { onConflict: 'place_id,author_name,review_time' })
    .select('id');

  if (error) {
    return NextResponse.json({ error: `upsert failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: rows.length, written: data?.length ?? 0 });
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
