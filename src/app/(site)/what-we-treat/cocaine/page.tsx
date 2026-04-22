import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Cocaine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential cocaine addiction treatment in Arizona. Evidence-based therapies, trauma-informed care, and holistic recovery at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function CocaineAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Cocaine Addiction Treatment"
      heroDescription="Cocaine rewires the brain's reward circuitry in ways that make sustained sobriety feel unreachable without structured support. At Seven Arrows Recovery, our trauma-informed residential program treats the stimulant use and the underlying dysregulation that drives it."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'How cocaine hijacks the reward system.',
        paragraphs: [
          'Cocaine floods the brain with dopamine and blocks its reuptake, producing an intense but short-lived euphoria. Repeated use alters the dopamine system itself, leaving users with persistent anhedonia, cravings, and compulsive redosing behavior.',
          'Chronic cocaine use is associated with cardiac complications, stroke risk, severe anxiety and depression, paranoia, and cognitive impairment. The pattern of binge use followed by crashing is particularly punishing to the nervous system.',
          'Cocaine dependence is rarely about the drug in isolation — it is almost always a response to underlying trauma, anxiety, ADHD, or burnout. Lasting recovery requires addressing both the neurochemistry and the reason the nervous system reached for a stimulant in the first place.',
        ],
      }}
      symptoms={{
        title: 'Signs of cocaine dependence',
        items: [
          'Binge use followed by multi-day crashes',
          'Intense cravings and compulsive redosing',
          'Anxiety, paranoia, or panic attacks',
          'Sleep disruption and appetite loss',
          'Rapid heart rate or chest pain',
          'Depression and anhedonia between uses',
          'Financial, relational, or occupational fallout',
          'Escalating tolerance over weeks or months',
        ],
      }}
      approach={{
        eyebrow: 'Treatment Approach',
        title: 'Stabilize the nervous system. Rebuild the life.',
        intro:
          'We treat cocaine addiction inside our Forward-Facing Freedom® framework — prioritizing nervous-system regulation, trauma-informed therapy, and body-based interventions that restore the brain’s natural reward response.',
        items: [
          {
            title: 'Medical Assessment & Stabilization',
            description:
              'Comprehensive cardiovascular and psychiatric assessment on arrival, with 24/7 clinical oversight through the early crash period and beyond.',
          },
          {
            title: 'Trauma-Informed Therapy',
            description:
              'Individual and group therapy grounded in somatic and polyvagal-informed approaches — treating the dysregulation that drove the stimulant use.',
          },
          {
            title: 'Cognitive Behavioral Therapy',
            description:
              'CBT and contingency-management techniques to interrupt the craving-use-crash cycle and build healthier reward pathways.',
          },
          {
            title: 'Holistic Nervous System Work',
            description:
              'Breathwork, equine-assisted therapy, mindfulness, and sound healing to rebuild the natural dopamine baseline without pharmaceuticals.',
          },
          {
            title: 'Dual-Diagnosis Support',
            description:
              'Integrated treatment for anxiety, depression, ADHD, and PTSD — the co-occurring conditions most commonly present alongside cocaine use.',
          },
          {
            title: 'Long-Term Recovery Plan',
            description:
              'Aftercare coordination, alumni community, and relapse-prevention planning so the work here continues well after discharge.',
          },
        ],
      }}
      cta={{
        title: 'Ready to step off the cycle?',
        body: 'Our admissions team can verify your insurance and begin intake within 24 to 48 hours. Cocaine recovery is possible — and it begins with one conversation.',
      }}
    />
  );
}
