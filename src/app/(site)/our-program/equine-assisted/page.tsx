import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import EquineWhy from './EquineWhy';
import EquineHerd from './EquineHerd';
import EquineSessions from './EquineSessions';
import EquinePopulations from './EquinePopulations';
import EquineSafety from './EquineSafety';
import EquineReview from './EquineReview';
import EquineFAQ from './EquineFAQ';
import EquineCTA from './EquineCTA';
import { equineFaqs } from './equineFaqs';

export const metadata: Metadata = {
  title: 'Equine-Assisted Psychotherapy (EAP) in Arizona | Seven Arrows Recovery',
  description:
    'Equine-Assisted Psychotherapy on a 160-acre private ranch in Cochise County, Arizona. Licensed clinicians, trauma-informed framework, and a full herd — for PTSD, addiction, attachment, and complex trauma. JCAHO-accredited, HIPAA + 42 CFR Part 2 compliant.',
  keywords:
    'equine assisted psychotherapy Arizona, equine therapy for addiction, horse therapy PTSD, EAP Cochise County, horse assisted therapy veterans, equine therapy Tucson, equine assisted learning rehab, trauma-informed equine therapy, residential equine therapy Arizona, Seven Arrows Recovery equine',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/our-program/equine-assisted',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/our-program/equine-assisted',
    title: 'Equine-Assisted Psychotherapy | Seven Arrows Recovery',
    description:
      'Licensed trauma-informed equine-assisted psychotherapy on a 160-acre Arizona ranch. Built for PTSD, addiction, attachment injury, and clients who need more than talk-therapy alone.',
    images: [
      {
        url: '/images/equine-therapy-portrait.jpg',
        width: 1200,
        height: 630,
        alt: 'Equine-assisted psychotherapy session at Seven Arrows Recovery in Cochise County, Arizona',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Equine-Assisted Psychotherapy | Seven Arrows Recovery',
    description:
      'Licensed trauma-informed equine-assisted psychotherapy at our 160-acre Arizona ranch — for PTSD, addiction, and complex trauma.',
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
      name: 'Equine-Assisted Psychotherapy',
      item: 'https://sevenarrowsrecovery.com/our-program/equine-assisted',
    },
  ],
};

const medicalTherapySchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalTherapy',
  name: 'Equine-Assisted Psychotherapy (EAP)',
  alternateName: ['Equine-Facilitated Psychotherapy', 'EAP', 'EFP', 'Horse therapy'],
  description:
    'A licensed mental-health intervention co-led by a behavioral-health clinician and an equine specialist. Integrates attachment theory, somatic experiencing, and Internal Family Systems (IFS) to address trauma, addiction, attachment injury, and nervous-system dysregulation. Delivered on a private 160-acre ranch in Cochise County, Arizona, as part of an accredited residential addiction program.',
  url: 'https://sevenarrowsrecovery.com/our-program/equine-assisted',
  medicineSystem: 'https://schema.org/WesternConventional',
  usedToDiagnose: [
    { '@type': 'MedicalCondition', name: 'Post-Traumatic Stress Disorder (PTSD)' },
    { '@type': 'MedicalCondition', name: 'Substance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Complex Trauma' },
    { '@type': 'MedicalCondition', name: 'Attachment Disorders' },
    { '@type': 'MedicalCondition', name: 'Generalized Anxiety Disorder' },
    { '@type': 'MedicalCondition', name: 'Major Depressive Disorder' },
  ],
  relevantSpecialty: [
    { '@type': 'MedicalSpecialty', name: 'Addiction Medicine' },
    { '@type': 'MedicalSpecialty', name: 'Psychiatry' },
  ],
  provider: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
};

const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: equineFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q.replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”'),
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a.replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”'),
    },
  })),
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Equine-Assisted Psychotherapy — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/our-program/equine-assisted',
  description:
    'Overview of the Equine-Assisted Psychotherapy program at Seven Arrows Recovery, a JCAHO-accredited residential addiction treatment ranch in Cochise County, Arizona.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  about: [
    { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecovery.com/#organization' },
    { '@type': 'MedicalTherapy', name: 'Equine-Assisted Psychotherapy' },
    { '@type': 'MedicalCondition', name: 'Substance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Post-Traumatic Stress Disorder' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-23',
  reviewedBy: {
    '@type': 'Organization',
    '@id': 'https://sevenarrowsrecovery.com/#organization',
    name: 'Seven Arrows Recovery clinical team',
  },
};

export default function EquineAssistedPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalTherapySchema) }}
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
        label="Equine-assisted therapy"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our program', href: '/our-program' },
          { label: 'Equine-assisted' },
        ]}
        title={[
          "The horses don't care about your ",
          { text: 'story', accent: true },
          '.',
        ]}
        description="Seven Arrows Recovery runs equine-assisted psychotherapy on a private 160-acre ranch at the base of the Swisshelm Mountains. The horses respond to what's true right now — and that is what makes the modality work."
      />
      <EquineWhy />
      <EquineSessions />
      <EquineHerd />
      <EquinePopulations />
      <EquineSafety />
      <EquineReview />
      <EquineFAQ />
      <EquineCTA />
    </main>
  );
}
