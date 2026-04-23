import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Benzodiazepine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Trauma-informed residential treatment for benzodiazepine addiction in Arizona, with coordinated medical detox through partnered facilities and evidence-based anxiety care. Call (866) 996-4308.',
};

export default function BenzoAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Benzodiazepine Addiction Treatment"
      heroDescription="Benzodiazepine dependence can form faster than most people realize — and withdrawal can be medically dangerous. Because acute benzo taper must be done under medical care, we coordinate a stay at a partnered detox facility first, then welcome you into our trauma-informed residential program to address the anxiety that led there."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'Why benzodiazepine withdrawal requires clinical care.',
        paragraphs: [
          'Benzodiazepines — alprazolam (Xanax), clonazepam (Klonopin), lorazepam (Ativan), diazepam (Valium), and others — enhance GABA activity in the brain, producing sedation, muscle relaxation, and anti-anxiety effects. Physical dependence can develop within just a few weeks of regular use.',
          'Abrupt cessation can trigger seizures, severe anxiety, psychosis, and life-threatening complications. Unlike opioid withdrawal, benzodiazepine withdrawal is one of the few detox scenarios that can be medically fatal — which is why tapered, supervised withdrawal is non-negotiable.',
          'Because the acute benzodiazepine taper requires medical oversight that goes beyond our scope, our admissions team coordinates the detox portion with a partnered facility. Once you are medically stable, benzodiazepine treatment at Seven Arrows goes beyond the taper — we address the underlying anxiety, panic, insomnia, or trauma that led to benzodiazepine use in the first place.',
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
          'We never recommend stopping benzodiazepines without medical supervision. Our admissions team coordinates the acute taper at a partnered detox facility, then welcomes you into residential care for the evidence-based anxiety work that keeps you off benzos long term.',
        items: [
          {
            title: 'Coordinated Detox with Partnered Facility',
            description:
              'A short stay at a partnered medical detox facility for the individualized, physician-supervised taper — then a warm hand-off into residential care.',
          },
          {
            title: 'Post-Detox Residential Care',
            description:
              'You arrive at Seven Arrows medically stable and stay with one team from that point on — no second hand-off, no scrambling for your next step.',
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
