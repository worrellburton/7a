// Cocaine page — alumni voices (three overlaid-portrait tiles).
// Real Google reviews only. If we don't have 3 verified reviews,
// the section renders nothing rather than fabricating alumni.

import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import AlumniVoicesView, { type AlumniVoice } from './AlumniVoicesView';

// Rotate through a small pool of background photos so each tile has
// some visual variety. These are environment shots, not alumni
// portraits, so they do not misrepresent anyone.
const PHOTOS = [
  '/images/covered-porch-desert-view.jpg',
  '/images/group-sunset-desert.jpg',
  '/images/facility-exterior-mountains.jpg',
];

const CARD_CAP = 260;

function trimQuote(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= CARD_CAP) return cleaned;
  const cut = cleaned.slice(0, CARD_CAP);
  const boundary = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (boundary > 150) return cut.slice(0, boundary + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 150 ? cut.slice(0, space) : cut) + '…';
}

export default async function AlumniVoices() {
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'newest', limit: 12 });
  const reviews =
    cached.length >= 3 ? cached : (await fetchPlaceDetails())?.reviews ?? [];

  if (reviews.length < 3) return null;

  const quotes: AlumniVoice[] = reviews.slice(0, 3).map((r, i) => ({
    quote: trimQuote(r.text || ''),
    attribution: `${r.authorName || 'Verified Google review'} · Verified Google review${
      r.relativeTime ? ` · ${r.relativeTime}` : ''
    }`,
    photo: PHOTOS[i % PHOTOS.length],
  }));

  return <AlumniVoicesView quotes={quotes} />;
}
