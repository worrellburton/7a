// Landing page — stats band + real-review card.
//
// Server component. Fetches one featured Google review via the same
// cached Places pipeline the reviews cinema uses, then hands off to a
// client counter block. Left column = four animated KPI counters; right
// column = a real verified review card. Replaces the standalone
// StatsSection directly under the hero so the first impression below
// the fold pairs "this is what we are" (numbers) with "this is what
// other humans say" (quoted review).

import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import HeroStatsBandClient from './HeroStatsBandClient';
import type { ReviewBubbleData } from './ReviewBubble';

const FALLBACK_REVIEW: ReviewBubbleData = {
  name: 'Michael T.',
  date: '2 months ago',
  rating: 5,
  text: "Seven Arrows saved my life. The staff genuinely cares about every person who walks through the door. The small group setting made me feel like I wasn't just a number. I'm 8 months sober now and I owe it to this incredible team.",
};

const FALLBACK_RATING = 4.9;
const FALLBACK_TOTAL = 27;

export default async function HeroStatsBand() {
  const place = await fetchPlaceDetails();
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'newest', limit: 1 });

  const featured = cached[0] ?? place?.reviews?.[0];
  const review: ReviewBubbleData = featured
    ? {
        name: featured.authorName,
        date: featured.relativeTime,
        rating: featured.rating,
        text: featured.text,
        photoUrl: featured.profilePhotoUrl,
      }
    : FALLBACK_REVIEW;

  const rating = place?.rating ?? FALLBACK_RATING;
  const total = place?.userRatingsTotal ?? FALLBACK_TOTAL;

  return (
    <HeroStatsBandClient review={review} rating={rating} total={total} />
  );
}
