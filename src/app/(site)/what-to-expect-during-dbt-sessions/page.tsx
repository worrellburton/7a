import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Expect During Dbt Sessions | Seven Arrows Recovery",
  description: "Finding the perfect therapy solution for your addiction recovery or mental health needs can seem daunting. At Seven Arrows Recovery, we pride ourselves on offering highly effective therapies grounded in scientific research. DBT,…",
  keywords: "what to expect during dbt sessions, what to expect during dbt sessions, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-to-expect-during-dbt-sessions",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
