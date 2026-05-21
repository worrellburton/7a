import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { generateBlogBody } from '@/lib/content-claude';

// POST /api/content/[id]/generate
//
// Phase 4 of the pipeline. Reads the blog row's prompt, calls Claude
// to draft the full markdown body, stamps it onto the blog row, and
// snapshots the result into blog_revisions so the editor can roll
// back. Status moves draft → reviewing.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, prompt, title')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.prompt) return NextResponse.json({ error: 'blog row has no prompt' }, { status: 400 });

  let body: string;
  try {
    body = await generateBlogBody(blog.prompt, blog.title);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }

  // Extract H1 as the title if the blog row didn't have one.
  let resolvedTitle = blog.title;
  if (!resolvedTitle) {
    const m = body.match(/^#\s+(.+)$/m);
    if (m) resolvedTitle = m[1].trim();
  }

  const { error: updateErr } = await admin
    .from('blogs')
    .update({ body_markdown: body, status: 'reviewing', title: resolvedTitle })
    .eq('id', id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { error: revErr } = await admin
    .from('blog_revisions')
    .insert({ blog_id: id, user_prompt: null, body_markdown: body, created_by: gate.user!.id });
  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, body_markdown: body, title: resolvedTitle });
}
