import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to Safely Detox from Xanax | Seven Arrows Recovery",
  description: "Detoxing from Xanax can feel scary, but necessary at the same time. It’s an important step toward recovery, but many people worry about what will happen when they stop. Xanax, or alprazolam, is a benzodiazepine that’s often…",
  keywords: "how to safely detox from xanax, how to safely detox from xanax, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-to-safely-detox-from-xanax",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
