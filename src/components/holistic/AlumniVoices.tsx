// Holistic & Indigenous — alumni voices section.
//
// Pulls real Google reviews from Places and hands the top 3 to the
// client view for animation. If fewer than 3 real reviews are
// available (Places not configured, quota exhausted, or the review
// pool is thin), we render nothing — we only show real, verified
// reviews on the site.

import { fetchPlaceDetails } from '@/lib/places';
import AlumniVoicesView from './AlumniVoicesView';

const CARD_CAP = 320;
function trimQuote(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= CARD_CAP) return cleaned;
  const cut = cleaned.slice(0, CARD_CAP);
  const boundary = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (boundary > 180) return cut.slice(0, boundary + 1);
  const space = cut.lastIndexOf(' ');
  return (space > 180 ? cut.slice(0, space) : cut) + '…';
}

export default async function AlumniVoices() {
  const place = await fetchPlaceDetails();
  const reviews = place?.reviews ?? [];

  if (reviews.length < 3) {
    // No curated fallback — we only surface real reviews. Skip the
    // section entirely when there aren't enough verified ones.
    return null;
  }

  const voices = reviews.slice(0, 3).map((r) => ({
    quote: trimQuote(r.text || ''),
    name: r.authorName || 'Anonymous',
    stay: r.relativeTime || 'Verified Google review',
    practice: 'Verified Google review',
  }));

  return <AlumniVoicesView voices={voices} />;
}
