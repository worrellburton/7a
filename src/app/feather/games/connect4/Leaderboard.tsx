'use client';

// Connect-4 · Phase 8 leaderboard. Renders the top-50 by Elo
// with avatar + win/loss/tournament-wins counts. Realtime-
// subscribed to connect4_ratings so the order shuffles in real
// time as matches resolve elsewhere on the team.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toAvatarThumb } from '@/lib/avatarThumb';

interface LeaderRow {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
  tournament_wins: number;
  last_match_at: string | null;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export default function Leaderboard() {
  const { session, user } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch('/api/games/connect4/leaderboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!r.ok) return;
    const json = (await r.json()) as { rows: LeaderRow[] };
    setRows(json.rows ?? []);
  }, [session?.access_token]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel('connect4-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_ratings' }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [reload]);

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
        <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Leaderboard</h2>
        <p className="text-[12px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
          No matches resolved yet. Play someone to seed the ladder.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
      <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Leaderboard · top {Math.min(rows.length, 50)}</h2>
      <ol className="divide-y divide-black/5">
        {rows.map((r, i) => {
          const isYou = r.user_id === user?.id;
          const display = r.user?.full_name || r.user?.email || '—';
          return (
            <li key={r.user_id} className={`flex items-center gap-3 px-2 py-2 text-[12.5px] ${isYou ? 'bg-primary/5' : ''}`}>
              <span className="w-6 text-right text-[11px] font-semibold text-foreground/45 tabular-nums">{i + 1}</span>
              {r.user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toAvatarThumb(r.user.avatar_url, 200) ?? r.user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover bg-warm-bg" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-warm-bg flex items-center justify-center text-[10px] font-semibold text-foreground/55">
                  {display.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="flex-1 min-w-0 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                {display}
                {isYou && <span className="ml-1 text-[9.5px] text-primary uppercase tracking-wider">you</span>}
              </span>
              {r.tournament_wins > 0 && (
                <span title={`${r.tournament_wins} tournament win${r.tournament_wins === 1 ? '' : 's'}`}>
                  {'🏆'.repeat(Math.min(r.tournament_wins, 3))}
                </span>
              )}
              <span className="tabular-nums text-foreground/45 text-[10.5px]">
                {r.wins}W · {r.losses}L{r.draws > 0 && ` · ${r.draws}D`}
              </span>
              <span className="tabular-nums font-semibold text-foreground w-12 text-right">{r.rating}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
