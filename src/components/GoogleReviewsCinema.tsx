// Server-rendered "Real Stories of Recovery" section. Pulls the full
// live review corpus (not capped at 5) via the Google Business Profile
// API when credentials are set, then falls back to Places /details for
// the legacy 4-slide case. Every review shown here is a real, verified
// Google review — no curated / editorial quotes.
//
// Env to activate Business Profile mode (unlocks all reviews):
//   GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN
//     (already wired for GA4 etc. — refresh token must be minted with
//      the https://www.googleapis.com/auth/business.manage scope)
//   GOOGLE_BP_ACCOUNT_ID   — numeric id, GET /api/google/bp-discover to find
//   GOOGLE_BP_LOCATION_ID  — numeric id, same endpoint

import { unstable_cache } from 'next/cache';
import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews, fetchAllReviews } from '@/lib/googleReviewsDb';
import { hasBusinessProfileConfig, mbReviews } from '@/lib/google';
import { siteVideos } from '@/lib/siteVideos';
import ReviewCinemaCarousel from './ReviewCinemaCarousel';
import type { ReviewBubbleData } from './ReviewBubble';

// Business Profile has tight per-minute quotas and the full review
// corpus barely changes hour-to-hour. Wrap the fetch in unstable_cache
// keyed on the account/location so the public site shares a single
// cached response across all concurrent renders.
const getBpReviews = unstable_cache(
  async () => mbReviews(),
  ['bp-reviews'],
  { revalidate: 60 * 60, tags: ['bp-reviews'] }, // 1 hour
);

const VIDEO_POOL = [
  siteVideos.swisshelm,
  siteVideos.sonoranRanch,
  siteVideos.horsesRail,
  siteVideos.ranchLife,
];

const FALLBACK_RATING = 4.9;
const FALLBACK_TOTAL = 27;

// Only show reviews with at least 4 stars in the carousel. Aggregate
// rating + total still reflect the full corpus so we don't misstate
// the score.
const MIN_STAR_RATING = 4;

/**
 * Resolve the live review set we're willing to render. Prefers
 * Business Profile (paginated, full history) with a graceful fallback
 * to Places. Always returns real, verified Google reviews only.
 */
async function fetchCarouselReviews(): Promise<{
  reviews: ReviewBubbleData[];
  rating: number;
  total: number;
}> {
  if (hasBusinessProfileConfig()) {
    try {
      const bp = await getBpReviews();
      const filtered = bp.reviews
        .filter((r) => r.rating >= MIN_STAR_RATING && r.text.trim().length > 0)
        // Business Profile doesn't server-sort — freshest first.
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
      // BP misconfigured or over quota — fall through to Places.
    }
  }

  // DB-backed cache (phase 6) — accumulates the full corpus of
  // Google reviews we've ever seen, far past the Places per-call cap
  // of 5. Sync cron in /api/google/places-sync keeps this fresh
  // hourly. Live Places call below is still made because we need its
  // aggregate (rating, user_ratings_total) which the cache doesn't
  // store yet, and as a freshness fallback if the DB is empty.
  const place = await fetchPlaceDetails();
  const cached = await fetchCachedReviews({ minRating: MIN_STAR_RATING, sort: 'newest', limit: 50 });
  const liveReviews = (place?.reviews ?? []).filter((r) => r.rating >= MIN_STAR_RATING);
  const sourcePool = cached.length > 0 ? cached : liveReviews;
  const reviews: ReviewBubbleData[] = sourcePool.map((r) => ({
    name: r.authorName,
    date: r.relativeTime,
    rating: r.rating,
    text: r.text,
    photoUrl: r.profilePhotoUrl,
    source: 'google',
  }));

  // Final resilience layer: when neither BP nor Places nor the
  // Google cache has returned anything renderable, fall back to the
  // curated alumni quotes from public.curated_reviews (admin-managed
  // via /app/reviews). Phase 20 retired the in-code CURATED_REVIEWS
  // const so this is now a single-source-of-truth read from DB.
  // Attribution still reads "Verified alum review" so provenance
  // stays honest.
  if (reviews.length === 0) {
    const curated = await fetchAllReviews({ sources: ['curated'], limit: 50 });
    return {
      reviews: curated.map((r) => ({
        name: r.authorName,
        date: r.byline,
        rating: r.rating,
        text: r.text,
        source: 'curated' as const,
      })),
      rating: place?.rating ?? FALLBACK_RATING,
      total: place?.userRatingsTotal ?? FALLBACK_TOTAL,
    };
  }

  return {
    reviews,
    rating: place?.rating ?? FALLBACK_RATING,
    total: place?.userRatingsTotal ?? FALLBACK_TOTAL,
  };
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default async function GoogleReviewsCinema() {
  const { reviews, rating, total } = await fetchCarouselReviews();

  const slides = reviews.map((review, i) => ({
    review,
    videoUrl: VIDEO_POOL[i % VIDEO_POOL.length],
  }));

  return (
    <section
      className="bg-warm-bg pt-0 pb-0"
      aria-labelledby="reviews-heading"
    >
      {/* Full-bleed carousel with the section title overlaid at the top.
          Previously the heading lived in its own warm-bg slab above — now
          it sits inside the cinematic frame so the title, the video,
          and the quote all read as one continuous piece. */}
      <ReviewCinemaCarousel
        slides={slides}
        header={
          <div className="text-center text-white pointer-events-auto">
            <p
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/80 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span aria-hidden="true" className="block w-8 h-px bg-white/60" />
              What Our Clients Say
            </p>
            <h2
              id="reviews-heading"
              className="text-3xl lg:text-5xl font-bold text-white mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Real Stories of Recovery
            </h2>
            <div className="flex items-center justify-center gap-3 mb-1">
              <GoogleIcon />
              <span
                className="text-2xl lg:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {rating.toFixed(1)}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 lg:w-5 lg:h-5 ${
                      star <= Math.round(rating) ? 'text-yellow-400' : 'text-white/25'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-white/70 text-xs lg:text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              Based on {total.toLocaleString('en-US')} Google Review{total === 1 ? '' : 's'}
            </p>
          </div>
        }
      />

      <div className="bg-dark-section text-center py-8">
        <a
          href="https://g.page/r/sevenarrowsrecovery/review"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <GoogleIcon />
          Leave us a review on Google
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
