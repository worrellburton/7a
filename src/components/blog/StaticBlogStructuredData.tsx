import { getAdminSupabase } from '@/lib/supabase-server';
import {
  isNoneSlug,
  resolveAuthorAsync,
  resolveReviewerAsync,
} from '@/lib/blogAuthors';
import { BlogPostJsonLd } from './BlogPostMeta';
import type { Episode } from '@/lib/episodes';

// Server component used by hand-coded blog page.tsx files. Reads
// public.static_blog_meta for per-slug overrides (author_slug,
// reviewer_slug, last_reviewed_at, schema_json) and emits:
//
//   * BlogPostJsonLd — MedicalWebPage with the resolved Person
//     nodes; null author/reviewer suppress those branches.
//   * FAQPage — when meta.schema_json.faq has entries.
//   * BlogPosting (Article subtype) — when meta.schema_json.article
//     is set.
//
// Reads degrade gracefully: a missing static_blog_meta row + a
// missing schema_json column both fall through to the seeded
// episode defaults, so legacy posts keep rendering even before the
// dashboard has been opened.

interface MetaRow {
  author_slug: string | null;
  reviewer_slug: string | null;
  last_reviewed_at: string | null;
  schema_json: {
    faq?: { question: string; answer: string }[];
    article?: {
      headline?: string;
      description?: string;
      keywords?: string[];
      wordCount?: number;
      articleSection?: string;
    };
  } | null;
}

async function loadMeta(slug: string): Promise<MetaRow | null> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('static_blog_meta')
    .select('author_slug, reviewer_slug, last_reviewed_at, schema_json')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[static_blog_meta] read failed, falling back to defaults:', error.message);
    return null;
  }
  return (data as MetaRow | null) ?? null;
}

export default async function StaticBlogStructuredData({ episode }: { episode: Episode }) {
  const meta = await loadMeta(episode.slug);

  const authorSlug = meta?.author_slug ?? episode.authorSlug ?? null;
  const reviewerSlug = meta?.reviewer_slug ?? episode.reviewerSlug ?? null;
  const lastReviewedAt = meta?.last_reviewed_at ?? episode.lastReviewedAt ?? null;

  const suppressAuthor = isNoneSlug(authorSlug);
  const suppressReviewer = isNoneSlug(reviewerSlug);

  // resolveAuthorAsync hits the users table so HR-edited bio /
  // credentials / linkedin win over the BLOG_AUTHORS seed.
  const [author, reviewer] = await Promise.all([
    suppressAuthor ? Promise.resolve(undefined) : resolveAuthorAsync(authorSlug),
    suppressReviewer ? Promise.resolve(undefined) : resolveReviewerAsync(reviewerSlug),
  ]);

  // Pass the override episode through so BlogPostJsonLd.lastReviewed
  // honours the dashboard's "Mark reviewed today" stamp.
  const episodeForLd: Episode = {
    ...episode,
    lastReviewedAt: lastReviewedAt ?? undefined,
  };

  const liveUrl = episode.href
    ? `https://sevenarrowsrecoveryarizona.com${episode.href.startsWith('/') ? episode.href : `/${episode.href}`}`
    : `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${episode.slug}`;

  const faq = meta?.schema_json?.faq && meta.schema_json.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: meta.schema_json.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null;

  const article = meta?.schema_json?.article
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: meta.schema_json.article.headline || episode.title,
        description: meta.schema_json.article.description || undefined,
        keywords: meta.schema_json.article.keywords?.length ? meta.schema_json.article.keywords.join(', ') : undefined,
        wordCount: meta.schema_json.article.wordCount || undefined,
        articleSection: meta.schema_json.article.articleSection || undefined,
        url: liveUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': liveUrl },
        datePublished: episode.publishedAt,
        dateModified: lastReviewedAt ?? episode.publishedAt,
        inLanguage: 'en-US',
        publisher: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
      }
    : null;

  return (
    <>
      <BlogPostJsonLd
        episode={episodeForLd}
        author={author ?? undefined}
        reviewer={reviewer ?? undefined}
        suppressAuthor={suppressAuthor}
        suppressReviewer={suppressReviewer}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}
      {article && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
        />
      )}
    </>
  );
}
