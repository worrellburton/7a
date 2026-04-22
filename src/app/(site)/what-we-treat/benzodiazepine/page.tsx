import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { benzoContent } from '@/lib/substances/benzodiazepine';

export const metadata: Metadata = {
  title: 'Benzodiazepine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Safe, medically supervised benzodiazepine tapering and residential treatment in Arizona. Individualized long-arc tapers, 24/7 monitoring, nervous-system work. Call (866) 996-4308.',
};

export default function BenzoAddictionPage() {
  return <SubstancePage10Phase content={benzoContent} />;
}
