import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { prescriptionContent } from '@/lib/substances/prescription';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Prescription Drug Addiction Treatment | Seven Arrows',
  description:
    "Residential prescription drug addiction treatment in Arizona — medication review, class-specific tapering, and direct treatment for what's underneath.",
};

export default function PrescriptionAddictionPage() {
  return <SubstancePage10Phase content={prescriptionContent} />;
}
