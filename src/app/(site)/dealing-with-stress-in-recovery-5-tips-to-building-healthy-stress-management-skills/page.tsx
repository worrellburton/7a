import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dealing with Stress in Recovery: 5 Tips to Building Healthy Stress-Management Skills | Seven Arrows Recovery",
  description: "Since stress is an inevitable part of life, learning stress-management is essential to living a healthy life. If you’re recovering from addiction or substance abuse, building a stress-management strategy can help you maintain…",
  keywords: "dealing with stress in recovery 5 tips to building healthy stress management skills, dealing with stress in recovery: 5 tips to building healthy stress-management skills, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
