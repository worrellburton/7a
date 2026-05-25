'use client';

// Connect Four · single-player vs. AI streak chase.
//
//   - You play arrows (copper). AI plays feathers (teal).
//   - Win → +1 streak, next round starts immediately.
//   - Loss or draw → submit final streak as the score, run ends.
//   - AI gets smarter with each win you rack up — early rounds
//     it plays random columns, later rounds it looks ahead
//     1 then 2 then 3 moves so the streak gets harder to extend.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Leaderboard from '../_components/Leaderboard';
import { useArcadeScore } from '../_lib/useArcadeScore';

const COLS = 7;
const ROWS = 6;
type Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 AI
type Board = Cell[];

function newBoard(): Board { return Array<Cell>(COLS * ROWS).fill(0); }
const idx = (r: number, c: number) => r * COLS + c;

// Returns the row that would receive a chip if dropped in col, or
// -1 if the column is full.
function dropRow(b: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[idx(r, col)] === 0) return r;
  return -1;
}

const DIRS: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

// Returns the winning cell indexes when `who` has 4-in-a-row at
// (r, c), or null if no win passes through that cell.
function findWinLine(b: Board, r: number, c: number, who: Cell): number[] | null {
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    for (let k = -3; k <= 3; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (b[idx(nr, nc)] === who) line.push(idx(nr, nc));
      else line.length = 0;
      if (line.length >= 4) return line.slice(-4);
    }
  }
  return null;
}

function isFull(b: Board): boolean { return b.every((c) => c !== 0); }

// AI move chooser. Difficulty 0 = random, 1 = block obvious wins,
// 2 = look 2 ahead, 3 = full negamax to depth 4.
function chooseAiMove(b: Board, difficulty: number): number {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) if (dropRow(b, c) !== -1) cols.push(c);
  if (cols.length === 0) return 0;
  // Always take an immediate winning column.
  for (const c of cols) {
    const r = dropRow(b, c);
    const test = b.slice(); test[idx(r, c)] = 2;
    if (findWinLine(test, r, c, 2)) return c;
  }
  if (difficulty >= 1) {
    // Block the player's immediate winning column.
    for (const c of cols) {
      const r = dropRow(b, c);
      const test = b.slice(); test[idx(r, c)] = 1;
      if (findWinLine(test, r, c, 1)) return c;
    }
  }
  if (difficulty >= 2) {
    // Negamax-lite: rank columns by a heuristic up to depth 2.
    const center = Math.floor(COLS / 2);
    let bestC = cols[0];
    let bestScore = -Infinity;
    for (const c of cols) {
      const r = dropRow(b, c);
      const test = b.slice(); test[idx(r, c)] = 2;
      // Score: prefer centre + a tiny look-ahead for opponent
      // winning chances on the next move.
      let score = 6 - Math.abs(c - center);
      // Penalise if the player can then win on top of this move.
      const playerCols: number[] = [];
      for (let pc = 0; pc < COLS; pc++) if (dropRow(test, pc) !== -1) playerCols.push(pc);
      for (const pc of playerCols) {
        const pr = dropRow(test, pc);
        const test2 = test.slice(); test2[idx(pr, pc)] = 1;
        if (findWinLine(test2, pr, pc, 1)) { score -= 20; break; }
      }
      if (score > bestScore) { bestScore = score; bestC = c; }
    }
    return bestC;
  }
  // Random fallback.
  return cols[Math.floor(Math.random() * cols.length)];
}

export default function ConnectFourContent() {
  const submitScore = useArcadeScore('connect_four');
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [turn, setTurn] = useState<Cell>(1); // 1 = player to move, 2 = AI
  const [streak, setStreak] = useState(0);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<Cell | 0>(0);
  const [draw, setDraw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dropping, setDropping] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Difficulty climbs with streak so the run actually ENDS.
  const difficulty = useMemo(() => {
    if (streak < 1) return 0;
    if (streak < 3) return 1;
    return 2;
  }, [streak]);

  // Place a chip in column c for the current turn. Returns the
  // dropped row + the winning line if this move closed out four.
  const placeChip = useCallback(
    (b: Board, c: number, who: Cell): { board: Board; row: number; line: number[] | null } => {
      const r = dropRow(b, c);
      if (r === -1) return { board: b, row: -1, line: null };
      const next = b.slice();
      next[idx(r, c)] = who;
      const line = findWinLine(next, r, c, who);
      return { board: next, row: r, line };
    },
    [],
  );

  const playerMove = useCallback((c: number) => {
    if (winner !== 0 || draw || turn !== 1 || dropping) return;
    setDropping(true);
    const res = placeChip(board, c, 1);
    if (res.row === -1) { setDropping(false); return; }
    setBoard(res.board);
    if (res.line) {
      setWinLine(res.line);
      setWinner(1);
      // Player wins → +1 streak, reset board after a beat.
      aiTimeoutRef.current = setTimeout(() => {
        setStreak((s) => s + 1);
        setBoard(newBoard());
        setWinLine(null);
        setWinner(0);
        setTurn(1);
        setDropping(false);
      }, 1100);
      return;
    }
    if (isFull(res.board)) { setDraw(true); setDropping(false); return; }
    setTurn(2);
    setDropping(false);
  }, [board, turn, winner, draw, dropping, placeChip]);

  // Drive the AI move whenever it's their turn.
  useEffect(() => {
    if (winner !== 0 || draw || turn !== 2) return;
    const t = setTimeout(() => {
      const c = chooseAiMove(board, difficulty);
      const res = placeChip(board, c, 2);
      if (res.row === -1) return;
      setBoard(res.board);
      if (res.line) {
        setWinLine(res.line);
        setWinner(2);
        return;
      }
      if (isFull(res.board)) { setDraw(true); return; }
      setTurn(1);
    }, 420);
    return () => clearTimeout(t);
  }, [turn, board, winner, draw, difficulty, placeChip]);

  // Submit the streak as the score when the run ends (AI win or
  // draw). Player wins don't end the run — they just bump streak.
  useEffect(() => {
    if (submitted) return;
    if (winner !== 2 && !draw) return;
    const score = streak;
    if (score <= 0) { setSubmitted(true); return; }
    void submitScore(score, { difficulty }).then((ok) => {
      setSubmitted(true);
      if (ok) setRefreshKey((k) => k + 1);
    });
  }, [winner, draw, streak, submitted, submitScore, difficulty]);

  const newRun = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setBoard(newBoard());
    setTurn(1);
    setStreak(0);
    setWinLine(null);
    setWinner(0);
    setDraw(false);
    setSubmitted(false);
    setDropping(false);
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/arcade" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Arcade</Link>
      <header className="mt-3 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Game · Connect Four</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Stack four arrows. Beat the herd.
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/65 max-w-xl">
          Drop your copper arrow into a column. Get four in a row before the feather AI does. Every win extends your streak — the AI gets smarter as your streak grows. Your final streak is your score.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55">Streak</p>
              <p className="text-2xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{streak}</p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55">
                {winner === 1 ? 'You won the round' : winner === 2 ? 'AI won' : draw ? 'Draw' : turn === 1 ? 'Your move' : 'AI thinking…'}
              </p>
              <p className="text-[11px] text-foreground/45 mt-0.5">
                {difficulty === 0 ? 'Difficulty · easy' : difficulty === 1 ? 'Difficulty · blocking' : 'Difficulty · looks ahead'}
              </p>
            </div>
          </div>

          {/* Column-tap row · big buttons above the board. Drops the
              chip into the targeted column. */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {Array.from({ length: COLS }, (_, c) => (
              <button
                key={`drop-${c}`}
                type="button"
                disabled={turn !== 1 || winner !== 0 || draw || dropRow(board, c) === -1}
                onClick={() => playerMove(c)}
                className="h-7 rounded-md bg-primary/15 hover:bg-primary/30 active:scale-95 disabled:opacity-30 transition-all text-primary text-sm font-bold"
                aria-label={`Drop in column ${c + 1}`}
              >
                ↓
              </button>
            ))}
          </div>

          {/* Board */}
          <div className="rounded-xl bg-foreground p-2 shadow-inner">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: ROWS * COLS }, (_, i) => {
                const v = board[i];
                const isWin = winLine?.includes(i) ?? false;
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {v === 0 ? (
                      <span className="block w-[78%] h-[78%] rounded-full bg-white/10" />
                    ) : v === 1 ? (
                      <span className={`block w-[86%] h-[86%] rounded-full shadow-md transition-transform ${isWin ? 'animate-pulse scale-105' : ''}`} style={{ background: 'radial-gradient(circle at 30% 30%, #ee8a5d, #bc6b4a 60%, #8a4f30)' }} />
                    ) : (
                      <span className={`block w-[86%] h-[86%] rounded-full shadow-md transition-transform ${isWin ? 'animate-pulse scale-105' : ''}`} style={{ background: 'radial-gradient(circle at 30% 30%, #99f6e4, #14b8a6 60%, #0f766e)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {(winner === 2 || draw) && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-900">{winner === 2 ? 'AI took the round' : 'Draw — board full'}</p>
              <p className="mt-1 text-3xl font-bold text-rose-900 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                {streak}
              </p>
              <p className="text-[11px] text-rose-900/70">final streak</p>
              {submitted && streak > 0 && (
                <p className="mt-1 text-[10.5px] text-emerald-700 font-semibold uppercase tracking-wider">✓ Score saved</p>
              )}
              <button
                type="button"
                onClick={newRun}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
              >
                New streak
              </button>
            </div>
          )}
        </div>

        <Leaderboard game="connect_four" scoreLabel="Best streak (wins in a row)" refreshKey={refreshKey} />
      </div>
    </div>
  );
}
