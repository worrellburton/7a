import type { Metadata } from 'next';

import AdmissionsHero from '@/components/admissions/AdmissionsHero';
import AdmissionsAtAGlance from '@/components/admissions/AdmissionsAtAGlance';
import ThreeStepIntake from '@/components/admissions/ThreeStepIntake';
import InsuranceVerify from '@/components/admissions/InsuranceVerify';
import WhatToExpect from '@/components/admissions/WhatToExpect';
import WhatToBring from '@/components/admissions/WhatToBring';
import TravelLogistics from '@/components/admissions/TravelLogistics';
import PaymentOptions from '@/components/admissions/PaymentOptions';
import AdmissionsFAQ from '@/components/admissions/AdmissionsFAQ';
import { admissionsFaqs } from '@/components/admissions/admissionsFaqs';

export const metadata: Metadata = {
  title: 'Admissions | Arizona Drug & Alcohol Rehab — Seven Arrows Recovery',
  description:
    'Start residential addiction treatment at Seven Arrows Recovery. Free 24/7 insurance verification (Aetna, BCBS, Cigna, UnitedHealthcare, Humana, TRICARE), phone assessment, travel coordination. Most clients arrive within 24–48 hours. Call (866) 996-4308.',
  keywords:
    'rehab admissions Arizona, drug rehab insurance verification, fast rehab admission, 24-hour rehab admissions, residential treatment Arizona, TRICARE rehab admission, what to bring to rehab, airport pickup rehab Arizona, sober transport, intervention support',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/admissions',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/admissions',
    title: 'Admissions | Seven Arrows Recovery',
    description:
      'Start with a phone call. Free insurance verification, phone assessment, and travel coordination — most clients arrive within 24 to 48 hours.',
    images: [
      {
        url: '/images/embrace-connection.jpg',
        width: 1200,
        height: 630,
        alt: 'Arriving at Seven Arrows Recovery in Cochise County, Arizona',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Admissions | Seven Arrows Recovery',
    description:
      'Residential addiction treatment in Arizona. Free insurance verification, phone assessment, and travel coordination within 24–48 hours.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Admissions', item: 'https://sevenarrowsrecovery.com/admissions' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: admissionsFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Admissions — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/admissions',
  description:
    'How to begin residential addiction treatment at Seven Arrows Recovery: insurance verification, phone assessment, travel coordination, and what to bring.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  about: [
    { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecovery.com/#organization' },
    { '@type': 'MedicalTherapy', name: 'Residential Addiction Treatment' },
    { '@type': 'MedicalProcedure', name: 'Medical Detoxification' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
};

export default function AdmissionsPage() {
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
      <AdmissionsHero />
      <AdmissionsAtAGlance />
      <ThreeStepIntake />
      <InsuranceVerify />
      <WhatToExpect />
      <WhatToBring />
      <TravelLogistics />
      <PaymentOptions />
      <AdmissionsFAQ />
    </main>
  );
}
