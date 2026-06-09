import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to Practice Self Care | Seven Arrows Recovery",
  description: "Self-care is an essential practice that promotes overall well-being, helps manage stress, and enhances our physical, emotional, and mental health. In today’s fast-paced and demanding world, taking time for self-care is more…",
  keywords: "how to practice self care, how to practice self care, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-to-practice-self-care",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
