import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Drug Rehabs with Horses | Seven Arrows Recovery",
  description: "Finding the right path to recovery is a deeply personal journey that touches every aspect of an individual’s life. At Seven Arrows Recovery, we believe this journey should be as unique as the person seeking help. While…",
  keywords: "drug rehabs with horses, drug rehabs with horses, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/drug-rehabs-with-horses",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
