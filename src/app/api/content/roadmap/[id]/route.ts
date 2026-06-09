import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { apiError } from '@/lib/api-responses';

// PATCH  /api/content/roadmap/[id] — edit one row in place (title,
//                                    keyword, volume, intent, date,
//                                    notes, position, blog_id).
// DELETE /api/content/roadmap/[id] — remove a row from the roadmap.
//                                    Does NOT delete the linked blog
//                                    (if any) — those are managed
//                                    independently from the pipeline tab.

export const dynamic = 'force-dynamic';

interface PatchBody {
  working_title?: string;
  target_keyword?: string | null;
  est_volume?: number | null;
  intent?: string | null;
  target_date?: string | null;
  notes?: string | null;
  position?: number;
  // Allows manual relinking but the Build action below is the
  // canonical path that creates + links a blog in one shot.
  blog_id?: string | null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let body: PatchBody = {};
  try { body = (await req.json()) as PatchBody; } catch { /* empty */ }
  const patch: Record<string, unknown> = {};
  if (typeof body.working_title === 'string' && body.working_title.trim().length > 0) {
    patch.working_title = body.working_title.trim();
  }
  if ('target_keyword' in body) patch.target_keyword = body.target_keyword;
  if ('est_volume' in body) patch.est_volume = body.est_volume;
  if ('intent' in body) patch.intent = body.intent;
  if ('target_date' in body) patch.target_date = body.target_date;
  if ('notes' in body) patch.notes = body.notes;
  if (typeof body.position === 'number') patch.position = body.position;
  if ('blog_id' in body) patch.blog_id = body.blog_id;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blog_roadmap_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { error } = await admin.from('blog_roadmap_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
