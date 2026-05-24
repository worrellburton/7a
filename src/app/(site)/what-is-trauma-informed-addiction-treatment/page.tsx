import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What is Trauma Informed Addiction Treatment | Seven Arrows Recovery",
  description: "Addiction is a deeply complex and multifaceted challenge, and it is often intertwined with a history of trauma. In the contemporary landscape of addiction treatment, a new approach has emerged, gaining recognition for its…",
  keywords: "what is trauma informed addiction treatment, what is trauma informed addiction treatment, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/what-is-trauma-informed-addiction-treatment",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
