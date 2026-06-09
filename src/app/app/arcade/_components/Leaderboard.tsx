'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import type { ArcadeGameKey } from '../_lib/useArcadeScore';

// Leaderboard · per-game top-10 + the viewer's own rank.
// Pulls highest score per user (window-fn would be cleaner but
// the table is small enough that a sort+dedupe on the client is
// fine). Joins user names + avatars in one round-trip.

interface ScoreRow {
  user_id: string;
  score: number;
  created_at: string;
}

interface UserMeta {
  full_name: string | null;
  avatar_url: string | null;
}

interface RankedRow extends ScoreRow {
  rank: number;
  name: string;
  avatar: string | null;
  meta: Record<string, unknown>;
}

export default function Leaderboard({
  game,
  scoreLabel = 'Score',
  scoreFormat,
  // When set, restricts the board to scores submitted with
  // meta.puzzle_date = puzzleDate. Saddle Sudoku uses this for
  // its "Today's solvers" board.
  puzzleDate,
  limit = 10,
  refreshKey,
  metaRenderer,
}: {
  game: ArcadeGameKey;
  scoreLabel?: string;
  scoreFormat?: (score: number) => string;
  puzzleDate?: string;
  limit?: number;
  // Bumping this from the parent (e.g. after a fresh submit)
  // forces a re-fetch. We don't realtime-subscribe because the
  // board only matters at game-over time — pulling fresh on
  // each submit is plenty.
  refreshKey?: number;
  // Optional per-row decorator the game can use to surface
  // run-specific metadata (which horse Trail Ride was ridden
  // on, etc.). Gets the score row's meta jsonb.
  metaRenderer?: (meta: Record<string, unknown>) => React.ReactNode;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<RankedRow[]>([]);
  const [myBest, setMyBest] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('arcade_scores')
      .select('user_id, score, created_at, meta')
      .eq('game', game);
    if (puzzleDate) q = q.eq('meta->>puzzle_date', puzzleDate);
    const { data } = await q.order('score', { ascending: false }).limit(500);
    const all = (data ?? []) as Array<ScoreRow & { meta: Record<string, unknown> }>;

    // Best score per user → keep the highest, breaking ties by
    // earliest submission so the same score sets the rank order
    // by who got there first.
    const bestPerUser = new Map<string, ScoreRow>();
    for (const r of all) {
      const prev = bestPerUser.get(r.user_id);
      if (!prev || r.score > prev.score || (r.score === prev.score && new Date(r.created_at) < new Date(prev.created_at))) {
        bestPerUser.set(r.user_id, r);
      }
    }
    const ranked = Array.from(bestPerUser.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Hydrate name + avatar for the top-N + the viewer (if not in top).
    const top = ranked.slice(0, limit);
    const viewerEntry = user?.id ? ranked.find((r) => r.user_id === user.id) ?? null : null;
    const viewerRank = viewerEntry ? ranked.indexOf(viewerEntry) + 1 : null;
    const ids = new Set<string>(top.map((r) => r.user_id));
    if (user?.id) ids.add(user.id);
    const usersMap = new Map<string, UserMeta>();
    if (ids.size > 0) {
      const { data: usrs } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(ids));
      for (const u of (usrs ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        usersMap.set(u.id, { full_name: u.full_name, avatar_url: u.avatar_url });
      }
    }
    // Need the meta jsonb on each top row too — bestPerUser
    // stored ScoreRow without it; merge back in from `all` so
    // the leaderboard can render run-specific metadata.
    const metaByKey = new Map<string, Record<string, unknown>>();
    for (const r of all) {
      const key = `${r.user_id}|${r.score}|${r.created_at}`;
      if (!metaByKey.has(key)) metaByKey.set(key, r.meta || {});
    }
    setRows(
      top.map((r, i): RankedRow => {
        const u = usersMap.get(r.user_id);
        const meta = metaByKey.get(`${r.user_id}|${r.score}|${r.created_at}`) ?? {};
        return {
          ...r,
          rank: i + 1,
          name: u?.full_name || 'Player',
          avatar: u?.avatar_url ?? null,
          meta,
        };
      }),
    );
    setMyBest(viewerEntry?.score ?? null);
    setMyRank(viewerRank);
    setLoading(false);
  }, [game, puzzleDate, limit, user?.id]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const fmt = (s: number) => (scoreFormat ? scoreFormat(s) : s.toLocaleString());

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary">Leaderboard</h2>
        {myBest !== null && myRank !== null && (
          <p className="text-[11px] text-foreground/55">
            You: <span className="font-semibold text-foreground">#{myRank}</span> · {fmt(myBest)}
          </p>
        )}
      </div>
      {loading ? (
        <p className="text-[12.5px] text-foreground/50 italic">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-foreground/50 italic">No scores yet. Be the first.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r) => {
            const isMine = user?.id === r.user_id;
            return (
              <li
                key={`${r.user_id}-${r.created_at}`}
                className={`flex items-center gap-3 px-2.5 py-1.5 rounded-lg ${isMine ? 'bg-primary/8 ring-1 ring-primary/20' : ''}`}
              >
                <span className={`text-[12px] font-bold w-6 text-right ${r.rank <= 3 ? 'text-primary' : 'text-foreground/40'}`}>
                  {r.rank}
                </span>
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-black/10" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center border border-primary/15">
                    {(r.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground/85 truncate block">
                    {r.name}
                    {isMine && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-primary">You</span>}
                  </span>
                  {metaRenderer && (
                    <span className="block text-[10.5px] text-foreground/50 truncate">
                      {metaRenderer(r.meta)}
                    </span>
                  )}
                </span>
                <span className="text-[13px] font-bold text-foreground tabular-nums">{fmt(r.score)}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-[10.5px] text-foreground/40 uppercase tracking-wider">
        {scoreLabel}
      </p>
    </section>
  );
}
