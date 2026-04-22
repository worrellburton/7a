import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Benzodiazepine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Safe, medically supervised benzodiazepine detox and trauma-informed residential treatment in Arizona. Individualized tapering, 24/7 monitoring, anxiety management. Call (866) 996-4308.',
};

export default function BenzoAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Benzodiazepine Addiction Treatment"
      heroDescription="Benzodiazepine dependence can form faster than most people realize — and withdrawal can be medically dangerous. Our residential program pairs supervised tapering with trauma-informed therapy so you can come off benzos safely and address the anxiety that led there."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'Why benzodiazepine withdrawal requires clinical care.',
        paragraphs: [
          'Benzodiazepines — alprazolam (Xanax), clonazepam (Klonopin), lorazepam (Ativan), diazepam (Valium), and others — enhance GABA activity in the brain, producing sedation, muscle relaxation, and anti-anxiety effects. Physical dependence can develop within just a few weeks of regular use.',
          'Abrupt cessation can trigger seizures, severe anxiety, psychosis, and life-threatening complications. Unlike opioid withdrawal, benzodiazepine withdrawal is one of the few detox scenarios that can be medically fatal — which is why tapered, supervised withdrawal is non-negotiable.',
          'At Seven Arrows, benzodiazepine treatment goes beyond the taper. We address the underlying anxiety, panic, insomnia, or trauma that led to benzodiazepine use in the first place — because without that work, the risk of returning to the medication is high.',
        ],
      }}
      symptoms={{
        title: 'Benzodiazepine withdrawal symptoms',
        items: [
          'Severe rebound anxiety and panic',
          'Insomnia and sleep disturbances',
          'Tremors and muscle tension',
          'Seizures (potentially life-threatening)',
          'Nausea, sweating, and palpitations',
          'Irritability and agitation',
          'Memory and concentration problems',
          'Perceptual disturbances and sensory hypersensitivity',
        ],
      }}
      approach={{
        eyebrow: 'Treatment Approach',
        title: 'Safe tapering paired with real anxiety work.',
        intro:
          'We never recommend stopping benzodiazepines without medical supervision. Our team uses individualized tapering protocols alongside evidence-based anxiety treatment so your nervous system has another way to regulate.',
        items: [
          {
            title: 'Individualized Tapering Protocol',
            description:
              'Gradual, physician-designed dose reduction tailored to your usage history — the safest possible path off benzodiazepines.',
          },
          {
            title: '24/7 Medical Monitoring',
            description:
              'Round-the-clock clinical supervision during the high-risk early detox period, with immediate intervention available for complications.',
          },
          {
            title: 'Non-Addictive Anxiety Management',
            description:
              'Evidence-based medications (SSRIs, buspirone, hydroxyzine) and skills work to manage rebound anxiety without restarting dependence.',
          },
          {
            title: 'Cognitive Behavioral Therapy',
            description:
              'CBT for anxiety and panic — learning the skills benzodiazepines were compensating for, so your nervous system has another route.',
          },
          {
            title: 'Somatic & Holistic Work',
            description:
              'Mindfulness, breathwork, equine therapy, and body-based interventions to rebuild interoception and natural self-regulation.',
          },
          {
            title: 'Long-Term Recovery Planning',
            description:
              'Coordination with outpatient psychiatrists for non-addictive anxiety care plus alumni support for ongoing stability.',
          },
        ],
      }}
      cta={{
        title: 'Come off benzodiazepines safely.',
        body: 'Benzodiazepine withdrawal requires professional medical supervision — do not attempt to quit on your own. Our admissions team can begin your confidential assessment today.',
      }}
    />
  );
}
