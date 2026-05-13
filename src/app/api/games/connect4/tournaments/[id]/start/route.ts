import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { buildInitialPairings } from '@/lib/connect4-bracket';

// POST /api/games/connect4/tournaments/[id]/start
//
// Locks the entrant list, randomly seeds the first round, inserts
// the round-0 connect4_bracket_matches rows + their underlying
// connect4_matches game rows, and flips the tournament to
// 'active'. Only the creator may start. Requires the entrant
// count to exactly equal `size` (no byes supported).

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const { data: t, error: tErr } = await admin
    .from('connect4_tournaments')
    .select('id, status, size, created_by')
    .eq('id', id)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (t.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the creator can start' }, { status: 403 });
  }
  if (t.status !== 'draft') {
    return NextResponse.json({ error: 'Tournament already started' }, { status: 409 });
  }

  const { data: entrants, error: eErr } = await admin
    .from('connect4_tournament_entrants')
    .select('user_id')
    .eq('tournament_id', id);
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
  if (!entrants || entrants.length !== t.size) {
    return NextResponse.json({ error: `Need exactly ${t.size} entrants, have ${entrants?.length ?? 0}` }, { status: 409 });
  }

  const pairings = buildInitialPairings(entrants.map((e) => e.user_id));
  // For each round-0 pairing: create a match row, then a bracket
  // row that points to it. Sequential because the bracket row
  // needs the match's id; could batch if this becomes a hot path.
  const nowIso = new Date().toISOString();
  for (const p of pairings) {
    const { data: matchRow, error: mErr } = await admin
      .from('connect4_matches')
      .insert({
        challenger_id: p.challenger_id,
        opponent_id: p.opponent_id,
        status: 'open',
        moves: [],
      })
      .select('id')
      .maybeSingle();
    if (mErr || !matchRow) return NextResponse.json({ error: mErr?.message ?? 'Match insert failed' }, { status: 500 });
    const { error: bErr } = await admin
      .from('connect4_bracket_matches')
      .insert({
        tournament_id: id,
        round: p.round,
        slot: p.slot,
        match_id: matchRow.id,
      });
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  }

  // Stamp seed numbers on the entrants in the pairing order, so
  // the bracket view can show "Seed 3 · Donna" labels.
  for (let i = 0; i < pairings.length * 2; i++) {
    const userId = i % 2 === 0 ? pairings[i / 2].challenger_id : pairings[(i - 1) / 2].opponent_id;
    await admin
      .from('connect4_tournament_entrants')
      .update({ seed: i + 1 })
      .eq('tournament_id', id)
      .eq('user_id', userId);
  }

  const { error: statusErr } = await admin
    .from('connect4_tournaments')
    .update({ status: 'active', started_at: nowIso })
    .eq('id', id);
  if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
