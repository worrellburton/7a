import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Look for Local Detox Center | Seven Arrows Recovery",
  description: "When beginning the journey to recovery, knowing what to look for in a local detox center or rehab is one of the most important decisions you can make. Detox is the first and often most challenging phase of overcoming addiction.…",
  keywords: "what to look for local detox center, what to look for local detox center, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-to-look-for-local-detox-center",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
