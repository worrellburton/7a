import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to Go to Rehab Without Loosing Your Job | Seven Arrows Recovery",
  description: "Going to rehab can be a life-changing decision, but for many individuals, the fear of losing their job can prevent them from seeking the help they need. However, thanks to the Family and Medical Leave Act (FMLA), employees have…",
  keywords: "how to go to rehab without loosing your job, how to go to rehab without loosing your job, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-to-go-to-rehab-without-loosing-your-job",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
