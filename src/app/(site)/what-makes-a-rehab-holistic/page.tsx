import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What Makes a Rehab Holistic | Seven Arrows Recovery",
  description: "Holistic rehab centers take a comprehensive approach to addiction treatment, addressing not only the physical aspects of addiction but also the emotional, mental, and spiritual components. These centers recognize that addiction…",
  keywords: "what makes a rehab holistic, what makes a rehab holistic, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-makes-a-rehab-holistic",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
