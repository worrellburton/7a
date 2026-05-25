import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sound Therapy and Addiction Treatment: How It Aids the Recovery Process | Seven Arrows Recovery",
  description: "Embarking on the path to addiction recovery is a courageous journey that requires a holistic approach to healing. At Seven Arrows Recovery, we integrate both traditional therapies and innovative practices like sound therapy and…",
  keywords: "sound therapy and addiction treatment, sound therapy and addiction treatment: how it aids the recovery process, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/sound-therapy-and-addiction-treatment",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
