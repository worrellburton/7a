import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { prescriptionContent } from '@/lib/substances/prescription';

export const metadata: Metadata = {
  title: 'Prescription Drug Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential prescription drug addiction treatment in Arizona. Comprehensive medication review, class-specific tapering, and direct treatment for the condition underneath every prescription. Call (866) 996-4308.',
};

export default function PrescriptionAddictionPage() {
  return <SubstancePage10Phase content={prescriptionContent} />;
}
