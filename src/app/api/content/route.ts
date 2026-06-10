import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin, makeSlug } from '@/lib/content-server';

// GET  /api/content — list every blog row (drafts + published) for
//                     the /feather/content list view. Joins users for
//                     the creator's display name + avatar so the
//                     row can show who started the post without a
//                     second round-trip.
// POST /api/content — create a fresh blog row. The prompt and title
//                     are both optional now; clicking "+ New blog"
//                     from the list page drops you straight onto
//                     the detail page where Step 1 (Prompt) is
//                     edited inline.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blogs')
    .select('id, slug, title, status, prompt, created_at, updated_at, published_at, created_by')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Single batch user lookup for the creator avatars. Cheaper than
  // a Postgres join when the join key set is small (typically 2–4
  // distinct authors on this team).
  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    title: string | null;
    status: string;
    prompt: string | null;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    created_by: string | null;
  }>;
  const authorIds = Array.from(new Set(rows.map((r) => r.created_by).filter((v): v is string => !!v)));
  const authorsById = new Map<string, { name: string | null; avatar_url: string | null }>();
  if (authorIds.length > 0) {
    const { data: authors } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', authorIds);
    for (const a of (authors ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
      authorsById.set(a.id, { name: a.full_name, avatar_url: a.avatar_url });
    }
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      creator_name: r.created_by ? (authorsById.get(r.created_by)?.name ?? null) : null,
      creator_avatar_url: r.created_by ? (authorsById.get(r.created_by)?.avatar_url ?? null) : null,
    })),
  });
}

interface CreateBody { prompt?: string; title?: string }

const DEFAULT_PROMPT = '(draft — describe what you want this post to be about, then click Generate body)';

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  let body: CreateBody = {};
  try { body = (await req.json()) as CreateBody; } catch { /* allow empty */ }
  const promptInput = (body.prompt ?? '').trim();
  const titleInput = (body.title ?? '').trim();
  // Prompt is now optional — clicking '+ New blog' drops the user
  // onto the detail page with Step 1 ready to edit. Persist a clear
  // placeholder so PromptPanel doesn't render an empty card and the
  // generate route can still display the saved value.
  const prompt = promptInput || DEFAULT_PROMPT;
  // Slug source: title first, then prompt, then a fallback so we
  // never call makeSlug('') (which returns '' and would collide).
  const slugSeed = titleInput || promptInput || 'untitled-draft';
  const title = titleInput || null;

  const admin = getAdminSupabase();
  let slug = makeSlug(slugSeed);
  if (!slug) slug = 'untitled-draft';
  // Guard against slug collisions — append -2, -3, ... until unique.
  for (let i = 2; i < 50; i += 1) {
    const { data } = await admin.from('blogs').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${makeSlug(slugSeed) || 'untitled-draft'}-${i}`;
  }

  const { data: inserted, error } = await admin
    .from('blogs')
    .insert({
      slug,
      title,
      status: 'draft',
      prompt,
      created_by: gate.user!.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(inserted, { status: 201 });
}
