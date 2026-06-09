import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Farm to Table to Healing a Conversation About Food and the Recovery Process with Chef Sandra Bradley | Seven Arrows Recovery",
  description: "The relationship between food and healing is a significant one. For those in substance abuse or addiction recovery, nutrition becomes all the more essential to this process of restoration. Recently, studies have shown the…",
  keywords: "farm to table to healing a conversation about food and the recovery process with chef sandra bradley, farm to table to healing a conversation about food and the recovery process with chef sandra bradley, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/farm-to-table-to-healing-a-conversation-about-food-and-the-recovery-process-with-chef-sandra-bradley",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
