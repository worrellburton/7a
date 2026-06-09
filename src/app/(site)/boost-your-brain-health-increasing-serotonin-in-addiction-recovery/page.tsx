import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Boost Your Brain Health Increasing Serotonin in Addiction Recovery | Seven Arrows Recovery",
  description: "Serotonin, a crucial neurotransmitter, plays a key role in regulating mood, sleep, and appetite. Its deficiencies often lead to conditions such as depression and anxiety. Understanding ways to increase serotonin without drugs can…",
  keywords: "boost your brain health increasing serotonin in addiction recovery, boost your brain health increasing serotonin in addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/boost-your-brain-health-increasing-serotonin-in-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
