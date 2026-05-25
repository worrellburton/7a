import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { benzoContent } from '@/lib/substances/benzodiazepine';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Benzodiazepine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Medically supervised benzo tapering and residential treatment in Arizona — individualized long-arc tapers and 24/7 monitoring. Call (866) 718-1665.',
};

export default function BenzoAddictionPage() {
  return <SubstancePage10Phase content={benzoContent} />;
}
