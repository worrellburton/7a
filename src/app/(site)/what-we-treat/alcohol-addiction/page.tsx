import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { alcoholContent } from '@/lib/substances/alcohol';

export const metadata: Metadata = {
  title: 'Alcohol Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential alcohol addiction treatment in Arizona. Medical detox coordination, trauma-informed therapy, and nervous-system work at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function AlcoholAddictionPage() {
  return <SubstancePage10Phase content={alcoholContent} />;
}
