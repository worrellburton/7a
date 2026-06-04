import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin, makeSlug } from '@/lib/content-server';

// POST /api/content/roadmap/[id]/build
//
// Single-shot "Build" action from the Roadmap tab. Creates a fresh
// blogs row using the roadmap row's working_title as both title +
// slug seed + prompt seed, then links it back to the roadmap row
// via blog_id so the row can show "Building" / "Published" state
// on the next list refresh.
//
// Idempotent on already-built rows — if blog_id is already set we
// just return the existing blog so a double-click doesn't create
// two drafts for one roadmap entry.

export const dynamic = 'force-dynamic';

const PROMPT_TEMPLATE = (title: string, keyword: string | null, intent: string | null) => {
  const lines: string[] = [
    `Working title: ${title}`,
  ];
  if (keyword) lines.push(`Target keyword: ${keyword}`);
  if (intent) lines.push(`Search intent: ${intent}`);
  lines.push('');
  lines.push(
    'Draft a long-form blog post for sevenarrowsrecoveryarizona.com on the topic above. Use the working title to set the angle, target the keyword naturally throughout, and match the stated search intent. Open with a clear hook, structure the body in scannable sections, and close with a soft CTA inviting the reader to verify insurance or call admissions.',
  );
  return lines.join('\n');
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: roadmapRow, error: rmErr } = await admin
    .from('blog_roadmap_items')
    .select('id, working_title, target_keyword, intent, blog_id')
    .eq('id', id)
    .maybeSingle();
  if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
  if (!roadmapRow) return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });

  // Idempotency: if this roadmap item already has a blog, return it
  // without creating a second one. UI uses this to short-circuit the
  // "Continue building" navigation.
  if (roadmapRow.blog_id) {
    const { data: existing } = await admin
      .from('blogs')
      .select('id, slug, title, status')
      .eq('id', roadmapRow.blog_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ...existing, already_linked: true });
    }
    // Linked blog was deleted out from under us — fall through and
    // create a fresh one, then update the link.
  }

  const title = (roadmapRow.working_title as string).trim();
  const slugSeed = title || 'untitled-draft';
  let slug = makeSlug(slugSeed) || 'untitled-draft';
  for (let i = 2; i < 50; i += 1) {
    const { data: clash } = await admin.from('blogs').select('id').eq('slug', slug).maybeSingle();
    if (!clash) break;
    slug = `${makeSlug(slugSeed) || 'untitled-draft'}-${i}`;
  }

  const prompt = PROMPT_TEMPLATE(
    title,
    (roadmapRow.target_keyword as string | null) ?? null,
    (roadmapRow.intent as string | null) ?? null,
  );

  const { data: inserted, error: blogErr } = await admin
    .from('blogs')
    .insert({
      slug,
      title,
      status: 'draft',
      prompt,
      created_by: gate.user!.id,
    })
    .select('id, slug, title, status')
    .single();
  if (blogErr) return NextResponse.json({ error: blogErr.message }, { status: 500 });

  // Link the new blog back to the roadmap row. Failure here is non-
  // fatal — the blog still exists and the user can navigate to it —
  // but log so a future audit can tell when a link was lost.
  const { error: linkErr } = await admin
    .from('blog_roadmap_items')
    .update({ blog_id: inserted.id })
    .eq('id', id);
  if (linkErr) console.warn('[roadmap/build] link failed', linkErr.message);

  return NextResponse.json({ ...inserted, already_linked: false }, { status: 201 });
}
