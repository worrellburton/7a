'use client';

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';

// One canonical key per game — the same string the arcade_scores
// table accepts via its check constraint. Adding a game means
// extending this union AND the SQL check constraint.
export type ArcadeGameKey = 'feather_catcher' | 'trail_ride' | 'saddle_sudoku' | 'connect_four' | 'salutogenic_uplifter';

// Submit a single attempt's score for the signed-in user. Returns
// true on success, false on auth/RLS failure. Failures are silent
// at the game layer — losing a single score is a worse UX hit if
// the game blocks the "Play again" CTA on an alert dialog.
export function useArcadeScore(game: ArcadeGameKey) {
  const { user } = useAuth();
  return useCallback(
    async (score: number, meta: Record<string, unknown> = {}) => {
      if (!user?.id || !Number.isFinite(score)) return false;
      const { error } = await supabase.from('arcade_scores').insert({
        game,
        user_id: user.id,
        score: Math.max(0, Math.round(score)),
        meta,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[arcade] score submit failed', error.message);
        return false;
      }
      return true;
    },
    [user?.id, game],
  );
}
