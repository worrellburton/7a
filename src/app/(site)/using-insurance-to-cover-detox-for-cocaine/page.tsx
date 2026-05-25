import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Using Insurance to Cover Detox for Cocaine Addiction | Seven Arrows Recovery",
  description: "Cocaine addiction can impact every facet of a person’s life—relationships, career, physical health, and emotional well-being. If you or someone you love is struggling with cocaine addiction, the decision to seek help is a…",
  keywords: "using insurance to cover detox for cocaine, using insurance to cover detox for cocaine addiction, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/using-insurance-to-cover-detox-for-cocaine",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
