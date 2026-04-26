import type { Metadata } from 'next';
import { EPISODES } from '@/lib/episodes';
import PageContent from './content';

const SLUG = 'salutogenic-not-pathological';
const ep = EPISODES.find((e) => e.slug === SLUG)!;
const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${SLUG}`;
const description =
  "The DSM mindset says you are what's wrong with you. The salutogenic frame says you are what's underneath, still intact, waiting to surface. Why self-leadership beats symptom management for 5-year outcomes.";

export const metadata: Metadata = {
  title: `${ep.title} | Seven Arrows Recovery`,
  description,
  keywords:
    'salutogenic recovery, salutogenesis addiction, self-leadership recovery, post-rehab outcomes, Rhoton Gentry active ingredients, beyond symptom management, strengths-based addiction treatment, sense of coherence',
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
    tags: ['Recovery Roadmap', 'Salutogenesis', 'Self-leadership', 'Strengths-based', 'Post-rehab'],
  },
  twitter: {
    card: 'summary_large_image',
    title: ep.title,
    description,
    images: [ep.image],
  },
};

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageContent />
    </>
  );
}
