import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import AtAGlance from '@/components/who-we-help/AtAGlance';
import Populations from '@/components/who-we-help/Populations';
import SubstancesAndConditions from '@/components/who-we-help/SubstancesAndConditions';
import FitCriteria from '@/components/who-we-help/FitCriteria';
import ComplexityWeHold from '@/components/who-we-help/ComplexityWeHold';
import GeographicReach from '@/components/who-we-help/GeographicReach';
import FamilyAndLovedOnes from '@/components/who-we-help/FamilyAndLovedOnes';
import WhoFAQ from '@/components/who-we-help/WhoFAQ';
import { whoFaqs } from '@/components/who-we-help/whoFaqs';
import WhoCTA from '@/components/who-we-help/WhoCTA';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Who We Help | Arizona Drug & Alcohol Rehab for Adults 18+',
  description:
    'Residential addiction treatment for adults 18+ in Arizona — alcohol, opioids, stimulants, benzos, and dual-diagnosis care. Call (866) 718-1665.',
  keywords:
    'residential addiction treatment Arizona, drug rehab adults Arizona, alcohol rehab Arizona, opioid addiction treatment, fentanyl rehab Arizona, stimulant rehab, meth addiction treatment, benzodiazepine detox, dual diagnosis treatment Arizona, first responder rehab, veteran rehab Arizona, healthcare professional rehab, Phoenix rehab, Tucson rehab, Scottsdale rehab, Mesa rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/our-program/who-we-help',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/our-program/who-we-help',
    title: 'Who We Help | Arizona Drug & Alcohol Rehab for Adults 18+',
    description:
      'Residential addiction treatment in Arizona for adults 18+ struggling with alcohol, opioids, stimulants, benzodiazepines, and co-occurring mental health conditions. Serving Phoenix, Tucson, Scottsdale, Mesa, and clients nationwide.',
    images: [
      {
        url: '/hero/group-gathering-pavilion.jpg',
        width: 1200,
        height: 630,
        alt: 'Group gathering at Seven Arrows Recovery in the Swisshelm Mountains of Arizona',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Who We Help | Arizona Drug & Alcohol Rehab for Adults 18+',
    description:
      'Residential addiction treatment for adults 18+ in Arizona. Serving clients from Phoenix, Tucson, Scottsdale, Mesa, and nationwide.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com' },
    { '@type': 'ListItem', position: 2, name: 'Our Program', item: 'https://sevenarrowsrecoveryarizona.com/our-program' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Who We Help',
      item: 'https://sevenarrowsrecoveryarizona.com/our-program/who-we-help',
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: whoFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Who We Help — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecoveryarizona.com/our-program/who-we-help',
  description:
    'Seven Arrows Recovery provides residential addiction treatment for adults 18 and older with alcohol, opioid, stimulant, benzodiazepine, and dual-diagnosis conditions. Serving clients from Phoenix, Tucson, Scottsdale, Mesa, and nationwide.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
  about: [
    { '@type': 'MedicalCondition', name: 'Alcohol Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Opioid Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Stimulant Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Benzodiazepine Dependence' },
    { '@type': 'MedicalCondition', name: 'Polysubstance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Dual Diagnosis' },
    { '@type': 'MedicalCondition', name: 'Post-Traumatic Stress Disorder' },
  ],
  audience: {
    '@type': 'PeopleAudience',
    suggestedMinAge: 18,
    geographicArea: [
      { '@type': 'State', name: 'Arizona' },
      { '@type': 'Country', name: 'United States' },
    ],
  },
  mainContentOfPage: {
    '@type': 'WebPageElement',
    cssSelector: 'main',
  },
  lastReviewed: '2026-04-22',
};

export default function WhoWeHelpPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PageHero
        label="Who we help"
        breadcrumbSchema={false}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our program', href: '/our-program' },
          { label: 'Who we help' },
        ]}
        title={[
          'Whoever walks ',
          { text: 'through the door', accent: true },
          '.',
        ]}
        description="Seven Arrows Recovery is a residential drug and alcohol rehab in Arizona for adults 18 and older — treating alcohol use disorder, opioid and heroin addiction, stimulant use, benzodiazepine dependence, and co-occurring mental health conditions."
      />
      <AtAGlance />
      <Populations />
      <SubstancesAndConditions />
      <FitCriteria />
      <ComplexityWeHold />
      <GeographicReach />
      <FamilyAndLovedOnes />
      <WhoFAQ />
      <WhoCTA />
    </main>
  );
}
