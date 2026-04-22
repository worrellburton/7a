// Editorial fallback voices used by <LiveReviewsBand /> on the tour
// page. Rendered when the Google Places API is unavailable (missing
// env key, network error, or not enough substantive reviews yet).
//
// This file previously exported a legacy client component; the tour
// page now renders <LiveReviewsBand> directly with these as the
// fallback. Importing as a pure data module keeps it server-safe.

import type { VoiceEntry } from '@/components/LiveReviewsBandClient';

export const tourVoicesFallback: VoiceEntry[] = [
  {
    quote:
      'The first night I looked up and saw the Milky Way, I cried. I hadn’t seen a sky like that since I was a child. That sky started the work for me.',
    name: 'James R.',
    tag: 'Alumnus · 18 months sober',
    photo: '/images/sign-night-sky-milky-way.jpg',
  },
  {
    quote:
      'Being out of my city, away from the bars and the friends and the habit — I didn’t realize until I got here how much the land was doing for me just by being far.',
    name: 'Michael T.',
    tag: 'Alumnus · 2 years sober',
    photo: '/images/facility-exterior-mountains.jpg',
  },
  {
    quote:
      'My horse recognized me before my therapist did. That sounds funny but it’s true. He knew when I was lying about how I was.',
    name: 'Rachel M.',
    tag: 'Alumna · equine program',
    photo: '/images/equine-therapy-portrait.jpg',
  },
  {
    quote:
      'We finally have our son back. The ranch gave him space to stop running. We visit every year now, just to sit on that porch again.',
    name: 'Sarah K.',
    tag: 'Family member',
    photo: '/images/covered-porch-desert-view.jpg',
  },
];
