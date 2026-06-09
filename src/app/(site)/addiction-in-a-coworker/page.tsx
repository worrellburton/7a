import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Addiction in a Coworker | Seven Arrows Recovery",
  description: "Navigating workplace relationships can be challenging under any circumstances, but when you suspect that a coworker might be struggling with drug addiction, it can feel overwhelming and deeply worrisome. Addiction in a coworker…",
  keywords: "addiction in a coworker, addiction in a coworker, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/addiction-in-a-coworker",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
