import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';

// GET    /api/content/[id] — fetch one blog with its revisions and images
// PATCH  /api/content/[id] — partial update (title, slug, status, selected_image_ids)
// DELETE /api/content/[id] — drop the row; cascades to revisions + images

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const [blog, revisions, images] = await Promise.all([
    admin.from('blogs').select('*').eq('id', id).maybeSingle(),
    admin.from('blog_revisions').select('*').eq('blog_id', id).order('created_at', { ascending: false }),
    admin.from('blog_images').select('*').eq('blog_id', id).order('position', { ascending: true }),
  ]);
  if (blog.error) return NextResponse.json({ error: blog.error.message }, { status: 500 });
  if (!blog.data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    blog: blog.data,
    revisions: revisions.data ?? [],
    images: images.data ?? [],
  });
}

interface PatchBody {
  title?: string | null;
  slug?: string;
  status?: string;
  selected_image_ids?: string[] | null;
  body_markdown?: string;
  layout?: unknown;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  let body: PatchBody = {};
  try { body = (await req.json()) as PatchBody; } catch { /* allow empty */ }
  const patch: Record<string, unknown> = {};
  if ('title' in body) patch.title = body.title;
  if ('slug' in body && body.slug) patch.slug = body.slug;
  if ('status' in body && body.status) patch.status = body.status;
  if ('selected_image_ids' in body) patch.selected_image_ids = body.selected_image_ids;
  if ('body_markdown' in body) patch.body_markdown = body.body_markdown;
  if ('layout' in body) patch.layout = body.layout;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blogs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { error } = await admin.from('blogs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
