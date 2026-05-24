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

// Map a first-round seed count to the conventional name of the
// round it represents. Falls back to "Round of N" when the size
// doesn't map onto a standard label.
function roundNameForSize(size: number): string {
  if (size === 2) return 'Final';
  if (size === 4) return 'Semifinals';
  if (size === 8) return 'Quarterfinals';
  return `Round of ${size}`;
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
  // up to the next power of two so every teammate gets a seat
  // (with any leftover slots rendering as empty seeds).
  const bracketSize = useMemo(
    () => Math.max(MIN_BRACKET_SIZE, nextPow2(Math.max(users.length, 2))),
    [users.length],
  );
  const rounds = Math.log2(bracketSize);
  const seeded = useMemo(() => users.slice(0, bracketSize), [users, bracketSize]);

  // Sequential pairing — alphabetical user 0 vs user 1, 2 vs 3, etc.
  // Keeps the bracket reading as a 1:1 mapping of the staff list
  // without making teammates memorise tournament seeds. Empty slots
  // get a null entry so the matchup cell can render "Empty seed".
  const bracketPairs = useMemo(() => {
    const out: [UserLite | null, UserLite | null][] = [];
    for (let i = 0; i < bracketSize; i += 2) {
      out.push([seeded[i] ?? null, seeded[i + 1] ?? null]);
    }
    return out;
  }, [seeded, bracketSize]);

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
  rounds,
  matchByPair,
  userById,
  youId,
  onCellClick,
  creating,
}: {
  pairs: [UserLite | null, UserLite | null][];
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

  // One label per round, ordered round 1 → semifinal. Round 1 is
  // the actual seeded list; rounds 2..(rounds-1) render as TBD
  // placeholder columns with the matching name; round `rounds`
  // (the Final) gets the trophy column in the centre.
  const sideRoundLabels: string[] = [];
  for (let r = 1; r < rounds; r += 1) {
    const sizeAtRound = 2 ** (rounds - r + 1);
    sideRoundLabels.push(roundNameForSize(sizeAtRound));
  }
  // sideRoundLabels[0] === firstRoundLabel (matches the seeded
  // column); subsequent entries are the placeholder rounds heading
  // toward the final.

  // Inline grid template: one fr per side round, plus a flex
  // central column for the Final. We avoid Tailwind class names
  // here because the column count grows with the team and Tailwind
  // can't enumerate every possible class at build time.
  const sideCols = sideRoundLabels.length;
  const gridTemplateColumns = `repeat(${sideCols}, minmax(0, 1fr)) minmax(140px, 180px) repeat(${sideCols}, minmax(0, 1fr))`;

  return (
    <div
      className="grid gap-3 lg:gap-4 items-stretch"
      style={{ gridTemplateColumns }}
    >
      {/* Left half — round 1 column is the real matchups; subsequent
          columns are placeholders heading toward the final. */}
      <BracketColumn
        label={firstRoundLabel}
        pairs={left}
        side="left"
        matchByPair={matchByPair}
        userById={userById}
        youId={youId}
        onCellClick={onCellClick}
        creating={creating}
      />
      {sideRoundLabels.slice(1).map((label, idx) => {
        const placeholderCount = left.length / 2 ** (idx + 1);
        return (
          <BracketPlaceholderColumn key={`left-${label}-${idx}`} label={label} count={placeholderCount} side="left" />
        );
      })}

      <FinalSlot />

      {/* Right half — mirrored. Render the placeholders in reverse
          so the visual order reads outward → inward → final →
          inward → outward. */}
      {sideRoundLabels.slice(1).reverse().map((label, idx) => {
        const placeholderCount = right.length / 2 ** (sideRoundLabels.length - 1 - idx);
        return (
          <BracketPlaceholderColumn key={`right-${label}-${idx}`} label={label} count={placeholderCount} side="right" />
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
}: {
  label: string;
  pairs: [UserLite | null, UserLite | null][];
  side: 'left' | 'right';
  matchByPair: Map<string, MatchRow>;
  userById: Map<string, UserLite>;
  youId: string | null;
  onCellClick: (a: UserLite | null, b: UserLite | null) => void;
  creating: string | null;
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

function BracketPlaceholderColumn({
  label,
  count,
  side,
}: {
  label: string;
  count: number;
  side: 'left' | 'right';
}) {
  // Round 2+ placeholder column. count is the integer number of
  // matchups that round will host once round-1 winners advance;
  // Math.max(1, ...) guards against any rounding glitch with very
  // small brackets.
  const safeCount = Math.max(1, Math.floor(count));
  return (
    <div className="hidden lg:flex flex-col">
      <p
        className={`text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/30 mb-2 ${side === 'right' ? 'text-right' : ''}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-3 flex-1 justify-around">
        {Array.from({ length: safeCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-dashed border-black/10 bg-white/30 px-3 py-3 text-[10px] text-foreground/30 text-center"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            TBD
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalSlot() {
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
        <p className="text-[11px] text-foreground/55 leading-snug">
          The champion of the open bracket lands here.
        </p>
      </div>
    </div>
  );
}

function MatchupCell({
  pair,
  side,
  matchByPair,
  userById,
  youId,
  onClick,
  creating,
}: {
  pair: [UserLite | null, UserLite | null];
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
  const canAct = (youAreIn && !creating) || !!match;

  // Status footer copy — one short line that reads on its own so
  // the bracket doubles as a status board. Each branch is short on
  // purpose; the cell only has ~12rem of horizontal space.
  let statusText: string;
  let statusTone: 'live' | 'open' | 'done' | 'idle' | 'wait';
  if (!a || !b) {
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
      <Row user={a} winner={!!isDone && match?.winner_id === a?.id} you={a?.id === youId} />
      <div className="h-px bg-black/5" />
      <Row user={b} winner={!!isDone && match?.winner_id === b?.id} you={b?.id === youId} />

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

function Row({ user, winner, you }: { user: UserLite | null; winner: boolean; you: boolean }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-foreground/35 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Empty seed
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
