import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Our Clinical Approach | Seven Arrows Recovery',
  description:
    "Relational-first clinical care grounded in the Salutogenic Treatment Structure conceptualized by Dr. Robert Rhoton and Dr. J. Eric Gentry — delivered through a polyvagal-informed lens at Seven Arrows.",
};

import PageHero from '@/components/PageHero';
import FrameworkIntro from '@/components/evidence-based/FrameworkIntro';
import RelationalInsight from '@/components/evidence-based/RelationalInsight';
import RegulatedPresence from '@/components/evidence-based/RegulatedPresence';
import PhaseFramework from '@/components/evidence-based/PhaseFramework';
import SelfCompassion from '@/components/evidence-based/SelfCompassion';
import Modalities from '@/components/evidence-based/Modalities';
import PolyvagalLens from '@/components/evidence-based/PolyvagalLens';
import ScienceAndWisdom from '@/components/evidence-based/ScienceAndWisdom';
import EvidenceCTA from '@/components/evidence-based/EvidenceCTA';

export default function EvidenceBasedPage() {
  return (
    <main>
      {/* Phase 1 — cinematic hero */}
      <PageHero
        label="Our clinical approach"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our program', href: '/our-program' },
          { label: 'Evidence-based' },
        ]}
        title={[
          'Our clinical approach is ',
          { text: 'relational', accent: true },
          ' first.',
        ]}
        description="Grounded in the Salutogenic Treatment Structure conceptualized by Dr. Robert Rhoton and Dr. J. Eric Gentry, delivered through a polyvagal-informed lens. Healing occurs through relationship and regulated presence, not through force or focus on pathology."
      />

      {/* Phase 2 — Rhoton/Gentry framework intro + shift glyph */}
      <FrameworkIntro />

      {/* Phase 3 — relational primacy pull-quote + interwoven arcs */}
      <RelationalInsight />

      {/* Phase 4 — regulated clinician presence + waveform chart */}
      <RegulatedPresence />

      {/* Phase 5 — the four-phase healing framework */}
      <PhaseFramework />

      {/* Phase 6 — self-compassion core commitment */}
      <SelfCompassion />

      {/* Phase 7 — clinical modalities bento */}
      <Modalities />

      {/* Phase 8 — polyvagal-informed lens ladder diagram */}
      <PolyvagalLens />

      {/* Phase 9 — where science meets ancient wisdom */}
      <ScienceAndWisdom />

      {/* Phase 10 — closing CTA */}
      <EvidenceCTA />
    </main>
  );
}
