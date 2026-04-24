import { NextResponse } from 'next/server';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import { fetchPlaceDetails } from '@/lib/places';

// GET /api/reviews/random
//
// Public — returns a small pool of real, verified Google reviews in
// random order so small surfaces (mobile nav drawer, ticker, etc.)
// can render a fresh one on every open without shipping the whole
// corpus. Real reviews only; empty array if neither the DB cache nor
// Places has anything ≥4 stars.

export const dynamic = 'force-dynamic';

export async function GET() {
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'random', limit: 12 });
  const source = cached.length > 0
    ? cached
    : ((await fetchPlaceDetails())?.reviews ?? []).filter((r) => r.rating >= 4);

  const rows = source
    .filter((r) => (r.text || '').trim().length >= 40)
    .slice(0, 8)
    .map((r) => ({
      authorName: r.authorName || null,
      profilePhotoUrl: r.profilePhotoUrl || null,
      rating: r.rating,
      relativeTime: r.relativeTime || null,
      text: r.text || '',
    }));

  return NextResponse.json({ rows }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}
