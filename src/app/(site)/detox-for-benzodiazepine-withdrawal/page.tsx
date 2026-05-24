import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Should I Go to Detox for Benzodiazepine Withdrawals? | Seven Arrows Recovery",
  description: "Benzodiazepines, often referred to as “benzos,” are a class of medications primarily prescribed to treat conditions such as anxiety, insomnia, and seizures. These drugs include well-known names like Xanax, Valium, Ativan, and…",
  keywords: "detox for benzodiazepine withdrawal, should i go to detox for benzodiazepine withdrawals?, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/detox-for-benzodiazepine-withdrawal",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
