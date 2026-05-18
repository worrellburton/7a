import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import GeoAnswer from '@/components/seo/GeoAnswer';
import SubstanceFAQ from '@/components/substance/SubstanceFAQ';
import { alcoholContent } from '@/lib/substances/alcohol';
import { jsonLdScript } from '@/lib/seo/pageSchema';

export const metadata: Metadata = {
  title: 'Alcohol Rehab in Arizona | Seven Arrows Recovery',
  description:
    'JCAHO-accredited residential alcohol rehab in Arizona — trauma-informed care on a 160-acre Cochise County ranch with coordinated medical detox. (866) 718-1665.',
};

// Schema replaces the prior helper output verbatim — the three blocks
// (MedicalWebPage, FAQPage, LocalBusiness) come from the SEO brief and
// must be emitted exactly as supplied so the FAQ + review markup is
// picked up by Rich Results / GEO parsers without us re-implementing
// the shape in TypeScript helpers.
const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/alcohol-addiction#webpage',
  url: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/alcohol-addiction',
  name: 'Alcohol Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential alcohol addiction treatment in Arizona. Somatic-CBT, trauma-informed therapy, medical detox coordination, and dual-diagnosis care for high-functioning drinkers, gray-area drinkers, and relapse cases.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#website',
    url: 'https://sevenarrowsrecoveryarizona.com',
    name: 'Seven Arrows Recovery',
  },
  about: {
    '@type': 'MedicalCondition',
    '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/alcohol-addiction#condition',
    name: 'Alcohol Use Disorder',
    alternateName: ['Alcoholism', 'Alcohol Addiction', 'Gray-Area Drinking', 'Alcohol Dependence'],
    associatedAnatomy: { '@type': 'AnatomicalSystem', name: 'Central Nervous System' },
    possibleTreatment: [
      {
        '@type': 'MedicalTherapy',
        name: 'Somatic-Cognitive Behavioral Therapy',
        description:
          'A house-integrated CBT variant that tracks the body and the thought simultaneously, helping clients interrupt the craving loop at the nervous-system level.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Medical Detox Coordination',
        description:
          'Pre-admission or on-site medical detox with 24/7 clinical oversight. MAT including naltrexone and acamprosate when clinically indicated.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Trauma-Informed Therapy',
        description:
          'Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after physical stabilization to support nervous system regulation.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Equine-Assisted Therapy',
        description:
          'Horses mirror nervous-system states, helping clients learn natural down-regulation as an alternative to alcohol.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Dual-Diagnosis Care',
        description:
          'Integrated treatment for co-occurring depression, anxiety, PTSD, and sleep disorders alongside alcohol use disorder.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Breathwork, Yoga, and Sound Therapy',
        description:
          "Parasympathetic-activating practices that restore the nervous system's natural self-regulation capacity.",
      },
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
    healthCondition: { '@type': 'MedicalCondition', name: 'Alcohol Use Disorder' },
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
      { '@type': 'ListItem', position: 2, name: 'What We Treat', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Alcohol Addiction',
        item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/alcohol-addiction',
      },
    ],
  },
};

const faqs = [
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
];

const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
  name: 'Seven Arrows Recovery',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '27',
    bestRating: '5',
    worstRating: '1',
  },
  review: [
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Kelly Jameson' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem.",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Jessica Collins' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Josh' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Boots' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Roger McGehee' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.',
    },
  ],
};

export default function AlcoholAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(medicalWebPageSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPageSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(localBusinessSchema)} />
      <SubstancePage10Phase content={alcoholContent} labelAs="h1" titleAs="h2" />
      <GeoAnswer
        id="alcohol-rehab-in-arizona"
        question="Alcohol rehab in Arizona"
        answer={
          <p>
            Seven Arrows Recovery is a JCAHO-accredited residential alcohol rehab in Arizona,
            on a private 160-acre ranch at the base of the Swisshelm Mountains in Cochise
            County. The program pairs coordinated alcohol detox with trauma-informed therapy:
            somatic experiencing, polyvagal-informed care, equine-assisted sessions, and
            evidence-based individual and group work, so that withdrawal, craving, and the
            underlying drivers of alcohol use disorder are addressed in one continuous stay at
            our Arizona alcohol treatment center.
          </p>
        }
        bullets={[
          { label: 'Medical detox first', body: 'Alcohol withdrawal can be dangerous. Coordinated detox at a partner facility, then direct hand-off into residential.' },
          { label: 'Trauma-informed', body: 'Forward-Facing® Accelerated Recovery framework treats alcohol use and underlying trauma concurrently — not sequentially.' },
          { label: 'Somatic + experiential', body: 'Somatic experiencing, breathwork, equine-assisted psychotherapy — body-based modalities alongside traditional talk therapy.' },
          { label: 'Insurance', body: 'Most major carriers accepted (Aetna, BCBS, Cigna, UHC, TRICARE). Free benefits verification: (866) 718-1665.' },
        ]}
        sources={[
          { label: 'SAMHSA — Alcohol Use Disorder treatment', href: 'https://www.samhsa.gov/substance-use/treatment' },
          { label: 'NIAAA — Treatment for Alcohol Problems', href: 'https://www.niaaa.nih.gov/alcohols-effects-health/alcohol-use-disorder/treatment' },
        ]}
      />
      <SubstanceFAQ items={faqs} />
    </>
  );
}
