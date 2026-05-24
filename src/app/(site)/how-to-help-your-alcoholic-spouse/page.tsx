import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to Help Your Alcoholic Spouse | Seven Arrows Recovery",
  description: "Alcohol abuse is a pervasive issue that affects millions of individuals and their families worldwide. When someone you love is struggling with alcohol use disorder (AUD), the impact reverberates throughout the household, causing…",
  keywords: "how to help your alcoholic spouse, how to help your alcoholic spouse, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-to-help-your-alcoholic-spouse",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
