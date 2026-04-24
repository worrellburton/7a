// Server wrapper that interleaves live Google review snippets with the
// static stat / link items in the bottom ticker. Real reviews only —
// when the Places / cache pools are empty the ticker renders its
// static stats and links without any review snippets rather than
// fabricate alumni copy.

import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import BottomTicker, { type TickerItem } from './BottomTicker';

const STATIC_ITEMS: TickerItem[] = [
  { type: 'stat', text: '1:1 Primary Clinician' },
  {
    type: 'link',
    text: 'NEW: When Drinking Stops Working →',
    href: '/who-we-are/blog/when-drinking-stops-working',
  },
  { type: 'stat', text: '90+ Day Programs Available' },
  { type: 'stat', text: '24/7 Admissions Support' },
  { type: 'stat', text: 'JCAHO Accredited • LegitScript Certified' },
];

// Pull a short, punchy snippet out of a long review. Prefer the first
// complete sentence under ~70 chars; otherwise word-truncate.
function snippet(text: string, max = 70): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (s.length >= 18 && s.length <= max) return s.replace(/[.!?]+$/, '.');
  }
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > 30 ? cut.slice(0, space) : cut) + '…';
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0)}.`;
}

export default async function BottomTickerServer() {
  const place = await fetchPlaceDetails();
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'random', limit: 4 });
  const sourcePool = cached.length > 0 ? cached : (place?.reviews ?? []);

  const reviewItems: TickerItem[] =
    sourcePool
      .filter((r) => r.rating >= 4 && r.text.trim().length >= 30)
      .slice(0, 4)
      .map((r) => ({
        type: 'review' as const,
        text: `"${snippet(r.text)}" — ${shortName(r.authorName)}`,
      }));
  // Real reviews only — empty array means the ticker shows stats + links
  // without any review snippets, never fabricated ones.
  const finalReviewItems = reviewItems;

  const ratingItem: TickerItem = {
    type: 'stat',
    text: place?.rating
      ? `${place.rating.toFixed(1)}/5 Google Rating${place.userRatingsTotal ? ` · ${place.userRatingsTotal} reviews` : ''}`
      : '4.9/5 Google Rating',
  };

  // Interleave: rating, then alternate stats and reviews so the marquee
  // doesn't clump category-by-category.
  const interleaved: TickerItem[] = [ratingItem];
  const maxLen = Math.max(STATIC_ITEMS.length, finalReviewItems.length);
  for (let i = 0; i < maxLen; i++) {
    if (finalReviewItems[i]) interleaved.push(finalReviewItems[i]);
    if (STATIC_ITEMS[i]) interleaved.push(STATIC_ITEMS[i]);
  }

  return <BottomTicker items={interleaved} />;
}
