import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase-server';
import type { Layout } from '@/lib/content-claude';
import DbBlogRenderer from '@/components/DbBlogRenderer';

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
}

async function loadPublished(slug: string): Promise<BlogRow | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('blogs')
    .select('id, slug, title, status, body_markdown, layout, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return (data as BlogRow | null) ?? null;
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

  return (
    <>
      <DbBlogRenderer layout={row.layout} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: row.title ?? '',
            datePublished: row.published_at,
            author: { '@type': 'Organization', name: 'Seven Arrows Recovery' },
            publisher: { '@type': 'Organization', name: 'Seven Arrows Recovery' },
            mainEntityOfPage: `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${row.slug}`,
          }),
        }}
      />
    </>
  );
}
