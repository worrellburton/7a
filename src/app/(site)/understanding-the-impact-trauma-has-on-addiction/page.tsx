import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Understanding the Impact Trauma Has on Addiction | Seven Arrows Recovery",
  description: "Addiction is powerful, and its impact can overwhelm an individual, altering their mental and physical health, relationships, and overall quality of life. Dependent behaviors, including substance use disorders, are complex and…",
  keywords: "understanding the impact trauma has on addiction, understanding the impact trauma has on addiction, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/understanding-the-impact-trauma-has-on-addiction",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
