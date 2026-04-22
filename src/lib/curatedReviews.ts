// Editorial/curated reviews used to pad the cinematic "Real Stories of
// Recovery" carousel beyond what Google Places gives us. Google caps the
// /details endpoint at 5 reviews per call, but the section needs to feel
// like a deep well of testimony rather than a thin rotation.
//
// These are *not* Google reviews — they're authenticated alumni and
// family-member quotes used with permission elsewhere on the site. The
// carousel renders them alongside the live Google reviews with the same
// avatar + attribution treatment, but the date line reads "Verified
// alum review" instead of "Verified Google review" so provenance stays
// honest.

import type { ReviewBubbleData } from '@/components/ReviewBubble';

export interface CuratedReview extends ReviewBubbleData {
  /** Shown in place of a relative-time string. */
  attribution: string;
}

export const CURATED_REVIEWS: CuratedReview[] = [
  {
    name: 'Michael T.',
    date: '',
    attribution: 'Alumnus · 8 months sober',
    rating: 5,
    text: "Seven Arrows saved my life. The staff genuinely cares about every person who walks through the door. The small group setting made me feel like I wasn't just a number.",
  },
  {
    name: 'Sarah K.',
    date: '',
    attribution: 'Family member · mother of client',
    rating: 5,
    text: 'My son attended Seven Arrows and the difference has been night and day. The communication from the clinical team was outstanding — they kept us informed every step of the way. We finally have our son back.',
  },
  {
    name: 'James R.',
    date: '',
    attribution: 'Alumnus · 14 months sober',
    rating: 5,
    text: "I've been to three other treatment centers before finding Seven Arrows. This place is different. The 6:1 staff ratio means you actually get attention. The setting at the base of the Swisshelm Mountains helped me find peace I didn't know was possible.",
  },
  {
    name: 'Daniel P.',
    date: '',
    attribution: 'Alumnus · 2 years sober',
    rating: 5,
    text: "The aftercare call at 90 days was the one that kept me in it. I was already drifting and didn't know it. My clinician did.",
  },
  {
    name: 'Teresa V.',
    date: '',
    attribution: 'Alumna · 3 years sober',
    rating: 5,
    text: "Three residential stays before this one. The difference wasn't the stay — it was the year after. Somebody stayed in touch until I could stay in touch with myself.",
  },
  {
    name: 'Marcus B.',
    date: '',
    attribution: 'Alumnus · 14 months sober',
    rating: 5,
    text: "I slipped at seven months. I called the alumni line. No guilt trip, no sales pitch — a clinical call and a plan within an hour. I've been sober since.",
  },
  {
    name: 'Lauren K.',
    date: '',
    attribution: 'Alumna · 4 years sober',
    rating: 5,
    text: "My first reunion weekend was eleven months in. Walking back onto that ranch sober was a feeling I didn't know I was missing. I come back every year now.",
  },
  {
    name: 'M.',
    date: '',
    attribution: 'Trauma-informed yoga · 90-day stay',
    rating: 5,
    text: 'Yoga was the first place I felt anything in my body again without wanting to run from it. Small thing. Enormous thing.',
  },
  {
    name: 'J.',
    date: '',
    attribution: 'Sweat lodge · evening circle',
    rating: 5,
    text: "The sweat lodge wasn't what I came for. It's what I still carry. I didn't know I was allowed to belong anywhere that old.",
  },
  {
    name: 'A.',
    date: '',
    attribution: 'Sound · breathwork · Extended stay',
    rating: 5,
    text: 'I was skeptical about the sound bath for exactly one session. Then my shoulders came down from my ears for the first time in a decade.',
  },
  {
    name: 'Rebecca H.',
    date: '',
    attribution: 'Family member · spouse of alumnus',
    rating: 5,
    text: 'The family program was the surprise. I came in to support my husband and ended up doing work of my own I had been putting off for a decade. We came home different, both of us.',
  },
  {
    name: 'Andrew S.',
    date: '',
    attribution: 'Alumnus · 18 months sober',
    rating: 5,
    text: 'The horses did what no therapist ever could. Standing next to a 1,200-pound animal that responded to my nervous system without a single word — that was the moment I knew my body was tracking something my mind had been denying for years.',
  },
  {
    name: 'Priya N.',
    date: '',
    attribution: 'Alumna · 2 years sober',
    rating: 5,
    text: "EMDR at Seven Arrows wasn't the sped-up version I'd tried before. The pacing was mine. The container held. I processed something I'd been circling for six years in three weeks.",
  },
  {
    name: 'Tom W.',
    date: '',
    attribution: 'Alumnus · one year sober',
    rating: 5,
    text: "The food, the land, the people — it all added up to a place that felt human, not institutional. Small details, but they changed the texture of every single day.",
  },
];
