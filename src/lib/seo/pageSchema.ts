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
