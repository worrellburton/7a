import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase-server';
import type { Layout } from '@/lib/content-claude';
import DbBlogRenderer from '@/components/DbBlogRenderer';
import LiveBlogEditor from '@/components/LiveBlogEditor';
import { AuthorByline, BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import type { Episode } from '@/lib/episodes';
import { isNoneSlug, resolveAuthorAsync, resolveReviewerAsync } from '@/lib/blogAuthors';

// Public renderer for DB-backed blog posts. Static folders under
// /who-we-are/blog/<slug>/ take precedence (Next.js routes static
// segments before dynamic ones), so the existing seven hand-coded
// posts keep working unchanged; only AI-pipeline slugs that don't
// match a static folder land here.

// Always render against the latest DB state so post-publish edits to
// byline (author / reviewer / last-reviewed-at), generated schema,
// or layout reach the live page without redeploying. Without this,
// Next.js can serve a cached HTML snapshot from build time and the
// editor's E-E-A-T panel feels broken even though the PATCH saved.
export const revalidate = 0;

interface GeneratedSchema {
  faq: { question: string; answer: string }[];
  article: {
    headline: string;
    description: string;
    keywords: string[];
    wordCount: number;
    articleSection: string;
  };
}

interface BlogRow {
  id: string;
  slug: string;
  title: string | null;
  status: string;
  body_markdown: string | null;
  layout: Layout | null;
  published_at: string | null;
  author_slug: string | null;
  reviewer_slug: string | null;
  last_reviewed_at: string | null;
  schema_json: GeneratedSchema | null;
}

// Walks the layout and swaps any image block (or hero image) whose
// URL no longer exists in blog_images for the matching current URL,
// matched by alt text. Layout JSON gets stale when images are
// regenerated — the layout was built before the swap so its URLs
// point at storage paths that 404. Looking the alt up in the live
// blog_images table heals the drift at render time.
function reconcileLayoutImages(layout: Layout, images: Array<{ url: string; alt: string | null }>): Layout {
  if (!images.length) return layout;
  const validUrls = new Set(images.map((i) => i.url));
  const byAlt = new Map<string, string>();
  for (const img of images) {
    if (img.alt && !byAlt.has(img.alt)) byAlt.set(img.alt, img.url);
  }
  const fixUrl = (url: string | undefined, alt: string | undefined): string | undefined => {
    if (!url) return url;
    if (validUrls.has(url)) return url;
    if (alt && byAlt.has(alt)) return byAlt.get(alt);
    return url;
  };
  const blocks = layout.blocks.map((b) => {
    if (b.type === 'image') {
      const next = fixUrl(b.url, b.alt);
      return next && next !== b.url ? { ...b, url: next } : b;
    }
    if (b.type === 'hero' && b.image) {
      const next = fixUrl(b.image.url, b.image.alt);
      return next && next !== b.image.url ? { ...b, image: { ...b.image, url: next } } : b;
    }
    return b;
  });
  return { ...layout, blocks };
}

async function loadPublished(slug: string): Promise<BlogRow | null> {
  const admin = getAdminSupabase();
  // Try the full select first (includes schema_json). If the DB hasn't
  // had the migration applied yet, fall back to a smaller select so
  // the post still renders — per CLAUDE.md "make reads resilient".
  const { data, error } = await admin
    .from('blogs')
    .select('id, slug, title, status, body_markdown, layout, published_at, author_slug, reviewer_slug, last_reviewed_at, schema_json')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.warn('[blog] schema_json column missing, falling back to legacy select', error.message);
    const { data: legacy } = await admin
      .from('blogs')
      .select('id, slug, title, status, body_markdown, layout, published_at, author_slug, reviewer_slug, last_reviewed_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    return legacy ? ({ ...(legacy as Omit<BlogRow, 'schema_json'>), schema_json: null }) : null;
  }
  return (data as BlogRow | null) ?? null;
}

// Adapt a DB blog row into the Episode shape BlogPostMeta consumes.
// Author / reviewer slugs come straight from the DB columns;
// resolveAuthor() / resolveReviewer() in blogAuthors fill in
// defaults when null so legacy rows still get a credentialed
// reviewer in the JSON-LD.
function episodeFromBlog(row: BlogRow): Episode {
  const heroBlock = row.layout?.blocks?.find((b) => b.type === 'hero');
  const heroImage = (heroBlock as { image?: { url?: string; alt?: string } } | undefined)?.image;
  const publishedAt = row.published_at ?? new Date().toISOString();
  return {
    number: 0,
    slug: row.slug,
    title: row.title ?? 'Untitled',
    blurb: row.body_markdown?.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.slice(0, 220) ?? '',
    publishedAt,
    publishedDisplay: new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    image: heroImage?.url ?? '/images/og-default.jpg',
    imageAlt: heroImage?.alt ?? row.title ?? 'Seven Arrows Recovery',
    authorSlug: row.author_slug ?? undefined,
    reviewerSlug: row.reviewer_slug ?? undefined,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const row = await loadPublished(slug);
  if (!row) return { title: 'Not Found' };
  const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${row.slug}`;
  const description = row.body_markdown?.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.slice(0, 220);
  const heroImg = row.layout?.blocks?.find((b) => b.type === 'hero' && (b as { image?: { url?: string } }).image?.url);
  const ogImage = (heroImg as { image?: { url?: string } } | undefined)?.image?.url;
  return {
    title: `${row.title ?? 'Untitled'} | Seven Arrows Recovery`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: row.title ?? 'Untitled',
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      siteName: 'Seven Arrows Recovery',
      publishedTime: row.published_at ?? undefined,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function DbBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { slug } = await params;
  const { edit } = await searchParams;
  const editMode = edit === '1';
  const row = await loadPublished(slug);
  if (!row || !row.layout) notFound();

  const episode = episodeFromBlog(row);
  // Pre-resolve author + reviewer from the DB so an HR-edited
  // users row (linkedin_url, credentials, bio) wins over the
  // BLOG_AUTHORS seed at render time.
  const [author, reviewer, blogImages] = await Promise.all([
    resolveAuthorAsync(row.author_slug),
    resolveReviewerAsync(row.reviewer_slug),
    // Pull the live blog_images list so we can heal stale URLs in
    // the layout — image regenerations rewrite storage paths but
    // the layout JSON keeps the old ones, producing broken <img>
    // tags. reconcileLayoutImages() swaps them back by alt text.
    (async () => {
      const admin = getAdminSupabase();
      const { data } = await admin
        .from('blog_images')
        .select('url, alt')
        .eq('blog_id', row.id);
      return (data ?? []) as Array<{ url: string; alt: string | null }>;
    })(),
  ]);
  const reconciledLayout = reconcileLayoutImages(row.layout, blogImages);

  const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${row.slug}`;
  const faqJsonLd = row.schema_json?.faq && row.schema_json.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: row.schema_json.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null;
  const articleJsonLd = row.schema_json?.article
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: row.schema_json.article.headline || row.title,
        description: row.schema_json.article.description || undefined,
        keywords: row.schema_json.article.keywords?.length ? row.schema_json.article.keywords.join(', ') : undefined,
        wordCount: row.schema_json.article.wordCount || undefined,
        articleSection: row.schema_json.article.articleSection || undefined,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        datePublished: row.published_at ?? undefined,
        dateModified: row.last_reviewed_at ?? row.published_at ?? undefined,
        inLanguage: 'en-US',
        publisher: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
      }
    : null;

  // null author_slug now also means "no byline" — the resolver default
  // is None, not Lindsay, so an unset slug suppresses the byline +
  // Person JSON-LD just like the explicit None sentinel does. Horse
  // bylines (`horse-<uuid>`) are picker-only for now and also suppress
  // here — the live page treats them as "no byline" until we wire a
  // proper horse byline renderer.
  const isHorseSlug = (s: string | null) => !!s && s.startsWith('horse-');
  const authorSuppressed = !row.author_slug || isNoneSlug(row.author_slug) || isHorseSlug(row.author_slug);
  const reviewerSuppressed = !row.reviewer_slug || isNoneSlug(row.reviewer_slug) || isHorseSlug(row.reviewer_slug);
  const renderedAuthor = authorSuppressed ? null : author;
  const renderedReviewer = reviewerSuppressed ? null : reviewer;
  const showByline = !authorSuppressed || !reviewerSuppressed;

  return (
    <>
      <BlogPostJsonLd
        episode={episode}
        author={renderedAuthor ?? undefined}
        reviewer={renderedReviewer ?? undefined}
        suppressAuthor={authorSuppressed}
        suppressReviewer={reviewerSuppressed}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      {/* Byline now rides AFTER the hero (image + title + tagline)
          inside DbBlogRenderer instead of above it, so the read
          order is Hero → Title → Byline → Content. The renderer
          splices the byline in right after the first hero block;
          posts without a hero get it at the very top. */}
      {editMode ? (
        <LiveBlogEditor
          blogId={row.id}
          initialLayout={reconciledLayout}
          byline={showByline ? (
            <AuthorByline
              episode={episode}
              author={renderedAuthor ?? undefined}
              reviewer={renderedReviewer ?? undefined}
              suppressAuthor={authorSuppressed}
              suppressReviewer={reviewerSuppressed}
            />
          ) : undefined}
        />
      ) : (
        <DbBlogRenderer
          layout={reconciledLayout}
          byline={showByline ? (
            <AuthorByline
              episode={episode}
              author={renderedAuthor ?? undefined}
              reviewer={renderedReviewer ?? undefined}
              suppressAuthor={authorSuppressed}
              suppressReviewer={reviewerSuppressed}
            />
          ) : undefined}
        />
      )}
    </>
  );
}
