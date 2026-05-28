import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { generateBlogSchema } from '@/lib/content-claude';

// POST /api/content/[id]/generate-schema
//
// Calls Claude on the post body + title to produce FAQPage + Article
// JSON-LD source data, stored in blogs.schema_json. The public
// [slug]/page.tsx reads this column and emits matching
// <script type="application/ld+json"> nodes alongside the existing
// MedicalWebPage schema (which already carries author + brand).

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, title, body_markdown')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.body_markdown) {
    return NextResponse.json({ error: 'no body to analyse — generate the post first' }, { status: 400 });
  }

  let schema;
  try {
    schema = await generateBlogSchema({
      title: blog.title ?? 'Untitled',
      bodyMarkdown: blog.body_markdown,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }

  const generatedAt = new Date().toISOString();
  const { error: updErr } = await admin
    .from('blogs')
    .update({ schema_json: schema, schema_generated_at: generatedAt })
    .eq('id', id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, schema, generatedAt });
}
