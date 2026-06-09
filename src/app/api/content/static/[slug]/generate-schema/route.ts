import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { EPISODES, episodeHref } from '@/lib/episodes';
import { generateBlogSchema } from '@/lib/content-claude';

// POST /api/content/static/[slug]/generate-schema
//
// Hand-coded blog posts don't have body_markdown in the DB — the
// prose lives in the .tsx file. So we fetch the rendered live page
// and strip the HTML down to readable text before sending to
// Claude. Result lands in static_blog_meta.schema_json the same
// way the AI-pipeline blogs land in blogs.schema_json.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function stripHtml(html: string): string {
  // Drop scripts + styles entirely; collapse tags to spaces; decode
  // the few entities the public page actually emits. Output is plain
  // text suitable for Claude's "read this post body" prompt.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { slug } = await ctx.params;

  const episode = EPISODES.find((e) => e.slug === slug);
  if (!episode) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Pull the live page so we always read the latest copy. Origin is
  // derived from the request to support preview deploys.
  const origin = req.nextUrl.origin;
  const path = episodeHref(episode.slug);
  let html: string;
  try {
    const res = await fetch(`${origin}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`live page HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `failed to read live page: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
  const text = stripHtml(html).slice(0, 12000);
  if (text.length < 200) {
    return NextResponse.json({ error: 'live page returned too little text to summarise' }, { status: 422 });
  }

  let schema;
  try {
    schema = await generateBlogSchema({ title: episode.title, bodyMarkdown: text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }

  const generatedAt = new Date().toISOString();
  const admin = getAdminSupabase();
  const { error } = await admin
    .from('static_blog_meta')
    .upsert(
      {
        slug,
        schema_json: schema,
        schema_generated_at: generatedAt,
        updated_at: generatedAt,
        updated_by: gate.user!.id,
      },
      { onConflict: 'slug' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, schema, generatedAt });
}
