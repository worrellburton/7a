'use client';

// Connect-4 board · Phase 3 of the 10-phase build.
//
// Stateless render layer driven entirely by the rules engine in
// src/lib/connect4.ts. The parent owns moves[] and the click
// handler — this component just paints chips and lets the user
// click columns. Pure presentation so the same component can be
// wired up to local-only state in this phase and to a Supabase
// realtime channel in Phase 4 without touching the JSX.

import { useMemo, useState } from 'react';
import { buildBoard, currentPlayer, findWinner, isColumnFull, COLS, ROWS, type Cell } from '@/lib/connect4';

interface BoardProps {
  moves: number[];
  /** When `null`, no chip drops on click (e.g. waiting for opponent). */
  onDrop: ((column: number) => void) | null;
  /** Set true to dim the whole board (game over, etc.). */
  disabled?: boolean;
  /** Labels under the chip color swatches in the header. Default red / yellow. */
  challengerLabel?: string;
  opponentLabel?: string;
}

const PLAYER_TONES: Record<0 | 1, { chip: string; ring: string; label: string }> = {
  0: { chip: 'bg-rose-500',   ring: 'ring-rose-300',   label: 'text-rose-700' },
  1: { chip: 'bg-amber-400',  ring: 'ring-amber-300',  label: 'text-amber-700' },
};

export default function Connect4Board({ moves, onDrop, disabled = false, challengerLabel = 'Red', opponentLabel = 'Yellow' }: BoardProps) {
  const board = buildBoard(moves);
  const turn = currentPlayer(moves);
  const win = findWinner(board);
  const winSet = new Set(win?.cells.map(([r, c]) => `${r}:${c}`));
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  // Phase 9 — last-dropped chip animation. We rebuild the board
  // without the final move and find where that last chip would
  // have landed; flag that (row, col) so its chip renders with
  // the sa-c4-chip-drop keyframes for a single render. React's
  // reconciliation will replace the node when the next move
  // arrives, naturally re-firing the animation.
  const lastDrop = useMemo<{ row: number; col: number } | null>(() => {
    if (moves.length === 0) return null;
    const col = moves[moves.length - 1];
    const prevBoard = buildBoard(moves.slice(0, -1));
    const row = lowestEmptyRowOfCol(prevBoard, col);
    return row < 0 ? null : { row, col };
  }, [moves]);

  return (
    <div className="inline-flex flex-col items-center gap-3">
      {/* Header — who's up, color swatch, win banner. */}
      <div className="flex items-center gap-4 text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded-full ${PLAYER_TONES[0].chip}`} />
          <span className={PLAYER_TONES[0].label} style={{ fontFamily: 'var(--font-body)' }}>{challengerLabel}</span>
        </span>
        <span className="text-foreground/30">vs</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded-full ${PLAYER_TONES[1].chip}`} />
          <span className={PLAYER_TONES[1].label} style={{ fontFamily: 'var(--font-body)' }}>{opponentLabel}</span>
        </span>
        <span aria-hidden className="text-foreground/30">·</span>
        {win ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${PLAYER_TONES[win.winner].chip}`} />
            <span className="font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
              {win.winner === 0 ? challengerLabel : opponentLabel} wins
            </span>
          </span>
        ) : (
          <span className="text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${PLAYER_TONES[turn].chip}`} />
            {(turn === 0 ? challengerLabel : opponentLabel) + ' to move'}
          </span>
        )}
      </div>

      {/* The board itself — a copper-tinted frame holding the 6×7 grid of cells. */}
      <div className={`relative rounded-2xl bg-[#bc6b4a]/15 ring-1 ring-[#bc6b4a]/25 p-2 sm:p-3 transition-opacity ${disabled || !!win ? 'opacity-90' : ''}`}>
        <div
          role="grid"
          aria-label="Connect-4 board"
          className="grid gap-1 sm:gap-1.5"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((__, c) => {
              const cell = board[r][c] as Cell;
              const inWin = winSet.has(`${r}:${c}`);
              // Hover preview — when the column is hovered and that
              // cell is the next chip's resting place, paint a faint
              // ghost so the user knows where the drop will land.
              const isPreview = hoverCol === c && !win && !disabled
                && cell === null
                && lowestEmptyRowOfCol(board, c) === r;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  role="gridcell"
                  aria-label={`Row ${ROWS - r}, column ${c + 1}${cell !== null ? `, ${cell === 0 ? challengerLabel : opponentLabel}` : ''}`}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol((prev) => (prev === c ? null : prev))}
                  onClick={() => {
                    if (!onDrop || disabled || win) return;
                    if (isColumnFull(board, c)) return;
                    onDrop(c);
                  }}
                  className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/70 ring-1 ring-black/5 transition-colors ${onDrop && !disabled && !win ? 'hover:bg-white/85 cursor-pointer' : 'cursor-default'}`}
                >
                  {cell !== null && (
                    <span
                      key={`chip-${r}-${c}-${moves.length}`}
                      className={`absolute inset-1 rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)] ${PLAYER_TONES[cell].chip} ${inWin ? `sa-c4-win-cell ring-2 ring-offset-1 ${PLAYER_TONES[cell].ring}` : ''} ${lastDrop && lastDrop.row === r && lastDrop.col === c && !inWin ? 'sa-c4-last-move sa-c4-chip-drop' : ''}`}
                      style={lastDrop && lastDrop.row === r && lastDrop.col === c
                        ? { ['--c4-drop-from' as string]: `${-(r + 1) * 44}px` }
                        : undefined}
                      aria-hidden
                    />
                  )}
                  {isPreview && (
                    <span
                      className={`absolute inset-1 rounded-full opacity-40 ${PLAYER_TONES[turn].chip}`}
                      aria-hidden
                    />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

// Tiny inline duplicate of lowestEmptyRow because importing two
// values for one preview hint felt like overkill. The grid is
// 6×7 = 42 cells so the cost is trivial.
function lowestEmptyRowOfCol(board: Cell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === null) return r;
  return -1;
}
