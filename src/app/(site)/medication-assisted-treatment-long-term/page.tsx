import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Medication Assisted Treatment Long Term | Seven Arrows Recovery",
  description: "In the battle against addiction, one of the most effective and research-backed approaches is medication-assisted treatment, also known as MAT. By combining FDA-approved medications with counseling and behavioral therapies, MAT…",
  keywords: "medication assisted treatment long term, medication assisted treatment long term, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/medication-assisted-treatment-long-term",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
