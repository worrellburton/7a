import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Philosophy | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery\'s philosophy: a salutogenic, trauma-informed approach rooted in the TraumAddiction® model and Forward-Facing Freedom® framework.',
};

import PageHero from '@/components/PageHero';
import PathologyToSalutogenesis from '@/components/philosophy/PathologyToSalutogenesis';
import TraumAddictionReframe from '@/components/philosophy/TraumAddictionReframe';
import ACEChart from '@/components/philosophy/ACEChart';
import SenseOfCoherence from '@/components/philosophy/SenseOfCoherence';
import ForwardFacingFreedom from '@/components/philosophy/ForwardFacingFreedom';
import MindBodySpirit from '@/components/philosophy/MindBodySpirit';
import SevenArrows from '@/components/philosophy/SevenArrows';
import NervousSystemGrounding from '@/components/philosophy/NervousSystemGrounding';
import PhilosophyCTA from '@/components/philosophy/PhilosophyCTA';

export default function OurPhilosophyPage() {
  return (
    <>
      {/* Phase 1 — shared video hero */}
      <PageHero
        label="Our Philosophy"
        title="Lasting recovery through health creation."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Our Philosophy' },
        ]}
        description="Our philosophy is rooted in the science of health creation — addressing mind, body, and spirit through the TraumAddiction® model and Forward-Facing Freedom® framework."
      />

      {/* Phase 2 — pathology → salutogenesis reframe */}
      <PathologyToSalutogenesis />

      {/* Phase 3 — TraumAddiction® reframe (addiction as adaptation) */}
      <TraumAddictionReframe />

      {/* Phase 4 — ACE study chart */}
      <ACEChart />

      {/* Phase 5 — Sense of Coherence triple Venn */}
      <SenseOfCoherence />

      {/* Phase 6 — Forward-Facing Freedom® three-phase path */}
      <ForwardFacingFreedom />

      {/* Phase 7 — Mind · Body · Spirit photo tiles */}
      <MindBodySpirit />

      {/* Phase 8 — The Seven Arrows (seven guiding principles) */}
      <SevenArrows />

      {/* Phase 9 — Nervous system grounding editorial beat */}
      <NervousSystemGrounding />

      {/* Phase 10 — Closing CTA */}
      <PhilosophyCTA />
    </>
  );
}
