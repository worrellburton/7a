'use client';

// Connect-4 · Phase 5 lobby. Renders three panes:
//
//   1. "Your turn" — matches where the caller can play right now.
//   2. "Waiting / spectate" — matches in flight where it's the
//      opponent's turn, or open matches the caller has been
//      challenged to.
//   3. "Challenge a teammate" — every other staff user with an
//      avatar + "Challenge" button that POSTs /api/games/connect4.
//
// Lobby data comes from the new GET /api/games/connect4 list +
// the existing users table. Both feed the panes; the subscribe-
// to-realtime piece (Phase 4) is reused at the page level so the
// lobby + the in-flight board stay coordinated.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { currentPlayer } from '@/lib/connect4';

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

export default function Connect4Lobby() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // Pull list once on mount + on every realtime row change.
  const reloadMatches = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch('/api/games/connect4', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
    setMatches(((json as { rows: MatchRow[] }).rows) ?? []);
  }, [session?.access_token]);

  useEffect(() => {
    void reloadMatches();
  }, [reloadMatches]);

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

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`connect4-lobby-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connect4_matches' },
        () => { void reloadMatches(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, reloadMatches]);

  const yourTurn = useMemo(() => {
    if (!user || !matches) return [];
    return matches.filter((m) => {
      if (m.status !== 'active' && m.status !== 'open') return false;
      if (user.id !== m.challenger_id && user.id !== m.opponent_id) return false;
      const expected = currentPlayer(m.moves) === 0 ? m.challenger_id : m.opponent_id;
      return expected === user.id;
    });
  }, [user, matches]);

  const waiting = useMemo(() => {
    if (!user || !matches) return [];
    return matches.filter((m) => {
      if (m.status !== 'active' && m.status !== 'open') return false;
      if (user.id !== m.challenger_id && user.id !== m.opponent_id) return false;
      const expected = currentPlayer(m.moves) === 0 ? m.challenger_id : m.opponent_id;
      return expected !== user.id;
    });
  }, [user, matches]);

  const completed = useMemo(() => {
    if (!user || !matches) return [];
    return matches.filter((m) =>
      (m.status === 'complete' || m.status === 'forfeit')
      && (m.challenger_id === user.id || m.opponent_id === user.id),
    ).slice(0, 5);
  }, [user, matches]);

  const opponents = useMemo(
    () => users.filter((u) => u.id !== user?.id),
    [users, user?.id],
  );

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LobbyPane title="Your turn" empty="No matches awaiting your move." count={yourTurn.length}>
        {yourTurn.map((m) => (
          <MatchRowItem key={m.id} match={m} you={user?.id} userById={userById} />
        ))}
      </LobbyPane>

      <LobbyPane title="Waiting / spectate" empty="Nothing in flight." count={waiting.length}>
        {waiting.map((m) => (
          <MatchRowItem key={m.id} match={m} you={user?.id} userById={userById} />
        ))}
      </LobbyPane>

      <LobbyPane title="Recent results" empty="No completed matches yet." count={completed.length}>
        {completed.map((m) => (
          <MatchRowItem key={m.id} match={m} you={user?.id} userById={userById} />
        ))}
      </LobbyPane>

      <LobbyPane title="Challenge a teammate" empty="Loading teammates…" count={opponents.length}>
        {opponents.map((u) => (
          <li key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-warm-bg/60">
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar_url} alt={u.full_name ?? u.email} className="w-7 h-7 rounded-full object-cover bg-warm-bg" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[12.5px] font-semibold text-foreground truncate flex-1">{u.full_name || u.email}</span>
            <button
              type="button"
              onClick={() => void challenge(u.id)}
              disabled={creating === u.id}
              className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {creating === u.id ? '…' : 'Challenge'}
            </button>
          </li>
        ))}
      </LobbyPane>

      {error && (
        <p className="sm:col-span-2 text-[11.5px] text-red-700" role="alert" style={{ fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function LobbyPane({ title, empty, count, children }: { title: string; empty: string; count: number; children: React.ReactNode }) {
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

function MatchRowItem({ match, you, userById }: { match: MatchRow; you: string | undefined; userById: Map<string, UserLite> }) {
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
        {opp?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opp.avatar_url} alt={oppName} className="w-6 h-6 rounded-full object-cover bg-warm-bg" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
            {oppName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate flex-1">{oppName}</span>
        <span className="text-[10.5px] text-foreground/45 whitespace-nowrap">{result}</span>
      </Link>
    </li>
  );
}
