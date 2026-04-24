import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import GeoAnswer from '@/components/seo/GeoAnswer';
import { alcoholContent } from '@/lib/substances/alcohol';
import { faqPageSchema, medicalWebPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

export const metadata: Metadata = {
  title: 'Alcohol Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Residential alcohol rehab in Arizona at Seven Arrows Recovery — JCAHO-accredited trauma-informed treatment on a 160-acre Cochise County ranch, with coordinated medical detox. Call (866) 996-4308.',
};

const faqJsonLd = faqPageSchema([
  {
    q: 'Where is the best alcohol rehab in Arizona?',
    a: 'Seven Arrows Recovery is a JCAHO-accredited residential alcohol rehab in Arizona, on a 160-acre ranch at the base of the Swisshelm Mountains in Cochise County. The program pairs medical detox coordination with trauma-informed therapy, somatic work, and equine-assisted sessions, and works with most major insurance carriers.',
  },
  {
    q: 'Do I need medical detox before alcohol rehab?',
    a: 'Many people with alcohol use disorder do. Alcohol withdrawal can be medically dangerous (seizures, delirium tremens), so the standard of care is a short medically supervised detox first. Seven Arrows coordinates detox at a trusted partner and hands off directly into residential care — no scrambling on your own.',
  },
  {
    q: 'How long is residential alcohol rehab?',
    a: 'Typical residential stays run 30 to 90 days based on clinical need. Insurers authorize concurrently, and our clinical team documents medical necessity so length-of-stay reflects what the client actually needs to recover, not what is easy to approve.',
  },
  {
    q: 'Does insurance cover alcohol rehab in Arizona?',
    a: 'Yes. Under the Mental Health Parity and Addiction Equity Act, most commercial plans cover alcohol use disorder treatment at parity with medical/surgical benefits. Seven Arrows works with Aetna, BCBS, Cigna, UnitedHealthcare, TRICARE, and most other major carriers.',
  },
]);

const webPageJsonLd = medicalWebPageSchema({
  url: 'https://sevenarrowsrecovery.com/what-we-treat/alcohol-addiction',
  name: 'Alcohol Rehab in Arizona — Seven Arrows Recovery',
  description:
    'Residential alcohol rehab in Arizona at Seven Arrows Recovery — JCAHO-accredited, trauma-informed treatment with coordinated detox in Cochise County.',
  about: [
    { type: 'MedicalCondition', name: 'Alcohol Use Disorder' },
    { type: 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
});

export default function AlcoholAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <SubstancePage10Phase content={alcoholContent} />
      <GeoAnswer
        id="alcohol-rehab-in-arizona"
        question="Alcohol rehab in Arizona"
        answer={
          <p>
            Seven Arrows Recovery is a JCAHO-accredited residential alcohol rehab in Arizona,
            on a private 160-acre ranch at the base of the Swisshelm Mountains in Cochise
            County. The program pairs coordinated medical detox with trauma-informed therapy
            — somatic experiencing, polyvagal-informed care, equine-assisted sessions, and
            evidence-based individual and group work — so that withdrawal, craving, and the
            underlying drivers of alcohol use are addressed in one continuous stay.
          </p>
        }
        bullets={[
          { label: 'Medical detox first', body: 'Alcohol withdrawal can be dangerous. Coordinated detox at a partner facility, then direct hand-off into residential.' },
          { label: 'Trauma-informed', body: 'TraumAddiction® framework treats alcohol use and underlying trauma concurrently — not sequentially.' },
          { label: 'Somatic + experiential', body: 'Somatic experiencing, breathwork, equine-assisted psychotherapy — body-based modalities alongside traditional talk therapy.' },
          { label: 'Insurance', body: 'Most major carriers accepted (Aetna, BCBS, Cigna, UHC, TRICARE). Free benefits verification: (866) 996-4308.' },
        ]}
        sources={[
          { label: 'SAMHSA — Alcohol Use Disorder treatment', href: 'https://www.samhsa.gov/substance-use/treatment' },
          { label: 'NIAAA — Treatment for Alcohol Problems', href: 'https://www.niaaa.nih.gov/alcohols-effects-health/alcohol-use-disorder/treatment' },
        ]}
      />
    </>
  );
}
