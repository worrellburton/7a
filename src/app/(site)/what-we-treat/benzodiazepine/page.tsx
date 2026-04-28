import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { benzoContent } from '@/lib/substances/benzodiazepine';

export const metadata: Metadata = {
  title: 'Benzodiazepine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Medically supervised benzo tapering and residential treatment in Arizona — individualized long-arc tapers and 24/7 monitoring. Call (866) 996-4308.',
};

export default function BenzoAddictionPage() {
  return <SubstancePage10Phase content={benzoContent} />;
}
