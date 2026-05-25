import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { inhalantsContent } from '@/lib/substances/inhalants';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Inhalant Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential inhalant addiction treatment in Arizona — urgent medical and neurological assessment, cognitive rehab, and trauma-informed therapy.',
};

export default function InhalantsAddictionPage() {
  return <SubstancePage10Phase content={inhalantsContent} />;
}
