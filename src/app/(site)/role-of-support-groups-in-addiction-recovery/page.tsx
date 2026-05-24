import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Role of Support Groups in Addiction Recovery | Seven Arrows Recovery",
  description: "Addiction recovery can be filled with many ups and downs. This is because becoming sober is just the beginning of your sobriety journey. While you’ll be leading a healthier, happier life, throughout your recovery journey you’ll…",
  keywords: "role of support groups in addiction recovery, the role of support groups in addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/role-of-support-groups-in-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
