import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Integration of Cultural and Holistic Healing in Recovery | Seven Arrows Recovery",
  description: "Native American healing traditions have played a significant role in addiction recovery for centuries. By incorporating cultural and spiritual practices into treatment programs, individuals can benefit from a holistic approach…",
  keywords: "the integration of cultural and holistic healing in recovery, the integration of cultural and holistic healing in recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/the-integration-of-cultural-and-holistic-healing-in-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
