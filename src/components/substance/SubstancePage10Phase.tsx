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
import SubstanceVoices from './SubstanceVoices';
import SubstanceCTA from './SubstanceCTA';
import type { SubstanceContent } from '@/lib/substances/types';

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
      <SubstanceVoices content={content.voices} />
      <SubstanceCTA content={content.cta} />
    </main>
  );
}
