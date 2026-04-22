import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Inhalant Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential inhalant addiction treatment in Arizona. Medical assessment, trauma-informed therapy, and cognitive rehabilitation at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function InhalantsAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Inhalant Addiction Treatment"
      heroDescription="Inhalant use causes some of the fastest neurological and organ damage of any substance we treat. Our residential program pairs medical assessment and cognitive rehabilitation with trauma-informed therapy to support recovery of both brain and life."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'Why inhalants are uniquely dangerous.',
        paragraphs: [
          'Inhalants — solvents, aerosols, nitrous oxide, amyl nitrites, and other volatile substances — are inhaled to produce a brief intoxication. Because these compounds were never designed for human consumption, they cause rapid damage to the brain, liver, kidneys, heart, and lungs, often even from first-time use.',
          'Sudden Sniffing Death Syndrome can occur from a single session — a cardiac arrhythmia triggered by the inhalant itself. Chronic use leads to profound and sometimes permanent cognitive impairment, peripheral neuropathy, vitamin B12 deficiency (with nitrous oxide), and severe mental-health symptoms.',
          'Inhalant use is often driven by accessibility and trauma. These substances are cheap, legal, and ubiquitous — so sobriety has to be supported by genuine change in the conditions that drove the use. Our trauma-informed framework addresses both.',
        ],
      }}
      symptoms={{
        title: 'Signs of inhalant abuse',
        items: [
          'Chemical odors on breath, clothing, or skin',
          'Paint or solvent stains on the face or hands',
          'Slurred speech and poor coordination',
          'Confusion, memory loss, or cognitive decline',
          'Numbness or tingling in hands and feet',
          'Rapid mood swings, depression, or irritability',
          'Runny nose, nosebleeds, or sores around the mouth',
          'Empty containers of household chemicals or aerosols',
        ],
      }}
      approach={{
        eyebrow: 'Treatment Approach',
        title: 'Medical oversight meets the work of healing.',
        intro:
          'Inhalant recovery starts with a careful medical workup — neurological, cardiac, hepatic — and then builds a long-runway residential plan around the neurocognitive recovery timeline.',
        items: [
          {
            title: 'Comprehensive Medical Assessment',
            description:
              'Neurological, cardiac, hepatic, and B12-status evaluation on arrival, with ongoing clinical monitoring throughout residential care.',
          },
          {
            title: 'Cognitive Rehabilitation',
            description:
              'Structured cognitive work to support memory, attention, and executive-function recovery from inhalant-related neurological damage.',
          },
          {
            title: 'Trauma-Informed Therapy',
            description:
              'Polyvagal- and somatic-informed individual and group therapy addressing the trauma and dysregulation that drove inhalant use.',
          },
          {
            title: 'Dual-Diagnosis Support',
            description:
              'Integrated psychiatric care for the depression, anxiety, and trauma-related conditions commonly co-occurring with inhalant dependence.',
          },
          {
            title: 'Body-Based Interventions',
            description:
              'Breathwork, equine therapy, mindfulness, and sensory work to rebuild embodied self-regulation and natural pleasure response.',
          },
          {
            title: 'Environmental & Relapse Planning',
            description:
              'Careful discharge planning addressing living conditions and triggers, plus alumni support for long-term stability.',
          },
        ],
      }}
      cta={{
        title: 'Your brain can still heal.',
        body: 'Inhalant recovery is a longer process than most — and it is absolutely possible with structured, trauma-informed care. Call our admissions team today for a confidential assessment.',
      }}
    />
  );
}
