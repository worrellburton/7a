// Phase 8 — Equine-specific Google review card.
//
// Server component. Pulls the live review corpus (Business Profile
// when configured, Places fallback), scores each review for
// equine-related language, and promotes the best match to the
// featured card. The unpromoted full-corpus rating + count still
// render below so the claim is anchored to the actual aggregate.
// Falls back to a generic rating row when no equine-language match
// exists so we never invent a quote.

import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import { hasBusinessProfileConfig, mbReviews } from '@/lib/google';
import { siteVideos } from '@/lib/siteVideos';
import EquineReviewClient from './EquineReviewClient';
import type { ReviewBubbleData } from '@/components/ReviewBubble';

const FALLBACK_RATING = 4.9;
const FALLBACK_TOTAL = 27;

const EQUINE_KEYWORDS = [
  'horse',
  'horses',
  'equine',
  'eap',
  'herd',
  'mare',
  'stallion',
  'gelding',
  'arena',
  'groundwork',
  'saddle',
  'ranch',
];

function scoreEquineRelevance(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const k of EQUINE_KEYWORDS) {
    // Word-boundary-ish: don't match "horses" inside "horseshoe" accidentally.
    const re = new RegExp(`\\b${k}\\b`, 'g');
    const matches = lower.match(re);
    if (matches) score += matches.length * (k.length >= 6 ? 3 : 2);
  }
  return score;
}

async function resolveLiveReviews(): Promise<{
  reviews: ReviewBubbleData[];
  rating: number;
  total: number;
}> {
  if (hasBusinessProfileConfig()) {
    try {
      const bp = await mbReviews();
      const filtered = bp.reviews
        .filter((r) => r.rating >= 4 && r.text.trim().length > 0)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      if (filtered.length > 0) {
        return {
          reviews: filtered.map((r) => ({
            name: r.authorName,
            date: r.relativeTime,
            rating: r.rating,
            text: r.text,
            photoUrl: r.profilePhotoUrl,
            source: 'google',
          })),
          rating: bp.averageRating ?? FALLBACK_RATING,
          total: bp.totalReviewCount ?? filtered.length,
        };
      }
    } catch {
      // fall through
    }
  }
  const place = await fetchPlaceDetails();
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'newest', limit: 100 });
  const liveReviews = (place?.reviews ?? []).filter((r) => r.rating >= 4 && r.text.trim().length > 0);
  const sourcePool = cached.length > 0 ? cached : liveReviews;
  const reviews: ReviewBubbleData[] = sourcePool
    .filter((r) => r.rating >= 4 && r.text.trim().length > 0)
    .map((r) => ({
      name: r.authorName,
      date: r.relativeTime,
      rating: r.rating,
      text: r.text,
      photoUrl: r.profilePhotoUrl,
      source: 'google',
    }));
  return {
    reviews,
    rating: place?.rating ?? FALLBACK_RATING,
    total: place?.userRatingsTotal ?? FALLBACK_TOTAL,
  };
}

export default async function EquineReview() {
  const { reviews, rating, total } = await resolveLiveReviews();

  // Pick the review with the highest equine-language score. Ties fall
  // to the freshest. If nothing scores > 0, pass null and the client
  // renders a generic rating row instead of inventing a quote.
  const scored = reviews
    .map((r) => ({ review: r, score: scoreEquineRelevance(r.text) }))
    .sort((a, b) => b.score - a.score);
  const featured = scored.length > 0 && scored[0].score > 0 ? scored[0].review : null;

  return (
    <EquineReviewClient
      review={featured}
      rating={rating}
      total={total}
      videoUrl={siteVideos.horsesRail}
    />
  );
}
