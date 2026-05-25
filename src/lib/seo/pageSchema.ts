// Small helpers to build page-level JSON-LD. Kept minimal on purpose — the
// goal is an extractive answer chunk the AI engines can lift, plus a
// MedicalWebPage/FAQPage envelope so Rich Results + GEO parsers know what
// they're looking at.

type QA = { q: string; a: string };

export function faqPageSchema(items: QA[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } as const;
}

type MedicalWebPageArgs = {
  url: string;
  name: string;
  description: string;
  specialty?: string;
  about?: Array<{ type: string; name: string; id?: string }>;
  audience?: string;
  lastReviewed?: string;
};

export function medicalWebPageSchema({
  url,
  name,
  description,
  specialty = 'Addiction Medicine',
  about = [],
  audience = 'Patients and families considering addiction treatment in Arizona',
  lastReviewed = '2026-04-24',
}: MedicalWebPageArgs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name,
    url,
    description,
    inLanguage: 'en-US',
    specialty: { '@type': 'MedicalSpecialty', name: specialty },
    audience: { '@type': 'MedicalAudience', audienceType: audience },
    about: [
      { '@type': 'MedicalBusiness', '@id': 'https://sevenarrowsrecovery.com/#organization' },
      ...about.map((a) =>
        a.id
          ? { '@type': a.type, name: a.name, '@id': a.id }
          : { '@type': a.type, name: a.name },
      ),
    ],
    isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
    lastReviewed,
    reviewedBy: {
      '@type': 'Organization',
      '@id': 'https://sevenarrowsrecovery.com/#organization',
      name: 'Seven Arrows Recovery clinical team',
    },
  } as const;
}

export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data) };
}

// LocalBusiness schema for per-city location pages. The ranch
// address stays constant across every city page (the physical
// facility is in Cochise County); `areaServed` flips per city so
// Google's Knowledge Graph + GBP parsers see a distinct
// city-coverage signal on each location URL without claiming
// multiple physical addresses we don't actually have.
type LocalBusinessArgs = {
  url: string;
  city: string;
  region?: string;
};

export function localBusinessSchema({ url, city, region = 'AZ' }: LocalBusinessArgs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    '@id': `${url}#localbusiness`,
    name: `Seven Arrows Recovery — Serving ${city}, ${region}`,
    url,
    telephone: '+1-866-718-1665',
    medicalSpecialty: 'AddictionMedicine',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '13771 E Rucker Canyon Rd',
      addressLocality: 'Pearce',
      addressRegion: 'AZ',
      postalCode: '85625',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 31.8786,
      longitude: -109.6342,
    },
    areaServed: [
      { '@type': 'City', name: `${city}, ${region}` },
      { '@type': 'AdministrativeArea', name: 'Arizona' },
    ],
    parentOrganization: {
      '@type': 'MedicalBusiness',
      '@id': 'https://sevenarrowsrecovery.com/#organization',
      name: 'Seven Arrows Recovery',
    },
  } as const;
}
