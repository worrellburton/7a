import type { Metadata } from 'next';
import { EPISODES, episodeImage } from '@/lib/episodes';
import { findAuthorBySlug } from '@/lib/blogAuthors';
import { BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import PageContent from './content';

const SLUG = 'your-therapists-nervous-system';
const ep = EPISODES.find((e) => e.slug === SLUG)!;
const author = findAuthorBySlug(ep.authorSlug);
const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${SLUG}`;
const title = `${ep.title} | Seven Arrows Recovery`;
const description =
  "Co-regulation, regulated presence, and why a clinician who's done their own work makes therapy actually land. Plus the warning signs of a therapist who's performing calm.";

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

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
    images: [{ url: episodeImage(ep), alt: ep.imageAlt }],
    siteName: 'Seven Arrows Recovery',
    publishedTime: ep.publishedAt,
    authors: author ? [author.name] : ['Seven Arrows Recovery Clinical Team'],
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
    images: [episodeImage(ep)],
  },
};

// BreadcrumbList stays inline (BlogPostJsonLd is Article-only).
// The Article JSON-LD itself moves into BlogPostJsonLd so the
// author Person + publisher Organization references match what's
// rendered in the visible byline.
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
      <BlogPostJsonLd episode={ep} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageContent />
    </>
  );
}
