import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin, requireSignedInUser } from '@/lib/content-server';

// GET /api/content/visibility — return every visibility row so the
//                                admin list can render toggle state
//                                for both AI + hand-coded posts in
//                                one round-trip. Open to any signed-in
//                                user — viewing the map mirrors the
//                                public-site visibility, no secrets.
// PUT /api/content/visibility   — upsert { slug, hidden } for a
//                                single post. Super-admin only.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireSignedInUser(req);
  if (gate.error) return gate.error;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blog_visibility')
    .select('slug, hidden, updated_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

interface PutBody { slug?: string; hidden?: boolean }

export async function PUT(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  let body: PutBody = {};
  try { body = (await req.json()) as PutBody; } catch { /* allow empty */ }
  const slug = (body.slug ?? '').trim();
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  const hidden = !!body.hidden;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blog_visibility')
    .upsert({ slug, hidden, updated_by: gate.user!.id }, { onConflict: 'slug' })
    .select('slug, hidden, updated_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
