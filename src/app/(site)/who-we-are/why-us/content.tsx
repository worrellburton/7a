'use client';

import PageHero from '@/components/PageHero';
import WhyStats from '@/components/why-us/WhyStats';
import SonoranSanctuary from '@/components/why-us/SonoranSanctuary';
import WhyDifference from '@/components/why-us/WhyDifference';
import VsTraditional from '@/components/why-us/VsTraditional';
import TeamTeaser from '@/components/why-us/TeamTeaser';
import WhyTestimonials from '@/components/why-us/WhyTestimonials';
import WhyAccreditation from '@/components/why-us/WhyAccreditation';
import WhyFAQ from '@/components/why-us/WhyFAQ';
import WhyCTA from '@/components/why-us/WhyCTA';

/**
 * /who-we-are/why-us — 10-phase redesign.
 *
 * Every inner page shares the video-backdrop PageHero. This page then
 * runs through nine additional sections that answer the three
 * questions a considering family or client asks next: "Is this place
 * serious? What makes it different? Can we trust it?"
 */
export default function PageContent() {
  return (
    <>
      {/* Phase 1 — shared video hero */}
      <PageHero
        label="Why Seven Arrows"
        title="Why Seven Arrows Recovery?"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Why Us' },
        ]}
        description="A boutique, trauma-informed residential program set on a 160-acre private ranch at the base of the Swisshelm Mountains. Multidisciplinary care — clinical, holistic, and Indigenous — delivered by people who know every client by name."
      />

      {/* Phase 2 — signature stats */}
      <WhyStats />

      {/* Phase 3 — Sonoran sanctuary narrative */}
      <SonoranSanctuary />

      {/* Phase 4 — The Seven Arrows Difference bento */}
      <WhyDifference />

      {/* Phase 5 — Seven Arrows vs traditional rehab */}
      <VsTraditional />

      {/* Phase 6 — Team teaser with rotating portraits */}
      <TeamTeaser />

      {/* Phase 7 — Alumni voices + Google rating */}
      <WhyTestimonials />

      {/* Phase 8 — Accreditation strip */}
      <WhyAccreditation />

      {/* Phase 9 — FAQ accordion */}
      <WhyFAQ />

      {/* Phase 10 — CTA + NAP + Map */}
      <WhyCTA />
    </>
  );
}
