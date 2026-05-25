import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Should I Travel for Addiction Treatment | Seven Arrows Recovery",
  description: "Deciding to seek help for addiction is a significant step toward recovery and healthier life choices. One crucial aspect of this journey is determining the best treatment facility and approach for your needs. Among the many…",
  keywords: "should i travel for addiction treatment, should i travel for addiction treatment, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/should-i-travel-for-addiction-treatment",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
