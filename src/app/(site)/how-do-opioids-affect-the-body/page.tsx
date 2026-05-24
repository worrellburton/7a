import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How Do Opioids Affect the Body? | Seven Arrows Recovery",
  description: "Opioids are a class of drugs that include prescription painkillers like oxycodone and hydrocodone and illicit substances such as heroin. While opioids can be effective in managing pain, they also carry a high risk of addiction…",
  keywords: "how do opioids affect the body, how do opioids affect the body?, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/how-do-opioids-affect-the-body",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
