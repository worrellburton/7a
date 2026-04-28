import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Professional Interventions | Seven Arrows Recovery',
  description:
    'Compassionate professional interventions in Arizona — planned with your family, led by a trained specialist, with immediate admission to Seven Arrows.',
};

import PageHero from '@/components/PageHero';
import TheTippingPoint from '@/components/interventions/TheTippingPoint';
import WithoutGuidance from '@/components/interventions/WithoutGuidance';
import WhenToIntervene from '@/components/interventions/WhenToIntervene';
import TheProcess from '@/components/interventions/TheProcess';
import ModelsCompared from '@/components/interventions/ModelsCompared';
import DayOfIntervention from '@/components/interventions/DayOfIntervention';
import SuccessFactors from '@/components/interventions/SuccessFactors';
import AfterTheYes from '@/components/interventions/AfterTheYes';
import InterventionsCTA from '@/components/interventions/InterventionsCTA';

export default function InterventionsPage() {
  return (
    <main>
      {/* Phase 1 — shared video-backdrop hero. */}
      <PageHero
        label="Professional Interventions"
        title={[
          { text: "When the conversation " },
          { text: "can't wait", accent: true },
          { text: ' any longer.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Treatment', href: '/treatment' },
          { label: 'Interventions' },
        ]}
        description="A professional intervention is a carefully planned, compassionate interruption of a pattern that will not interrupt itself. We help families prepare, hold the room on the day, and move directly into treatment the moment your loved one says yes."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Intervention line · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Phase 2 — Tipping-point curve, animated SVG. */}
      <TheTippingPoint />

      {/* Phase 3 — Without guidance vs. with a specialist: two-panel
          contrasting SVG diagrams. */}
      <WithoutGuidance />

      {/* Phase 4 — Eight signals it's time to call. */}
      <WhenToIntervene />

      {/* Phase 5 — Five-step process with horizontal progress rail. */}
      <TheProcess />

      {/* Phase 6 — Four intervention models compared (Johnson, ARISE,
          Systemic, Seven Arrows Hybrid). */}
      <ModelsCompared />

      {/* Phase 7 — Day-of timeline with animated clock arc. */}
      <DayOfIntervention />

      {/* Phase 8 — Factors that predict a "yes" — animated bars. */}
      <SuccessFactors />

      {/* Phase 9 — What happens in the 72 hours after yes. */}
      <AfterTheYes />

      {/* Phase 9b (family voices) intentionally omitted — we only
          surface real, verified reviews on the site. */}

      {/* Phase 10 — Final CTA with aurora backdrop. */}
      <InterventionsCTA />
    </main>
  );
}
