import type { Metadata } from 'next';

import FamilyHero from '@/components/family/FamilyHero';
import FamilyAtAGlance from '@/components/family/FamilyAtAGlance';
import WhyFamilyMatters from '@/components/family/WhyFamilyMatters';
import FamilyComponents from '@/components/family/FamilyComponents';
import FamilyPersonas from '@/components/family/FamilyPersonas';
import WhileTheyAreIn from '@/components/family/WhileTheyAreIn';

export const metadata: Metadata = {
  title: 'Family Program | Seven Arrows Recovery',
  description:
    'Family therapy, family education groups, boundary coaching, and dedicated family coordinator for loved ones of clients at Seven Arrows Recovery. The whole system heals, or nothing does.',
  keywords:
    'family program rehab, family therapy addiction, rehab for loved ones, codependency support, boundaries addiction family, family visitation rehab Arizona, rehab family weekend, adult child of addict support',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/our-program/family-program',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/our-program/family-program',
    title: 'Family Program | Seven Arrows Recovery',
    description:
      'The whole system heals, or nothing does. Weekly family therapy, education groups, boundary coaching, and a dedicated family coordinator.',
    images: [
      {
        url: '/images/embrace-connection.jpg',
        width: 1200,
        height: 630,
        alt: 'Family reconnecting at Seven Arrows Recovery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family Program | Seven Arrows Recovery',
    description:
      'Weekly family therapy, education groups, boundary coaching, and a dedicated family coordinator.',
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
      name: 'Family Program',
      item: 'https://sevenarrowsrecovery.com/our-program/family-program',
    },
  ],
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Family Program — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/our-program/family-program',
  description:
    'Family therapy, education, and coordination for the loved ones of Seven Arrows Recovery clients. The whole system heals, or nothing does.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  about: [
    { '@type': 'MedicalTherapy', name: 'Family Therapy' },
    { '@type': 'MedicalTherapy', name: 'Psychoeducation' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
};

export default function FamilyProgramPage() {
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
      <FamilyHero />
      <FamilyAtAGlance />
      <WhyFamilyMatters />
      <FamilyComponents />
      <FamilyPersonas />
      <WhileTheyAreIn />
    </main>
  );
}
