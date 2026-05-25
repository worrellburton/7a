import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Nature Versus Nurture: Explaining the Link Between Epigenetics and Addiction | Seven Arrows Recovery",
  description: "Nature and nurture are often set as opposing forces. Does our innate nature or genes make us do what we do? Or are our actions determined by our environment and how we are nurtured?",
  keywords: "nature versus nurture explaining the link between epigenetics and addiction, nature versus nurture: explaining the link between epigenetics and addiction, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/nature-versus-nurture-explaining-the-link-between-epigenetics-and-addiction",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
