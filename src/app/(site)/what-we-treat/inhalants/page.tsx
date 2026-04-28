import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { inhalantsContent } from '@/lib/substances/inhalants';

export const metadata: Metadata = {
  title: 'Inhalant Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential inhalant addiction treatment in Arizona — urgent medical and neurological assessment, cognitive rehab, and trauma-informed therapy.',
};

export default function InhalantsAddictionPage() {
  return <SubstancePage10Phase content={inhalantsContent} />;
}
