import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Benefits of Animal-Assisted Therapies in Addiction Treatment | Seven Arrows Recovery",
  description: "At Seven Arrows Recovery, we understand that the journey to recovery is deeply personal and challenging. Our mission is to support you every step of the way, offering a holistic blend of evidence-based and innovative therapies…",
  keywords: "benefits of animal assisted therapies, the benefits of animal-assisted therapies in addiction treatment, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/benefits-of-animal-assisted-therapies",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
