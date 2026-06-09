import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Expect During Meth Withdrawal | Seven Arrows Recovery",
  description: "Methamphetamine addiction can take a devastating toll on your body, mind, and overall well-being. If you or your loved one is struggling with meth use, know that seeking help is the first courageous step toward reclaiming a…",
  keywords: "what to expect during meth withdrawal, what to expect during meth withdrawal, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-to-expect-during-meth-withdrawal",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
