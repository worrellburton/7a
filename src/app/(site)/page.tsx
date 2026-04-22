import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery is a premier drug and alcohol rehab center in Arizona. We provide clinical and residential treatment in a small group setting at the base of the Swisshelm Mountains. Call (866) 996-4308.',
};

import { PersonaProvider } from '@/components/landing/PersonaContext';
import TrustRibbon from '@/components/landing/TrustRibbon';
import LandingHero from '@/components/landing/LandingHero';
import PersonaSplitter from '@/components/landing/PersonaSplitter';
import ProofBand from '@/components/landing/ProofBand';
import Differentiator from '@/components/landing/Differentiator';
import CampusMap from '@/components/landing/CampusMap';
import DayAtRanch from '@/components/landing/DayAtRanch';
import GoogleReviewsCinema from '@/components/GoogleReviewsCinema';
import InsuranceTransparency from '@/components/landing/InsuranceTransparency';
import PersonaFAQ from '@/components/landing/PersonaFAQ';
import LandingClose from '@/components/landing/LandingClose';
import ExitIntentModal from '@/components/landing/ExitIntentModal';
import StickyMobileCTA from '@/components/StickyMobileCTA';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  '@id': 'https://sevenarrowsrecovery.com/#organization',
  name: 'Seven Arrows Recovery',
  description:
    'A boutique drug and alcohol rehab center in Arizona offering clinical and residential treatment with a TraumAddiction™ specialty approach.',
  url: 'https://sevenarrowsrecovery.com',
  telephone: '+1-866-996-4308',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '2491 W Jefferson Rd',
    addressLocality: 'Elfrida',
    addressRegion: 'AZ',
    postalCode: '85610',
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 31.9, longitude: -109.9 },
  areaServed: [
    { '@type': 'State', name: 'Arizona' },
    { '@type': 'City', name: 'Phoenix' },
    { '@type': 'City', name: 'Scottsdale' },
    { '@type': 'City', name: 'Tucson' },
    { '@type': 'City', name: 'Mesa' },
    { '@type': 'City', name: 'Tempe' },
    { '@type': 'City', name: 'Glendale' },
  ],
  medicalSpecialty: 'Addiction Medicine',
  isAcceptingNewPatients: true,
  currenciesAccepted: 'USD',
  paymentAccepted: 'Insurance, Private Pay',
  hasCredential: [
    { '@type': 'EducationalOccupationalCredential', credentialCategory: 'JCAHO Accredited' },
    { '@type': 'EducationalOccupationalCredential', credentialCategory: 'LegitScript Certified' },
    { '@type': 'EducationalOccupationalCredential', credentialCategory: 'HIPAA Compliant' },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '28',
    bestRating: '5',
  },
  priceRange: '$$$$',
};

const breadcrumbData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
  ],
};

export default function Home() {
  return (
    <PersonaProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      {/* Cross-cutting: always-visible trust ribbon above every phase. */}
      <TrustRibbon />

      {/* Phase 1 — hero + instant-trust stack */}
      <LandingHero />

      {/* Phase 2 — dual-persona splitter (biggest conversion lever on the page) */}
      <PersonaSplitter />

      {/* Everything below re-renders based on persona choice */}
      <div id="landing-below-splitter" className="scroll-mt-24" />

      {/* Phase 3 — proof band: stats + inline testimonials + accreditations */}
      <ProofBand />

      {/* Phase 4 — why us, specifically: animated side-by-side comparison */}
      <Differentiator />

      {/* Phase 5 — interactive campus map */}
      <CampusMap />

      {/* Phase 6 — a day at the ranch (scroll-coupled image well + timeline) */}
      <DayAtRanch />

      {/* Phase 7 — cinematic real-stories carousel (existing — unchanged) */}
      <GoogleReviewsCinema />

      {/* Phase 8 — insurance transparency + admissions form with upload */}
      <InsuranceTransparency />

      {/* Phase 9 — persona-tabbed FAQ (second biggest lever) */}
      <PersonaFAQ />

      {/* Phase 10 — closing conversion stack: live indicator + tri-CTA */}
      <LandingClose />

      {/* Cross-cutting: one-shot exit-intent rescue modal */}
      <ExitIntentModal />

      {/* Existing mobile sticky CTA stays — tap-to-call always visible */}
      <StickyMobileCTA />
    </PersonaProvider>
  );
}
