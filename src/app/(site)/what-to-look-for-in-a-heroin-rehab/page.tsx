import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Look for in a Heroin Rehab | Seven Arrows Recovery",
  description: "Heroin addiction is a devastating disease that affects individuals and families across the country. If you or someone you love is struggling, finding the right treatment center is critical. Knowing what to look for in a heroin…",
  keywords: "what to look for in a heroin rehab, what to look for in a heroin rehab, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-to-look-for-in-a-heroin-rehab",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
