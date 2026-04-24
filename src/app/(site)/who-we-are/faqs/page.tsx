import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import FAQPersonaView from '@/components/faqs/FAQPersonaView';
import FAQIntake from '@/components/faqs/FAQIntake';
import FAQCTA from '@/components/faqs/FAQCTA';
import { allFaqs } from '@/components/faqs/faqData';

export const metadata: Metadata = {
  title: 'FAQs | Arizona Drug & Alcohol Rehab — Seven Arrows Recovery',
  description:
    'Answers to the most common questions about Seven Arrows Recovery: admissions, insurance (Aetna, BCBS, Cigna, UnitedHealthcare, Humana, TRICARE), detox, treatment length, family involvement, dual diagnosis, aftercare, and privacy.',
  keywords:
    'rehab FAQ Arizona, drug rehab questions, alcohol rehab insurance, TRICARE rehab, dual diagnosis FAQ, residential treatment FAQ, medical detox FAQ, MAT rehab, family visitation rehab, HIPAA 42 CFR Part 2, JCAHO rehab, LegitScript rehab, Arizona rehab admissions',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/who-we-are/faqs',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/who-we-are/faqs',
    title: 'FAQs | Seven Arrows Recovery',
    description:
      'Direct answers to common rehab questions — admissions, insurance, detox, treatment length, family, dual diagnosis, aftercare, and privacy.',
    images: [
      {
        url: '/images/common-area-living-room.jpg',
        width: 1200,
        height: 630,
        alt: 'Common area at Seven Arrows Recovery in Cochise County, Arizona',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQs | Seven Arrows Recovery',
    description:
      'Direct answers to common rehab questions about admissions, insurance, detox, clinical approach, family, aftercare, and privacy.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com' },
    { '@type': 'ListItem', position: 2, name: 'Who We Are', item: 'https://sevenarrowsrecoveryarizona.com/who-we-are' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'FAQs',
      item: 'https://sevenarrowsrecoveryarizona.com/who-we-are/faqs',
    },
  ],
};

const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'FAQs — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecoveryarizona.com/who-we-are/faqs',
  description:
    'Frequently asked questions about admissions, insurance, detox, clinical care, family involvement, aftercare, and privacy at Seven Arrows Recovery, a residential drug and alcohol rehab in Arizona.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
  about: [
    { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
    { '@type': 'MedicalCondition', name: 'Substance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Dual Diagnosis' },
    { '@type': 'MedicalProcedure', name: 'Medication-Assisted Treatment' },
    { '@type': 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
  reviewedBy: {
    '@type': 'Organization',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
    name: 'Seven Arrows Recovery clinical team',
  },
};

export default function FAQsPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema) }}
      />
      <PageHero
        label="Frequently asked questions"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who we are', href: '/who-we-are' },
          { label: 'FAQs' },
        ]}
        title={[
          'Your questions about ',
          { text: 'rehab at Seven Arrows', accent: true },
          '.',
        ]}
        description="Answers to the questions our admissions team fields most often — insurance and cost, length of stay, detox, the clinical approach, family involvement, aftercare, and privacy. Updated regularly and organized by topic."
      />
      <FAQPersonaView />
      <FAQIntake />
      <FAQCTA />
    </main>
  );
}
