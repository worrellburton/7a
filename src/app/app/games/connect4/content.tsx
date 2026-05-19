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
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { currentPlayer, COLS } from '@/lib/connect4';
import Board from './Board';
import BracketLobby from './BracketLobby';
import Tournament from './Tournament';
import TournamentList from './TournamentList';
import Leaderboard from './Leaderboard';

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
  const tournamentId = searchParams.get('tournament');


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

  // ── Tournament view.
  if (tournamentId && !matchId) {
    return (
      <PageShell tagline="Single-elimination bracket.">
        <Tournament tournamentId={tournamentId} />
      </PageShell>
    );
  }

  // ── No match / no tournament in URL → lobby.
  if (!matchId) {
    return (
      <PageShell tagline="Challenge a teammate, jump into an in-flight match, or open a tournament bracket.">
        <BracketLobby />
        <TournamentList />
        <Leaderboard />
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
      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        <div className="flex flex-col items-start gap-2">
          <Board
            moves={match.moves}
            onDrop={youArePlayer !== null ? onDropServer : null}
            disabled={!isMyTurn || match.status === 'complete' || match.status === 'forfeit'}
            challengerLabel={youArePlayer === 0 ? 'You' : 'Red'}
            opponentLabel={youArePlayer === 1 ? 'You' : 'Yellow'}
          />
          {youArePlayer === null && (
            <p className="text-[10.5px] tracking-[0.18em] uppercase font-bold text-emerald-700" style={{ fontFamily: 'var(--font-body)' }}>
              · Spectating ·
            </p>
          )}
          {submitError && (
            <p className="text-[11.5px] text-red-700" role="alert">{submitError}</p>
          )}
        </div>
        <OtherLiveGames currentMatchId={match.id} />
      </div>
    </PageShell>
  );
}

// Panel rendered next to the board when viewing a match. Lists every
// other live (open/active) connect-4 match in the system so the
// viewer can hop over and spectate without going back to the lobby.
// Subscribes to the matches realtime channel so the list stays fresh
// as games are created, played, and finished.
interface UserLite { id: string; full_name: string | null; email: string; avatar_url: string | null }

function OtherLiveGames({ currentMatchId }: { currentMatchId: string }) {
  const { session } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch('/api/games/connect4', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) return;
    setMatches(((json as { rows: MatchRow[] }).rows) ?? []);
  }, [session?.access_token]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    void (async () => {
      const rows = await db({
        action: 'select', table: 'users',
        select: 'id, full_name, email, avatar_url',
      }).catch(() => []);
      if (Array.isArray(rows)) setUsers(rows as UserLite[]);
    })();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel(`connect4-other-${currentMatchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_matches' }, () => { void reload(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [currentMatchId, reload]);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

  const others = useMemo(() => {
    return matches
      .filter((m) => m.id !== currentMatchId && (m.status === 'active' || m.status === 'open'))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [matches, currentMatchId]);

  return (
    <aside className="w-full lg:w-72 shrink-0 rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/70 to-white/80 px-4 py-3">
      <header className="flex items-center justify-between mb-2">
        <h2 className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-700">
          <span className="relative inline-flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          Other games live
        </h2>
        <span className="text-[10.5px] tabular-nums text-foreground/40">{others.length}</span>
      </header>
      {others.length === 0 ? (
        <p className="text-[12px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
          No other matches in progress.
        </p>
      ) : (
        <ul className="space-y-1">
          {others.map((m) => {
            const a = userById.get(m.challenger_id);
            const b = userById.get(m.opponent_id);
            const aName = (a?.full_name || a?.email || '—').split(' ')[0];
            const bName = (b?.full_name || b?.email || '—').split(' ')[0];
            return (
              <li key={m.id}>
                <Link
                  href={`/app/games/connect4?match=${m.id}`}
                  className="group flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-emerald-200/60 hover:border-emerald-400 hover:shadow-sm transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <SmallAvatar user={a ?? null} />
                  <span className="text-[12px] font-semibold text-foreground/80 truncate">{aName}</span>
                  <span className="text-[9.5px] text-foreground/35 uppercase tracking-wider">vs</span>
                  <SmallAvatar user={b ?? null} />
                  <span className="text-[12px] font-semibold text-foreground/80 truncate flex-1">{bName}</span>
                  <span className="text-[9.5px] text-foreground/40 tabular-nums whitespace-nowrap">{m.moves.length}</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Watch →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function SmallAvatar({ user }: { user: UserLite | null }) {
  const dim = 'w-5 h-5 text-[9px]';
  if (!user) return <div className={`${dim} rounded-full bg-warm-bg shrink-0`} />;
  if (user.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar_url} alt="" className={`${dim} rounded-full object-cover bg-warm-bg shrink-0`} />;
  }
  const name = user.full_name || user.email || '?';
  return (
    <div className={`${dim} rounded-full bg-warm-bg flex items-center justify-center font-semibold text-foreground/55 shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
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
