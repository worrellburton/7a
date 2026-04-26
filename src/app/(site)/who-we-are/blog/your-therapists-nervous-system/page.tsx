import type { Metadata } from 'next';
import { EPISODES } from '@/lib/episodes';
import PageContent from './content';

const SLUG = 'your-therapists-nervous-system';
const ep = EPISODES.find((e) => e.slug === SLUG)!;
const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${SLUG}`;
const title = `${ep.title} | Seven Arrows Recovery`;
const description =
  "Co-regulation, regulated presence, and why a clinician who's done their own work makes therapy actually land. Plus the warning signs of a therapist who's performing calm.";

export const metadata: Metadata = {
  title,
  description,
  keywords:
    'co-regulation therapy, regulated presence, polyvagal therapy, nervous system therapist, somatic therapist, therapist self-regulation, why therapy isn’t working, signs of a bad therapist, trauma-informed therapist',
  alternates: { canonical: url },
  openGraph: {
    type: 'article',
    url,
    title: ep.title,
    description,
    images: [{ url: ep.image, alt: ep.imageAlt }],
    siteName: 'Seven Arrows Recovery',
    publishedTime: ep.publishedAt,
    authors: ['Seven Arrows Recovery Clinical Team'],
    tags: [
      'Recovery Roadmap',
      'Co-regulation',
      'Polyvagal',
      'Therapist regulation',
      'Trauma therapy',
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: ep.title,
    description,
    images: [ep.image],
  },
};

// Article + BreadcrumbList JSON-LD for rich snippets. Inlined in the
// server component so it ships with the HTML payload (Google reads
// JSON-LD that's present at first render — script tags injected by
// client JS are picked up less reliably).
const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: ep.title,
  description,
  image: [ep.image],
  datePublished: ep.publishedAt,
  dateModified: ep.publishedAt,
  author: {
    '@type': 'Organization',
    name: 'Seven Arrows Recovery Clinical Team',
    url: 'https://sevenarrowsrecoveryarizona.com/who-we-are',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Seven Arrows Recovery',
    url: 'https://sevenarrowsrecoveryarizona.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://sevenarrowsrecoveryarizona.com/logo.png',
    },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  isPartOf: {
    '@type': 'CreativeWorkSeries',
    name: 'The Recovery Roadmap',
    url: 'https://sevenarrowsrecoveryarizona.com/who-we-are/recovery-roadmap',
  },
  articleSection: 'Recovery Roadmap',
  keywords: [
    'co-regulation',
    'regulated presence',
    'polyvagal',
    'somatic therapy',
    'nervous system',
    'therapist self-regulation',
  ].join(', '),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com/' },
    { '@type': 'ListItem', position: 2, name: 'Who We Are', item: 'https://sevenarrowsrecoveryarizona.com/who-we-are' },
    { '@type': 'ListItem', position: 3, name: 'Recovery Roadmap', item: 'https://sevenarrowsrecoveryarizona.com/who-we-are/recovery-roadmap' },
    { '@type': 'ListItem', position: 4, name: ep.title, item: url },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageContent />
    </>
  );
}
