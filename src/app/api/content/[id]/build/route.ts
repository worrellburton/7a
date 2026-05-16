import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { buildBlogLayout } from '@/lib/content-claude';

// POST /api/content/[id]/build
//
// Phase 8 of the pipeline. Reads the approved body markdown plus the
// 7 selected images, asks Claude to compose a JSON layout the public
// renderer can walk, and saves it to blogs.layout. Status → 'built'.
// The page is still in admin-preview state at this point; phase 10's
// publish endpoint flips it live.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, title, body_markdown, selected_image_ids')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.body_markdown) return NextResponse.json({ error: 'no body — generate first' }, { status: 400 });
  const ids = (blog.selected_image_ids ?? []) as string[];
  if (ids.length !== 7) return NextResponse.json({ error: 'exactly 7 images must be selected first' }, { status: 400 });

  const { data: imgs, error: imgErr } = await admin
    .from('blog_images')
    .select('id, url, alt, provider')
    .in('id', ids);
  if (imgErr) return NextResponse.json({ error: imgErr.message }, { status: 500 });
  if (!imgs || imgs.length !== 7) return NextResponse.json({ error: 'could not load all 7 selected images' }, { status: 500 });

  let layout;
  try {
    layout = await buildBlogLayout({
      title: blog.title ?? 'Untitled',
      bodyMarkdown: blog.body_markdown,
      images: imgs.map((i) => ({
        url: i.url as string,
        alt: (i.alt as string) ?? '',
        ai: (i.provider as string) !== 'library',
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }

  const { error: updateErr } = await admin
    .from('blogs')
    .update({ layout, status: 'built' })
    .eq('id', id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, layout });
}
