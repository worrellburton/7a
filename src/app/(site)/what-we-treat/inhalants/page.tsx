import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import GeoAnswer from '@/components/seo/GeoAnswer';
import { inhalantsContent } from '@/lib/substances/inhalants';
import { faqPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Inhalant Addiction Treatment in Arizona | Seven Arrows Recovery',
  description:
    'Residential inhalant addiction treatment in Arizona — urgent medical and neurological assessment, cognitive rehab, and trauma-informed therapy.',
};

const faqJsonLd = faqPageSchema([
  {
    q: 'Is there inhalant addiction treatment in Arizona?',
    a: 'Yes. Seven Arrows Recovery is a JCAHO-accredited residential treatment program in Cochise County, Arizona that treats inhalant use disorder. Care begins with a medical and neurological assessment, then combines B12 and nutritional rehabilitation, cognitive rehabilitation, and trauma-informed therapy on a longer recovery runway, because inhalant recovery depends on giving the brain time and the right conditions to repair.',
  },
  {
    q: 'Why do inhalants need specialized treatment?',
    a: 'Inhalants — solvents, nitrous oxide (whippets), and nitrites (poppers) — are neurotoxic and can affect the heart, peripheral nerves, and cognition. Effective treatment is neurologically informed: it establishes a medical baseline (cardiovascular review, B12 and hematology screening, neuroimaging referral when indicated) and pairs cognitive support with addiction care, rather than treating inhalant use like any other substance.',
  },
  {
    q: 'Is there a medication for inhalant withdrawal?',
    a: 'There is no FDA-approved medication specific to inhalant use disorder. Care at Seven Arrows is supportive and restorative: medical monitoring, nutritional and B12 repletion, structured cognitive rehabilitation, and trauma-informed therapy, sequenced so the nervous system has the best possible conditions to recover.',
  },
  {
    q: 'How long is residential inhalant treatment?',
    a: 'Residential stays typically run 30 to 90 days based on clinical and neurological need. Because cognitive recovery from inhalants is gradual, the clinical team documents medical necessity so the length of stay reflects what supports real repair, not just what is quick to authorize.',
  },
]);

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/inhalants#webpage',
  url: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/inhalants',
  name: 'Inhalant Addiction Treatment | Seven Arrows Recovery',
  description:
    'Residential inhalant use disorder treatment in Arizona. Neurologically-informed care with medical and neurological assessment, cognitive rehabilitation, trauma-informed therapy, and dual-diagnosis support for solvent, nitrous, and nitrite dependence.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    '@id': 'https://sevenarrowsrecoveryarizona.com/#website',
    url: 'https://sevenarrowsrecoveryarizona.com',
    name: 'Seven Arrows Recovery',
  },
  about: {
    '@type': 'MedicalCondition',
    '@id': 'https://sevenarrowsrecoveryarizona.com/what-we-treat/inhalants#condition',
    name: 'Inhalant Use Disorder',
    alternateName: [
      'Inhalant Addiction',
      'Inhalant Dependence',
      'Solvent Abuse',
      'Nitrous Oxide Dependence',
      'Whippet Addiction',
      'Poppers Addiction',
      'Volatile Substance Abuse',
    ],
    associatedAnatomy: { '@type': 'AnatomicalSystem', name: 'Central Nervous System' },
    possibleTreatment: [
      { '@type': 'MedicalTherapy', name: 'Neurologically-Informed Residential Treatment', description: 'Baseline neuropsych assessment, B12 and nutritional rehabilitation, cognitive support work, and trauma-informed therapy sequenced so the brain has the best possible conditions to repair what can be repaired.' },
      { '@type': 'MedicalTherapy', name: 'Medical and Neurological Assessment', description: 'Cardiovascular review, B12 and hematology screening, peripheral nerve assessment, and neuroimaging referral when indicated to establish a full medical baseline.' },
      { '@type': 'MedicalTherapy', name: 'Cognitive Rehabilitation', description: 'Structured attention, memory, and executive-function work paired with lifestyle protocols including sleep, nutrition, and movement that measurably support brain recovery.' },
      { '@type': 'MedicalTherapy', name: 'Trauma-Informed Therapy', description: 'Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after the early medical and cognitive picture has stabilized.' },
      { '@type': 'MedicalTherapy', name: 'Equine-Assisted Therapy', description: 'Horses mirror nervous-system states. Grounding and presence work with a non-judgmental partner helps clients rebuild embodied safety.' },
      { '@type': 'MedicalTherapy', name: 'Breathwork, Yoga, and Sound Therapy', description: 'Parasympathetic practice and embodiment work that give the nervous system back its own regulatory tools.' },
      { '@type': 'MedicalTherapy', name: 'Dual-Diagnosis Care', description: 'Integrated treatment for depression, PTSD, anxiety, and cognitive-effect-related mood disorders under one clinical team with a longer recovery runway.' },
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
    healthCondition: { '@type': 'MedicalCondition', name: 'Inhalant Use Disorder' },
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
      { '@type': 'ListItem', position: 2, name: 'What We Treat', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat' },
      { '@type': 'ListItem', position: 3, name: 'Inhalants', item: 'https://sevenarrowsrecoveryarizona.com/what-we-treat/inhalants' },
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

export default function InhalantsAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(localBusinessJsonLd)} />
      <SubstancePage10Phase content={inhalantsContent} />
      <GeoAnswer
        id="inhalant-addiction-treatment-arizona"
        question="Inhalant addiction treatment in Arizona"
        answer={
          <p>
            Seven Arrows Recovery is a JCAHO-accredited residential program in Arizona,
            on a 160-acre ranch in Cochise County, that treats inhalant use disorder with a
            neurologically-informed model. Care opens with a medical and neurological
            assessment, then layers B12 and nutritional rehabilitation, structured cognitive
            rehabilitation, and trauma-informed therapy, so the brain has the time and the
            conditions to repair what can be repaired.
          </p>
        }
        bullets={[
          { label: 'Neurological assessment first', body: 'Cardiovascular review, B12 and hematology screening, peripheral-nerve checks, and neuroimaging referral when indicated establish a full medical baseline.' },
          { label: 'Cognitive rehabilitation', body: 'Structured attention, memory, and executive-function work paired with sleep, nutrition, and movement protocols that measurably support brain recovery.' },
          { label: 'Trauma + addiction together', body: 'Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after the early medical and cognitive picture has stabilized.' },
          { label: 'Longer recovery runway', body: 'Because cognitive repair from inhalants is gradual, the length of stay reflects medical necessity rather than the fastest approvable window.' },
        ]}
        sources={[
          { label: 'NIDA — Inhalants DrugFacts', href: 'https://nida.nih.gov/publications/drugfacts/inhalants' },
          { label: 'SAMHSA — National Helpline', href: 'https://www.samhsa.gov/find-help/national-helpline' },
        ]}
      />
    </>
  );
}
