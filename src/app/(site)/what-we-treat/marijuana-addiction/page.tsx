import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { marijuanaContent } from '@/lib/substances/marijuana';

export const metadata: Metadata = {
  title: 'Marijuana Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential cannabis use disorder treatment in Arizona. Sleep rebuilding, anxiety-direct CBT, and trauma-informed therapy at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function MarijuanaAddictionPage() {
  return <SubstancePage10Phase content={marijuanaContent} />;
}
