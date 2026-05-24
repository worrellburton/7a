// Typed schema.org builders for the Seven Arrows marketing site.
// Single source of truth so the NAP, social URLs, geo, and opening
// hours stay in sync across the ~27 surfaces that emit JSON-LD.
//
// Every builder returns a plain object that JSON.stringify cleanly,
// matching schema.org spec at https://schema.org/. Render via the
// shared <JsonLd> component (src/components/JsonLd.tsx) so the
// `<script type="application/ld+json">` markup is consistent.
//
// When the address ever moves, change RANCH_ADDRESS in
// src/components/RanchAddress.tsx — these builders import from it.

import { RANCH_ADDRESS, RANCH_PHONE_TEL } from '@/components/RanchAddress';

// ──── Canonical references ─────────────────────────────────────

export const SITE_URL = 'https://sevenarrowsrecoveryarizona.com';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// Precise lat/lng for the ranch — pulled from the Google Places
// listing (the same coordinates the Google Maps deep link in the
// home-page schema uses). Update only when the property itself
// moves; this is the same place id Google has on file.
export const RANCH_GEO = { latitude: 31.6816641, longitude: -109.5974003 } as const;
export const RANCH_GOOGLE_MAP_URL =
  'https://www.google.com/maps/place/Seven+Arrows+Recovery/@31.6816641,-109.5974003,840m/data=!3m2!1e3!4b1!4m6!3m5!1s0x86d757b12c931e93:0x4359cfcad3b471d5!8m2!3d31.6816641!4d-109.5974003!16s%2Fg%2F11sf3vbq_s';

// Real social handles in active use. LinkedIn carries the org
// vanity, Facebook + Instagram carry the @sevenarrowsrecovery
// handle in production.
export const SOCIAL_SAME_AS = [
  'https://www.facebook.com/sevenarrowsrecovery',
  'https://www.instagram.com/sevenarrowsrecovery',
  'https://www.linkedin.com/company/sevenarrowsrecovery',
] as const;

// ──── Shared building blocks ───────────────────────────────────

const POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: RANCH_ADDRESS.streetAddress,
  addressLocality: RANCH_ADDRESS.locality,
  addressRegion: RANCH_ADDRESS.region,
  postalCode: RANCH_ADDRESS.postalCode,
  addressCountry: 'US',
} as const;

const GEO_COORDINATES = {
  '@type': 'GeoCoordinates',
  latitude: RANCH_GEO.latitude,
  longitude: RANCH_GEO.longitude,
} as const;

// 24/7 admissions intake — phone is staffed around the clock.
const ADMISSIONS_HOURS = {
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  opens: '00:00',
  closes: '23:59',
} as const;

const ADMISSIONS_CONTACT = {
  '@type': 'ContactPoint',
  telephone: RANCH_PHONE_TEL,
  contactType: 'admissions',
  areaServed: 'US',
  availableLanguage: ['English', 'Spanish'],
  hoursAvailable: ADMISSIONS_HOURS,
} as const;

// ──── Types ────────────────────────────────────────────────────

export interface AggregateRating {
  ratingValue: number;
  reviewCount: number;
}

/** Individual customer review embedded in the home-page schema. */
export interface InlineReview {
  authorName: string;
  ratingValue: number;
  reviewBody: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqQaPair {
  question: string;
  answer: string;
}

export interface ArticlePost {
  title: string;
  description: string;
  slug: string;
  /** Path relative to SITE_URL, e.g. /who-we-are/blog/foo */
  path: string;
  imageUrl?: string | null;
  publishedAt: string;
  modifiedAt?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  reviewerName?: string | null;
  reviewerUrl?: string | null;
  lastReviewedAt?: string | null;
}

interface SchemaObject {
  '@context': 'https://schema.org';
  [key: string]: unknown;
}

// ──── Builders ─────────────────────────────────────────────────

export function buildOrganizationSchema(opts: { aggregateRating?: AggregateRating } = {}): SchemaObject {
  const base: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Seven Arrows Recovery',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    contactPoint: ADMISSIONS_CONTACT,
    sameAs: [...SOCIAL_SAME_AS],
    address: POSTAL_ADDRESS,
    foundingDate: '2020',
    numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
    areaServed: [
      { '@type': 'State', name: 'Arizona' },
      { '@type': 'City', name: 'Phoenix' },
      { '@type': 'City', name: 'Scottsdale' },
      { '@type': 'City', name: 'Tucson' },
      { '@type': 'City', name: 'Mesa' },
    ],
  };
  if (opts.aggregateRating) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.aggregateRating.ratingValue,
      reviewCount: opts.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return base;
}

export function buildLocalBusinessSchema(opts: { aggregateRating?: AggregateRating } = {}): SchemaObject {
  const base: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#local-business`,
    name: 'Seven Arrows Recovery',
    url: SITE_URL,
    telephone: RANCH_PHONE_TEL,
    image: `${SITE_URL}/hero/facility-exterior-mountains.jpg`,
    address: POSTAL_ADDRESS,
    geo: GEO_COORDINATES,
    openingHoursSpecification: ADMISSIONS_HOURS,
    priceRange: '$$$',
    sameAs: [...SOCIAL_SAME_AS],
  };
  if (opts.aggregateRating) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.aggregateRating.ratingValue,
      reviewCount: opts.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return base;
}

export function buildMedicalBusinessSchema(opts: {
  aggregateRating?: AggregateRating;
  /** When set, schema declares the three combined types Google's
   *  rich-results validator likes for residential treatment
   *  facilities. Defaults to true. */
  combineTypes?: boolean;
  /** Google Maps deep link surfaced as `hasMap`. */
  hasMap?: string;
  /** Inline customer reviews — kept short so the schema doesn't
   *  balloon. Five 5-star reviews is the validator's sweet spot. */
  reviews?: InlineReview[];
} = {}): SchemaObject {
  const combine = opts.combineTypes ?? true;
  const base: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': combine ? ['Organization', 'MedicalBusiness', 'LocalBusiness'] : ['MedicalBusiness', 'LocalBusiness'],
    '@id': combine ? ORGANIZATION_ID : `${SITE_URL}/#medical-business`,
    name: 'Seven Arrows Recovery',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    image: `${SITE_URL}/hero/facility-exterior-mountains.jpg`,
    telephone: RANCH_PHONE_TEL,
    address: POSTAL_ADDRESS,
    geo: GEO_COORDINATES,
    hasMap: opts.hasMap,
    openingHoursSpecification: ADMISSIONS_HOURS,
    medicalSpecialty: 'Psychiatry',
    contactPoint: ADMISSIONS_CONTACT,
    sameAs: [...SOCIAL_SAME_AS],
    foundingDate: '2020',
    numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
    areaServed: [
      { '@type': 'State', name: 'Arizona' },
      { '@type': 'City', name: 'Phoenix' },
      { '@type': 'City', name: 'Scottsdale' },
      { '@type': 'City', name: 'Tucson' },
      { '@type': 'City', name: 'Mesa' },
    ],
  };
  if (opts.aggregateRating) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.aggregateRating.ratingValue,
      reviewCount: opts.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (opts.reviews && opts.reviews.length > 0) {
    base.review = opts.reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.authorName },
      reviewRating: { '@type': 'Rating', ratingValue: r.ratingValue, bestRating: 5 },
      reviewBody: r.reviewBody,
    }));
  }
  // Strip any undefined keys so JSON.stringify renders cleanly.
  for (const k of Object.keys(base)) {
    if (base[k] === undefined) delete base[k];
  }
  return base;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: it.url.startsWith('http') ? it.url : `${SITE_URL}${it.url.startsWith('/') ? '' : '/'}${it.url}`,
    })),
  };
}

export function buildFAQSchema(qaPairs: FaqQaPair[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qaPairs.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  };
}

export function buildArticleSchema(post: ArticlePost): SchemaObject {
  const url = post.path.startsWith('http') ? post.path : `${SITE_URL}${post.path.startsWith('/') ? '' : '/'}${post.path}`;
  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt ?? post.publishedAt,
    publisher: { '@id': ORGANIZATION_ID },
  };
  if (post.imageUrl) {
    schema.image = post.imageUrl;
  }
  if (post.authorName) {
    schema.author = post.authorUrl
      ? { '@type': 'Person', name: post.authorName, url: post.authorUrl }
      : { '@type': 'Person', name: post.authorName };
  }
  if (post.reviewerName) {
    schema.reviewedBy = post.reviewerUrl
      ? { '@type': 'Person', name: post.reviewerName, url: post.reviewerUrl }
      : { '@type': 'Person', name: post.reviewerName };
  }
  if (post.lastReviewedAt) {
    schema.lastReviewed = post.lastReviewedAt;
  }
  return schema;
}

// Helper for the WebSite mark — narrower than Organization so search
// engines can pull SearchAction sitelinks if we ever add them.
export function buildWebSiteSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Seven Arrows Recovery',
    url: SITE_URL,
    publisher: { '@id': ORGANIZATION_ID },
  };
}
