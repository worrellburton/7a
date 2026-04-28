import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { heroinContent } from '@/lib/substances/heroin';

export const metadata: Metadata = {
  title: 'Heroin Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential heroin addiction treatment in Arizona — medical detox, MAT coordination, fentanyl-era naloxone readiness, and trauma-informed therapy.',
};

export default function HeroinAddictionPage() {
  return <SubstancePage10Phase content={heroinContent} />;
}
