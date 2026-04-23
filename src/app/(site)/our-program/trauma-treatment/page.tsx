import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TraumAddiction® Treatment | Forward-Facing Freedom® | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery',
};

import PageHero from '@/components/PageHero';
import ClinicalGap from '@/components/trauma/ClinicalGap';
import PostTraumaticAdaptation from '@/components/trauma/PostTraumaticAdaptation';
import SocDomains from '@/components/trauma/SocDomains';
import WisdomGallery from '@/components/trauma/WisdomGallery';
import ClinicalModalities from '@/components/trauma/ClinicalModalities';
import TreatmentTimeline from '@/components/trauma/TreatmentTimeline';
import PostTraumaticGrowth from '@/components/trauma/PostTraumaticGrowth';
import TraumaCTA from '@/components/trauma/TraumaCTA';

export default function TraumaTreatmentPage() {
  return (
    <main>
      {/* Phase 1 — shared video-backdrop hero for consistency with
          every other inner page. The Swisshelm mp4 loops under the
          scrim on first paint. */}
      <PageHero
        label="TraumAddiction® Treatment"
        title={[
          { text: 'Healing trauma at ' },
          { text: 'the root', accent: true },
          { text: ' of recovery.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Trauma Treatment' },
        ]}
        description="Addiction rarely exists in isolation. Our TraumAddiction® approach treats trauma and substance use as one integrated condition through the Forward-Facing Freedom® model — unlocking deeper and more lasting healing."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Clinical line · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'See the plan' },
        ]}
      />

      {/* Phase 2 — The Clinical Gap, animated SVG glyph section. */}
      <ClinicalGap />

      {/* Phase 3 — Post-Traumatic Adaptation: full-bleed photo +
          overlay card + ACE stats that count up on scroll-in. */}
      <PostTraumaticAdaptation />

      {/* Phase 4 — Forward-Facing Freedom three SOC domains with
          custom animated SVG diagrams per domain. */}
      <SocDomains />

      {/* Phase 5 — four full-bleed photos carrying overlaid wisdom
          quotes about trauma-informed recovery. */}
      <WisdomGallery />

      {/* Phase 6 — Clinical Modalities bento layout with photo anchor
          and flagship Forward-Facing Freedom® feature tile. */}
      <ClinicalModalities />

      {/* Phase 7 — Treatment timeline: week-by-week horizontal stepper
          with a progress rail that paints on scroll-in. */}
      <TreatmentTimeline />

      {/* Phase 8 — Post-Traumatic Growth: parallax photo + three
          counting-up outcome stats. */}
      <PostTraumaticGrowth />

      {/* Phase 9 — Alumni voices section removed under the
          real-reviews-only policy (was hardcoded fabricated quotes). */}

      {/* Phase 10 — WebGL aurora CTA with trust line. */}
      <TraumaCTA />
    </main>
  );
}
