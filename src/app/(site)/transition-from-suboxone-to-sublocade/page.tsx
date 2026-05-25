import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Transitioning from Suboxone to Sublocade | Seven Arrows Recovery',
  description:
    'A clinical, compassionate guide to switching from daily Suboxone to monthly Sublocade injections — what to expect, insurance coverage, and how Seven Arrows Recovery in Arizona supports you through every step.',
  keywords:
    'transition from Suboxone to Sublocade, Sublocade injection, buprenorphine extended release, Suboxone to Sublocade timeline, MAT for opioid use disorder, monthly buprenorphine injection, opioid addiction treatment Arizona',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/transition-from-suboxone-to-sublocade',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
