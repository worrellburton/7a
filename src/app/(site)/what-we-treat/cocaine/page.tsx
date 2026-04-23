import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cocaine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential cocaine addiction treatment in Arizona. Trauma-informed care, cardiac-safe stabilization, contingency management, and nervous-system work at Seven Arrows Recovery. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import TheReward from '@/components/cocaine/TheReward';
import TheCycle from '@/components/cocaine/TheCycle';
import TheBody from '@/components/cocaine/TheBody';
import WithdrawalTimeline from '@/components/cocaine/WithdrawalTimeline';
import WhoWeSee from '@/components/cocaine/WhoWeSee';
import OurApproach from '@/components/cocaine/OurApproach';
import RewardRewiring from '@/components/cocaine/RewardRewiring';
import CocaineCTA from '@/components/cocaine/CocaineCTA';

export default function CocaineAddictionPage() {
  return (
    <main>
      {/* Phase 1 — video-backdrop hero */}
      <PageHero
        label="Cocaine Addiction Treatment"
        title={[
          { text: 'Cocaine rewires reward. We help you ' },
          { text: 'rebuild it', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: 'Cocaine Addiction' },
        ]}
        description="At Seven Arrows Recovery, cocaine use disorder is treated as a nervous-system and reward-circuit condition, not a willpower problem. Our residential program in Arizona sequences cardiac-safe stabilization, trauma-informed therapy, and body-based work so the brain's natural reward baseline can actually return."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Phase 2 — Dopamine curve (animated SVG) */}
      <TheReward />

      {/* Phase 3 — Four-stage cycle ring (animated orbit SVG) */}
      <TheCycle />

      {/* Phase 4 — Cardiac & neurological stats with pulsing heart SVG */}
      <TheBody />

      {/* Phase 5 — Four-phase withdrawal timeline with climbing curve */}
      <WithdrawalTimeline />

      {/* Phase 6 — Five realistic client archetypes */}
      <WhoWeSee />

      {/* Phase 7 — Clinical approach bento (flagship + 6 tiles) */}
      <OurApproach />

      {/* Phase 8 — Rebuilding reward: natural-reward climb curve */}
      <RewardRewiring />

      {/* Phase 9 (alumni voices) intentionally omitted — we only
          surface real, verified reviews on the site. Google reviews
          live on the homepage carousel. */}

      {/* Phase 10 — Final CTA with animated aurora backdrop */}
      <CocaineCTA />
    </main>
  );
}
