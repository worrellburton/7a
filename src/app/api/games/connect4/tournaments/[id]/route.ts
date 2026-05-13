import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/games/connect4/tournaments/[id]
// Returns the tournament + every entrant + every bracket match
// (including the underlying match game state). Phase 7 calls this
// once on mount and then subscribes to realtime for live updates.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const [tournament, entrants, brackets] = await Promise.all([
    admin
      .from('connect4_tournaments')
      .select('id, name, size, status, winner_id, created_by, created_at, started_at, completed_at')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('connect4_tournament_entrants')
      .select('user_id, seed, joined_at')
      .eq('tournament_id', id),
    admin
      .from('connect4_bracket_matches')
      .select('id, round, slot, match_id, created_at, match:connect4_matches(id, challenger_id, opponent_id, status, moves, winner_id)')
      .eq('tournament_id', id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true }),
  ]);
  if (tournament.error) return NextResponse.json({ error: tournament.error.message }, { status: 500 });
  if (!tournament.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (entrants.error) return NextResponse.json({ error: entrants.error.message }, { status: 500 });
  if (brackets.error) return NextResponse.json({ error: brackets.error.message }, { status: 500 });

  return NextResponse.json({
    tournament: tournament.data,
    entrants: entrants.data ?? [],
    brackets: brackets.data ?? [],
  });
}
