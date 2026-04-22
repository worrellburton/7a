import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { opioidContent } from '@/lib/substances/opioid';

export const metadata: Metadata = {
  title: 'Opioid Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential opioid addiction treatment in Arizona. MAT coordination, medical detox, trauma-informed therapy, and naloxone-ready aftercare at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function OpioidAddictionPage() {
  return <SubstancePage10Phase content={opioidContent} />;
}
