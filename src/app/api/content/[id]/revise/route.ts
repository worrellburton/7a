import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { reviseBlogBody } from '@/lib/content-claude';

// POST /api/content/[id]/revise
//
// Phase 5 of the pipeline. Takes an editor instruction ("punchier
// opener", "expand the polyvagal section", etc.) and runs Claude to
// rewrite the current body. Snapshots the *prior* body into
// blog_revisions before overwriting so the editor can restore it.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ReviseBody { instruction?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  let payload: ReviseBody = {};
  try { payload = (await req.json()) as ReviseBody; } catch { /* allow empty */ }
  const instruction = (payload.instruction ?? '').trim();
  if (!instruction) return NextResponse.json({ error: 'instruction is required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, body_markdown')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.body_markdown) return NextResponse.json({ error: 'no body to revise — generate first' }, { status: 400 });

  let revised: string;
  try {
    revised = await reviseBlogBody(blog.body_markdown, instruction);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }

  const { error: updateErr } = await admin
    .from('blogs')
    .update({ body_markdown: revised })
    .eq('id', id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { error: revErr } = await admin
    .from('blog_revisions')
    .insert({ blog_id: id, user_prompt: instruction, body_markdown: revised, created_by: gate.user!.id });
  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, body_markdown: revised });
}
