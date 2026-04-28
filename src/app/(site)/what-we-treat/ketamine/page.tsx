import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { ketamineContent } from '@/lib/substances/ketamine';

export const metadata: Metadata = {
  title: 'Ketamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential ketamine use disorder treatment in Arizona — urological assessment, cognitive rehabilitation, and dissociation-aware trauma work.',
};

export default function KetamineAddictionPage() {
  return <SubstancePage10Phase content={ketamineContent} />;
}
