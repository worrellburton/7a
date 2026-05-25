import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { methContent } from '@/lib/substances/methamphetamine';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Methamphetamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential meth addiction treatment in Arizona — long-arc dopamine recovery, cardiac stabilization, and trauma-informed therapy. Call (866) 718-1665.',
};

export default function MethAddictionPage() {
  return <SubstancePage10Phase content={methContent} />;
}
