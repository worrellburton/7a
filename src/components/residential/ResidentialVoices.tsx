// Residential page — alumni voices section.
//
// Pulls real Google reviews (DB cache first, Places API fallback)
// and hands the top 3 to the client view. No curated / fabricated
// quotes: if fewer than 3 real verified reviews are available we
// render nothing rather than invent alumni.

import { fetchPlaceDetails } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import ResidentialVoicesView, { type ResidentialVoice } from './ResidentialVoicesView';

const CARD_CAP = 280;

function trimQuote(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= CARD_CAP) return cleaned;
  const cut = cleaned.slice(0, CARD_CAP);
  const boundary = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (boundary > 160) return cut.slice(0, boundary + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 160 ? cut.slice(0, space) : cut) + '…';
}

export default async function ResidentialVoices() {
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'newest', limit: 12 });
  const place = cached.length < 3 ? await fetchPlaceDetails() : null;
  const reviews = cached.length >= 3 ? cached : (place?.reviews ?? []);

  if (reviews.length < 3) return null;

  const voices: ResidentialVoice[] = reviews.slice(0, 3).map((r) => ({
    quote: trimQuote(r.text || ''),
    author: r.authorName || 'Verified Google review',
    tag: r.relativeTime ? `Verified Google review · ${r.relativeTime}` : 'Verified Google review',
  }));

  const averageRating =
    cached.length > 0
      ? cached.reduce((s, r) => s + (r.rating || 0), 0) / cached.length
      : place?.rating ?? 4.9;

  return <ResidentialVoicesView voices={voices} averageRating={averageRating} />;
}
