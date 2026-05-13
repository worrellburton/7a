'use client';

// Connect-4 tournament — Phase 3 of the 10-phase build. The board
// is now playable in a single-browser local-two-player mode (pass
// the laptop back and forth). Phase 4 swaps onDrop's local
// setState for the PATCH /api/games/connect4/[id] call + a
// Supabase realtime subscription; nothing else here changes.

import { useState } from 'react';
import { findWinner, buildBoard } from '@/lib/connect4';
import Board from './Board';

export default function Content() {
  const [moves, setMoves] = useState<number[]>([]);
  const winner = findWinner(buildBoard(moves));

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Games</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Connect-4 Tournament
        </h1>
        <p className="mt-1 text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          Local pass-and-play for now — Phase 4 wires real-time so two browsers can share a board.
        </p>
      </header>

      <div className="flex flex-col items-start gap-4">
        <Board
          moves={moves}
          onDrop={(col) => setMoves((prev) => [...prev, col])}
          disabled={false}
        />
        <button
          type="button"
          onClick={() => setMoves([])}
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {winner ? 'Play again' : 'Reset board'}
        </button>
      </div>
    </div>
  );
}
