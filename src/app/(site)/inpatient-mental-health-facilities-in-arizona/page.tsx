import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Inpatient Mental Health Facilities in Arizona | Seven Arrows Recovery",
  description: "Understanding how to find the best inpatient mental health facilities in Arizona is crucial in your journey to healing and recovery. With various options available, each offering different approaches and services, it can be…",
  keywords: "inpatient mental health facilities in arizona, inpatient mental health facilities in arizona, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/inpatient-mental-health-facilities-in-arizona",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
