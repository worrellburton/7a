import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';
import { fetchPlaceDetails, SEVEN_ARROWS_PLACE_ID } from '@/lib/places';

// GET / POST /api/google/places-sync
//
// Hourly cron + manual admin trigger. Fetches Places Details twice
// (once with reviews_sort=newest and once with =most_relevant) so we
// surface as much of the actual review pool as possible — Google's
// 5-per-call cap returns different sets depending on sort. Upserts
// every result into public.google_reviews on the
// (place_id, author_name, review_time) natural key, then evicts rows
// older than 30 days from fetched_at to stay within Google Maps
// Platform ToS.
//
// Auth: Bearer ${CRON_SECRET} when called from Vercel Cron, or any
// signed-in admin when called from the admin panel.

export const dynamic = 'force-dynamic';

const CACHE_TTL_DAYS = 30;

interface SyncRow {
  place_id: string;
  author_name: string;
  profile_photo_url: string | null;
  rating: number;
  relative_time: string | null;
  text: string | null;
  review_time: string;
  language: string;
  fetched_at: string;
}

async function authorize(req: NextRequest): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  if (expected && authHeader === `Bearer ${expected}`) return { ok: true };
  const user = await getUserFromRequest(req);
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
  return { ok: true };
}

async function handle(req: NextRequest) {
  const auth = await authorize(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sources: Array<'newest' | 'most_relevant'> = ['newest', 'most_relevant'];
  const seen = new Map<string, SyncRow>();

  for (const sort of sources) {
    const place = await fetchPlaceDetails({ reviewsSort: sort, cache: false });
    if (!place) continue;
    for (const r of place.reviews) {
      const reviewTime = new Date(r.time * 1000).toISOString();
      const key = `${SEVEN_ARROWS_PLACE_ID}|${r.authorName}|${reviewTime}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        place_id: SEVEN_ARROWS_PLACE_ID,
        author_name: r.authorName,
        profile_photo_url: r.profilePhotoUrl,
        rating: Math.round(r.rating),
        relative_time: r.relativeTime,
        text: r.text,
        review_time: reviewTime,
        language: 'en',
        fetched_at: new Date().toISOString(),
      });
    }
  }

  const rows = Array.from(seen.values());

  const admin = getAdminSupabase();
  let written = 0;
  if (rows.length > 0) {
    const { data, error } = await admin
      .from('google_reviews')
      .upsert(rows, { onConflict: 'place_id,author_name,review_time' })
      .select('id');
    if (error) {
      console.error(`[places-sync] upsert failed: ${error.message}`);
      return NextResponse.json({ error: `upsert failed: ${error.message}` }, { status: 500 });
    }
    written = data?.length ?? 0;
  }

  // Evict cache rows beyond Google's 30-day allowance.
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count: evicted, error: delErr } = await admin
    .from('google_reviews')
    .delete({ count: 'exact' })
    .lt('fetched_at', cutoff);
  if (delErr) {
    console.error(`[places-sync] eviction failed: ${delErr.message}`);
  }

  return NextResponse.json({
    ok: true,
    sources_called: sources,
    unique_seen: rows.length,
    written,
    evicted: evicted ?? 0,
    cache_ttl_days: CACHE_TTL_DAYS,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
