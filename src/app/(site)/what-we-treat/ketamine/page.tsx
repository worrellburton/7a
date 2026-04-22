import type { Metadata } from 'next';
import SubstancePage from '@/components/SubstancePage';

export const metadata: Metadata = {
  title: 'Ketamine Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential ketamine addiction treatment in Arizona. Trauma-informed therapy, dissociation work, and holistic recovery at Seven Arrows Recovery. Call (866) 996-4308.',
};

export default function KetamineAddictionPage() {
  return (
    <SubstancePage
      heroTitle="Ketamine Addiction Treatment"
      heroDescription="Ketamine’s rise as both a recreational drug and a therapeutic tool has made dependence dramatically more common. Our residential program treats problematic ketamine use while addressing the dissociative patterns and trauma that often sit underneath it."
      overview={{
        eyebrow: 'Understanding the Risks',
        title: 'Ketamine, dissociation, and the pull to escape.',
        paragraphs: [
          'Ketamine is a dissociative anesthetic that creates detachment from the body and surroundings. At low doses it produces relaxation and analgesia; at higher doses, a trance-like "K-hole" experience. That detachment is exactly what makes ketamine so compelling for people whose nervous systems are already seeking escape from emotional pain.',
          'Chronic ketamine use can lead to severe urinary tract damage (ketamine-induced cystitis), cognitive impairment, depression, and profound depersonalization. Tolerance builds quickly, and the line between recreational use and compulsive use is thin.',
          'Because ketamine use is often tangled up with trauma, dissociation, and co-occurring mental-health conditions, recovery requires more than simply stopping the substance. Our Forward-Facing Freedom® framework helps clients reconnect with their bodies safely, without needing to leave them.',
        ],
      }}
      symptoms={{
        title: 'Signs of problematic ketamine use',
        items: [
          'Escalating tolerance and frequency of use',
          'Persistent dissociation or depersonalization',
          'Memory and cognitive impairment',
          'Urinary pain or bladder complications',
          'Using alone or in high-risk settings',
          'Reliance on ketamine to manage anxiety or numb emotions',
          'Withdrawal from relationships and interests',
          'Depression, suicidal ideation, or anhedonia',
        ],
      }}
      approach={{
        eyebrow: 'Treatment Approach',
        title: 'Come back into the body on purpose.',
        intro:
          'Ketamine recovery is fundamentally about re-building the capacity to feel — safely, gradually, and in community. Our residential program is built around that work.',
        items: [
          {
            title: 'Medical & Urological Assessment',
            description:
              'Comprehensive assessment on arrival, including urology referral when indicated, plus 24/7 clinical oversight through stabilization.',
          },
          {
            title: 'Somatic & Polyvagal-Informed Therapy',
            description:
              'Somatic Experiencing and polyvagal-informed work to restore interoception — the capacity to feel the body safely, without dissociating.',
          },
          {
            title: 'Trauma-Focused Clinical Work',
            description:
              'Forward-Facing Freedom®-model therapy for the trauma and chronic dysregulation most ketamine dependence is organized around.',
          },
          {
            title: 'Dissociation & Depersonalization Support',
            description:
              'Specialized approaches for post-ketamine dissociation, including grounding practices, sensory integration, and slow re-embodiment.',
          },
          {
            title: 'Holistic Nervous-System Care',
            description:
              'Equine-assisted therapy, breathwork, mindfulness, and sound healing to build a nervous system that does not need ketamine to rest.',
          },
          {
            title: 'Dual-Diagnosis Psychiatry',
            description:
              'Integrated psychiatric care for the depression, anxiety, and treatment-resistant symptoms that often accompany ketamine use.',
          },
        ],
      }}
      cta={{
        title: 'Reconnect with what ketamine let you leave behind.',
        body: 'Recovery is not about erasing the reasons you reached for ketamine — it is about building the capacity to face them with support. Contact our admissions team today.',
      }}
    />
  );
}
