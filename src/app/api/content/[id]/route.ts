import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
    // Explicit column list — the editor reads body_markdown + layout
    // (large jsonb) but it doesn't surface internal audit columns so
    // listing only what's used keeps the payload tight.
    admin
      .from('blogs')
      .select('id, slug, title, status, prompt, body_markdown, layout, selected_image_ids, created_at, updated_at, published_at, created_by, author_slug, reviewer_slug, last_reviewed_at')
      .eq('id', id)
      .maybeSingle(),
    // Revisions grow unbounded for prolific editors; cap at 50 (the
    // history panel renders the first 8 in a list with no
    // pagination yet) so an aggressively-revised post doesn't ship
    // hundreds of body snapshots on every reload.
    admin
      .from('blog_revisions')
      .select('id, blog_id, user_prompt, body_markdown, created_by, created_at')
      .eq('blog_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('blog_images')
      .select('id, blog_id, url, alt, position, provider, prompt, created_at')
      .eq('blog_id', id)
      .order('position', { ascending: true }),
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
  prompt?: string;
  // E-E-A-T byline fields. author_slug + reviewer_slug match
  // BLOG_AUTHORS entries in /lib/blogAuthors.ts; last_reviewed_at
  // is set by the 'Mark reviewed today' button so MedicalWebPage
  // schema can emit a fresh lastReviewed timestamp.
  author_slug?: string | null;
  reviewer_slug?: string | null;
  last_reviewed_at?: string | null;
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
  if ('prompt' in body) patch.prompt = body.prompt;
  if ('author_slug' in body) patch.author_slug = body.author_slug;
  if ('reviewer_slug' in body) patch.reviewer_slug = body.reviewer_slug;
  if ('last_reviewed_at' in body) patch.last_reviewed_at = body.last_reviewed_at;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blogs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalidate the live blog page so byline / body / layout edits
  // ship without waiting for the next render. The page already
  // declares `export const revalidate = 0` (no ISR cache), but the
  // route-level cache and any per-page Data Cache entry can still
  // hold a stale render — revalidatePath drops both. Also bust the
  // index/listing so the title + last-updated stamp refresh too.
  if (data?.slug) {
    try {
      revalidatePath(`/who-we-are/blog/${data.slug}`);
      revalidatePath('/who-we-are/blog');
    } catch {
      /* revalidate is best-effort */
    }
  }

  // If selected_image_ids was part of this PATCH, promote any newly-
  // selected AI images into the shared /app/images library so the
  // 'AI' tab on the gallery surfaces them site-wide. Idempotent: the
  // unique partial index on site_images.source_blog_image_id catches
  // re-saves and we ignore the conflict. Library-imported images
  // (provider='library') are skipped — they're already in
  // site_images by definition.
  if ('selected_image_ids' in body && Array.isArray(body.selected_image_ids) && body.selected_image_ids.length > 0) {
    const ids = body.selected_image_ids;
    const { data: pickedRows } = await admin
      .from('blog_images')
      .select('id, blog_id, url, alt, prompt, provider')
      .in('id', ids);
    const aiRows = ((pickedRows ?? []) as Array<{ id: string; blog_id: string; url: string; alt: string | null; prompt: string | null; provider: string | null }>)
      .filter((r) => r.provider !== 'library' && r.url);
    if (aiRows.length > 0) {
      // Insert with onConflict: ignore — the unique index on
      // source_blog_image_id makes re-saving a no-op.
      const filenameOf = (u: string) => {
        try { return new URL(u).pathname.split('/').pop() ?? 'ai-image'; }
        catch { return 'ai-image'; }
      };
      const toInsert = aiRows.map((r) => ({
        path: `ai/${r.id}`,
        public_url: r.url,
        filename: filenameOf(r.url),
        alt: r.alt ?? null,
        uploaded_by: gate.user!.id,
        is_ai: true,
        ai_provider: r.provider,
        ai_prompt: r.prompt,
        source_blog_id: r.blog_id,
        source_blog_image_id: r.id,
      }));
      await admin.from('site_images').upsert(toInsert, { onConflict: 'source_blog_image_id', ignoreDuplicates: true });
    }
  }

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
