import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TraumAddiction® Treatment | Forward-Facing Freedom® | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery',
};

import TraumaHero from '@/components/trauma/TraumaHero';
import ClinicalGap from '@/components/trauma/ClinicalGap';
import PostTraumaticAdaptation from '@/components/trauma/PostTraumaticAdaptation';
import SocDomains from '@/components/trauma/SocDomains';
import WisdomGallery from '@/components/trauma/WisdomGallery';
import ClinicalModalities from '@/components/trauma/ClinicalModalities';
import TreatmentTimeline from '@/components/trauma/TreatmentTimeline';
import PostTraumaticGrowth from '@/components/trauma/PostTraumaticGrowth';
import AlumniVoices from '@/components/trauma/AlumniVoices';
import TraumaCTA from '@/components/trauma/TraumaCTA';

export default function TraumaTreatmentPage() {
  return (
    <main>
      {/* Phase 1 — cinematic WebGL-aurora hero. */}
      <TraumaHero />

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

      {/* Phase 9 — Alumni voices: portrait tiles with overlay quotes
          + slow Ken-Burns zoom. */}
      <AlumniVoices />

      {/* Phase 10 — WebGL aurora CTA with trust line. */}
      <TraumaCTA />
    </main>
  );
}
