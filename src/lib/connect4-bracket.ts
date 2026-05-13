// Bracket math for Connect-4 single-elimination tournaments.
// Pure functions — no DB. Phase 6 uses these to seed initial
// pairings; Phase 7 will reuse them to compute the next-round
// slot when a match resolves.

export interface BracketPairing {
  round: 0;
  slot: number;
  challenger_id: string;
  opponent_id: string;
}

// Fisher-Yates shuffle for entrant seeding. Deterministic enough
// (Math.random) since the only fairness concern is "not biased
// toward join order"; we don't need crypto-strength randomness.
function shuffle<T>(input: T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildInitialPairings(entrantIds: string[]): BracketPairing[] {
  if (entrantIds.length === 0 || (entrantIds.length & (entrantIds.length - 1)) !== 0) {
    throw new Error(`Entrant count must be a power of 2 (got ${entrantIds.length})`);
  }
  const seeded = shuffle(entrantIds);
  const pairings: BracketPairing[] = [];
  for (let i = 0; i < seeded.length; i += 2) {
    pairings.push({
      round: 0,
      slot: i / 2,
      challenger_id: seeded[i],
      opponent_id: seeded[i + 1],
    });
  }
  return pairings;
}

// Given a (round, slot) that just resolved, returns the
// (round+1, slot/2 floored) that the winner advances into.
// Returns null when the match was the final.
export function nextBracketSlot(round: number, slot: number, totalRounds: number): { round: number; slot: number } | null {
  if (round + 1 >= totalRounds) return null;
  return { round: round + 1, slot: Math.floor(slot / 2) };
}

// Total number of rounds for a power-of-2 entrant count.
export function totalRounds(size: number): number {
  return Math.log2(size);
}
