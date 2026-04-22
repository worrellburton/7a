import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { methContent } from '@/lib/substances/methamphetamine';

export const metadata: Metadata = {
  title: 'Methamphetamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential methamphetamine addiction treatment in Arizona. Long-arc dopamine recovery, cardiac stabilization, trauma-informed therapy, and contingency management at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function MethAddictionPage() {
  return <SubstancePage10Phase content={methContent} />;
}
