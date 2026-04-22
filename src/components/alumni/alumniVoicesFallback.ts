// Editorial fallback quotes for the alumni-aftercare voices band.
// Rendered by <LiveReviewsBand> when the Google Places API is
// unavailable (missing env key, network error, or fewer than 4
// substantive reviews). Server-safe, no client imports.

import type { VoiceEntry } from '@/components/LiveReviewsBandClient';

export const alumniVoicesFallback: VoiceEntry[] = [
  {
    quote:
      'The aftercare call at 90 days was the one that kept me in it. I was already drifting and didn\'t know it. My clinician did.',
    name: 'Daniel P.',
    tag: 'Alumnus · 2 years sober',
    photo: '/images/covered-porch-desert-view.jpg',
  },
  {
    quote:
      'Three residential stays before this one. The difference wasn\'t the stay — it was the year after. Somebody stayed in touch until I could stay in touch with myself.',
    name: 'Teresa V.',
    tag: 'Alumna · 3 years sober',
    photo: '/images/group-gathering-pavilion.jpg',
  },
  {
    quote:
      'I slipped at seven months. I called the alumni line. No guilt trip, no sales pitch — a clinical call and a plan within an hour. I\'ve been sober since.',
    name: 'Marcus B.',
    tag: 'Alumnus · 14 months sober',
    photo: '/images/group-sunset-desert.jpg',
  },
  {
    quote:
      'My first reunion weekend was 11 months in. Walking back onto that ranch sober was a feeling I didn\'t know I was missing. I come back every year now.',
    name: 'Lauren K.',
    tag: 'Alumna · 4 years sober',
    photo: '/images/facility-exterior-mountains.jpg',
  },
];
