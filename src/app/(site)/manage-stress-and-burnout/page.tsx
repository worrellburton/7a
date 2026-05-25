import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to Best Manage Stress and Burnout | Seven Arrows Recovery",
  description: "In the modern, fast-paced world, stress and burnout have become common challenges, especially for those facing drug addiction. Our holistic drug rehab center acknowledges the importance of addressing stress and burnout as part of…",
  keywords: "manage stress and burnout, how to best manage stress and burnout, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/manage-stress-and-burnout",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
