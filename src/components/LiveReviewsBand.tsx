// Async server wrapper that pulls live Google reviews for the
// marketing site's editorial voices band.
//
// Selection logic: keep ratings ≥ 4 and reviews with at least ~140
// characters of text (so we skip "Great place!" one-liners), sort
// by time newest-first, pick up to 4. Long reviews are gently
// trimmed on a sentence boundary so the serif quote doesn't run
// into a wall of text.
//
// Fallback: if GOOGLE_PLACES_API_KEY is unset, the Places call fails, or
// we don't have enough substantive reviews, we render the `fallback`
// voices passed by the parent (so the page always has content and
// the build never breaks in a preview env without secrets).

import { fetchPlaceDetails, type PlaceReview } from '@/lib/places';
import { fetchCachedReviews } from '@/lib/googleReviewsDb';
import LiveReviewsBandClient, { type VoiceEntry } from './LiveReviewsBandClient';

interface LiveReviewsBandProps {
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  headlineTail?: string;
  lede?: string;
  fallback: VoiceEntry[];
  /** How many reviews to render. Defaults to 4 to fit the 2-column
      masonry layout. */
  count?: number;
  /** Minimum character length for a review to be selected. Filters
      out "5 stars great staff" one-liners that don't carry the
      editorial weight of the layout. */
  minLength?: number;
}

export default async function LiveReviewsBand({
  eyebrow,
  headlineLead,
  headlineAccent,
  headlineTail,
  lede,
  fallback,
  count = 4,
  minLength = 140,
}: LiveReviewsBandProps) {
  // Prefer the DB-backed cache (phase 5/8) so we draw from the full
  // accumulated corpus instead of just Google's 5-most-recent. Live
  // Places call kept as a hot-path fallback if the cache is empty
  // (e.g. brand new project, or right after a TTL eviction).
  const cached = await fetchCachedReviews({ minRating: 4, sort: 'newest', limit: 100 });
  let source: PlaceReview[] = cached;
  if (source.length === 0) {
    const details = await fetchPlaceDetails();
    source = details?.reviews ?? [];
  }

  const substantive = source
    .filter((r) => r.rating >= 4 && r.text.trim().length >= minLength)
    .sort((a, b) => b.time - a.time)
    .slice(0, count);

  // If we couldn't assemble a full set of live reviews, fall back
  // to the editorial stubs. We do *not* mix sources — either live or
  // fallback — to keep attribution honest.
  const useLive = substantive.length >= count;
  const voices: VoiceEntry[] = useLive
    ? substantive.map(toVoiceEntry)
    : fallback.slice(0, count);

  return (
    <LiveReviewsBandClient
      eyebrow={eyebrow}
      headlineLead={headlineLead}
      headlineAccent={headlineAccent}
      headlineTail={headlineTail}
      lede={lede}
      voices={voices}
      showGoogleFooter={useLive}
    />
  );
}

function toVoiceEntry(review: PlaceReview): VoiceEntry {
  return {
    quote: polishQuote(review.text),
    name: review.authorName,
    tag: `Google review · ${review.relativeTime || '5 stars'}`,
    photo: review.profilePhotoUrl,
    fromGoogle: true,
  };
}

// Soft trim for the editorial layout. Hard cap around 340 chars; cut
// on the last sentence boundary that fits. Never mid-word. Google's
// TOS allows display of review text as returned; trimming to a
// natural stop (and adding an ellipsis) is common, non-editorial
// practice.
function polishQuote(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const CAP = 340;
  if (cleaned.length <= CAP) return cleaned;
  const cut = cleaned.slice(0, CAP);
  // Prefer a sentence ending.
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (sentenceEnd > 200) return cut.slice(0, sentenceEnd + 1);
  // Otherwise last word boundary + ellipsis.
  const space = cut.lastIndexOf(' ');
  return (space > 200 ? cut.slice(0, space) : cut) + '…';
}
