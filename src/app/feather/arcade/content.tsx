'use client';

// Arcade hub. Three Seven Arrows themed games + their top scores.
// Tile grid responsive: 3-col on lg, 2-col on md, stacked on mobile.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import type { ArcadeGameKey } from './_lib/useArcadeScore';

interface GameDef {
  key: ArcadeGameKey;
  href: string;
  title: string;
  pitch: string;
  scoreLabel: string;
  /** Tailwind gradient for the tile artwork backdrop. */
  gradient: string;
  /** Inline SVG glyph (currentColor) for the tile artwork. */
  art: React.ReactNode;
}

const GAMES: GameDef[] = [
  {
    key: 'feather_catcher',
    href: '/feather/arcade/feather-catcher',
    title: 'Feather Catcher',
    pitch: 'Catch the feathers drifting down the Sonoran sky. Dodge the tumbleweeds. Hunt the all-time high.',
    scoreLabel: 'Feathers caught',
    gradient: 'from-amber-200 via-orange-200 to-rose-200',
    art: (
      <svg viewBox="0 0 80 80" className="w-20 h-20 text-amber-900/85" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M62 18a18 18 0 0 0-25.5-25.5L22 5l-4 5v18l8 8 18-8 18-10z" transform="translate(0 14)" />
        <line x1="42" y1="24" x2="14" y2="52" />
        <line x1="46" y1="38" x2="28" y2="38" />
      </svg>
    ),
  },
  {
    key: 'trail_ride',
    href: '/feather/arcade/trail-ride',
    title: 'Trail Ride',
    pitch: 'Gallop east-to-west across the Pearce desert. Jump fences, leap creeks, snag hay bales.',
    scoreLabel: 'Best distance',
    gradient: 'from-orange-200 via-rose-200 to-amber-300',
    art: (
      <svg viewBox="0 0 100 80" className="w-24 h-20 text-rose-900/85" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 60 c8 -6 18 -8 26 -6 c4 1 8 4 12 6 c8 4 16 0 22 -6" />
        <path d="M52 28 c4 -2 10 -2 14 2 l6 6 c2 2 0 6 -3 6 l-8 0 l-2 6 l-6 0 l-2 -10 z" />
        <circle cx="60" cy="32" r="1.6" fill="currentColor" stroke="none" />
        <path d="M58 48 l-2 12 M64 48 l2 12 M48 48 l-2 12 M44 46 l-2 12" />
      </svg>
    ),
  },
  {
    key: 'saddle_sudoku',
    href: '/feather/arcade/saddle-sudoku',
    title: 'Saddle Sudoku',
    pitch: '9×9 daily puzzle — no digits, just feathers, arrows, horseshoes and stetsons. One puzzle per day for everyone.',
    scoreLabel: 'Fastest solve',
    gradient: 'from-emerald-200 via-teal-200 to-sky-200',
    art: (
      <svg viewBox="0 0 80 80" className="w-20 h-20 text-emerald-900/85" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="64" height="64" rx="3" />
        <line x1="30" y1="8" x2="30" y2="72" />
        <line x1="52" y1="8" x2="52" y2="72" />
        <line x1="8" y1="30" x2="72" y2="30" />
        <line x1="8" y1="52" x2="72" y2="52" />
        <circle cx="19" cy="19" r="2.4" fill="currentColor" stroke="none" />
        <circle cx="41" cy="41" r="2.4" fill="currentColor" stroke="none" />
        <circle cx="63" cy="63" r="2.4" fill="currentColor" stroke="none" />
        <circle cx="63" cy="19" r="2.4" fill="currentColor" stroke="none" />
        <circle cx="19" cy="63" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'connect_four',
    href: '/feather/arcade/connect-four',
    title: 'Connect Four',
    pitch: 'Drop arrows. Stack four in a row before the feather AI does. Each win extends your streak; AI gets smarter the longer you survive.',
    scoreLabel: 'Best streak',
    gradient: 'from-rose-200 via-amber-200 to-orange-300',
    art: (
      <svg viewBox="0 0 80 80" className="w-20 h-20 text-rose-900/85" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="14" width="68" height="56" rx="4" />
        <circle cx="20" cy="56" r="6" fill="currentColor" stroke="none" />
        <circle cx="34" cy="56" r="6" fill="currentColor" stroke="none" opacity="0.55" />
        <circle cx="48" cy="56" r="6" fill="currentColor" stroke="none" />
        <circle cx="62" cy="56" r="6" fill="currentColor" stroke="none" opacity="0.55" />
        <circle cx="34" cy="42" r="6" fill="currentColor" stroke="none" />
        <circle cx="48" cy="42" r="6" fill="currentColor" stroke="none" opacity="0.55" />
        <circle cx="48" cy="28" r="6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

interface BestScore {
  game: ArcadeGameKey;
  user_id: string;
  score: number;
  name: string;
  avatar: string | null;
}

export default function ArcadeContent() {
  const { user, userKind } = useAuth();
  const [topByGame, setTopByGame] = useState<Map<ArcadeGameKey, BestScore | null>>(new Map());

  const load = useCallback(async () => {
    // Pull top score per game in one query, then resolve their
    // names + avatars in a second call. Small N (one row per
    // game), so a follow-up join is cheaper than a full
    // window-function query.
    const { data } = await supabase
      .from('arcade_scores')
      .select('game, user_id, score, created_at')
      .order('score', { ascending: false })
      .limit(50);
    const rows = (data ?? []) as Array<{ game: ArcadeGameKey; user_id: string; score: number; created_at: string }>;
    const best = new Map<ArcadeGameKey, BestScore | null>();
    for (const g of GAMES) best.set(g.key, null);
    for (const r of rows) {
      const cur = best.get(r.game);
      if (!cur || r.score > cur.score) {
        best.set(r.game, { game: r.game, user_id: r.user_id, score: r.score, name: 'Player', avatar: null });
      }
    }
    const ids = Array.from(best.values()).filter((v): v is BestScore => !!v).map((v) => v.user_id);
    if (ids.length > 0) {
      const { data: usrs } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      const usersMap = new Map<string, { name: string | null; avatar: string | null }>();
      for (const u of (usrs ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        usersMap.set(u.id, { name: u.full_name, avatar: u.avatar_url });
      }
      for (const [k, v] of best.entries()) {
        if (!v) continue;
        const m = usersMap.get(v.user_id);
        if (m) best.set(k, { ...v, name: m.name || 'Player', avatar: m.avatar });
      }
    }
    setTopByGame(new Map(best));
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  const firstName = (user.email ? user.email.split('@')[0] : '').replace(/\.|_/g, ' ');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Arcade</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Three games, one ranch{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
          Built for breaks, alumni meetups, and a little friendly rivalry. {userKind === 'alumni' ? 'Staff and alumni' : 'You and the alumni community'} share the same leaderboards.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {GAMES.map((g) => {
          const best = topByGame.get(g.key) ?? null;
          return (
            <Link
              key={g.key}
              href={g.href}
              className="group rounded-3xl border border-black/10 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <div className={`relative h-32 bg-gradient-to-br ${g.gradient} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_30%_30%,_white_0,_transparent_55%)]" />
                <div className="relative transition-transform duration-300 group-hover:scale-110">
                  {g.art}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{g.title}</h3>
                <p className="mt-1 text-[12.5px] text-foreground/65 leading-relaxed min-h-[3rem]">{g.pitch}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {best ? (
                    <div className="flex items-center gap-2 min-w-0">
                      {best.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={best.avatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover border border-black/10" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/15">
                          {(best.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 leading-none">{g.scoreLabel}</p>
                        <p className="text-[12.5px] font-semibold text-foreground truncate">
                          {best.name} · <span className="tabular-nums">{best.score.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-foreground/45 italic">No scores yet</p>
                  )}
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-primary group-hover:text-primary-dark transition-colors">
                    Play →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
