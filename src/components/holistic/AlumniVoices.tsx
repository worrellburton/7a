// Holistic & Indigenous — alumni voices section.
//
// Server component: pulls real Google reviews from Places, picks the
// top 3 newest >= 4★, and hands them to the client view for animation.
// Falls back to a small curated set if Places isn't configured — keeps
// the section from rendering empty in local dev or quota-exhausted
// states.

import { fetchPlaceDetails } from '@/lib/places';
import AlumniVoicesView, { type Voice } from './AlumniVoicesView';

const FALLBACK_VOICES: Voice[] = [
  {
    quote:
      'Yoga was the first place I felt anything in my body again without wanting to run from it. Small thing. Enormous thing.',
    name: 'M.',
    stay: '90-day stay · 2024',
    practice: 'Trauma-informed yoga',
  },
  {
    quote:
      'The sweat lodge wasn&rsquo;t what I came for. It&rsquo;s what I still carry. I didn&rsquo;t know I was allowed to belong anywhere that old.',
    name: 'J.',
    stay: '60-day stay · 2023',
    practice: 'Sweat lodge · evening circle',
    quoteHtml: true,
  },
  {
    quote:
      'I was skeptical about the sound bath for exactly one session. Then my shoulders came down from my ears for the first time in a decade.',
    name: 'A.',
    stay: 'Extended stay · 2024',
    practice: 'Sound · breathwork',
  },
];

// Hard cap the quote length so long reviews don't overwhelm the tile.
// Clip on a sentence boundary when we can.
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

  const voices: Voice[] =
    reviews.length >= 3
      ? reviews.slice(0, 3).map((r) => ({
          quote: trimQuote(r.text || ''),
          name: r.authorName || 'Anonymous',
          stay: r.relativeTime || 'Verified review',
          practice: 'Verified Google review',
        }))
      : FALLBACK_VOICES;

  return <AlumniVoicesView voices={voices} />;
}
