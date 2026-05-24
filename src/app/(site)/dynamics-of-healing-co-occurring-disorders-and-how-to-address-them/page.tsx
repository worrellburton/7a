import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dynamics of Healing Co Occurring Disorders and How to Address Them | Seven Arrows Recovery",
  description: "Did you know that the brain is one of the most complex parts of the human body? It regulates and cooperates with multiple systems, and keeps everything in balance with one another.",
  keywords: "dynamics of healing co occurring disorders and how to address them, dynamics of healing co occurring disorders and how to address them, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/dynamics-of-healing-co-occurring-disorders-and-how-to-address-them",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
