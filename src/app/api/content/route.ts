import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin, requireSignedInUser, makeSlug } from '@/lib/content-server';

// GET  /api/content — list every blog row (drafts + published) for
//                     the /app/content list view. Open to any signed-in
//                     user so non-super admins can browse the pipeline.
// POST /api/content — create a fresh blog row from a paragraph prompt.
//                     Super-admin only — only publishers create drafts.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireSignedInUser(req);
  if (gate.error) return gate.error;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blogs')
    .select('id, slug, title, status, prompt, created_at, updated_at, published_at')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

interface CreateBody { prompt?: string; title?: string }

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  let body: CreateBody = {};
  try { body = (await req.json()) as CreateBody; } catch { /* allow empty */ }
  const prompt = (body.prompt ?? '').trim();
  const title = (body.title ?? '').trim() || null;
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });

  const admin = getAdminSupabase();
  let slug = makeSlug(title ?? prompt);
  // Guard against slug collisions — append -2, -3, ... until unique.
  for (let i = 2; i < 50; i += 1) {
    const { data } = await admin.from('blogs').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${makeSlug(title ?? prompt)}-${i}`;
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
