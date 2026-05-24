import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "A Simple Guide to 12-Step Meetings | Seven Arrows Recovery",
  description: "The journey to recovery is deeply personal, filled with unique challenges and moments of profound growth. At Seven Arrows Recovery, we understand that each person’s path is different, and supporting these individual journeys is…",
  keywords: "guide to 12 step meetings, a simple guide to 12-step meetings, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/guide-to-12-step-meetings",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
