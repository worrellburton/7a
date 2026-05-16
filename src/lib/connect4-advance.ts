// Connect-4 tournament auto-advance. After a match resolves
// (PATCH winner determined / DELETE forfeit), check whether it
// belongs to a tournament bracket; if so, find the next-round
// slot and either create the next match (when the sibling has
// also resolved) or wait. Final-round resolution flips the
// tournament to 'complete' and stamps winner_id.

import type { SupabaseClient } from '@supabase/supabase-js';
import { nextBracketSlot, totalRounds } from '@/lib/connect4-bracket';
import { incrementTournamentWin } from '@/lib/connect4-elo';

interface BracketRow {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  match_id: string | null;
}

interface MatchRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  winner_id: string | null;
  status: string;
}

export async function advanceBracketIfNeeded(
  admin: SupabaseClient,
  matchId: string,
): Promise<void> {
  // Is this match part of a bracket?
  const { data: brRow } = await admin
    .from('connect4_bracket_matches')
    .select('id, tournament_id, round, slot, match_id')
    .eq('match_id', matchId)
    .maybeSingle();
  if (!brRow) return;
  const br = brRow as BracketRow;

  // Need the tournament size to know whether this was the final.
  const { data: t } = await admin
    .from('connect4_tournaments')
    .select('id, size, status')
    .eq('id', br.tournament_id)
    .maybeSingle();
  if (!t) return;

  // Read the match's winner.
  const { data: mRow } = await admin
    .from('connect4_matches')
    .select('id, challenger_id, opponent_id, winner_id, status')
    .eq('id', matchId)
    .maybeSingle();
  if (!mRow) return;
  const m = mRow as MatchRow;
  // If the match is still in progress, bail — we'll be re-invoked
  // when it resolves.
  if (m.status !== 'complete' && m.status !== 'forfeit') return;
  // Draws need a tiebreaker so the bracket can progress to a
  // champion. Pick the challenger deterministically — first to
  // claim the slot wins on a tie. We stamp the winner_id here so
  // the bracket-advance logic below works uniformly with regular
  // wins; downstream (Elo apply) already fired on the original
  // match resolution, so the rating side stays unaffected.
  let effectiveWinnerId: string | null = m.winner_id;
  if (m.status === 'complete' && !effectiveWinnerId) {
    effectiveWinnerId = m.challenger_id;
    await admin
      .from('connect4_matches')
      .update({ winner_id: effectiveWinnerId, status: 'complete' })
      .eq('id', m.id);
  }
  if (!effectiveWinnerId) return;

  const next = nextBracketSlot(br.round, br.slot, totalRounds(t.size));
  if (!next) {
    // No next slot — this was the final. Flip the tournament
    // and bump the winner's tournament_wins counter for the
    // leaderboard's "rings" metric.
    await admin
      .from('connect4_tournaments')
      .update({ status: 'complete', winner_id: effectiveWinnerId, completed_at: new Date().toISOString() })
      .eq('id', br.tournament_id);
    await incrementTournamentWin(admin, effectiveWinnerId);
    return;
  }

  // Find or create the next-round bracket row.
  const { data: existing } = await admin
    .from('connect4_bracket_matches')
    .select('id, match_id')
    .eq('tournament_id', br.tournament_id)
    .eq('round', next.round)
    .eq('slot', next.slot)
    .maybeSingle();

  // The sibling is the OTHER round-R slot that feeds this same
  // next slot. Their (round, slot) is (br.round, br.slot XOR 1).
  const siblingSlot = br.slot ^ 1;
  const { data: sib } = await admin
    .from('connect4_bracket_matches')
    .select('id, match_id')
    .eq('tournament_id', br.tournament_id)
    .eq('round', br.round)
    .eq('slot', siblingSlot)
    .maybeSingle();
  if (!sib?.match_id) return; // Sibling not even created yet.

  const { data: sibMatch } = await admin
    .from('connect4_matches')
    .select('winner_id, status')
    .eq('id', sib.match_id)
    .maybeSingle();
  if (!sibMatch?.winner_id) {
    // Sibling not finished yet. We'll be re-invoked when it
    // resolves, so just bail.
    return;
  }

  // Both resolved. Either the next-round row already exists
  // (race) or we need to create it.
  if (existing) {
    if (existing.match_id) return; // Already created.
    // Bracket row exists but no game row yet — create the game
    // and attach.
    const challengerId = br.slot < siblingSlot ? effectiveWinnerId : sibMatch.winner_id;
    const opponentId   = br.slot < siblingSlot ? sibMatch.winner_id : effectiveWinnerId;
    const { data: matchRow } = await admin
      .from('connect4_matches')
      .insert({ challenger_id: challengerId, opponent_id: opponentId, status: 'open', moves: [] })
      .select('id')
      .maybeSingle();
    if (matchRow) {
      await admin
        .from('connect4_bracket_matches')
        .update({ match_id: matchRow.id })
        .eq('id', existing.id);
    }
    return;
  }

  // No existing row; insert both the bracket row and the match.
  const challengerId = br.slot < siblingSlot ? effectiveWinnerId : sibMatch.winner_id;
  const opponentId   = br.slot < siblingSlot ? sibMatch.winner_id : effectiveWinnerId;
  const { data: matchRow } = await admin
    .from('connect4_matches')
    .insert({ challenger_id: challengerId, opponent_id: opponentId, status: 'open', moves: [] })
    .select('id')
    .maybeSingle();
  if (!matchRow) return;
  await admin
    .from('connect4_bracket_matches')
    .insert({
      tournament_id: br.tournament_id,
      round: next.round,
      slot: next.slot,
      match_id: matchRow.id,
    });
}
