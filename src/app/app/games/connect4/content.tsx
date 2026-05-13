'use client';

// Connect-4 tournament — Phase 4 of the 10-phase build. When the
// URL carries ?match=<uuid> we hydrate that match record, render
// the live board off its moves[], subscribe to the
// connect4_matches realtime channel filtered to that id, and PATCH
// /api/games/connect4/[id] on every drop. Without a ?match, the
// page falls back to a single-browser pass-and-play demo so the
// rules engine stays exercised even before the lobby (Phase 5)
// ships.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { findWinner, buildBoard, currentPlayer, COLS } from '@/lib/connect4';
import Board from './Board';

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

export default function Content() {
  const { user, session } = useAuth();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match');

  // Local pass-and-play state (used when no ?match param is set).
  const [localMoves, setLocalMoves] = useState<number[]>([]);

  // Server-backed match state (live when ?match=<id> is set).
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate the match record + subscribe to realtime when match id
  // changes. Realtime payloads update local state in place so the
  // PATCH round-trip is purely best-effort — the channel echoes
  // every confirmed move back to both clients and the UI never
  // needs to await the API response to render.
  useEffect(() => {
    if (!matchId || !session?.access_token) { setMatch(null); return; }
    let cancelled = false;
    setLoadError(null);

    void (async () => {
      const r = await fetch(`/api/games/connect4/${matchId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await r.json().catch(() => ({}));
      if (!cancelled) {
        if (!r.ok) setLoadError((json as { error?: string }).error ?? `HTTP ${r.status}`);
        else setMatch(json as MatchRow);
      }
    })();

    const channel = supabase
      .channel(`connect4-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connect4_matches', filter: `id=eq.${matchId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as MatchRow;
          if (!cancelled) setMatch(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, session?.access_token]);

  // Drop handler is closed over the current match state so we know
  // whose turn it is + whether the caller is allowed to play.
  const isMyTurn = useMemo(() => {
    if (!match || !user) return false;
    if (match.status === 'complete' || match.status === 'forfeit') return false;
    const expected = currentPlayer(match.moves) === 0 ? match.challenger_id : match.opponent_id;
    return expected === user.id;
  }, [match, user]);

  const onDropServer = useCallback(
    async (column: number) => {
      if (!matchId || !session?.access_token || !match) return;
      if (!isMyTurn) return;
      if (column < 0 || column >= COLS) return;
      // Optimistic update — append locally so the chip drops the
      // instant the user clicks. The realtime echo will overwrite
      // moves[] with the server's authoritative copy a tick later.
      setMatch((prev) => (prev ? { ...prev, moves: [...prev.moves, column] } : prev));
      setSubmitError(null);
      const r = await fetch(`/api/games/connect4/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ column }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        setSubmitError((json as { error?: string }).error ?? `HTTP ${r.status}`);
        // Roll back the optimistic move — the realtime echo from
        // the server won't include it, so we re-sync from match's
        // current authoritative state.
        const cur = await fetch(`/api/games/connect4/${matchId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (cur.ok) setMatch((await cur.json()) as MatchRow);
      }
    },
    [matchId, session?.access_token, match, isMyTurn],
  );

  // ── No match in URL → local pass-and-play demo (Phase 3 mode).
  if (!matchId) {
    const winner = findWinner(buildBoard(localMoves));
    return (
      <PageShell tagline="Local pass-and-play for now — pass the laptop back and forth, or open the lobby (Phase 5) to challenge a teammate.">
        <Board moves={localMoves} onDrop={(c) => setLocalMoves((p) => [...p, c])} />
        <button
          type="button"
          onClick={() => setLocalMoves([])}
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {winner ? 'Play again' : 'Reset board'}
        </button>
      </PageShell>
    );
  }

  // ── Match by id → server-backed live game.
  if (loadError) {
    return (
      <PageShell tagline="Match failed to load.">
        <p className="text-[13px] text-red-700">{loadError}</p>
      </PageShell>
    );
  }
  if (!match) {
    return (
      <PageShell tagline="Loading match…">
        <p className="text-[13px] text-foreground/55">…</p>
      </PageShell>
    );
  }

  const youArePlayer: 0 | 1 | null = !user
    ? null
    : user.id === match.challenger_id
    ? 0
    : user.id === match.opponent_id
    ? 1
    : null;
  const status = match.status === 'complete' && match.winner_id
    ? match.winner_id === user?.id ? 'You won' : 'Opponent wins'
    : match.status === 'complete'
    ? 'Draw'
    : match.status === 'forfeit'
    ? match.winner_id === user?.id ? 'Opponent forfeited' : 'You forfeited'
    : isMyTurn ? 'Your move' : "Waiting on opponent…";

  return (
    <PageShell tagline={status}>
      <Board
        moves={match.moves}
        onDrop={youArePlayer !== null ? onDropServer : null}
        disabled={!isMyTurn || match.status === 'complete' || match.status === 'forfeit'}
        challengerLabel={youArePlayer === 0 ? 'You' : 'Red'}
        opponentLabel={youArePlayer === 1 ? 'You' : 'Yellow'}
      />
      {submitError && (
        <p className="text-[11.5px] text-red-700" role="alert">{submitError}</p>
      )}
    </PageShell>
  );
}

// Tiny presentation wrapper so both branches of the render share
// the same header chrome without duplicating the JSX.
function PageShell({ tagline, children }: { tagline: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Games</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Connect-4 Tournament
        </h1>
        <p className="mt-1 text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          {tagline}
        </p>
      </header>
      <div className="flex flex-col items-start gap-4">{children}</div>
    </div>
  );
}
