import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How Can Equine Therapy Benefit Addiction Recovery? | Seven Arrows Recovery",
  description: "Addiction is an ongoing issue affecting millions of people worldwide. Whether it’s substances like drugs and alcohol or behaviors such as gambling, addiction disrupts lives, fractures families, and depletes communities.…",
  keywords: "how can equine therapy benefit addiction recovery, how can equine therapy benefit addiction recovery?, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-can-equine-therapy-benefit-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
