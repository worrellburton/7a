import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';

// POST   /api/content/[id]/library-image  — import a site_images row into
//                                           blog_images with provider='library'
// DELETE /api/content/[id]/library-image  — remove a previously imported
//                                           library entry (by blog_images.id)
//
// Lets the editor pick from /app/images uploads instead of (or alongside)
// the AI-generated set. The imported row stores the public URL + alt so
// the build step can mix both sources uniformly.

export const dynamic = 'force-dynamic';

interface PostBody { site_image_id?: string }
interface DeleteBody { blog_image_id?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id: blogId } = await ctx.params;

  let body: PostBody = {};
  try { body = (await req.json()) as PostBody; } catch { /* allow empty */ }
  const siteImageId = body.site_image_id;
  if (!siteImageId) return NextResponse.json({ error: 'site_image_id required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: site, error: readErr } = await admin
    .from('site_images')
    .select('id, public_url, alt, filename, seo_description')
    .eq('id', siteImageId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!site) return NextResponse.json({ error: 'library image not found' }, { status: 404 });

  // Don't re-import the same library image twice — surface the existing row.
  const { data: existing } = await admin
    .from('blog_images')
    .select('id')
    .eq('blog_id', blogId)
    .eq('provider', 'library')
    .eq('url', site.public_url as string)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, blog_image_id: existing.id, already: true });

  // Slot the new row after whatever's there. Library images don't need a
  // deterministic position the way the AI-gen grid does — they trail.
  const { data: maxRow } = await admin
    .from('blog_images')
    .select('position')
    .eq('blog_id', blogId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow?.position as number | null) ?? -1) + 1;

  const promptFallback = (site.seo_description as string | null) || (site.filename as string | null) || 'library image';
  const { data: inserted, error: insErr } = await admin
    .from('blog_images')
    .insert({
      blog_id: blogId,
      provider: 'library',
      url: site.public_url as string,
      alt: (site.alt as string | null) ?? (site.filename as string | null) ?? '',
      prompt: promptFallback,
      position: nextPosition,
    })
    .select('id')
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // If the blog was still in the post-generate 'images' or fresh 'reviewing'
  // status the editor may not yet have a selecting-ready state. Library
  // imports happen at the selecting stage and beyond, so we don't move it.
  return NextResponse.json({ ok: true, blog_image_id: inserted.id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id: blogId } = await ctx.params;

  let body: DeleteBody = {};
  try { body = (await req.json()) as DeleteBody; } catch { /* allow empty */ }
  const blogImageId = body.blog_image_id;
  if (!blogImageId) return NextResponse.json({ error: 'blog_image_id required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { error } = await admin
    .from('blog_images')
    .delete()
    .eq('blog_id', blogId)
    .eq('id', blogImageId)
    .eq('provider', 'library'); // never let this drop an AI-generated row
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
