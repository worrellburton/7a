import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TraumAddiction® Treatment | Seven Arrows Recovery',
  description:
    'Forward-Facing Freedom® and TraumAddiction® treatment in Arizona — trauma-informed residential care that addresses addiction at its root. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import GeoAnswer from '@/components/seo/GeoAnswer';
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

      <GeoAnswer
        id="trauma-informed-rehab-in-arizona"
        question="Trauma-informed rehab in Arizona"
        answer={
          <p>
            Seven Arrows Recovery is a trauma-informed residential drug and alcohol rehab in
            Arizona, set on a 160-acre ranch in Cochise County. Clinicians treat trauma and
            addiction concurrently through the TraumAddiction&reg; model and the
            Forward-Facing Freedom&reg; framework, drawing on polyvagal theory, somatic
            experiencing, and the ACE literature — and sequencing nervous-system regulation
            before memory work so early-recovery clients are not destabilized.
          </p>
        }
        bullets={[
          { label: 'Stabilize, then process', body: 'Nervous-system capacity is built first; deeper trauma work follows once regulation is reliable.' },
          { label: 'Concurrent care', body: 'Trauma and substance use treated as one integrated condition — not two sequenced programs.' },
          { label: 'Somatic + relational', body: 'Body-based interventions, equine-assisted psychotherapy, and attachment-informed groupwork.' },
          { label: 'Evidence chain', body: 'Informed by the ACE study, polyvagal theory, IFS, and somatic experiencing — named frameworks, not slogans.' },
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
