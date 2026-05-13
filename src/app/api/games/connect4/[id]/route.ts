import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { buildBoard, currentPlayer, findWinner, isBoardFull, isColumnFull, COLS } from '@/lib/connect4';

// GET   /api/games/connect4/[id]              — fetch one match
// PATCH /api/games/connect4/[id] { column }   — drop a chip
// DELETE /api/games/connect4/[id]             — forfeit / cancel
//
// Phase 2 of the Connect-4 build. The PATCH route is where the
// rules engine lives: server validates that
//   1. The caller is a participant.
//   2. The match isn't already complete / forfeit.
//   3. It's the caller's turn (challenger plays on even move
//      counts, opponent on odd).
//   4. The column is a valid index (0-6).
//   5. The column isn't full.
// On success we append the column to moves[], re-derive the
// board, run findWinner, and either flip status to 'complete'
// (with winner_id) or to 'active' if it was still open.

export const dynamic = 'force-dynamic';

interface MatchRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'open' | 'active' | 'complete' | 'forfeit';
  moves: number[];
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('connect4_matches')
    .select('id, challenger_id, opponent_id, status, moves, winner_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data as MatchRow);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { column?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const col = Number(body.column);
  if (!Number.isInteger(col) || col < 0 || col >= COLS) {
    return NextResponse.json({ error: 'column must be 0-6' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: match, error: readErr } = await admin
    .from('connect4_matches')
    .select('id, challenger_id, opponent_id, status, moves, winner_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const m = match as MatchRow;

  if (m.status === 'complete' || m.status === 'forfeit') {
    return NextResponse.json({ error: 'Match is already over' }, { status: 409 });
  }
  if (user.id !== m.challenger_id && user.id !== m.opponent_id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  // Turn enforcement — even = challenger (player 0), odd = opponent.
  const expected = currentPlayer(m.moves) === 0 ? m.challenger_id : m.opponent_id;
  if (user.id !== expected) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 409 });
  }

  const board = buildBoard(m.moves);
  if (isColumnFull(board, col)) {
    return NextResponse.json({ error: 'Column is full' }, { status: 409 });
  }

  const nextMoves = [...m.moves, col];
  const nextBoard = buildBoard(nextMoves);
  const win = findWinner(nextBoard);
  const draw = !win && isBoardFull(nextBoard);

  const updates: Partial<MatchRow> & { updated_at: string } = {
    moves: nextMoves,
    status: win || draw ? 'complete' : 'active',
    winner_id: win ? (win.winner === 0 ? m.challenger_id : m.opponent_id) : null,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: writeErr } = await admin
    .from('connect4_matches')
    .update(updates)
    .eq('id', id)
    .select('id, challenger_id, opponent_id, status, moves, winner_id, created_at, updated_at')
    .maybeSingle();
  if (writeErr || !updated) {
    return NextResponse.json({ error: writeErr?.message ?? 'Update failed' }, { status: 500 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: match } = await admin
    .from('connect4_matches')
    .select('challenger_id, opponent_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const m = match as { challenger_id: string; opponent_id: string; status: string };
  if (user.id !== m.challenger_id && user.id !== m.opponent_id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  if (m.status === 'complete' || m.status === 'forfeit') {
    return NextResponse.json({ error: 'Match is already over' }, { status: 409 });
  }

  // Forfeit. Winner = the opposite participant (the one who didn't bail).
  const winnerId = user.id === m.challenger_id ? m.opponent_id : m.challenger_id;
  const { error } = await admin
    .from('connect4_matches')
    .update({ status: 'forfeit', winner_id: winnerId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
