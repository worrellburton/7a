import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Signs a Spouse is Using Drugs | Seven Arrows Recovery",
  description: "Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses. If you’ve noticed your partner acting differently and you’re starting to worry about signs a spouse…",
  keywords: "signs a spouse is using drugs, signs a spouse is using drugs, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/signs-a-spouse-is-using-drugs",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
