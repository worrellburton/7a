import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/games/connect4/tournaments/[id]/join — self-join
// DELETE — leave (only while still draft)

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const { data: t } = await admin
    .from('connect4_tournaments')
    .select('status, size')
    .eq('id', id)
    .maybeSingle();
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (t.status !== 'draft') return NextResponse.json({ error: 'Tournament already started' }, { status: 409 });

  const { count } = await admin
    .from('connect4_tournament_entrants')
    .select('user_id', { count: 'exact', head: true })
    .eq('tournament_id', id);
  if ((count ?? 0) >= t.size) {
    return NextResponse.json({ error: 'Tournament is full' }, { status: 409 });
  }

  const { error } = await admin
    .from('connect4_tournament_entrants')
    .insert({ tournament_id: id, user_id: user.id });
  if (error && !/duplicate/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const { data: t } = await admin
    .from('connect4_tournaments')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (t.status !== 'draft') return NextResponse.json({ error: 'Tournament already started' }, { status: 409 });

  const { error } = await admin
    .from('connect4_tournament_entrants')
    .delete()
    .eq('tournament_id', id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
