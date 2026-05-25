'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import Switch from './Switch';

// Reset-Connect-4-tournament switch.
//
// Hits POST /api/levers/reset-connect4-tournament which wipes the
// tournament rows, the bracket cells, the tournament-bound matches,
// the entrant rows, and zeros every user's `tournament_wins` count.
// Casual non-tournament matches + Elo / W-L-D stay intact.
//
// Two confirmation gates: a window.confirm before the API call so
// a mis-click can't nuke the bracket, and the switch UI itself —
// it has to be deliberately flipped, not bumped. The result of the
// API call surfaces in a one-line summary under the switch.

interface ResetSummary {
  tournamentsDeleted: number;
  bracketRowsDeleted: number;
  bracketLinkedMatchesDeleted: number;
  entrantsDeleted: number;
  ratingsResetCount: number;
}

export default function ResetConnect4Switch() {
  const { session } = useAuth();
  const [flipping, setFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<ResetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFlip = async () => {
    if (flipping || !session?.access_token) return;
    const confirmed = window.confirm(
      'Reset the Connect-4 tournament?\n\n'
      + 'This will permanently delete every tournament row, every '
      + 'bracket cell, every match that was tied to a bracket, and '
      + 'zero out the 🏆 tournament-win count on the leaderboard.\n\n'
      + 'Casual matches + Elo / W-L-D records stay intact. There '
      + 'is no undo.',
    );
    if (!confirmed) return;

    setFlipping(true);
    setError(null);
    try {
      const r = await fetch('/api/levers/reset-connect4-tournament', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await r.json().catch(() => ({}))) as ResetSummary & { ok?: boolean; error?: string };
      if (!r.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${r.status}`);
        return;
      }
      setLastResult({
        tournamentsDeleted: json.tournamentsDeleted ?? 0,
        bracketRowsDeleted: json.bracketRowsDeleted ?? 0,
        bracketLinkedMatchesDeleted: json.bracketLinkedMatchesDeleted ?? 0,
        entrantsDeleted: json.entrantsDeleted ?? 0,
        ratingsResetCount: json.ratingsResetCount ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFlipping(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Switch
        name="Reset tourney"
        flipping={flipping}
        onFlip={onFlip}
        tone="rose"
        hint="Wipes brackets · entrants · matches · 🏆 tally"
      />

      {error && (
        <p className="text-[11px] text-rose-300 max-w-[220px] text-center leading-snug" role="alert">
          {error}
        </p>
      )}

      {lastResult && !error && (
        <p className="text-[10px] text-emerald-200/85 max-w-[260px] text-center leading-snug">
          Reset complete · {lastResult.tournamentsDeleted} tournament{lastResult.tournamentsDeleted === 1 ? '' : 's'},{' '}
          {lastResult.bracketRowsDeleted} bracket cell{lastResult.bracketRowsDeleted === 1 ? '' : 's'},{' '}
          {lastResult.bracketLinkedMatchesDeleted} match{lastResult.bracketLinkedMatchesDeleted === 1 ? '' : 'es'},{' '}
          {lastResult.entrantsDeleted} entrant{lastResult.entrantsDeleted === 1 ? '' : 's'}, {lastResult.ratingsResetCount} 🏆 tall{lastResult.ratingsResetCount === 1 ? 'y' : 'ies'} cleared.
        </p>
      )}
    </div>
  );
}
