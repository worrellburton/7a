import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Holistic & Indigenous Practice | Seven Arrows Recovery',
  description:
    'Yoga, breathwork, sound, art, music, sweat lodge, talking circle, and land-based ceremony — held by credentialed practitioners alongside our clinical program. Where modern practice meets ancient wisdom.',
};

import HolisticHero from '@/components/holistic/HolisticHero';
import WhyHolistic from '@/components/holistic/WhyHolistic';
import FourDimensions from '@/components/holistic/FourDimensions';
import ModalitiesBento from '@/components/holistic/ModalitiesBento';
import IndigenousFeature from '@/components/holistic/IndigenousFeature';
import DayOfPractice from '@/components/holistic/DayOfPractice';
import EvidenceStats from '@/components/holistic/EvidenceStats';
import Practitioners from '@/components/holistic/Practitioners';
import AlumniVoices from '@/components/holistic/AlumniVoices';
import HolisticCTA from '@/components/holistic/HolisticCTA';

export default function HolisticApproachesPage() {
  return (
    <main>
      <HolisticHero />
      <WhyHolistic />
      <FourDimensions />
      <div id="practices" className="scroll-mt-20" />
      <ModalitiesBento />
      <IndigenousFeature />
      <DayOfPractice />
      <EvidenceStats />
      <Practitioners />
      <AlumniVoices />
      <HolisticCTA />
    </main>
  );
}
