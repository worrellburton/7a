import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pets Role in Addiction Recovery Unconditional Support Love | Seven Arrows Recovery",
  description: "Beginning the journey to recovery from addiction is a monumental step, and you’re not alone in this. Those on the journey know that support is foundational to a successful recovery, and support is not limited to people alone.…",
  keywords: "pets role in addiction recovery unconditional support love, pets role in addiction recovery unconditional support love, addiction recovery, Seven Arrows Recovery, Arizona rehab",
  alternates: {
    canonical: "https://sevenarrowsrecoveryarizona.com/pets-role-in-addiction-recovery-unconditional-support-love",
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
