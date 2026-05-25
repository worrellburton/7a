import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Power of Nutrition in Early Recovery | Seven Arrows Recovery",
  description: "At Seven Arrows Recovery Center in Arizona, embracing nutrition in recovery is a foundational step toward holistic healing for those dealing with substance abuse. Integrating functional medicine and meal planning, this innovative…",
  keywords: "the power of nutrition in early recovery, the power of nutrition in early recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/the-power-of-nutrition-in-early-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
