'use client';

// Connect-4 · Phase 7 · tournament bracket view.
//
// Loads /api/games/connect4/tournaments/[id] once and subscribes
// to realtime on the four tables we care about (tournament,
// entrants, bracket rows, match rows for those bracket entries)
// so the bracket updates instantly when a round resolves and the
// auto-advancer (src/lib/connect4-advance.ts) inserts the next
// round.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { totalRounds } from '@/lib/connect4-bracket';

interface Tournament {
  id: string;
  name: string;
  size: number;
  status: 'draft' | 'active' | 'complete';
  winner_id: string | null;
  created_by: string;
}

interface Entrant { user_id: string; seed: number | null }

interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  match_id: string | null;
  match: {
    id: string;
    challenger_id: string;
    opponent_id: string;
    status: 'open' | 'active' | 'complete' | 'forfeit';
    moves: number[];
    winner_id: string | null;
  } | null;
}

interface UserLite {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function Connect4Tournament({ tournamentId }: { tournamentId: string }) {
  const { user, session } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [brackets, setBrackets] = useState<BracketMatch[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch(`/api/games/connect4/tournaments/${tournamentId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
    setTournament((json as { tournament: Tournament }).tournament);
    setEntrants((json as { entrants: Entrant[] }).entrants);
    setBrackets((json as { brackets: BracketMatch[] }).brackets);
  }, [session?.access_token, tournamentId]);

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
    if (!tournamentId) return;
    const ch = supabase
      .channel(`connect4-tournament-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_tournaments', filter: `id=eq.${tournamentId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_tournament_entrants', filter: `tournament_id=eq.${tournamentId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_bracket_matches', filter: `tournament_id=eq.${tournamentId}` }, () => void reload())
      // Match-row updates for any bracket member also redraw.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_matches' }, (payload) => {
        const mid = (payload.new as { id?: string })?.id;
        if (mid && brackets.some((b) => b.match_id === mid)) void reload();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [tournamentId, reload, brackets]);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u] as const)), [users]);

  const joinedIds = useMemo(() => new Set(entrants.map((e) => e.user_id)), [entrants]);
  const meIn = user ? joinedIds.has(user.id) : false;
  const canStart = user && tournament && user.id === tournament.created_by
    && tournament.status === 'draft' && entrants.length === tournament.size;

  const rounds = tournament ? totalRounds(tournament.size) : 0;
  const matchesByRound = useMemo(() => {
    const buckets: BracketMatch[][] = Array.from({ length: rounds }, () => []);
    for (const b of brackets) {
      if (b.round < rounds) buckets[b.round].push(b);
    }
    for (const arr of buckets) arr.sort((a, b) => a.slot - b.slot);
    return buckets;
  }, [brackets, rounds]);

  const post = useCallback(async (path: string, init?: RequestInit) => {
    if (!session?.access_token) return null;
    return fetch(path, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${session.access_token}` },
    });
  }, [session?.access_token]);

  if (!tournament) {
    return <p className="text-[13px] text-foreground/55">{error ?? 'Loading tournament…'}</p>;
  }

  const champion = tournament.status === 'complete' && tournament.winner_id
    ? userById.get(tournament.winner_id) ?? null
    : null;

  return (
    <div className="w-full">
      {/* Champion banner — only renders when the final's been
          resolved. Big tasteful celebration so a finished
          tournament reads as A THING THAT HAPPENED rather than
          another row in the bracket. */}
      {champion && (
        <div className="mb-4 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50 via-amber-100/40 to-white px-5 py-4 flex items-center gap-4">
          <span className="text-3xl" aria-hidden>🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-700">Champion</p>
            <p className="text-lg font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {champion.full_name || champion.email || '—'}
            </p>
            <p className="text-[11.5px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Won {tournament.name} · {tournament.size}-seed bracket
            </p>
          </div>
          {champion.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={champion.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-300" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-warm-bg flex items-center justify-center text-xl font-bold text-foreground/55 ring-2 ring-amber-300">
              {(champion.full_name || champion.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <header className="mb-4 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{tournament.name}</h2>
          <p className="mt-0.5 text-[12px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            {tournament.status === 'draft' && `Draft — ${entrants.length} / ${tournament.size} entrants`}
            {tournament.status === 'active' && `Round ${activeRound(matchesByRound) + 1} of ${rounds}`}
            {tournament.status === 'complete' && tournament.winner_id && (
              <>Winner: <span className="font-semibold text-foreground">{userById.get(tournament.winner_id)?.full_name ?? '—'}</span></>
            )}
          </p>
        </div>
        {tournament.status === 'draft' && user && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => { setBusy('join'); await post(`/api/games/connect4/tournaments/${tournamentId}/join`, { method: meIn ? 'DELETE' : 'POST' }); await reload(); setBusy(null); }}
              disabled={busy === 'join'}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${meIn ? 'bg-white text-foreground/70 border-black/15 hover:bg-warm-bg/60' : 'bg-primary text-white border-primary hover:bg-primary/90'}`}
            >
              {meIn ? 'Leave' : 'Join'}
            </button>
            {canStart && (
              <button
                type="button"
                onClick={async () => { setBusy('start'); await post(`/api/games/connect4/tournaments/${tournamentId}/start`, { method: 'POST' }); await reload(); setBusy(null); }}
                disabled={busy === 'start'}
                className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85"
              >
                {busy === 'start' ? 'Starting…' : 'Start tournament'}
              </button>
            )}
          </div>
        )}
      </header>

      {error && <p className="mb-3 text-[11.5px] text-red-700" role="alert">{error}</p>}

      {tournament.status === 'draft' ? (
        <ul className="space-y-1.5">
          {entrants.map((e) => {
            const u = userById.get(e.user_id);
            return (
              <li key={e.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 border border-black/5 text-[12.5px]">
                {u?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover bg-warm-bg" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
                    {(u?.full_name || u?.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 truncate">{u?.full_name || u?.email || '—'}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex items-stretch gap-6 min-w-full">
            {matchesByRound.map((roundMatches, ri) => (
              <ol key={ri} className="flex flex-col justify-around gap-3 min-w-[200px]">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45">
                  {roundLabel(ri, rounds)}
                </p>
                {roundMatches.map((bm) => (
                  <BracketCard key={bm.id} bracket={bm} userById={userById} youId={user?.id ?? null} />
                ))}
              </ol>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function activeRound(matchesByRound: BracketMatch[][]): number {
  for (let r = 0; r < matchesByRound.length; r++) {
    const all = matchesByRound[r];
    const allDone = all.length > 0 && all.every((b) => b.match?.status === 'complete' || b.match?.status === 'forfeit');
    if (!allDone) return r;
  }
  return matchesByRound.length - 1;
}

function roundLabel(round: number, total: number): string {
  if (round === total - 1) return 'Final';
  if (round === total - 2) return 'Semifinals';
  if (round === total - 3) return 'Quarterfinals';
  return `Round ${round + 1}`;
}

function BracketCard({ bracket, userById, youId }: { bracket: BracketMatch; userById: Map<string, UserLite>; youId: string | null }) {
  const m = bracket.match;
  if (!m) {
    return (
      <li className="rounded-lg border border-dashed border-black/15 bg-white/40 px-3 py-2 text-[11.5px] text-foreground/45">
        Waiting on prior round
      </li>
    );
  }
  const c = userById.get(m.challenger_id);
  const o = userById.get(m.opponent_id);
  const winnerSide: 0 | 1 | null = m.winner_id === m.challenger_id ? 0 : m.winner_id === m.opponent_id ? 1 : null;
  const isYou = (id: string) => id === youId;
  return (
    <li>
      <Link
        href={`/app/games/connect4?match=${m.id}`}
        className="block rounded-lg border border-black/10 bg-white hover:bg-warm-bg/60 transition-colors overflow-hidden"
      >
        <Row name={c?.full_name || c?.email || '—'} avatar={c?.avatar_url} winner={winnerSide === 0} you={isYou(m.challenger_id)} />
        <div className="h-px bg-black/5" />
        <Row name={o?.full_name || o?.email || '—'} avatar={o?.avatar_url} winner={winnerSide === 1} you={isYou(m.opponent_id)} />
      </Link>
    </li>
  );
}

function Row({ name, avatar, winner, you }: { name: string; avatar: string | null | undefined; winner: boolean; you: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${winner ? 'font-semibold text-foreground' : 'text-foreground/65'}`} style={{ fontFamily: 'var(--font-body)' }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover bg-warm-bg" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-warm-bg flex items-center justify-center text-[9px] font-semibold text-foreground/55">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="truncate flex-1">{name}{you && <span className="ml-1 text-[9.5px] text-primary uppercase tracking-wider">you</span>}</span>
      {winner && <span aria-hidden className="text-emerald-600 text-[12px]">✓</span>}
    </div>
  );
}
