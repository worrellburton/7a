import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { prescriptionContent } from '@/lib/substances/prescription';

export const metadata: Metadata = {
  title: 'Prescription Drug Addiction Treatment | Seven Arrows',
  description:
    "Residential prescription drug addiction treatment in Arizona — medication review, class-specific tapering, and direct treatment for what's underneath.",
};

export default function PrescriptionAddictionPage() {
  return <SubstancePage10Phase content={prescriptionContent} />;
}
