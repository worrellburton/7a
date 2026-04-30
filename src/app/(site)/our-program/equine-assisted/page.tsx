import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import GeoAnswer from '@/components/seo/GeoAnswer';
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
  title: 'Equine-Assisted Psychotherapy (EAP) | Seven Arrows Recovery',
  description:
    'Equine-Assisted Psychotherapy on a 160-acre ranch in Cochise County, AZ — trauma-informed, JCAHO-accredited care for PTSD, addiction, and complex trauma.',
  keywords:
    'equine assisted psychotherapy Arizona, equine therapy for addiction, horse therapy PTSD, EAP Cochise County, horse assisted therapy veterans, equine therapy Tucson, equine assisted learning rehab, trauma-informed equine therapy, residential equine therapy Arizona, Seven Arrows Recovery equine',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/our-program/equine-assisted',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/our-program/equine-assisted',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com' },
    { '@type': 'ListItem', position: 2, name: 'Our Program', item: 'https://sevenarrowsrecoveryarizona.com/our-program' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Equine-Assisted Psychotherapy',
      item: 'https://sevenarrowsrecoveryarizona.com/our-program/equine-assisted',
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
  url: 'https://sevenarrowsrecoveryarizona.com/our-program/equine-assisted',
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
  provider: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
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
  url: 'https://sevenarrowsrecoveryarizona.com/our-program/equine-assisted',
  description:
    'Overview of the Equine-Assisted Psychotherapy program at Seven Arrows Recovery, a JCAHO-accredited residential addiction treatment ranch in Cochise County, Arizona.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
  about: [
    { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
    { '@type': 'MedicalTherapy', name: 'Equine-Assisted Psychotherapy' },
    { '@type': 'MedicalCondition', name: 'Substance Use Disorder' },
    { '@type': 'MedicalCondition', name: 'Post-Traumatic Stress Disorder' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-23',
  reviewedBy: {
    '@type': 'Organization',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
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
          'Equine-assisted psychotherapy restores regulation and drives ',
          { text: 'deep healing', accent: true },
          ' through connection with horses.',
        ]}
        description="Seven Arrows Recovery runs equine-assisted psychotherapy on a private 160-acre ranch at the base of the Swisshelm Mountains. The herd works alongside licensed trauma therapists in sessions that access material talk-therapy alone rarely reaches."
      />
      <GeoAnswer
        id="rehabs-with-equine-therapy"
        question="Rehabs with equine-assisted psychotherapy in Arizona"
        answer={
          <>
            <p>
              Seven Arrows Recovery is a trauma-informed addiction treatment center in
              Arizona, where equine-assisted psychotherapy (EAP) is fully integrated into
              the core clinical program, not offered as an add-on. Grounded in safety,
              attunement, and relational healing, sessions take place on a private 160-acre
              ranch in Cochise County with a herd intentionally cared for as therapeutic
              partners.
            </p>
            <p className="mt-3">
              EAP group sessions are facilitated by an Arizona-licensed therapist alongside
              an equine specialist, supporting structured, experiential group work.
              Individual EAP sessions are offered as clinically appropriate and are often
              co-facilitated with the therapist and equine partner, creating a more
              intimate space that supports vulnerability, emotional processing, and deeper
              healing.
            </p>
          </>
        }
        bullets={[
          { label: 'Ground-based work', body: 'Most of the clinical work happens on the ground — attunement, leading, groundwork, grooming. No riding required for therapeutic work.' },
          { label: 'Integrated, Not Elective', body: 'Equine-assisted psychotherapy (EAP) is embedded into the core weekly treatment schedule. Clients participate in a weekly EAP group session, with individual EAP sessions offered as clinically indicated, integrated alongside individual therapy, group therapy, and somatic-based work.' },
          { label: 'Evidence-Informed', body: 'Draws on attachment theory, somatic awareness/experiencing, and Internal Family Systems (IFS); integrates experiential and relational interventions; and is used as an adjunct to CBT, EMDR, mindfulness-based practices, psychoeducation, nervous system regulation (ANS-informed work), and trauma-informed care principles within equine-assisted psychotherapy.' },
          { label: 'For who it helps most', body: 'Clients presenting with complex trauma, Post-Traumatic Stress Disorder, attachment disruptions, and moral wounds, particularly those who have demonstrated limited response to traditional talk-based interventions and may benefit from experiential, somatic, and relationally focused approaches.' },
          { label: 'Trail riding twice a week', body: 'Beyond the clinical EAP work, scheduled trail rides twice a week give clients time outdoors with the herd in a low-stakes, regulating context — separate from the structured therapy sessions.' },
        ]}
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
