import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Residential Inpatient Treatment | Seven Arrows Recovery',
  description:
    'Our 30-to-90-day residential inpatient program offers 24/7 support, a 6:1 client-to-staff ratio, and a structured daily schedule in a small group setting at Seven Arrows Recovery.',
};

import PageHero from '@/components/PageHero';
import ResidentialStats from '@/components/residential/ResidentialStats';
import ProgramOverview from '@/components/residential/ProgramOverview';
import DayAtRanch from '@/components/landing/DayAtRanch';
import LivingEnvironment from '@/components/residential/LivingEnvironment';
import WhatsIncluded from '@/components/residential/WhatsIncluded';
import RoundTheClockCare from '@/components/residential/RoundTheClockCare';
import ResidentialVoices from '@/components/residential/ResidentialVoices';
import ResidentialFAQ from '@/components/residential/ResidentialFAQ';
import ResidentialCTA from '@/components/residential/ResidentialCTA';

export default function ResidentialInpatientPage() {
  return (
    <>
      {/* Phase 1 — shared video hero */}
      <PageHero
        label="Our Program"
        title="Residential inpatient, paced to the nervous system."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Residential Inpatient' },
        ]}
        description="Immerse yourself in recovery with our 30-to-90-day residential inpatient program — round-the-clock clinical support in a safe, structured environment at the base of the Swisshelm Mountains."
      />

      {/* Phase 2 — by-the-numbers stats */}
      <ResidentialStats />

      {/* Phase 3 — program overview + highlights + feature photo */}
      <ProgramOverview />

      {/* Phase 4 — day-at-the-ranch scroll-coupled timeline (replaces
          the older DailyRhythm section — same concept, much richer
          execution: sticky image well cross-fades to the active hour
          as the visitor scrolls through the beats). */}
      <DayAtRanch />

      {/* Phase 5 — living environment gallery */}
      <LivingEnvironment />

      {/* Phase 6 — What's Included icon grid */}
      <WhatsIncluded />

      {/* Phase 7 — 24/7 clinical oversight reassurance */}
      <RoundTheClockCare />

      {/* Phase 8 — alumni voices */}
      <ResidentialVoices />

      {/* Phase 9 — FAQ accordion */}
      <ResidentialFAQ />

      {/* Phase 10 — closing CTA */}
      <ResidentialCTA />
    </>
  );
}
