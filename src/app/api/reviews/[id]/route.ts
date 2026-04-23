import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/reviews/[id]?source=google|curated — update flags / fields
// DELETE /api/reviews/[id]?source=curated         — only curated; google
//                                                   rows would be re-inserted
//                                                   by the next sync.

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { error: null as null };
}

interface PatchBody {
  // Curation flags — both tables.
  featured?: boolean;
  hidden?: boolean;
  display_order?: number | null;
  // Editable content — curated only. Quietly ignored for google rows.
  author_name?: string;
  attribution?: string | null;
  text?: string;
  rating?: number;
}

function tableForSource(source: string | null): 'google_reviews' | 'curated_reviews' | null {
  if (source === 'google') return 'google_reviews';
  if (source === 'curated') return 'curated_reviews';
  return null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const table = tableForSource(url.searchParams.get('source'));
  if (!table) return NextResponse.json({ error: 'source query param required: google|curated' }, { status: 400 });

  let body: PatchBody;
  try { body = (await req.json()) as PatchBody; } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.featured === 'boolean') updates.featured = body.featured;
  if (typeof body.hidden === 'boolean') updates.hidden = body.hidden;
  if (body.display_order === null || typeof body.display_order === 'number') {
    updates.display_order = body.display_order;
  }

  // Content fields — curated only.
  if (table === 'curated_reviews') {
    if (typeof body.author_name === 'string' && body.author_name.trim()) {
      updates.author_name = body.author_name.trim();
    }
    if (body.attribution === null || typeof body.attribution === 'string') {
      updates.attribution = body.attribution;
    }
    if (typeof body.text === 'string' && body.text.trim()) {
      updates.text = body.text.trim();
    }
    if (typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5) {
      updates.rating = Math.round(body.rating);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from(table)
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: `update failed: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, review: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const source = url.searchParams.get('source');
  if (source !== 'curated') {
    return NextResponse.json(
      { error: 'Only curated reviews can be deleted. Hide google reviews instead — deletion would be undone by the next sync.' },
      { status: 400 },
    );
  }

  const admin = getAdminSupabase();
  const { error } = await admin.from('curated_reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: `delete failed: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
