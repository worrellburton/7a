import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { methContent } from '@/lib/substances/methamphetamine';

export const metadata: Metadata = {
  title: 'Methamphetamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential meth addiction treatment in Arizona — long-arc dopamine recovery, cardiac stabilization, and trauma-informed therapy. Call (866) 996-4308.',
};

export default function MethAddictionPage() {
  return <SubstancePage10Phase content={methContent} />;
}
