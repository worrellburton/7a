import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Holistic & Indigenous Practice | Seven Arrows Recovery',
  description:
    'Yoga, breathwork, sound, art, music, sweat lodge, talking circle, and land-based ceremony — held by credentialed practitioners alongside our clinical program. Where modern practice meets ancient wisdom.',
};

import PageHero from '@/components/PageHero';
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
      <PageHero
        label="Ancient wisdom · modern practice"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our program', href: '/our-program' },
          { label: 'Holistic & Indigenous' },
        ]}
        title={[
          'Where modern practice meets ',
          { text: 'ancient wisdom', accent: true },
          '.',
        ]}
        description="Yoga, breathwork, sound, movement, sweat lodge, talking circle. Body-based and land-based practices held alongside our clinical program — because the nervous system heals in the places words cannot reach."
      />
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
