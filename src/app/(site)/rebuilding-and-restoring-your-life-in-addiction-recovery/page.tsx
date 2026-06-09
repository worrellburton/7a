import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rebuilding and Restoring Your Life in Addiction Recovery | Seven Arrows Recovery",
  description: "Recovery from substance abuse and addiction is a lifelong process and can come in many forms. But still many people continue to think that residential treatments and detox programs are the most important part of addiction…",
  keywords: "rebuilding and restoring your life in addiction recovery, rebuilding and restoring your life in addiction recovery, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/rebuilding-and-restoring-your-life-in-addiction-recovery",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
