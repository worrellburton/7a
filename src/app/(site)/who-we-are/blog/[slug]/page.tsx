import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase-server';
import type { Layout } from '@/lib/content-claude';
import DbBlogRenderer from '@/components/DbBlogRenderer';
import { AuthorByline, BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import type { Episode } from '@/lib/episodes';
import { resolveAuthorAsync, resolveReviewerAsync } from '@/lib/blogAuthors';

// Public renderer for DB-backed blog posts. Static folders under
// /who-we-are/blog/<slug>/ take precedence (Next.js routes static
// segments before dynamic ones), so the existing seven hand-coded
// posts keep working unchanged; only AI-pipeline slugs that don't
// match a static folder land here.

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
}

async function loadPublished(slug: string): Promise<BlogRow | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('blogs')
    .select('id, slug, title, status, body_markdown, layout, published_at, author_slug, reviewer_slug, last_reviewed_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
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

export default async function DbBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await loadPublished(slug);
  if (!row || !row.layout) notFound();

  const episode = episodeFromBlog(row);
  // Pre-resolve author + reviewer from the DB so an HR-edited
  // users row (linkedin_url, credentials, bio) wins over the
  // BLOG_AUTHORS seed at render time.
  const [author, reviewer] = await Promise.all([
    resolveAuthorAsync(row.author_slug),
    resolveReviewerAsync(row.reviewer_slug),
  ]);

  return (
    <>
      <BlogPostJsonLd episode={episode} author={author} reviewer={reviewer} />
      {/* Byline rides above the layout body, mirroring how the
          static hand-coded posts compose Hero → Byline → Content.
          DbBlogRenderer owns the hero block, so the byline goes
          right after the renderer's max-width wrapper has opened. */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <AuthorByline episode={episode} author={author} reviewer={reviewer} />
      </div>
      <DbBlogRenderer layout={row.layout} />
    </>
  );
}
