// Shared 10-phase substance-page shell. Pages import this, hand in a
// SubstanceContent object, and get the full animated experience.
// Named `SubstancePage10Phase` to avoid colliding with the legacy
// `SubstancePage` template — once all addiction pages migrate, the
// legacy one can be retired.

import PageHero from '@/components/PageHero';
import SubstanceReward from './SubstanceReward';
import SubstanceCycle from './SubstanceCycle';
import SubstanceBody from './SubstanceBody';
import SubstanceWithdrawal from './SubstanceWithdrawal';
import SubstancePersonas from './SubstancePersonas';
import SubstanceApproach from './SubstanceApproach';
import SubstanceRewiring from './SubstanceRewiring';
import SubstanceCTA from './SubstanceCTA';
import type { SubstanceContent } from '@/lib/substances/types';

// Note: we deliberately do NOT render `SubstanceVoices` here. The
// voice content in each substance file is editorial / representative
// and would present as testimonial — we only show real reviews on the
// site (via the GoogleReviewsCinema homepage carousel). Keeping the
// field on the content shape so a future version can feed real,
// verified quotes in substance-specific slots when that pipeline
// exists.
export default function SubstancePage10Phase({ content }: { content: SubstanceContent }) {
  return (
    <main>
      <PageHero
        label={content.hero.label}
        title={content.hero.title}
        description={content.hero.description}
        breadcrumbs={content.hero.breadcrumbs}
      />
      <SubstanceReward content={content.reward} />
      <SubstanceCycle content={content.cycle} />
      <SubstanceBody content={content.body} />
      <SubstanceWithdrawal content={content.withdrawal} />
      <SubstancePersonas content={content.personas} />
      <SubstanceApproach content={content.approach} />
      <SubstanceRewiring content={content.rewiring} />
      <SubstanceCTA content={content.cta} />
    </main>
  );
}
