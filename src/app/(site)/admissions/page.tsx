import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import AdmissionsAtAGlance from '@/components/admissions/AdmissionsAtAGlance';
import ThreeStepIntake from '@/components/admissions/ThreeStepIntake';
import InsuranceVerify from '@/components/admissions/InsuranceVerify';
import WhatToExpect from '@/components/admissions/WhatToExpect';
import WhatToBring from '@/components/admissions/WhatToBring';
import TravelLogistics from '@/components/admissions/TravelLogistics';
import PaymentOptions from '@/components/admissions/PaymentOptions';
import AdmissionsFAQ from '@/components/admissions/AdmissionsFAQ';
import AdmissionsCTA from '@/components/admissions/AdmissionsCTA';
import { admissionsFaqs } from '@/components/admissions/admissionsFaqs';
import { JsonLd } from '@/components/JsonLd';
import { buildBreadcrumbSchema, buildFAQSchema, SITE_URL, ORGANIZATION_ID } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'Admissions · Arizona Rehab | Seven Arrows Recovery',
  description:
    'Start residential addiction treatment in Arizona — free 24/7 insurance verification, phone assessment, and travel coordination. Most arrive in 24-48 hours.',
  keywords:
    'rehab admissions Arizona, drug rehab insurance verification, fast rehab admission, 24-hour rehab admissions, residential treatment Arizona, TRICARE rehab admission, what to bring to rehab, airport pickup rehab Arizona, sober transport, intervention support',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/admissions',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/admissions',
    title: 'Admissions | Seven Arrows Recovery',
    description:
      'Start with a phone call. Free insurance verification, phone assessment, and travel coordination — most clients arrive within 24 to 48 hours.',
    images: [
      {
        url: '/hero/embrace-connection.jpg',
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

// Breadcrumb + FAQ now come from the shared builders in
// src/lib/seo/schema.ts so the host, ID conventions, and item
// shapes stay in sync with the global MedicalBusiness object the
// root layout emits. MedicalWebPage stays inline because it's
// page-scoped — it references the global MedicalBusiness by @id
// via ORGANIZATION_ID rather than re-emitting the whole entity.
const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Admissions', url: '/admissions' },
]);

const faqSchema = buildFAQSchema(
  admissionsFaqs.map((f) => ({ question: f.q, answer: f.a })),
);

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Admissions — Seven Arrows Recovery',
  url: `${SITE_URL}/admissions`,
  description:
    'How to begin residential addiction treatment at Seven Arrows Recovery: insurance verification, phone assessment, travel coordination, and what to bring.',
  inLanguage: 'en-US',
  isPartOf: { '@id': ORGANIZATION_ID },
  about: [
    { '@type': 'MedicalBusiness', '@id': ORGANIZATION_ID },
    { '@type': 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
};

export default function AdmissionsPage() {
  return (
    <main>
      <JsonLd data={[breadcrumbSchema, medicalWebPageSchema, faqSchema]} />
      <PageHero
        label="Admissions"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Admissions' }]}
        title={[
          'Start with a call. ',
          { text: "We'll take it from here", accent: true },
          '.',
        ]}
        description="Seven Arrows Recovery is 160 acres of quiet at the base of the Swisshelm Mountains. Start with a phone call. We'll verify your insurance, walk you through the assessment, and coordinate travel — most clients arrive within 24 to 48 hours."
      />
      <AdmissionsAtAGlance />
      <ThreeStepIntake />
      <InsuranceVerify />
      <WhatToExpect />
      <WhatToBring />
      <TravelLogistics />
      <PaymentOptions />
      <AdmissionsFAQ />
      <AdmissionsCTA />
    </main>
  );
}
