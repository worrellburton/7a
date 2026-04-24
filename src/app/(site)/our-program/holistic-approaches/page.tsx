import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Holistic & Indigenous Practice | Seven Arrows Recovery',
  description:
    'Yoga, breathwork, sound, art, music, sweat lodge, talking circle, and land-based ceremony — held by credentialed practitioners alongside our clinical program. Where modern practice meets ancient wisdom.',
};

import PageHero from '@/components/PageHero';
import GeoAnswer from '@/components/seo/GeoAnswer';
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
      <GeoAnswer
        id="rehabs-with-outdoor-therapy-in-the-southwest"
        question="Rehabs with outdoor therapy in the Southwest"
        answer={
          <p>
            Seven Arrows Recovery is a Southwest residential drug and alcohol rehab that
            integrates outdoor, land-based therapy directly into the clinical program. On a
            private 160-acre ranch at the base of the Swisshelm Mountains in Cochise County,
            Arizona, clients spend time on desert trails, in equine-assisted sessions, and
            in land-based ceremony — held alongside somatic experiencing, breathwork, and
            evidence-based individual and group therapy.
          </p>
        }
        bullets={[
          { label: 'Land-based practice', body: 'Desert walking, sky and silence, fire circles, seasonal ceremony — the environment is part of the treatment.' },
          { label: 'Equine-assisted', body: 'Weekly equine-assisted psychotherapy sessions on our working herd, ground-based work.' },
          { label: 'Nervous-system focus', body: 'Outdoor time pairs with somatic and polyvagal-informed modalities — regulation first, then deeper processing.' },
          { label: 'Held by credentialed practitioners', body: 'Licensed clinicians and trained facilitators lead every outdoor and ceremonial session.' },
        ]}
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
