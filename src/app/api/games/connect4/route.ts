import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/games/connect4              — list recent matches
// POST /api/games/connect4 { opponent_id } — create a new open match
//
// Phase 2 of the Connect-4 build. The list endpoint feeds the
// lobby (Phase 5) — recent + open + your-turn matches, capped at
// MAX_LIST. POST creates an open match for the authenticated user
// to challenge a specific opponent; opponent acceptance happens
// when they make their first move (Phase 5 wires the accept UI).

export const dynamic = 'force-dynamic';

const MAX_LIST = 50;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('connect4_matches')
    .select('id, challenger_id, opponent_id, status, moves, winner_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(MAX_LIST);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { opponent_id?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const opponentId = typeof body.opponent_id === 'string' ? body.opponent_id : '';
  if (!opponentId) return NextResponse.json({ error: 'opponent_id is required' }, { status: 400 });
  if (opponentId === user.id) {
    return NextResponse.json({ error: 'You can\'t challenge yourself' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('connect4_matches')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      status: 'open',
      moves: [],
    })
    .select('id, challenger_id, opponent_id, status, moves, winner_id, created_at, updated_at')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }
  return NextResponse.json(data);
}
