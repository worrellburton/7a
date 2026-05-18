import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { benzoContent } from '@/lib/substances/benzodiazepine';
import { jsonLdScript } from '@/lib/seo/pageSchema';

export const metadata: Metadata = {
  title: 'Benzo Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Medically supervised benzo tapering and residential treatment in Arizona — individualized long-arc tapers and 24/7 monitoring. Call (866) 718-1665.',
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/benzodiazepine#webpage',
  url: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/benzodiazepine',
  name: 'Benzodiazepine Addiction & Withdrawal Treatment | Seven Arrows Recovery',
  description:
    'Medically-supervised benzodiazepine taper and residential treatment in Arizona. Long-arc tapering protocol, somatic therapy, trauma-informed care, and dual-diagnosis treatment for prescribed long-term users, panic self-medicators, and poly-substance patterns.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#website',
    url: 'https://sevenarrowsrecoveryarizona.com',
    name: 'Seven Arrows Recovery',
  },
  about: {
    '@type': 'MedicalCondition',
    '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/benzodiazepine#condition',
    name: 'Benzodiazepine Use Disorder',
    alternateName: [
      'Benzo Dependence',
      'Benzodiazepine Addiction',
      'Benzodiazepine Withdrawal',
      'Benzo Withdrawal Syndrome',
      'Iatrogenic Benzo Dependence',
    ],
    associatedAnatomy: { '@type': 'AnatomicalSystem', name: 'Central Nervous System' },
    possibleTreatment: [
      {
        '@type': 'MedicalTherapy',
        name: 'Medically-Supervised Long-Arc Taper',
        description:
          'An addiction-medicine physician holds a slow, structured taper — often using a long-half-life benzo as a bridge — with reductions of 5–10% held for days or weeks at a time. Somatic-CBT therapy supports the nervous system between each cut.',
      },
      {
        '@type': 'MedicalTherapy',
        name: '24/7 Medical Oversight',
        description:
          'Seizure-precaution protocols, cardiovascular monitoring, and bridge medications including gabapentin, clonidine, and hydroxyzine when indicated to make the taper tolerable.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Trauma-Informed Therapy',
        description:
          'Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced carefully so processing does not destabilize the taper. Often begins mid-taper or post-taper.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Panic and Sleep Reconditioning',
        description:
          'Structured CBT for panic disorder, sleep-hygiene rebuilding, and graded exposure work — so the symptoms benzos were masking have their own direct treatment pathway.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Equine-Assisted Therapy',
        description:
          'Horses mirror nervous-system activation. Clients tapering benzos learn what safe down-regulation physically feels like without medication.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Breathwork, Yoga, and Sound Therapy',
        description:
          'Parasympathetic-activating practices that train the nervous system to self-regulate. These carry more clinical weight in benzo recovery than in almost any other substance protocol.',
      },
      {
        '@type': 'MedicalTherapy',
        name: 'Dual-Diagnosis Care',
        description:
          'Integrated treatment for panic disorder, PTSD, insomnia, and other conditions most commonly present underneath long-term benzodiazepine use.',
      },
    ],
  },
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
    healthCondition: { '@type': 'MedicalCondition', name: 'Benzodiazepine Use Disorder' },
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
      { '@type': 'ListItem', position: 2, name: 'What We Treat', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Benzodiazepine',
        item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/benzodiazepine',
      },
    ],
  },
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://sevenarrowsrecoveryarizona.com/#organization',
  name: 'Seven Arrows Recovery',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '27',
    bestRating: '5',
    worstRating: '1',
  },
  review: [
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Kelly Jameson' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem.",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Jessica Collins' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Josh' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Boots' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Roger McGehee' },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody:
        'This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.',
    },
  ],
};

export default function BenzoAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(medicalWebPageSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(localBusinessSchema)} />
      <SubstancePage10Phase content={benzoContent} labelAs="h1" titleAs="h2" />
    </>
  );
}
