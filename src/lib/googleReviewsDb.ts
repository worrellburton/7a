// DB-backed reads of the Google review cache (public.google_reviews).
// Same return shape as PlaceReview from lib/places.ts so a component
// can swap the two without touching its render code. Server-only —
// uses the admin Supabase client because review data is public anyway
// and we don't want to require RLS policies on the cache table just
// to render a marquee.

import { getAdminSupabase } from '@/lib/supabase-server';
import { SEVEN_ARROWS_PLACE_ID, type PlaceReview } from '@/lib/places';

interface FetchOpts {
  /** Max rows to return. Default 50 (covers every realistic carousel). */
  limit?: number;
  /** Filter rows with rating below this value. Default 4 to match
      the public-facing components that filter out 1-3 star reviews. */
  minRating?: number;
  /** Sort order. Default 'newest'. 'random' returns a Postgres-side
      shuffled set — useful for marquees that should feel un-curated. */
  sort?: 'newest' | 'highest_rated' | 'random';
  /** Future-proofing for multi-location. Defaults to the Seven Arrows
      Place ID currently hardcoded in lib/places.ts. */
  placeId?: string;
}

interface DbRow {
  author_name: string;
  profile_photo_url: string | null;
  rating: number;
  relative_time: string | null;
  text: string | null;
  review_time: string;
}

export async function fetchCachedReviews(opts: FetchOpts = {}): Promise<PlaceReview[]> {
  const limit = opts.limit ?? 50;
  const minRating = opts.minRating ?? 4;
  const sort = opts.sort ?? 'newest';
  const placeId = opts.placeId ?? SEVEN_ARROWS_PLACE_ID;

  const admin = getAdminSupabase();
  let q = admin
    .from('google_reviews')
    .select('author_name, profile_photo_url, rating, relative_time, text, review_time')
    .eq('place_id', placeId)
    .gte('rating', minRating);

  if (sort === 'newest') {
    q = q.order('review_time', { ascending: false });
  } else if (sort === 'highest_rated') {
    q = q.order('rating', { ascending: false }).order('review_time', { ascending: false });
  }
  // For 'random' we order in JS after fetch — Postgres random()
  // ordering on a small table is fine but Supabase JS doesn't expose
  // it cleanly. Pull a wider set, shuffle, then slice.

  const fetchLimit = sort === 'random' ? Math.max(limit * 3, 30) : limit;
  q = q.limit(fetchLimit);

  const { data, error } = await q;
  if (error) {
    console.error(`[googleReviewsDb] read failed: ${error.message}`);
    return [];
  }

  let rows = (data ?? []) as DbRow[];
  if (sort === 'random') {
    rows = rows
      .map((r) => ({ r, k: Math.random() }))
      .sort((a, b) => a.k - b.k)
      .slice(0, limit)
      .map(({ r }) => r);
  }

  return rows.map((r) => ({
    authorName: r.author_name,
    profilePhotoUrl: r.profile_photo_url,
    rating: r.rating,
    relativeTime: r.relative_time ?? '',
    text: r.text ?? '',
    time: Math.floor(new Date(r.review_time).getTime() / 1000),
  }));
}

export async function countCachedReviews(placeId: string = SEVEN_ARROWS_PLACE_ID): Promise<number> {
  const admin = getAdminSupabase();
  const { count, error } = await admin
    .from('google_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('place_id', placeId);
  if (error) {
    console.error(`[googleReviewsDb] count failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}
