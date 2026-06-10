'use client';

// Floating "Your move" pill that surfaces on the home screen
// whenever it's the current user's turn in any Connect-4 match.
// Subscribes to the connect4_matches realtime channel so the
// pill appears and disappears live as opponents play their
// moves. Clicking the pill routes to the live board.
//
// Returns the opponent's user_id via the `onOpponentChange`
// callback so the parent can pulse that avatar in the orbit
// (Phase 2 of the QC sweep — "have the persons icon who you're
// playing online show when it's your turn").

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { currentPlayer } from '@/lib/connect4';
import { toAvatarThumb } from '@/lib/avatarThumb';

interface MatchRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'open' | 'active' | 'complete' | 'forfeit';
  moves: number[];
  winner_id: string | null;
  updated_at: string;
}

interface UserLite {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Props {
  /** Receives the opponent's user_id when it's your turn, null when no pending move. */
  onOpponentChange?: (opponentId: string | null) => void;
}

export default function HomeConnect4Nudge({ onOpponentChange }: Props) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [users, setUsers] = useState<Map<string, UserLite>>(new Map());

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('connect4_matches')
      .select('id, challenger_id, opponent_id, status, moves, winner_id, updated_at')
      .in('status', ['open', 'active'])
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });
    setMatches((data ?? []) as MatchRow[]);
  }, [user?.id]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`home-c4-nudge-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connect4_matches' },
        () => { void reload(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, reload]);

  // Pick the most-recent match where it's the caller's turn.
  const yourTurnMatch = useMemo(() => {
    if (!user?.id) return null;
    return matches.find((m) => {
      const expected = currentPlayer(m.moves) === 0 ? m.challenger_id : m.opponent_id;
      return expected === user.id;
    }) ?? null;
  }, [matches, user?.id]);

  const opponentId = yourTurnMatch
    ? (yourTurnMatch.challenger_id === user?.id ? yourTurnMatch.opponent_id : yourTurnMatch.challenger_id)
    : null;

  // Hydrate the opponent's display name + avatar from public.users
  // when we know their id. One row, cached on the Map so a
  // realtime echo doesn't refetch.
  useEffect(() => {
    if (!opponentId || users.has(opponentId)) return;
    void (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('id', opponentId)
        .maybeSingle();
      if (data) {
        setUsers((prev) => {
          const next = new Map(prev);
          next.set((data as UserLite).id, data as UserLite);
          return next;
        });
      }
    })();
  }, [opponentId, users]);

  // Push the opponent id up so the orbit can pulse them.
  useEffect(() => {
    onOpponentChange?.(opponentId);
  }, [opponentId, onOpponentChange]);

  if (!yourTurnMatch || !opponentId) return null;
  const opp = users.get(opponentId);
  const oppName = (opp?.full_name || opp?.email || 'your opponent').split(' ')[0];
  const moves = yourTurnMatch.moves.length;

  return (
    <Link
      href={`/feather/games/connect4?match=${yourTurnMatch.id}`}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-foreground text-white shadow-xl hover:shadow-2xl transition-shadow"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-label={`Your move in Connect-4 Tourney against ${oppName}`}
    >
      {opp?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toAvatarThumb(opp.avatar_url, 200) ?? opp.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-[11px] font-bold text-foreground ring-2 ring-white/30">
          {oppName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-bold leading-tight">
          Your move
        </span>
        <span className="text-[12.5px] leading-tight">
          Connect-4 Tourney · vs {oppName}
          {moves > 0 && <span className="text-white/60"> · {moves} moves in</span>}
        </span>
      </span>
      <span aria-hidden className="relative inline-flex w-2 h-2 ml-1">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-400" />
      </span>
    </Link>
  );
}
