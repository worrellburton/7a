import type { Metadata } from 'next';

import WhoHero from '@/components/who-we-help/WhoHero';
import AtAGlance from '@/components/who-we-help/AtAGlance';
import Populations from '@/components/who-we-help/Populations';
import SubstancesAndConditions from '@/components/who-we-help/SubstancesAndConditions';

export const metadata: Metadata = {
  title: 'Who We Help | Arizona Drug & Alcohol Rehab for Adults 18+',
  description:
    'Seven Arrows Recovery provides residential addiction treatment for adults 18+ with alcohol, opioid, stimulant, benzodiazepine, and dual-diagnosis conditions. Serving Phoenix, Tucson, Scottsdale, Mesa, and nationwide. Call (866) 996-4308.',
  keywords:
    'residential addiction treatment Arizona, drug rehab adults Arizona, alcohol rehab Arizona, opioid addiction treatment, fentanyl rehab Arizona, stimulant rehab, meth addiction treatment, benzodiazepine detox, dual diagnosis treatment Arizona, first responder rehab, veteran rehab Arizona, healthcare professional rehab, Phoenix rehab, Tucson rehab, Scottsdale rehab, Mesa rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/our-program/who-we-help',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/our-program/who-we-help',
    title: 'Who We Help | Arizona Drug & Alcohol Rehab for Adults 18+',
    description:
      'Residential addiction treatment in Arizona for adults 18+ struggling with alcohol, opioids, stimulants, benzodiazepines, and co-occurring mental health conditions. Serving Phoenix, Tucson, Scottsdale, Mesa, and clients nationwide.',
    images: [
      {
        url: '/images/group-gathering-pavilion.jpg',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Our Program', item: 'https://sevenarrowsrecovery.com/our-program' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Who We Help',
      item: 'https://sevenarrowsrecovery.com/our-program/who-we-help',
    },
  ],
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Who We Help — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/our-program/who-we-help',
  description:
    'Seven Arrows Recovery provides residential addiction treatment for adults 18 and older with alcohol, opioid, stimulant, benzodiazepine, and dual-diagnosis conditions. Serving clients from Phoenix, Tucson, Scottsdale, Mesa, and nationwide.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
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
      <WhoHero />
      <AtAGlance />
      <Populations />
      <SubstancesAndConditions />
    </main>
  );
}
