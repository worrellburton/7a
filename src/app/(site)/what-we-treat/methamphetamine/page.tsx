import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Methamphetamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential methamphetamine addiction treatment in Arizona. Medical stabilization, trauma-informed therapy, and holistic recovery at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function MethAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Methamphetamine Addiction Treatment"
      heroDescription="Methamphetamine is one of the most neurologically damaging substances we treat. Our residential program pairs medical stabilization with trauma-informed therapy to give the brain and body what they need to recover."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'What methamphetamine does to the body and brain.',
        paragraphs: [
          'Methamphetamine produces an intense, long-lasting release of dopamine and norepinephrine. Over time, this burns out the brain’s dopamine system, leaving users with persistent anhedonia, cognitive impairment, and deep cravings that can last many months into recovery.',
          'Physical effects include severe weight loss, dental damage, skin sores, cardiovascular strain, and high risk of stroke or seizure. Psychiatric effects commonly include paranoia, psychosis, violent mood swings, and suicidal ideation.',
          'Recovery from methamphetamine dependence is entirely possible — but it requires a long runway, medical oversight, and clinical care designed around the slow timeline of dopamine-system healing. Forward-Facing Freedom® gives the nervous system the scaffolding it needs.',
        ],
      }}
      symptoms={{
        title: 'Signs of methamphetamine dependence',
        items: [
          'Binge-and-crash cycles spanning days',
          'Insomnia followed by extended sleep periods',
          'Severe weight loss and appetite suppression',
          'Paranoia, hallucinations, or psychosis',
          'Violent mood swings or agitation',
          'Cognitive and memory impairment',
          'Persistent anhedonia between uses',
          'Cardiac and dental complications',
        ],
      }}
      approach={{
        eyebrow: 'Treatment Approach',
        title: 'Long-runway recovery for a long-timeline drug.',
        intro:
          'Methamphetamine recovery does not respond to short stays. Our 30-to-90-day residential program is designed for the actual neurological timeline, with trauma-informed therapy, medical oversight, and holistic care throughout.',
        items: [
          {
            title: 'Medical Stabilization',
            description:
              'Cardiovascular, psychiatric, and nutritional assessment, with 24/7 clinical monitoring through the vulnerable early recovery period.',
          },
          {
            title: 'Extended Residential Stay',
            description:
              'Program lengths of 60 to 90+ days so the dopamine system has time to begin healing in a structured, sober environment.',
          },
          {
            title: 'Trauma-Informed Therapy',
            description:
              'Polyvagal- and somatic-informed individual and group therapy — addressing the trauma and dysregulation that drive stimulant use.',
          },
          {
            title: 'Dual-Diagnosis Psychiatry',
            description:
              'Careful psychiatric care for methamphetamine-induced anxiety, depression, and psychosis — including medication management where indicated.',
          },
          {
            title: 'Body-Based Interventions',
            description:
              'Breathwork, equine-assisted therapy, movement, and sound healing to rebuild the natural reward response without pharmaceuticals.',
          },
          {
            title: 'Aftercare Planning',
            description:
              'Structured step-down to outpatient care, sober-living referrals, and alumni community — the long runway recovery actually requires.',
          },
        ],
      }}
      cta={{
        title: 'Your brain can heal. We know the timeline.',
        body: 'Methamphetamine recovery is slower than other substances — but it is absolutely possible with the right clinical support. Reach out to our admissions team today.',
      }}
    />
  );
}
