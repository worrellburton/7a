import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Symptoms of Fentanyl Addiction | Seven Arrows Recovery",
  description: "In recent years, the opioid crisis in the United States has escalated at an alarming rate, with fentanyl at its core. Fentanyl, a synthetic opioid, is up to 100 times more potent than morphine and about 50 times stronger than…",
  keywords: "symptoms of fentanyl addiction, symptoms of fentanyl addiction, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/symptoms-of-fentanyl-addiction",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
