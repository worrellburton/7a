import type { Metadata } from 'next';
import { EPISODES } from '@/lib/episodes';
import PageContent from './content';

const SLUG = 'polyvagal-in-plain-english';
const ep = EPISODES.find((e) => e.slug === SLUG)!;
const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${SLUG}`;
const description =
  "The three nervous-system states you live in every day — ventral, sympathetic, dorsal — explained as a ladder, in language you can actually use in the middle of a craving.";

export const metadata: Metadata = {
  title: `${ep.title} | Seven Arrows Recovery`,
  description,
  keywords:
    'polyvagal theory plain english, ventral vagal, sympathetic state, dorsal vagal, polyvagal ladder, what is dysregulated, nervous system states addiction, polyvagal craving, Stephen Porges, somatic recovery',
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
    tags: ['Recovery Roadmap', 'Polyvagal', 'Ventral vagal', 'Dorsal vagal', 'Sympathetic', 'Nervous system'],
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
