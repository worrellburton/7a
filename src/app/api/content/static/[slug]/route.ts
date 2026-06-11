import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { EPISODES, episodeHref } from '@/lib/episodes';

// GET   /api/content/static/[slug] — episode metadata + meta overrides
// PATCH /api/content/static/[slug] — write byline + last-reviewed +
//                                    schema_json overrides
//
// Hand-coded blog posts live as .tsx files. This endpoint lets the
// dashboard at /feather/content/static/<slug> edit byline, mark-reviewed,
// and schema without touching the filesystem — overrides live in
// public.static_blog_meta and the public blog page reads them.

export const dynamic = 'force-dynamic';

interface PatchBody {
  author_slug?: string | null;
  reviewer_slug?: string | null;
  last_reviewed_at?: string | null;
  schema_json?: unknown;
  schema_generated_at?: string | null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { slug } = await ctx.params;

  const episode = EPISODES.find((e) => e.slug === slug);
  if (!episode) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const admin = getAdminSupabase();
  const { data } = await admin
    .from('static_blog_meta')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return NextResponse.json({
    episode: {
      ...episode,
      path: episodeHref(episode.slug),
    },
    meta: data ?? null,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { slug } = await ctx.params;

  const episode = EPISODES.find((e) => e.slug === slug);
  if (!episode) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: PatchBody = {};
  try { body = (await req.json()) as PatchBody; } catch { /* allow empty */ }

  const patch: Record<string, unknown> = { slug, updated_at: new Date().toISOString(), updated_by: gate.user!.id };
  if ('author_slug' in body) patch.author_slug = body.author_slug;
  if ('reviewer_slug' in body) patch.reviewer_slug = body.reviewer_slug;
  if ('last_reviewed_at' in body) patch.last_reviewed_at = body.last_reviewed_at;
  if ('schema_json' in body) patch.schema_json = body.schema_json;
  if ('schema_generated_at' in body) patch.schema_generated_at = body.schema_generated_at;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('static_blog_meta')
    .upsert(patch, { onConflict: 'slug' })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, meta: data });
}
