import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sober Summer Activities | Seven Arrows Recovery",
  description: "If you’re in recovery, the idea of warm weather, late nights, and seasonal events can feel complicated. But sober summer activities don’t have to be boring or isolating. Summer can become one of the most fulfilling times in your…",
  keywords: "sober summer activities, sober summer activities, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/sober-summer-activities",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
