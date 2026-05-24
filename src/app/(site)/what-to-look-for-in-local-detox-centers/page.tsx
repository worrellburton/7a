import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Look for in Local Detox Centers | Seven Arrows Recovery",
  description: "Starting the recovery journey is a brave and life-changing decision, and choosing the right detox center is a crucial first step. At Seven Arrows Recovery, we understand the challenges of addiction and the importance of a safe,…",
  keywords: "what to look for in local detox centers, what to look for in local detox centers, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-to-look-for-in-local-detox-centers",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
