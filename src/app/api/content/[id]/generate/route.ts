import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { generateBlogBody, formatBlogBodyFromContent } from '@/lib/content-claude';

// POST /api/content/[id]/generate
//
// Phase 4 of the pipeline, dual-mode per the blog's source_mode:
//   'prompt'  — Claude drafts the full post from the Step-1 brief.
//   'content' — the admin pasted their own copy in Step 1; it is
//               used AS the main content (structured to markdown,
//               wording preserved — nothing new is written).
// Either way the result lands on the blog row and is snapshotted
// into blog_revisions so the editor can roll back. Status moves
// draft → reviewing.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, prompt, source_mode, source_content, title')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const useOwnContent = blog.source_mode === 'content';
  if (useOwnContent && !blog.source_content?.trim()) {
    return NextResponse.json({ error: 'Step 1 is set to "Your own content" but no content was pasted.' }, { status: 400 });
  }
  if (!useOwnContent && !blog.prompt) {
    return NextResponse.json({ error: 'blog row has no prompt' }, { status: 400 });
  }

  let body: string;
  try {
    body = useOwnContent
      ? await formatBlogBodyFromContent(blog.source_content as string, blog.title)
      : await generateBlogBody(blog.prompt as string, blog.title);
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
