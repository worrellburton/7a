import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Unlocking Healing: Understanding Trauma-Informed Yoga for Addiction Recovery | Seven Arrows Recovery",
  description: "In the journey toward addiction recovery, healing takes many forms. While traditional therapies and support groups play vital roles, complementary practices such as yoga are gaining recognition for their profound impact on the…",
  keywords: "unlocking healing understanding trauma informed yoga for addiction recovery, unlocking healing: understanding trauma-informed yoga for addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/unlocking-healing-understanding-trauma-informed-yoga-for-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
