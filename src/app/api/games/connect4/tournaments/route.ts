import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/games/connect4/tournaments              — list tournaments
// POST /api/games/connect4/tournaments { name, size } — create draft

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('connect4_tournaments')
    .select('id, name, size, status, winner_id, created_by, created_at, started_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: { name?: unknown; size?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const size = Number(body.size);
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (![4, 8, 16].includes(size)) {
    return NextResponse.json({ error: 'size must be 4, 8, or 16' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('connect4_tournaments')
    .insert({ name, size, status: 'draft', created_by: user.id })
    .select('id, name, size, status, winner_id, created_by, created_at')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  // Creator auto-joins so the draft pane isn't empty on first open.
  await admin
    .from('connect4_tournament_entrants')
    .insert({ tournament_id: data.id, user_id: user.id });
  return NextResponse.json(data);
}
