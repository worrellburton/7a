import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dual Diagnosis Treatment | Seven Arrows Recovery',
  description:
    'Integrated dual diagnosis treatment for co-occurring mental health and substance use disorders at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import DestructiveCycle from '@/components/dual-diagnosis/DestructiveCycle';
import PrevalenceStats from '@/components/dual-diagnosis/PrevalenceStats';
import ConditionsBento from '@/components/dual-diagnosis/ConditionsBento';
import ParallelVsIntegrated from '@/components/dual-diagnosis/ParallelVsIntegrated';
import IntegratedApproach from '@/components/dual-diagnosis/IntegratedApproach';
import MedTherapySynergy from '@/components/dual-diagnosis/MedTherapySynergy';
import TraumaLayer from '@/components/dual-diagnosis/TraumaLayer';
import DualVoices from '@/components/dual-diagnosis/DualVoices';
import DualCTA from '@/components/dual-diagnosis/DualCTA';

export default function DualDiagnosisPage() {
  return (
    <>
      {/* Phase 1 — shared video hero */}
      <PageHero
        label="What We Treat"
        title={[
          { text: 'Two conditions. ' },
          { text: 'One integrated plan', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: 'Dual-Diagnosis' },
        ]}
        description="When a mental-health condition and a substance use disorder show up together, only integrated care resolves them. Our dual-diagnosis program treats both under one clinical team, one treatment plan, one roof."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Phase 2 — destructive cycle diagram */}
      <DestructiveCycle />

      {/* Phase 3 — prevalence count-ups */}
      <PrevalenceStats />

      {/* Phase 4 — common co-occurring conditions bento */}
      <ConditionsBento />

      {/* Phase 5 — parallel vs integrated comparison */}
      <ParallelVsIntegrated />

      {/* Phase 6 — our integrated approach (6-component bento) */}
      <IntegratedApproach />

      {/* Phase 7 — medication + therapy coordination */}
      <MedTherapySynergy />

      {/* Phase 8 — trauma-informed layer */}
      <TraumaLayer />

      {/* Phase 9 — dual-diagnosis alumni voices */}
      <DualVoices />

      {/* Phase 10 — closing CTA */}
      <DualCTA />
    </>
  );
}
