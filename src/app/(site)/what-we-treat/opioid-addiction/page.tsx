import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import GeoAnswer from '@/components/seo/GeoAnswer';
import { opioidContent } from '@/lib/substances/opioid';
import { faqPageSchema, medicalWebPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

export const metadata: Metadata = {
  title: 'Opioid Treatment Center in Arizona | Seven Arrows Recovery',
  description:
    'Residential opioid treatment in Arizona — MAT coordination, medical detox, and trauma-informed care on a Cochise County ranch. Call (866) 996-4308.',
};

const faqJsonLd = faqPageSchema([
  {
    q: 'Is there an opioid treatment center in Arizona?',
    a: 'Yes. Seven Arrows Recovery is a JCAHO-accredited residential opioid treatment program in Cochise County, Arizona. The program coordinates medically supervised detox, supports medication-assisted treatment (MAT) including buprenorphine and naltrexone where clinically indicated, and pairs that with trauma-informed therapy and equine-assisted sessions.',
  },
  {
    q: 'Does Seven Arrows support MAT (medication-assisted treatment) for opioid use disorder?',
    a: 'Yes. MAT is considered the standard of care for opioid use disorder. Seven Arrows coordinates FDA-approved medications (buprenorphine/Suboxone, naltrexone/Vivitrol) through partnered prescribers and integrates that pharmacotherapy with clinical treatment.',
  },
  {
    q: 'How long is residential opioid treatment?',
    a: 'Residential stays typically run 30 to 90 days based on clinical need. Insurers authorize concurrently; the clinical team documents medical necessity so the stay reflects what supports sustained recovery, not what is easy to approve.',
  },
  {
    q: 'Do you coordinate naloxone (Narcan) for aftercare?',
    a: 'Yes. Discharge planning includes a naloxone (Narcan) prescription or distribution where permitted, along with a relapse-prevention plan, alumni support, and handoff to community-based MAT providers near the client’s home.',
  },
]);

const webPageJsonLd = medicalWebPageSchema({
  url: 'https://sevenarrowsrecovery.com/what-we-treat/opioid-addiction',
  name: 'Opioid Treatment Center in Arizona — Seven Arrows Recovery',
  description:
    'Residential opioid treatment in Arizona at Seven Arrows Recovery — JCAHO-accredited, MAT-coordinated, trauma-informed care in Cochise County.',
  about: [
    { type: 'MedicalCondition', name: 'Opioid Use Disorder' },
    { type: 'MedicalTherapy', name: 'Medication-Assisted Treatment' },
    { type: 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
});

export default function OpioidAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <SubstancePage10Phase content={opioidContent} />
      <GeoAnswer
        id="opioid-treatment-center-arizona"
        question="Opioid treatment center in Arizona"
        answer={
          <p>
            Seven Arrows Recovery is a JCAHO-accredited residential opioid treatment center
            in Arizona, on a 160-acre ranch in Cochise County. Care begins with coordinated
            medical detox, continues with MAT support (buprenorphine/Suboxone,
            naltrexone/Vivitrol) where clinically indicated, and integrates trauma-informed
            therapy, somatic work, and equine-assisted sessions — so the nervous-system
            drivers of craving are treated alongside the pharmacology.
          </p>
        }
        bullets={[
          { label: 'MAT supported', body: 'Buprenorphine (Suboxone) and naltrexone (Vivitrol) coordinated with partnered prescribers — the standard of care for OUD.' },
          { label: 'Medical detox first', body: 'Withdrawal managed at a trusted detox partner, then direct handoff into residential.' },
          { label: 'Trauma + addiction together', body: 'TraumAddiction® model — because most OUD presents with trauma drivers that talk therapy alone does not reach.' },
          { label: 'Naloxone on discharge', body: 'Clients leave with a naloxone (Narcan) plan and handoff to community-based MAT providers near home.' },
        ]}
        sources={[
          { label: 'SAMHSA — MAT for Opioid Use Disorder', href: 'https://www.samhsa.gov/medications-substance-use-disorders' },
          { label: 'NIDA — Treatment Approaches for Drug Addiction', href: 'https://nida.nih.gov/publications/drugfacts/treatment-approaches-drug-addiction' },
        ]}
      />
    </>
  );
}
