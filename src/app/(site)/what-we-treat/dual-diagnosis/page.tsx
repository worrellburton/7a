import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Dual Diagnosis Treatment | Seven Arrows Recovery',
  description:
    'Integrated dual diagnosis treatment for co-occurring mental health and substance use disorders at Seven Arrows Recovery in Arizona. Call (866) 718-1665.',
};

import PageHero from '@/components/PageHero';
import GeoAnswer from '@/components/seo/GeoAnswer';
import DestructiveCycle from '@/components/dual-diagnosis/DestructiveCycle';
import PrevalenceStats from '@/components/dual-diagnosis/PrevalenceStats';
import ConditionsBento from '@/components/dual-diagnosis/ConditionsBento';
import ParallelVsIntegrated from '@/components/dual-diagnosis/ParallelVsIntegrated';
import IntegratedApproach from '@/components/dual-diagnosis/IntegratedApproach';
import MedTherapySynergy from '@/components/dual-diagnosis/MedTherapySynergy';
import TraumaLayer from '@/components/dual-diagnosis/TraumaLayer';
import DualCTA from '@/components/dual-diagnosis/DualCTA';
import { faqPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

const faqJsonLd = faqPageSchema([
  {
    q: 'What is dual diagnosis treatment?',
    a: 'Dual diagnosis treatment (also called co-occurring or integrated treatment) addresses a mental-health condition and a substance use disorder at the same time, under one clinical team and one shared plan. At Seven Arrows Recovery in Arizona, the psychiatrist, therapist, and medical team round on every client together so a change in one layer of care immediately informs the others, instead of treating the two conditions in separate, disconnected programs.',
  },
  {
    q: 'Does Seven Arrows treat co-occurring mental health conditions with addiction?',
    a: 'Yes. Seven Arrows treats depression, anxiety, PTSD, bipolar disorder, panic disorder, OCD, borderline personality disorder, and ADHD alongside substance use disorders. Every admission begins with a comprehensive psychiatric and clinical assessment that identifies each co-occurring condition and builds a single, unified treatment roadmap rather than two parallel ones.',
  },
  {
    q: 'Why is integrated treatment better than treating each condition separately?',
    a: 'When a mental-health condition and a substance use disorder are treated in separate programs, each side works around the other and clients fall through the gap between them. Integrated care treats both as one interrelated problem — research associates integrated treatment with markedly better sustained-recovery outcomes than parallel or sequential treatment.',
  },
  {
    q: 'How does Seven Arrows address trauma in dual diagnosis?',
    a: 'Seven Arrows holds trauma as the common thread underneath both the mental-health symptoms and the substance use. Forward-Facing® Accelerated Recovery and other trauma-informed modalities (EMDR, IFS, DBT) sit at the center of the plan, titrated and consent-based, so treating the shared root helps both conditions loosen at once.',
  },
]);

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/dual-diagnosis#webpage',
  url: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/dual-diagnosis',
  name: 'Dual-Diagnosis Treatment | Seven Arrows Recovery',
  description:
    'Integrated dual-diagnosis treatment in Arizona for co-occurring mental health and substance use disorders. One clinical team treats depression, anxiety, PTSD, bipolar disorder, panic disorder, OCD, borderline personality disorder, and ADHD alongside addiction.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#website',
    url: 'https://sevenarrowsrecoveryarizona.com',
    name: 'Seven Arrows Recovery',
  },
  about: [
    {
      '@type': 'MedicalCondition',
      '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/dual-diagnosis#condition',
      name: 'Co-Occurring Disorder',
      alternateName: ['Dual Diagnosis', 'Comorbid Substance Use Disorder', 'Concurrent Disorder'],
      associatedAnatomy: { '@type': 'AnatomicalSystem', name: 'Central Nervous System' },
    },
    { '@type': 'MedicalCondition', name: 'Major Depressive Disorder', description: 'Persistent sadness, anhedonia, and fatigue that often drives self-medication.' },
    { '@type': 'MedicalCondition', name: 'Generalized Anxiety Disorder', description: 'Chronic worry, muscle tension, and a nervous system stuck on high alert.' },
    { '@type': 'MedicalCondition', name: 'Post-Traumatic Stress Disorder', alternateName: 'PTSD', description: 'Intrusions, avoidance, hyperarousal, and sleep disruption following traumatic experience.' },
    { '@type': 'MedicalCondition', name: 'Bipolar Disorder', description: 'Cycling between depression and elevated or activated states, each with its own risks.' },
    { '@type': 'MedicalCondition', name: 'Panic Disorder', description: 'Recurrent, sudden episodes of intense fear with strong physiological symptoms.' },
    { '@type': 'MedicalCondition', name: 'Obsessive-Compulsive Disorder', alternateName: 'OCD', description: 'Intrusive thoughts and compulsive behaviors that often intertwine with substance use.' },
    { '@type': 'MedicalCondition', name: 'Borderline Personality Disorder', description: 'Intense emotional reactivity, identity instability, and patterns of relational chaos.' },
    { '@type': 'MedicalCondition', name: 'Attention-Deficit/Hyperactivity Disorder', alternateName: 'ADHD', description: 'Attention regulation and impulse control challenges that often predate substance use.' },
  ],
  possibleTreatment: [
    { '@type': 'MedicalTherapy', name: 'Comprehensive Psychiatric Assessment', description: 'Every admission begins with a thorough psychiatric and clinical evaluation to identify every co-occurring condition and build a single, unified treatment roadmap.' },
    { '@type': 'MedicalTherapy', name: 'Integrated Individual Therapy', description: 'One-on-one sessions with licensed therapists using CBT, DBT, EMDR, and IFS — addressing addiction and mental-health symptoms in the same hour.' },
    { '@type': 'MedicalTherapy', name: 'Medication Management', description: 'Psychiatric oversight ensures safe, effective use of non-addictive medications when clinically indicated, coordinated with every other layer of care.' },
    { '@type': 'MedicalTherapy', name: 'Specialized Dual-Diagnosis Groups', description: 'Groups designed specifically for co-occurring disorders, where shared understanding among members allows the clinical work to go deeper.' },
    { '@type': 'MedicalTherapy', name: 'Trauma-Informed Care', description: 'Forward-Facing® Accelerated Recovery treats trauma as the common thread between the mental-health condition and the substance use, addressing it directly.' },
    { '@type': 'MedicalTherapy', name: 'Somatic and Body-Based Work', description: 'Breathwork, yoga, equine therapy, and somatic experiencing regulate the shared nervous-system substrate that drives both conditions.' },
    { '@type': 'MedicalTherapy', name: 'Integrated Aftercare', description: 'Discharge plans coordinate ongoing mental-health providers, psychiatric medication management, and recovery community into a single step-down plan.' },
  ],
  provider: {
    '@type': ['MedicalBusiness', 'LocalBusiness'],
    '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
    name: 'Seven Arrows Recovery',
    url: 'https://sevenarrowsrecoveryarizona.com',
    telephone: '+1-866-718-1665',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2491 W Jefferson Rd',
      addressLocality: 'Elfrida',
      addressRegion: 'AZ',
      postalCode: '85610',
      addressCountry: 'US',
    },
  },
  audience: {
    '@type': 'MedicalAudience',
    audienceType: 'Patient',
    healthCondition: { '@type': 'MedicalCondition', name: 'Co-Occurring Disorder' },
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
      { '@type': 'ListItem', position: 2, name: 'What We Treat', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat' },
      { '@type': 'ListItem', position: 3, name: 'Dual-Diagnosis', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/dual-diagnosis' },
    ],
  },
};

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
  name: 'Seven Arrows Recovery',
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '27', bestRating: '5', worstRating: '1' },
  review: [
    { '@type': 'Review', author: { '@type': 'Person', name: 'Kelly Jameson' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem." },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Jessica Collins' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Josh' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Boots' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.' },
    { '@type': 'Review', author: { '@type': 'Person', name: 'Roger McGehee' }, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, reviewBody: 'This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.' },
  ],
};

export default function DualDiagnosisPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(localBusinessJsonLd)} />
      {/* Phase 1 — shared video hero */}
      <PageHero
        label="What We Treat"
        title={[
          { text: 'Two conditions. ' },
          { text: 'One integrated plan', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: 'Dual-Diagnosis' },
        ]}
        description="When a mental-health condition and a substance use disorder show up together, only integrated care resolves them. Our dual diagnosis treatment program in Arizona treats both under one clinical team, one shared plan, one roof."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 718-1665',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Phase 2 — destructive cycle diagram */}
      <DestructiveCycle />

      {/* Phase 3 — prevalence count-ups */}
      <PrevalenceStats />

      {/* Phase 4 — common co-occurring conditions bento */}
      <ConditionsBento />

      {/* Phase 5 — parallel vs integrated comparison */}
      <ParallelVsIntegrated />

      {/* Phase 6 — our integrated approach (6-component bento) */}
      <IntegratedApproach />

      {/* Phase 7 — medication + therapy coordination */}
      <MedTherapySynergy />

      {/* Phase 8 — trauma-informed layer */}
      <TraumaLayer />

      {/* Phase 9 — dual-diagnosis alumni voices were hardcoded
          fabricated quotes; removed under the real-reviews-only
          policy. Restore via the public.google_reviews cache once the
          BP API approval lands and we have enough verified
          dual-diagnosis-relevant testimony. */}

      {/* Phase 9b — GEO extractive answer block (mirrors the FAQ JSON-LD) */}
      <GeoAnswer
        id="dual-diagnosis-treatment-arizona"
        question="Dual diagnosis treatment in Arizona"
        tone="bg"
        answer={
          <p>
            Seven Arrows Recovery provides integrated dual diagnosis treatment in Arizona,
            on a 160-acre ranch in Cochise County, for adults living with both a mental-health
            condition and a substance use disorder. One clinical team — psychiatrist, therapist,
            and medical staff — treats both under a single shared plan, with trauma-informed care
            at the center, so the two conditions are resolved together instead of in separate,
            disconnected programs.
          </p>
        }
        bullets={[
          { label: 'One team, one plan', body: 'The psychiatrist, therapist, and medical team round on every client together so a change in one layer of care immediately informs the others.' },
          { label: 'Conditions treated', body: 'Depression, anxiety, PTSD, bipolar disorder, panic disorder, OCD, borderline personality disorder, and ADHD — alongside the substance use disorder.' },
          { label: 'Trauma at the center', body: 'Forward-Facing® Accelerated Recovery, EMDR, IFS, and DBT treat the trauma underneath both conditions, titrated and consent-based.' },
          { label: 'Comprehensive psychiatric assessment', body: 'Every admission starts with a full psychiatric and clinical evaluation that builds one unified roadmap, not two parallel ones.' },
        ]}
        sources={[
          { label: 'NIDA — Comorbidity: Substance Use & Mental Disorders', href: 'https://nida.nih.gov/research-topics/comorbidity' },
          { label: 'SAMHSA — National Helpline', href: 'https://www.samhsa.gov/find-help/national-helpline' },
        ]}
      />

      {/* Phase 10 — closing CTA */}
      <DualCTA />
    </>
  );
}
