'use client';

// March Madness — style Connect-4 lobby.
//
// Tournament-bracket layout that fills itself in from the staff list
// (alphabetical seed order, split half-and-half across the two
// sides of the bracket). Every teammate gets a first-round seat —
// the bracket size grows to the next power of two above the team
// count (clamped to a 16-seed minimum so a brand-new install still
// shows the familiar four-round layout). Empty seats render as
// "Empty seed" placeholders so the visual stays symmetrical.
//
// Each round-1 cell is a clickable matchup: if you're one of the
// two players the click POSTs /api/games/connect4 and routes you
// into the live board; if there's already an open / active /
// complete match between those two, the cell links to that game so
// anyone can spectate. The cell also surfaces a one-line status
// pill — TBD, Open, Live · N moves, Winner · Name, or Forfeit —
// so the bracket reads as a status board without a click.
//
// A LIVE NOW strip across the top broadcasts every in-flight match
// across the team — both players' avatars, current move count,
// time since last move — and refreshes off the connect4_matches
// realtime channel so admins / clinicians can see who's mid-game
// without refreshing.
//
// Below the bracket sit two compact rows the original lobby
// carried (Your Turn — matches awaiting your move; Recent
// Results — your last completed games). The old "challenge anyone"
// overflow list has been removed: with the dynamic bracket size,
// every teammate is already in the bracket.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { currentPlayer } from '@/lib/connect4';

// Floor on the bracket size — keeps a small org from rendering a
// lopsided 2- or 4-seat bracket. nextPow2 below grows the bracket
// past this floor as the team grows.
const MIN_BRACKET_SIZE = 16;

function nextPow2(n: number): number {
  if (n <= 1) return 2;
  return 2 ** Math.ceil(Math.log2(n));
}

// Deterministic shuffle (Fisher-Yates + linear-congruential RNG) so
// the bracket is stable across re-renders within a tournament cycle
// but rotates each cycle. We seed off the calendar week (UTC) so
// every Monday the byes redraw onto different teammates — nobody
// gets stuck as the perma-bye holder and nobody gets stuck always
// drawing into a first-round game.
function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = ((seed | 0) >>> 0) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function currentWeekSeed(): number {
  // 7 days in ms; Jan 1 1970 UTC was a Thursday — offset doesn't
  // matter, we just need a stable integer that ticks once per week.
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

// Map a first-round seed count to the conventional name of the
// round it represents. Falls back to "Round of N" when the size
// doesn't map onto a standard label.
function roundNameForSize(size: number): string {
  if (size === 2) return 'Final';
  if (size === 4) return 'Semifinals';
  if (size === 8) return 'Quarterfinals';
  return `Round of ${size}`;
}

// A bracket cell carries either a known UserLite (a real player,
// either seeded directly or a known bye-advancer in a later round)
// or a 'pending' marker for "waiting on a lower-round match to
// resolve". Round 1 cells are either PvP (two users) or BYE (one
// user + the cell is marked isBye so the visual + status can flag
// the auto-advance).
type CellSlot =
  | { kind: 'user'; user: UserLite }
  | { kind: 'pending' };

interface BracketCell {
  top: CellSlot | null;
  bottom: CellSlot | null;
  // True only for first-round cells where one player gets a bye.
  // The bracket builder propagates the bye player into round 2 (and
  // beyond, if that player's round-2 opponent is also a bye-advancer)
  // so later rounds never look empty when the tournament starts.
  isBye: boolean;
}

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

interface UserLite {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function BracketLobby() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const reloadMatches = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch('/api/games/connect4', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
    setMatches(((json as { rows: MatchRow[] }).rows) ?? []);
  }, [session?.access_token]);

  useEffect(() => { void reloadMatches(); }, [reloadMatches]);

  useEffect(() => {
    if (!session?.access_token) return;
    void (async () => {
      const rows = await db({
        action: 'select', table: 'users',
        select: 'id, full_name, email, avatar_url',
        order: { column: 'full_name', ascending: true },
      }).catch(() => []);
      if (Array.isArray(rows)) setUsers(rows as UserLite[]);
    })();
  }, [session?.access_token]);

  // Single realtime channel — every match row change refreshes the
  // bracket, the live-now strip, the your-turn list, and the
  // recent-results list in one shot.
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`connect4-bracket-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connect4_matches' },
        () => { void reloadMatches(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, reloadMatches]);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

  // Map (a, b) → most recent match between those two so a bracket
  // cell can light up when their game is live. Sorted by updated_at
  // newest first so reused pairings always show the freshest game.
  const matchByPair = useMemo(() => {
    const m = new Map<string, MatchRow>();
    if (!matches) return m;
    const sorted = [...matches].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    for (const row of sorted) {
      const key = pairKey(row.challenger_id, row.opponent_id);
      if (!m.has(key)) m.set(key, row);
    }
    return m;
  }, [matches]);

  // Live-now feed — every active or open match in the system.
  const liveMatches = useMemo(() => {
    if (!matches) return [];
    return matches
      .filter((m) => m.status === 'active' || m.status === 'open')
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [matches]);

  const yourTurn = useMemo(() => {
    if (!user || !matches) return [];
    return matches.filter((m) => {
      if (m.status !== 'active' && m.status !== 'open') return false;
      if (user.id !== m.challenger_id && user.id !== m.opponent_id) return false;
      const expected = currentPlayer(m.moves) === 0 ? m.challenger_id : m.opponent_id;
      return expected === user.id;
    });
  }, [user, matches]);

  const completed = useMemo(() => {
    if (!user || !matches) return [];
    return matches.filter((m) =>
      (m.status === 'complete' || m.status === 'forfeit')
      && (m.challenger_id === user.id || m.opponent_id === user.id),
    ).slice(0, 5);
  }, [user, matches]);

  // Bracket size grows with the team. Floor at MIN_BRACKET_SIZE so a
  // small team still sees a real round-of-16 layout; otherwise round
  // up to the next power of two so every teammate gets a seat.
  const bracketSize = useMemo(
    () => Math.max(MIN_BRACKET_SIZE, nextPow2(Math.max(users.length, 2))),
    [users.length],
  );
  const rounds = Math.log2(bracketSize);

  // Full bracket layout — round 1 through the final, with byes
  // SCATTERED across the bracket (not piled at the end of the
  // alphabet) and bye-advancers propagated forward so later rounds
  // never look empty when the tournament starts.
  //
  // Strategy (rotates weekly so the same teammate doesn't get
  // perma-byed):
  //   1. Shuffle the user list deterministically off the week
  //      number; reload-stable within the week.
  //   2. Compute byeCount = bracketSize - users.length. With 37
  //      teammates and a 64 bracket, that's 27 byes and 5 real
  //      first-round games.
  //   3. Build a template of 32 first-round match slots — 5 PvP
  //      tokens + 27 BYE tokens — and shuffle that template too so
  //      the byes interleave among the first-round positions.
  //   4. Fill PvP slots with two players each; fill BYE slots with
  //      one player + null.
  //   5. Walk forward through each subsequent round: cell N at
  //      round R takes its top/bottom from cells 2N and 2N+1 at
  //      round R-1. If a feeder cell is a bye, its known player
  //      flows up. Otherwise the slot is 'pending'.
  // The result: every first-round cell has at least one real
  // player, and any second-round cell whose two feeders are both
  // byes already shows both players (the tournament can start
  // immediately on those games).
  const bracketRounds = useMemo<BracketCell[][]>(() => {
    if (users.length === 0) return [];
    const round1Count = bracketSize / 2;
    const placed = users.slice(0, bracketSize);
    const byeCount = Math.max(0, bracketSize - placed.length);
    const pvpMatchCount = Math.max(0, round1Count - byeCount);

    const weekSeed = currentWeekSeed();
    const shuffledUsers = deterministicShuffle(placed, weekSeed);
    const templates: ('PvP' | 'BYE')[] = [
      ...Array(pvpMatchCount).fill('PvP') as 'PvP'[],
      ...Array(byeCount).fill('BYE') as 'BYE'[],
    ];
    const shuffledTemplates = deterministicShuffle(templates, (weekSeed ^ 0x5a5a5a5a) >>> 0);

    const round1: BracketCell[] = [];
    let userIdx = 0;
    for (const t of shuffledTemplates) {
      if (t === 'PvP') {
        const a = shuffledUsers[userIdx];
        const b = shuffledUsers[userIdx + 1];
        round1.push({
          top: a ? { kind: 'user', user: a } : null,
          bottom: b ? { kind: 'user', user: b } : null,
          isBye: false,
        });
        userIdx += 2;
      } else {
        const a = shuffledUsers[userIdx];
        round1.push({
          top: a ? { kind: 'user', user: a } : null,
          bottom: null,
          isBye: true,
        });
        userIdx += 1;
      }
    }

    const out: BracketCell[][] = [round1];
    for (let r = 1; r < rounds; r += 1) {
      const prev = out[r - 1] ?? [];
      const next: BracketCell[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        const fa = prev[i];
        const fb = prev[i + 1];
        // A bye cell forwards its sole known player; any other
        // round-1 cell or any higher-round cell whose feeders
        // haven't been pre-resolved is 'pending'.
        const advancerFrom = (cell: BracketCell | undefined): CellSlot | null => {
          if (!cell) return null;
          if (cell.isBye && cell.top && cell.top.kind === 'user') return cell.top;
          return { kind: 'pending' };
        };
        next.push({
          top: advancerFrom(fa),
          bottom: advancerFrom(fb),
          isBye: false,
        });
      }
      out.push(next);
    }
    return out;
  }, [users, bracketSize, rounds]);

  // Round-1-only view kept for the click-to-challenge path: each
  // first-round PvP / BYE cell still maps to a (UserLite|null,
  // UserLite|null) pair so the existing onCellClick + match-creation
  // flow keeps working without changes.
  const bracketPairs = useMemo<[UserLite | null, UserLite | null][]>(() => {
    const round1 = bracketRounds[0] ?? [];
    return round1.map((c): [UserLite | null, UserLite | null] => [
      c.top && c.top.kind === 'user' ? c.top.user : null,
      c.bottom && c.bottom.kind === 'user' ? c.bottom.user : null,
    ]);
  }, [bracketRounds]);

  const challenge = useCallback(
    async (opponentId: string) => {
      if (!session?.access_token) return;
      setCreating(opponentId);
      setError(null);
      const r = await fetch('/api/games/connect4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ opponent_id: opponentId }),
      });
      const json = await r.json().catch(() => ({}));
      setCreating(null);
      if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
      const newMatch = json as MatchRow;
      router.push(`/app/games/connect4?match=${newMatch.id}`);
    },
    [session?.access_token, router],
  );

  // Click handler for a matchup cell. Three behaviours:
  //   - Both players present, you're one of them → either jump to
  //     the existing match between you or POST a new one.
  //   - Both players present, you're a spectator → if a match
  //     exists between them, route to it; otherwise no-op.
  //   - One slot empty → no-op (the bracket is still seating).
  const onCellClick = useCallback(
    (a: UserLite | null, b: UserLite | null) => {
      if (!a || !b || !user) return;
      const existing = matchByPair.get(pairKey(a.id, b.id));
      const youAreIn = user.id === a.id || user.id === b.id;
      if (existing && (existing.status !== 'complete' && existing.status !== 'forfeit')) {
        router.push(`/app/games/connect4?match=${existing.id}`);
        return;
      }
      if (existing) {
        router.push(`/app/games/connect4?match=${existing.id}`);
        return;
      }
      if (youAreIn) {
        const opponentId = user.id === a.id ? b.id : a.id;
        void challenge(opponentId);
      }
    },
    [user, matchByPair, router, challenge],
  );

  return (
    <div className="flex flex-col gap-5">
      <LiveNow matches={liveMatches} userById={userById} youId={user?.id ?? null} />

      <section className="rounded-2xl border border-black/10 bg-white/65 px-4 py-4 lg:px-6 lg:py-5">
        <header className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
              Open bracket · {bracketSize} seeds
            </h2>
            <p className="text-[12px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Click any first-round matchup to challenge — or spectate a game already in progress.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[10px] tracking-[0.22em] uppercase text-foreground/35">
            {bracketSize / 2} matchups · {rounds} rounds
          </span>
        </header>

        <Bracket
          pairs={bracketPairs}
          bracketRounds={bracketRounds}
          rounds={rounds}
          matchByPair={matchByPair}
          userById={userById}
          youId={user?.id ?? null}
          onCellClick={onCellClick}
          creating={creating}
        />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <CompactPane title="Your turn" empty="No matches awaiting your move." count={yourTurn.length}>
          {yourTurn.map((m) => (
            <MatchPaneItem key={m.id} match={m} you={user?.id} userById={userById} />
          ))}
        </CompactPane>
        <CompactPane title="Recent results" empty="No completed matches yet." count={completed.length}>
          {completed.map((m) => (
            <MatchPaneItem key={m.id} match={m} you={user?.id} userById={userById} />
          ))}
        </CompactPane>
      </div>

      {error && (
        <p className="text-[11.5px] text-red-700" role="alert" style={{ fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── LIVE NOW strip ──────────────────────────────────────────────── */

function LiveNow({
  matches,
  userById,
  youId,
}: {
  matches: MatchRow[];
  userById: Map<string, UserLite>;
  youId: string | null;
}) {
  if (matches.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-gradient-to-r from-warm-bg/70 to-white/60 px-4 py-3 flex items-center gap-3">
        <span className="inline-block w-2 h-2 rounded-full bg-foreground/30" />
        <span className="text-[12px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          No matches in progress — claim a bracket slot below to kick the day off.
        </span>
      </section>
    );
  }
  return (
    <section
      className="rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-white/80 px-4 py-3"
      aria-label="Matches currently in progress"
    >
      <header className="flex items-center justify-between mb-2">
        <h2 className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-700">
          <span className="relative inline-flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          Live now
        </h2>
        <span className="text-[10.5px] tabular-nums text-foreground/40">{matches.length}</span>
      </header>
      <ul className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {matches.map((m) => {
          const a = userById.get(m.challenger_id);
          const b = userById.get(m.opponent_id);
          const aIsYou = m.challenger_id === youId;
          const bIsYou = m.opponent_id === youId;
          const aName = (a?.full_name || a?.email || '—').split(' ')[0];
          const bName = (b?.full_name || b?.email || '—').split(' ')[0];
          return (
            <li key={m.id} className="shrink-0">
              <Link
                href={`/app/games/connect4?match=${m.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-emerald-200/60 hover:border-emerald-400 hover:shadow-sm transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Avatar user={a} size="xs" />
                <span className={`text-[12px] ${aIsYou ? 'font-bold text-primary' : 'font-semibold text-foreground/80'}`}>{aName}</span>
                <span className="text-[10px] text-foreground/35 uppercase tracking-wider">vs</span>
                <span className={`text-[12px] ${bIsYou ? 'font-bold text-primary' : 'font-semibold text-foreground/80'}`}>{bName}</span>
                <span className="text-[10px] text-foreground/40 tabular-nums">· {m.moves.length} moves</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── Bracket layout ─────────────────────────────────────────────── */

function Bracket({
  pairs,
  bracketRounds,
  rounds,
  matchByPair,
  userById,
  youId,
  onCellClick,
  creating,
}: {
  pairs: [UserLite | null, UserLite | null][];
  bracketRounds: BracketCell[][];
  rounds: number;
  matchByPair: Map<string, MatchRow>;
  userById: Map<string, UserLite>;
  youId: string | null;
  onCellClick: (a: UserLite | null, b: UserLite | null) => void;
  creating: string | null;
}) {
  // Split the first-round matchups across two halves. Left side
  // gets the first half; right side gets the second half. The
  // bracket mirrors around the Final so future rounds converge
  // inward toward the trophy slot.
  const left = pairs.slice(0, pairs.length / 2);
  const right = pairs.slice(pairs.length / 2);
  const firstRoundLabel = roundNameForSize(pairs.length * 2);

  // Per-round labels (round 1 → semifinal). round[0] === first-
  // round. round[rounds-1] is the Final (rendered separately in the
  // centre column). For later rounds we use the bracketRounds data
  // to render advancers where known (bye holders) and 'TBD' where
  // their feeder match hasn't resolved yet.
  const sideRoundLabels: string[] = [];
  for (let r = 1; r < rounds; r += 1) {
    const sizeAtRound = 2 ** (rounds - r + 1);
    sideRoundLabels.push(roundNameForSize(sizeAtRound));
  }

  // Inline grid template: one fr per side round, plus a flex
  // central column for the Final. We avoid Tailwind class names
  // here because the column count grows with the team and Tailwind
  // can't enumerate every possible class at build time.
  const sideCols = sideRoundLabels.length;
  const gridTemplateColumns = `repeat(${sideCols}, minmax(0, 1fr)) minmax(140px, 180px) repeat(${sideCols}, minmax(0, 1fr))`;

  // Pre-split each non-first round into its left + right halves so
  // we can hand the right halves to the right-side placeholder
  // columns. Round 0 is rendered separately by BracketColumn (it's
  // interactive); rounds 1..(rounds-1) are passive display cells
  // that surface bye-advancers as soon as they're known.
  const laterRounds = bracketRounds.slice(1);

  return (
    <div
      className="grid gap-3 lg:gap-4 items-stretch"
      style={{ gridTemplateColumns }}
    >
      {/* Left half — round 1 column is interactive; subsequent
          columns render advancers / TBD heading toward the final. */}
      <BracketColumn
        label={firstRoundLabel}
        pairs={left}
        side="left"
        matchByPair={matchByPair}
        userById={userById}
        youId={youId}
        onCellClick={onCellClick}
        creating={creating}
        round1Cells={bracketRounds[0]?.slice(0, left.length) ?? []}
      />
      {sideRoundLabels.slice(1).map((label, idx) => {
        const roundCells = laterRounds[idx] ?? [];
        const halfCount = roundCells.length / 2;
        const leftCells = roundCells.slice(0, halfCount);
        return (
          <BracketAdvancerColumn
            key={`left-${label}-${idx}`}
            label={label}
            cells={leftCells}
            side="left"
            youId={youId}
          />
        );
      })}

      <FinalSlot finalCell={bracketRounds[rounds - 1]?.[0]} youId={youId} />

      {/* Right half — mirrored. Render later rounds in reverse so
          the visual order reads outward → inward → final → inward
          → outward. */}
      {sideRoundLabels.slice(1).reverse().map((label, idx) => {
        const actualIdx = sideRoundLabels.length - 2 - idx;
        const roundCells = laterRounds[actualIdx] ?? [];
        const halfCount = roundCells.length / 2;
        const rightCells = roundCells.slice(halfCount);
        return (
          <BracketAdvancerColumn
            key={`right-${label}-${idx}`}
            label={label}
            cells={rightCells}
            side="right"
            youId={youId}
          />
        );
      })}
      <BracketColumn
        label={firstRoundLabel}
        pairs={right}
        side="right"
        matchByPair={matchByPair}
        userById={userById}
        youId={youId}
        onCellClick={onCellClick}
        creating={creating}
        round1Cells={bracketRounds[0]?.slice(left.length) ?? []}
      />
    </div>
  );
}

function BracketColumn({
  label,
  pairs,
  side,
  matchByPair,
  userById,
  youId,
  onCellClick,
  creating,
  round1Cells,
}: {
  label: string;
  pairs: [UserLite | null, UserLite | null][];
  side: 'left' | 'right';
  matchByPair: Map<string, MatchRow>;
  userById: Map<string, UserLite>;
  youId: string | null;
  onCellClick: (a: UserLite | null, b: UserLite | null) => void;
  creating: string | null;
  // Parallel array to `pairs`; carries the `isBye` flag so the
  // matchup cell can render "BYE · advances" instead of "Waiting
  // for seed" for the now-deliberate one-player cells.
  round1Cells: BracketCell[];
}) {
  return (
    <div className="flex flex-col">
      <p
        className={`text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/40 mb-2 ${side === 'right' ? 'text-right' : ''}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-3 flex-1 justify-around">
        {pairs.map((pair, i) => (
          <MatchupCell
            key={`${side}-${i}`}
            pair={pair}
            isBye={round1Cells[i]?.isBye === true}
            side={side}
            matchByPair={matchByPair}
            userById={userById}
            youId={youId}
            onClick={() => onCellClick(pair[0], pair[1])}
            creating={creating}
          />
        ))}
      </div>
    </div>
  );
}

function BracketAdvancerColumn({
  label,
  cells,
  side,
  youId,
}: {
  label: string;
  cells: BracketCell[];
  side: 'left' | 'right';
  youId: string | null;
}) {
  // Round 2+ display column. Each cell either:
  //   - already shows BOTH players (both feeders were byes, so the
  //     tournament can start this game immediately),
  //   - shows ONE player + "Waiting for round X" (one feeder was a
  //     bye, the other is a PvP whose winner hasn't resolved yet), or
  //   - shows "TBD" on both rows (both feeders are PvP).
  // No round ever renders as a blank cell — the bye-advancers
  // propagated by the bracket builder make sure every later round
  // shows real player names wherever the math allows.
  const safeCells = cells.length > 0 ? cells : Array.from({ length: 1 }, () => ({ top: null, bottom: null, isBye: false } as BracketCell));
  return (
    <div className="hidden lg:flex flex-col">
      <p
        className={`text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/30 mb-2 ${side === 'right' ? 'text-right' : ''}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-3 flex-1 justify-around">
        {safeCells.map((cell, i) => (
          <AdvancerCell key={i} cell={cell} side={side} youId={youId} />
        ))}
      </div>
    </div>
  );
}

function AdvancerCell({
  cell,
  side,
  youId,
}: {
  cell: BracketCell;
  side: 'left' | 'right';
  youId: string | null;
}) {
  const topKnown = cell.top?.kind === 'user' ? cell.top.user : null;
  const bottomKnown = cell.bottom?.kind === 'user' ? cell.bottom.user : null;
  const bothKnown = !!(topKnown && bottomKnown);
  const noneKnown = !cell.top && !cell.bottom
    ? true
    : (!topKnown && !bottomKnown);

  // Status line conveys whether this cell can play yet.
  let statusText: string;
  let statusTone: 'ready' | 'half' | 'tbd';
  if (bothKnown) {
    statusText = 'Ready to play';
    statusTone = 'ready';
  } else if (topKnown || bottomKnown) {
    statusText = 'Waiting for round 1';
    statusTone = 'half';
  } else {
    statusText = 'TBD';
    statusTone = 'tbd';
  }
  const statusClasses = statusTone === 'ready'
    ? 'text-emerald-700 bg-emerald-100/70'
    : statusTone === 'half'
      ? 'text-sky-700 bg-sky-100/60'
      : 'text-foreground/40 bg-white/40';

  return (
    <div
      className={`rounded-lg border ${bothKnown ? 'border-black/10 bg-white' : 'border-dashed border-black/10 bg-white/40'} ${side === 'right' ? 'pr-2' : 'pl-2'}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <AdvancerRow slot={cell.top} you={topKnown?.id === youId} />
      <div className="h-px bg-black/5" />
      <AdvancerRow slot={cell.bottom} you={bottomKnown?.id === youId} />
      <div
        className={`flex items-center justify-between gap-1 px-2 py-1 rounded-b-md text-[9.5px] font-semibold uppercase tracking-wider ${statusClasses}`}
      >
        <span className="truncate">{statusText}</span>
        {noneKnown && <span className="text-[8.5px] font-normal opacity-60">·</span>}
      </div>
    </div>
  );
}

function AdvancerRow({ slot, you }: { slot: CellSlot | null; you: boolean }) {
  if (!slot) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-foreground/30 italic">
        TBD
      </div>
    );
  }
  if (slot.kind === 'pending') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-foreground/40 italic">
        Winner of round 1
      </div>
    );
  }
  const u = slot.user;
  const name = u.full_name || u.email || '—';
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-foreground/75">
      <Avatar user={u} size="xs" />
      <span className="truncate flex-1">
        {name}
        {you && <span className="ml-1 text-[9px] text-primary uppercase tracking-wider font-bold">you</span>}
      </span>
    </div>
  );
}

function FinalSlot({ finalCell, youId }: { finalCell?: BracketCell; youId: string | null }) {
  // The Final's top + bottom are derived from the two semifinal
  // winners. A bye-heavy bracket can sometimes resolve one or both
  // sides of the Final early (very rare, but mathematically possible
  // on tiny brackets), so we still surface whichever side is known.
  const topKnown = finalCell?.top?.kind === 'user' ? finalCell.top.user : null;
  const bottomKnown = finalCell?.bottom?.kind === 'user' ? finalCell.bottom.user : null;
  return (
    <div className="hidden lg:flex flex-col items-center justify-center">
      <p
        className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary mb-2"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Final
      </p>
      <div
        className="w-full aspect-[3/4] rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-warm-bg/40 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="text-2xl" aria-hidden>🏆</span>
        {topKnown || bottomKnown ? (
          <div className="w-full text-[11px] text-foreground/70 leading-snug space-y-0.5">
            <p className={topKnown?.id === youId ? 'font-bold text-primary' : 'font-semibold'}>
              {topKnown ? (topKnown.full_name || topKnown.email || '—').split(' ').slice(0, 2).join(' ') : 'TBD'}
            </p>
            <p className="text-[10px] text-foreground/45 uppercase tracking-wider">vs</p>
            <p className={bottomKnown?.id === youId ? 'font-bold text-primary' : 'font-semibold'}>
              {bottomKnown ? (bottomKnown.full_name || bottomKnown.email || '—').split(' ').slice(0, 2).join(' ') : 'TBD'}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-foreground/55 leading-snug">
            The champion of the open bracket lands here.
          </p>
        )}
      </div>
    </div>
  );
}

function MatchupCell({
  pair,
  isBye,
  side,
  matchByPair,
  userById,
  youId,
  onClick,
  creating,
}: {
  pair: [UserLite | null, UserLite | null];
  isBye: boolean;
  side: 'left' | 'right';
  matchByPair: Map<string, MatchRow>;
  userById: Map<string, UserLite>;
  youId: string | null;
  onClick: () => void;
  creating: string | null;
}) {
  const [a, b] = pair;
  const match = a && b ? matchByPair.get(pairKey(a.id, b.id)) : undefined;
  const youAreIn = !!(youId && (a?.id === youId || b?.id === youId));
  const isLive = !!match && (match.status === 'active' || match.status === 'open');
  const isDone = !!match && (match.status === 'complete' || match.status === 'forfeit');
  // Bye cells aren't clickable — there's no opponent to challenge,
  // and the auto-advance fills the round-2 slot automatically.
  const canAct = !isBye && ((youAreIn && !creating) || !!match);

  // Status footer copy — one short line that reads on its own so
  // the bracket doubles as a status board. Each branch is short on
  // purpose; the cell only has ~12rem of horizontal space.
  let statusText: string;
  let statusTone: 'live' | 'open' | 'done' | 'idle' | 'wait' | 'bye';
  if (isBye) {
    statusText = 'Bye · advances';
    statusTone = 'bye';
  } else if (!a || !b) {
    statusText = 'Waiting for seed';
    statusTone = 'wait';
  } else if (match && match.status === 'active') {
    const moves = match.moves.length;
    statusText = `Live · ${moves} ${moves === 1 ? 'move' : 'moves'}`;
    statusTone = 'live';
  } else if (match && match.status === 'open') {
    statusText = match.moves.length === 0 ? 'Open · awaiting first move' : `Open · ${match.moves.length} moves`;
    statusTone = 'open';
  } else if (match && match.status === 'complete') {
    if (match.winner_id) {
      const winnerName = (() => {
        if (match.winner_id === a.id) return (a.full_name || a.email || '').split(' ')[0] || 'Winner';
        if (match.winner_id === b.id) return (b.full_name || b.email || '').split(' ')[0] || 'Winner';
        return userById.get(match.winner_id)?.full_name?.split(' ')[0] ?? 'Winner';
      })();
      statusText = `Winner · ${winnerName}`;
    } else {
      statusText = 'Draw';
    }
    statusTone = 'done';
  } else if (match && match.status === 'forfeit') {
    statusText = 'Forfeit';
    statusTone = 'done';
  } else if (youAreIn) {
    statusText = creating ? 'Starting…' : 'Click to challenge';
    statusTone = 'idle';
  } else {
    statusText = 'TBD';
    statusTone = 'idle';
  }
  const statusClasses = (() => {
    switch (statusTone) {
      case 'live': return 'text-emerald-700 bg-emerald-100/70';
      case 'open': return 'text-sky-700 bg-sky-100/70';
      case 'done': return 'text-foreground/60 bg-warm-bg/70';
      case 'wait': return 'text-foreground/40 bg-white/40';
      case 'bye': return 'text-violet-700 bg-violet-100/70';
      case 'idle':
      default: return youAreIn ? 'text-primary bg-primary/10' : 'text-foreground/40 bg-white/40';
    }
  })();

  return (
    <button
      type="button"
      onClick={canAct ? onClick : undefined}
      disabled={!canAct}
      className={`group relative rounded-lg border bg-white text-left transition-all
        ${side === 'right' ? 'pr-2' : 'pl-2'}
        ${canAct ? 'border-black/10 hover:border-primary/40 hover:shadow-sm cursor-pointer' : 'border-black/5 cursor-default'}
        ${isLive ? 'ring-2 ring-emerald-400/60' : ''}
        ${isDone ? 'bg-warm-bg/50' : ''}`}
    >
      {isLive && (
        <span className="absolute -top-1.5 right-2 inline-flex items-center gap-1 px-1.5 py-px rounded-full bg-emerald-500 text-white text-[8.5px] font-bold tracking-widest uppercase">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-white" />
          </span>
          Live
        </span>
      )}
      <Row user={a} winner={!!isDone && match?.winner_id === a?.id} you={a?.id === youId} byePlaceholder={isBye && !a} />
      <div className="h-px bg-black/5" />
      <Row user={b} winner={!!isDone && match?.winner_id === b?.id} you={b?.id === youId} byePlaceholder={isBye && !b} />

      {/* Status footer — reads even when the cell isn't clickable
          (e.g. a finished round-1 match, or a "Waiting for seed"
          slot in a sparse bracket). Picks tone from the resolved
          match state so an admin scanning the page can see the
          state of every game without opening each one. */}
      <div
        className={`flex items-center justify-between gap-1 px-2 py-1 rounded-b-md text-[9.5px] font-semibold uppercase tracking-wider ${statusClasses}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="truncate">{statusText}</span>
        {match && (
          <span className="text-[8.5px] font-normal opacity-60 tabular-nums shrink-0">{match.moves.length}m</span>
        )}
      </div>
    </button>
  );
}

function Row({ user, winner, you, byePlaceholder = false }: { user: UserLite | null; winner: boolean; you: boolean; byePlaceholder?: boolean }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] italic" style={{ fontFamily: 'var(--font-body)' }}>
        {byePlaceholder ? (
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-violet-100/60 text-violet-700 text-[9.5px] font-bold uppercase tracking-[0.18em] not-italic">
            Bye
          </span>
        ) : (
          <span className="text-foreground/35">Empty seed</span>
        )}
      </div>
    );
  }
  const name = user.full_name || user.email || '—';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${winner ? 'font-bold text-foreground' : 'text-foreground/75'}`} style={{ fontFamily: 'var(--font-body)' }}>
      <Avatar user={user} size="xs" />
      <span className="truncate flex-1">
        {name}
        {you && <span className="ml-1 text-[9px] text-primary uppercase tracking-wider font-bold">you</span>}
      </span>
      {winner && <span aria-hidden className="text-emerald-600 text-[12px]">✓</span>}
    </div>
  );
}

function Avatar({ user, size = 'sm' }: { user: UserLite | null | undefined; size?: 'xs' | 'sm' }) {
  const dim = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';
  if (!user) {
    return <div className={`${dim} rounded-full bg-warm-bg`} />;
  }
  const name = user.full_name || user.email || '?';
  if (user.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar_url} alt="" className={`${dim} rounded-full object-cover bg-warm-bg`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-warm-bg flex items-center justify-center font-semibold text-foreground/55`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Compact panes (your-turn + recent results) ──────────────── */

function CompactPane({
  title,
  empty,
  count,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
      <header className="flex items-baseline justify-between mb-1.5">
        <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45">{title}</h2>
        <span className="text-[11px] text-foreground/40 tabular-nums">{count}</span>
      </header>
      {count === 0 ? (
        <p className="text-[12px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>{empty}</p>
      ) : (
        <ul className="space-y-0.5">{children}</ul>
      )}
    </section>
  );
}

function MatchPaneItem({
  match,
  you,
  userById,
}: {
  match: MatchRow;
  you: string | undefined;
  userById: Map<string, UserLite>;
}) {
  const opponent = you === match.challenger_id ? match.opponent_id : match.challenger_id;
  const opp = userById.get(opponent);
  const oppName = opp?.full_name || opp?.email || '(unknown)';
  const moves = match.moves.length;
  const result =
    match.status === 'complete' && match.winner_id === you ? 'You won'
    : match.status === 'complete' && match.winner_id ? 'You lost'
    : match.status === 'complete' ? 'Draw'
    : match.status === 'forfeit' && match.winner_id === you ? 'Opponent forfeited'
    : match.status === 'forfeit' ? 'You forfeited'
    : match.status === 'open' ? 'Open'
    : `${moves} ${moves === 1 ? 'move' : 'moves'}`;
  return (
    <li>
      <Link
        href={`/app/games/connect4?match=${match.id}`}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] hover:bg-warm-bg/60"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Avatar user={opp ?? null} size="xs" />
        <span className="truncate flex-1">{oppName}</span>
        <span className="text-[10.5px] text-foreground/45 whitespace-nowrap">{result}</span>
      </Link>
    </li>
  );
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
