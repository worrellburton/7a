import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { getAllEpisodesNewestFirst, episodeHref, episodeImage } from '@/lib/episodes';

// GET /api/episodes/list
//
// Returns every live Recovery Roadmap episode — the static EPISODES
// table merged with published AI-pipeline blogs — plus a per-episode
// cover image so the email-campaign "Feature a blog" picker can show
// the full catalogue with episode numbers. Each row carries either a
// blog_id (DB-backed AI post) or null (static episode), so the
// picker can disambiguate how to persist the choice.

export const dynamic = 'force-dynamic';

interface BlogCover {
  url: string;
  alt: string | null;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();

  // Pull every episode (static + AI-published, dedup'd, hidden-
  // filtered) newest-first so the picker leads with the most recent.
  const episodes = await getAllEpisodesNewestFirst();

  // Need the AI-blog rows' UUID + cover image so the picker can
  // persist featured_blog_id when one of them is chosen.
  const [blogsRes, blogImagesRes] = await Promise.all([
    admin.from('blogs').select('id, slug').eq('status', 'published'),
    admin.from('blog_images').select('blog_id, url, alt, position').order('position', { ascending: true }),
  ]);
  const blogBySlug = new Map<string, { id: string }>();
  for (const b of (blogsRes.data ?? []) as Array<{ id: string; slug: string | null }>) {
    if (b.slug) blogBySlug.set(b.slug, { id: b.id });
  }
  const coverByBlogId = new Map<string, BlogCover>();
  for (const r of (blogImagesRes.data ?? []) as Array<{ blog_id: string; url: string; alt: string | null }>) {
    if (!coverByBlogId.has(r.blog_id)) coverByBlogId.set(r.blog_id, { url: r.url, alt: r.alt });
  }

  const rows = episodes.map((ep) => {
    const dbRow = blogBySlug.get(ep.slug);
    const cover = dbRow ? coverByBlogId.get(dbRow.id) : null;
    return {
      number: ep.number,
      slug: ep.slug,
      title: ep.title,
      blurb: ep.blurb,
      publishedAt: ep.publishedAt,
      publishedDisplay: ep.publishedDisplay,
      href: episodeHref(ep.slug),
      // For DB-backed AI posts, blog_id is the UUID for
      // email_campaigns.featured_blog_id. For static episodes blog_id
      // is null and the picker stores the slug in
      // email_campaigns.featured_episode_slug.
      blog_id: dbRow?.id ?? null,
      coverImageUrl: cover?.url ?? episodeImage(ep),
      coverImageAlt: cover?.alt ?? ep.imageAlt,
    };
  });

  return NextResponse.json({ rows, total: rows.length });
}
