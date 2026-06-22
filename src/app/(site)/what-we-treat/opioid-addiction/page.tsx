import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import GeoAnswer from '@/components/seo/GeoAnswer';
import { opioidContent } from '@/lib/substances/opioid';
import { faqPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Opioid Treatment Center in Arizona | Seven Arrows Recovery',
  description:
    'Residential opioid treatment in Arizona — MAT coordination, medical detox, and trauma-informed care on a Cochise County ranch. Call (866) 718-1665.',
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

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/opioid-addiction#webpage',
  url: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/opioid-addiction',
  name: 'Opioid Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential opioid use disorder treatment in Arizona. Medication-assisted treatment with buprenorphine, methadone, or naltrexone, pain-informed care, trauma-informed therapy, and dual-diagnosis support for post-surgical dependence, chronic pain, and the fentanyl-era patient.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#website',
    url: 'https://sevenarrowsrecoveryarizona.com',
    name: 'Seven Arrows Recovery',
  },
  about: {
    '@type': 'MedicalCondition',
    '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/opioid-addiction#condition',
    name: 'Opioid Use Disorder',
    alternateName: [
      'Opioid Addiction',
      'Opioid Dependence',
      'Prescription Opioid Dependence',
      'Fentanyl Use Disorder',
      'Post-Surgical Opioid Dependence',
      'Chronic Pain Opioid Dependence',
    ],
    associatedAnatomy: { '@type': 'AnatomicalSystem', name: 'Central Nervous System' },
    possibleTreatment: [
      { '@type': 'MedicalTherapy', name: 'Medication-Assisted Treatment (MAT)', description: 'Buprenorphine, methadone, or naltrexone protocols held by an addiction-medicine physician, paired tightly with trauma-informed psychotherapy. The medication stabilizes the biology while therapy addresses the underlying drivers.' },
      { '@type': 'MedicalTherapy', name: 'Pain-Informed Care', description: 'A pain psychologist reviews every chronic-pain case, separating nociception from catastrophizing and building a body-first plan that does not require opioids to be livable.' },
      { '@type': 'MedicalTherapy', name: 'Trauma-Informed Therapy', description: 'Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after the body is stable so processing supports regulation rather than unsettling it.' },
      { '@type': 'MedicalTherapy', name: 'Naloxone-Ready Aftercare', description: 'Every discharging client leaves with naloxone in hand, a family member trained to use it, and a harm-reduction plan aligned with their goals.' },
      { '@type': 'MedicalTherapy', name: 'Equine-Assisted Therapy', description: 'Horses mirror nervous-system states without judgment. Clients learn what down-regulation physically feels like — often for the first time sober.' },
      { '@type': 'MedicalTherapy', name: 'Breathwork, Yoga, and Sound Therapy', description: "Parasympathetic-activating practice that restores the body's own down-regulation tools, treated as medicine rather than a supplementary extra." },
      { '@type': 'MedicalTherapy', name: 'Dual-Diagnosis Care', description: 'Integrated treatment for depression, anxiety, PTSD, and chronic-pain-related mood disorders under one coordinated clinical team.' },
    ],
  },
  provider: {
    '@type': ['MedicalBusiness', 'LocalBusiness'],
    '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
    name: 'Seven Arrows Recovery',
    url: 'https://sevenarrowsrecoveryarizona.com',
    telephone: '+1-866-718-1665',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2491 W Jefferson Rd',
      addressLocality: 'Elfrida',
      addressRegion: 'AZ',
      postalCode: '85610',
      addressCountry: 'US',
    },
  },
  audience: {
    '@type': 'MedicalAudience',
    audienceType: 'Patient',
    healthCondition: { '@type': 'MedicalCondition', name: 'Opioid Use Disorder' },
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
      { '@type': 'ListItem', position: 2, name: 'What We Treat', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat' },
      { '@type': 'ListItem', position: 3, name: 'Opioid Addiction', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/opioid-addiction' },
    ],
  },
};

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
  name: 'Seven Arrows Recovery',
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '27', bestRating: '5', worstRating: '1' },
  review: [
    { '@type': 'Review', author: { '@type': 'Person', name: 'Kelly Jameson' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem." },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Jessica Collins' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Josh' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Boots' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Roger McGehee' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.' },
  ],
};

export default function OpioidAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(localBusinessJsonLd)} />
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
            therapy, somatic work, and equine-assisted sessions, so the nervous-system
            drivers of craving are treated alongside the pharmacology.
          </p>
        }
        bullets={[
          { label: 'MAT supported', body: 'Buprenorphine (Suboxone) and naltrexone (Vivitrol) coordinated with partnered prescribers — the standard of care for OUD.' },
          { label: 'Medical detox first', body: 'Withdrawal managed at a trusted detox partner, then direct handoff into residential.' },
          { label: 'Trauma + addiction together', body: 'Forward-Facing® Accelerated Recovery model — because most OUD presents with trauma drivers that talk therapy alone does not reach.' },
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
