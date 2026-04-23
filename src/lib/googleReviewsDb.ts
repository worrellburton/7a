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
    .eq('hidden', false)
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

// ---- Curated + unified reads (phase 13) ----------------------------------
//
// Curated rows live in public.curated_reviews and are admin-managed.
// fetchAllReviews merges Google cache + curated, respects hidden/featured
// flags, and returns a single sorted list ready for render.

export type ReviewSource = 'google' | 'curated';

export interface UnifiedReview {
  id: string;
  source: ReviewSource;
  authorName: string;
  rating: number;
  text: string;
  /** "2 weeks ago" for Google, "Alumnus · 8 months sober" for curated. */
  byline: string;
  photoUrl: string | null;
  featured: boolean;
  /** unix seconds — present on google rows for ordering, undefined on curated. */
  reviewTime?: number;
  /** Manual ordering when set by an admin. */
  displayOrder: number | null;
}

interface UnifiedOpts {
  /** Max rows. Default 50. */
  limit?: number;
  /** Filter by source. Default both. */
  sources?: ReviewSource[];
  /** Filter by minimum rating. Default 4. */
  minRating?: number;
  /** Featured rows first regardless of sort. Default true. */
  featuredFirst?: boolean;
}

interface CuratedRow {
  id: string;
  author_name: string;
  attribution: string | null;
  rating: number;
  text: string;
  featured: boolean;
  display_order: number | null;
}

interface GoogleRow {
  id: string;
  author_name: string;
  profile_photo_url: string | null;
  rating: number;
  relative_time: string | null;
  text: string | null;
  review_time: string;
  featured: boolean;
  display_order: number | null;
}

export async function fetchAllReviews(opts: UnifiedOpts = {}): Promise<UnifiedReview[]> {
  const limit = opts.limit ?? 50;
  const sources = opts.sources ?? ['google', 'curated'];
  const minRating = opts.minRating ?? 4;
  const featuredFirst = opts.featuredFirst ?? true;
  const admin = getAdminSupabase();

  const collected: UnifiedReview[] = [];

  if (sources.includes('google')) {
    const { data, error } = await admin
      .from('google_reviews')
      .select('id, author_name, profile_photo_url, rating, relative_time, text, review_time, featured, display_order')
      .eq('place_id', SEVEN_ARROWS_PLACE_ID)
      .eq('hidden', false)
      .gte('rating', minRating)
      .order('review_time', { ascending: false });
    if (error) {
      console.error(`[reviewsDb] google select failed: ${error.message}`);
    } else {
      for (const r of (data ?? []) as GoogleRow[]) {
        collected.push({
          id: r.id,
          source: 'google',
          authorName: r.author_name,
          rating: r.rating,
          text: r.text ?? '',
          byline: r.relative_time ?? 'Verified Google review',
          photoUrl: r.profile_photo_url,
          featured: r.featured,
          reviewTime: Math.floor(new Date(r.review_time).getTime() / 1000),
          displayOrder: r.display_order,
        });
      }
    }
  }

  if (sources.includes('curated')) {
    const { data, error } = await admin
      .from('curated_reviews')
      .select('id, author_name, attribution, rating, text, featured, display_order')
      .eq('hidden', false)
      .gte('rating', minRating)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (error) {
      console.error(`[reviewsDb] curated select failed: ${error.message}`);
    } else {
      for (const r of (data ?? []) as CuratedRow[]) {
        collected.push({
          id: r.id,
          source: 'curated',
          authorName: r.author_name,
          rating: r.rating,
          text: r.text,
          byline: r.attribution ?? 'Verified alum review',
          photoUrl: null,
          featured: r.featured,
          displayOrder: r.display_order,
        });
      }
    }
  }

  collected.sort((a, b) => {
    if (featuredFirst && a.featured !== b.featured) return a.featured ? -1 : 1;
    const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    // Then freshest first for google, alphabetical for curated/no-time.
    const aTime = a.reviewTime ?? 0;
    const bTime = b.reviewTime ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.authorName.localeCompare(b.authorName);
  });

  return collected.slice(0, limit);
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
