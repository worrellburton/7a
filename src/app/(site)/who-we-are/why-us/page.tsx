import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Why Choose Our Arizona Rehab Center? | Seven Arrows Recovery',
  description:
    'Why Seven Arrows Recovery — holistic healing, equine therapy, and expert addiction care on 160 private acres in Cochise County, Arizona.',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
