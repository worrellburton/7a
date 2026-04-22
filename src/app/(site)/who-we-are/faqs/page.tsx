import type { Metadata } from 'next';

import FAQHero from '@/components/faqs/FAQHero';
import FAQCategoryNav from '@/components/faqs/FAQCategoryNav';
import FAQCategorySection from '@/components/faqs/FAQCategorySection';
import FAQIntake from '@/components/faqs/FAQIntake';
import FAQCTA from '@/components/faqs/FAQCTA';
import { faqCategories, allFaqs } from '@/components/faqs/faqData';

export const metadata: Metadata = {
  title: 'FAQs | Arizona Drug & Alcohol Rehab — Seven Arrows Recovery',
  description:
    'Answers to the most common questions about Seven Arrows Recovery: admissions, insurance (Aetna, BCBS, Cigna, UnitedHealthcare, Humana, TRICARE), detox, treatment length, family involvement, dual diagnosis, aftercare, and privacy.',
  keywords:
    'rehab FAQ Arizona, drug rehab questions, alcohol rehab insurance, TRICARE rehab, dual diagnosis FAQ, residential treatment FAQ, medical detox FAQ, MAT rehab, family visitation rehab, HIPAA 42 CFR Part 2, JCAHO rehab, LegitScript rehab, Arizona rehab admissions',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/who-we-are/faqs',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/who-we-are/faqs',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Who We Are', item: 'https://sevenarrowsrecovery.com/who-we-are' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'FAQs',
      item: 'https://sevenarrowsrecovery.com/who-we-are/faqs',
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
  url: 'https://sevenarrowsrecovery.com/who-we-are/faqs',
  description:
    'Frequently asked questions about admissions, insurance, detox, clinical care, family involvement, aftercare, and privacy at Seven Arrows Recovery, a residential drug and alcohol rehab in Arizona.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  about: [
    { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecovery.com/#organization' },
    { '@type': 'MedicalCondition', name: 'Substance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Dual Diagnosis' },
    { '@type': 'MedicalProcedure', name: 'Medical Detoxification' },
    { '@type': 'MedicalProcedure', name: 'Medication-Assisted Treatment' },
    { '@type': 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
  reviewedBy: {
    '@type': 'Organization',
    '@id': 'https://sevenarrowsrecovery.com/#organization',
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
      <FAQHero />
      <FAQCategoryNav />
      {faqCategories.map((c) => (
        <FAQCategorySection key={c.id} category={c} />
      ))}
      <FAQIntake />
      <FAQCTA />
    </main>
  );
}
