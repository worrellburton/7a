import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// POST /api/levers/reset-connect4-tournament
//
// Wipes the Connect-4 tournament state so a fresh tournament can
// start clean: brackets, entrants, tournament rows, the matches
// that were tied to bracket cells, and the per-user
// `tournament_wins` tally on connect4_ratings.
//
// Casual non-tournament matches (anything in connect4_matches that
// isn't referenced by a bracket cell) and the long-running Elo /
// W-L-D record on connect4_ratings are PRESERVED so people's
// season-long stats survive a reset. If we ever want a deeper
// "season reset" lever, it should be a separate switch — keeping
// this one tournament-only avoids accidentally torching ratings.

export const dynamic = 'force-dynamic';

interface ResetResult {
  tournamentsDeleted: number;
  bracketRowsDeleted: number;
  bracketLinkedMatchesDeleted: number;
  entrantsDeleted: number;
  ratingsResetCount: number;
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req, 'Only super admins can reset the Connect-4 tournament.');
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  // Step 1: read all bracket rows so we know which connect4_matches
  // rows were tournament-linked. We have to delete the bracket rows
  // BEFORE the matches (the FK goes bracket.match_id → matches.id),
  // but we need the ids in memory first.
  const { data: bracketRows, error: bracketReadErr } = await admin
    .from('connect4_bracket_matches')
    .select('id, match_id');
  if (bracketReadErr) {
    return NextResponse.json({ error: `Failed reading brackets: ${bracketReadErr.message}` }, { status: 500 });
  }
  const bracketIds = (bracketRows ?? []).map((r) => r.id as string);
  const matchIds = (bracketRows ?? [])
    .map((r) => r.match_id as string | null)
    .filter((id): id is string => !!id);

  const result: ResetResult = {
    tournamentsDeleted: 0,
    bracketRowsDeleted: 0,
    bracketLinkedMatchesDeleted: 0,
    entrantsDeleted: 0,
    ratingsResetCount: 0,
  };

  // Step 2: delete the bracket rows themselves. Without this, the
  // matches delete in step 3 would violate the bracket→match FK.
  if (bracketIds.length > 0) {
    const { error: delBracketErr, count } = await admin
      .from('connect4_bracket_matches')
      .delete({ count: 'exact' })
      .in('id', bracketIds);
    if (delBracketErr) {
      return NextResponse.json({ error: `Failed deleting brackets: ${delBracketErr.message}` }, { status: 500 });
    }
    result.bracketRowsDeleted = count ?? bracketIds.length;
  }

  // Step 3: delete the matches that were tied to those brackets.
  // Casual matches (rows in connect4_matches without a bracket
  // reference) are untouched — they show up in the lobby
  // independently and shouldn't disappear when a tournament resets.
  if (matchIds.length > 0) {
    const { error: delMatchErr, count } = await admin
      .from('connect4_matches')
      .delete({ count: 'exact' })
      .in('id', matchIds);
    if (delMatchErr) {
      return NextResponse.json({ error: `Failed deleting matches: ${delMatchErr.message}` }, { status: 500 });
    }
    result.bracketLinkedMatchesDeleted = count ?? matchIds.length;
  }

  // Step 4: entrants. Drop everyone from every tournament before
  // the tournaments row itself goes — same FK ordering reason.
  const { error: delEntrantsErr, count: entrantsCount } = await admin
    .from('connect4_tournament_entrants')
    .delete({ count: 'exact' })
    .not('tournament_id', 'is', null);
  if (delEntrantsErr) {
    return NextResponse.json({ error: `Failed deleting entrants: ${delEntrantsErr.message}` }, { status: 500 });
  }
  result.entrantsDeleted = entrantsCount ?? 0;

  // Step 5: tournaments table itself.
  const { error: delTournamentsErr, count: tournamentsCount } = await admin
    .from('connect4_tournaments')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  if (delTournamentsErr) {
    return NextResponse.json({ error: `Failed deleting tournaments: ${delTournamentsErr.message}` }, { status: 500 });
  }
  result.tournamentsDeleted = tournamentsCount ?? 0;

  // Step 6: zero the per-user tournament_wins so the leaderboard
  // 🏆 counts reset alongside the bracket. Elo / wins / losses /
  // draws / matches_played stay intact — those are season-long.
  const { error: ratingsErr, count: ratingsCount } = await admin
    .from('connect4_ratings')
    .update({ tournament_wins: 0 }, { count: 'exact' })
    .gt('tournament_wins', 0);
  if (ratingsErr) {
    return NextResponse.json({ error: `Failed resetting tournament_wins: ${ratingsErr.message}` }, { status: 500 });
  }
  result.ratingsResetCount = ratingsCount ?? 0;

  return NextResponse.json({ ok: true, ...result });
}
