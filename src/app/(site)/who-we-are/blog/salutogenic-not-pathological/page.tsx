import type { Metadata } from 'next';
import { EPISODES, episodeImage } from '@/lib/episodes';
import { findAuthorBySlug } from '@/lib/blogAuthors';
import { BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import PageContent from './content';

const SLUG = 'salutogenic-not-pathological';
const ep = EPISODES.find((e) => e.slug === SLUG)!;
const author = findAuthorBySlug(ep.authorSlug);
const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${SLUG}`;
const description =
  "The DSM says you are what's wrong with you — the salutogenic frame says you are what's underneath. Why self-leadership beats symptom management long-term.";

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
    images: [{ url: episodeImage(ep), alt: ep.imageAlt }],
    siteName: 'Seven Arrows Recovery',
    publishedTime: ep.publishedAt,
    authors: author ? [author.name] : ['Seven Arrows Recovery Clinical Team'],
    tags: ['Recovery Roadmap', 'Salutogenesis', 'Self-leadership', 'Strengths-based', 'Post-rehab'],
  },
  twitter: {
    card: 'summary_large_image',
    title: ep.title,
    description,
    images: [episodeImage(ep)],
  },
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
      <BlogPostJsonLd episode={ep} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageContent />
    </>
  );
}
