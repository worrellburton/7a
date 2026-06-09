import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Exercise and Addiction Recovery 4 Ways to Rewire Your Brain | Seven Arrows Recovery",
  description: "Substance abuse and addiction wire your brain to prioritize substances above everything else. Your lifestyle bends to accommodate them, and your enjoyment of things you used to love slowly wanes. One of the ways that these…",
  keywords: "exercise and addiction recovery 4 ways to rewire your brain, exercise and addiction recovery 4 ways to rewire your brain, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/exercise-and-addiction-recovery-4-ways-to-rewire-your-brain",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
