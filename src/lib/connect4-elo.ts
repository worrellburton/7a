// Classic Elo update for Connect-4 head-to-head matches.
//
// K is fixed at 32 — standard for casual rated play. Expected
// score uses the canonical sigmoid; outcomes are 1 (win), 0.5
// (draw), 0 (loss). The function returns the rating DELTAS, not
// the new ratings, so callers can apply both in a single UPDATE.

import type { SupabaseClient } from '@supabase/supabase-js';

const K = 32;
const DEFAULT_RATING = 1200;

function expectedScore(rA: number, rB: number): number {
  return 1 / (1 + 10 ** ((rB - rA) / 400));
}

export interface EloDelta { user_id: string; delta: number; outcome: 'win' | 'loss' | 'draw' }

export function eloDeltasForMatch(
  challengerRating: number,
  opponentRating: number,
  winner: 'challenger' | 'opponent' | 'draw',
): EloDelta[] {
  const eA = expectedScore(challengerRating, opponentRating);
  const sA = winner === 'challenger' ? 1 : winner === 'draw' ? 0.5 : 0;
  const deltaA = Math.round(K * (sA - eA));
  return [
    { user_id: '__challenger__', delta: deltaA, outcome: sA === 1 ? 'win' : sA === 0 ? 'loss' : 'draw' },
    { user_id: '__opponent__',   delta: -deltaA, outcome: sA === 0 ? 'win' : sA === 1 ? 'loss' : 'draw' },
  ];
}

// Apply ratings post-match. Idempotent-ish: if called twice for
// the same match we'd double-credit, so the caller is expected
// to fire this only on the transition from "in progress" to
// "resolved." advanceBracketIfNeeded fires it for both branches
// (PATCH winner determined + DELETE forfeit).
export async function applyMatchRating(
  admin: SupabaseClient,
  challengerId: string,
  opponentId: string,
  winnerId: string | null,
): Promise<void> {
  // Pull current rows (or default to 1200).
  const { data: rows } = await admin
    .from('connect4_ratings')
    .select('user_id, rating, wins, losses, draws, matches_played, tournament_wins')
    .in('user_id', [challengerId, opponentId]);
  const byId = new Map<string, { rating: number; wins: number; losses: number; draws: number; matches_played: number; tournament_wins: number }>();
  for (const r of (rows ?? []) as { user_id: string; rating: number; wins: number; losses: number; draws: number; matches_played: number; tournament_wins: number }[]) {
    byId.set(r.user_id, r);
  }
  const cur = (id: string) => byId.get(id) ?? { rating: DEFAULT_RATING, wins: 0, losses: 0, draws: 0, matches_played: 0, tournament_wins: 0 };
  const c = cur(challengerId);
  const o = cur(opponentId);

  const winner = winnerId === challengerId ? 'challenger' : winnerId === opponentId ? 'opponent' : 'draw';
  const eA = expectedScore(c.rating, o.rating);
  const sA = winner === 'challenger' ? 1 : winner === 'draw' ? 0.5 : 0;
  const deltaA = Math.round(K * (sA - eA));
  const now = new Date().toISOString();

  await admin.from('connect4_ratings').upsert({
    user_id: challengerId,
    rating: c.rating + deltaA,
    wins: c.wins + (winner === 'challenger' ? 1 : 0),
    losses: c.losses + (winner === 'opponent' ? 1 : 0),
    draws: c.draws + (winner === 'draw' ? 1 : 0),
    matches_played: c.matches_played + 1,
    tournament_wins: c.tournament_wins,
    last_match_at: now,
    updated_at: now,
  });
  await admin.from('connect4_ratings').upsert({
    user_id: opponentId,
    rating: o.rating - deltaA,
    wins: o.wins + (winner === 'opponent' ? 1 : 0),
    losses: o.losses + (winner === 'challenger' ? 1 : 0),
    draws: o.draws + (winner === 'draw' ? 1 : 0),
    matches_played: o.matches_played + 1,
    tournament_wins: o.tournament_wins,
    last_match_at: now,
    updated_at: now,
  });
}

export async function incrementTournamentWin(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin
    .from('connect4_ratings')
    .select('tournament_wins')
    .eq('user_id', userId)
    .maybeSingle();
  const cur = (data as { tournament_wins: number } | null)?.tournament_wins ?? 0;
  await admin
    .from('connect4_ratings')
    .upsert({ user_id: userId, tournament_wins: cur + 1, updated_at: new Date().toISOString() });
}
