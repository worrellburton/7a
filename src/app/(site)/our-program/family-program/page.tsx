import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import FamilyAtAGlance from '@/components/family/FamilyAtAGlance';
import WhyFamilyMatters from '@/components/family/WhyFamilyMatters';
import FamilyComponents from '@/components/family/FamilyComponents';
import FamilyPersonas from '@/components/family/FamilyPersonas';
import WhileTheyAreIn from '@/components/family/WhileTheyAreIn';
import BoundariesVsEnabling from '@/components/family/BoundariesVsEnabling';
import FamilyFAQ from '@/components/family/FamilyFAQ';
import { familyFaqs } from '@/components/family/familyFaqs';
import FamilyCTA from '@/components/family/FamilyCTA';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Family Program | Seven Arrows Recovery',
  description:
    'Weekly family sessions, education groups, and boundary coaching for loved ones at Seven Arrows Recovery — the whole system heals, or nothing does.',
  keywords:
    'family program rehab, family support sessions addiction, rehab for loved ones, codependency support, boundaries addiction family, family visitation rehab Arizona, rehab family weekend, adult child of addict support',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/our-program/family-program',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/our-program/family-program',
    title: 'Family Program | Seven Arrows Recovery',
    description:
      'The whole system heals, or nothing does. Weekly family support sessions, education groups, and boundary coaching.',
    images: [
      {
        url: '/hero/embrace-connection.jpg',
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
      'Weekly family support sessions, education groups, and boundary coaching.',
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
      name: 'Family Program',
      item: 'https://sevenarrowsrecoveryarizona.com/our-program/family-program',
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: familyFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Family Program — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecoveryarizona.com/our-program/family-program',
  description:
    'Family support sessions, education, and coordination for the loved ones of Seven Arrows Recovery clients. The whole system heals, or nothing does.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
  about: [
    { '@type': 'MedicalTherapy', name: 'Family Support Sessions' },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PageHero
        label="Family program"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our program', href: '/our-program' },
          { label: 'Family program' },
        ]}
        title={[
          'The whole ',
          { text: 'system', accent: true },
          ' heals, or nothing does.',
        ]}
        description="Addiction is a family disease. Our family program gives parents, partners, and adult children the therapy, education, and coordination they need — while the client is in treatment and long after discharge."
      />
      <FamilyAtAGlance />
      <WhyFamilyMatters />
      <FamilyComponents />
      <FamilyPersonas />
      <WhileTheyAreIn />
      <BoundariesVsEnabling />
      <FamilyFAQ />
      <FamilyCTA />
    </main>
  );
}
