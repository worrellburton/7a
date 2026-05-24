import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Benefits of Meditation for Addiction Recovery | Seven Arrows Recovery",
  description: "Meditation is a practice that dates back centuries, and its benefits for mental health are widely recognized. In today’s fast-paced and stressful world, finding ways to achieve a balanced mind and a healthy mental state is more…",
  keywords: "the benefits of meditation for addiction recovery, the benefits of meditation for addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/the-benefits-of-meditation-for-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
