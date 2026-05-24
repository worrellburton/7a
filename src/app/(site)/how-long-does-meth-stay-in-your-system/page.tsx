import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How Long Does Meth Stay in Your System? | Seven Arrows Recovery",
  description: "Methamphetamine, commonly referred to as meth or crystal meth, is a powerful and addictive stimulant that significantly impacts the central nervous system. The profound effects of this drug can lead to intense euphoria, but…",
  keywords: "how long does meth stay in your system, how long does meth stay in your system?, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-long-does-meth-stay-in-your-system",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
