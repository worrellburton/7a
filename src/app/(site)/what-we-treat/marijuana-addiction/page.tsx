import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { marijuanaContent } from '@/lib/substances/marijuana';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Marijuana Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential cannabis use disorder treatment in Arizona — sleep rebuilding, anxiety-direct CBT, and trauma-informed therapy. Call (866) 718-1665.',
};

export default function MarijuanaAddictionPage() {
  return <SubstancePage10Phase content={marijuanaContent} />;
}
