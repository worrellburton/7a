'use client';

// Saddle Sudoku · daily 9×9 puzzle, glyphs instead of digits.
//
// Daily seed: the day's Phoenix date (America/Phoenix) is hashed
// to a deterministic 0..N-1 puzzle index. Everyone sees the same
// puzzle, leaderboard is per-day via meta.puzzle_date.
//
// The "digits" are 9 hand-picked Western glyphs (feather, horseshoe,
// arrow, cactus, sun, mountain, hat, hoof, star). Logic is exactly
// like normal sudoku — only the rendering changes.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Leaderboard from '../_components/Leaderboard';
import { useArcadeScore } from '../_lib/useArcadeScore';

type Cell = number; // 0 = empty, 1..9 = filled
type Board = Cell[];

// A small bank of pre-solved sudoku boards. Each entry is a
// full solution (81 digits 1..9). The "puzzle" is derived by
// removing a deterministic mask of cells based on the daily
// seed. Three solutions cycle by day so a missed day's puzzle
// can still be reconstructed from just the date.
const SOLUTIONS: string[] = [
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  '123456789456789123789123456231564897564897231897231564312645978645978312978312645',
  '815734296693128574247956831531287469468591723972463185156342987784619352329875641',
];

// 9 glyphs — one per digit. Rendered inline as SVGs so the grid
// reads as Western iconography rather than numerals.
function GlyphIcon({ d, size = 28, color = 'currentColor' }: { d: number; size?: number; color?: string }) {
  const s = size;
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (d) {
    case 1: // Feather
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      );
    case 2: // Horseshoe
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M5 4v8a7 7 0 0 0 14 0V4" />
          <circle cx="5.5" cy="4.5" r="0.8" fill={color} />
          <circle cx="18.5" cy="4.5" r="0.8" fill={color} />
        </svg>
      );
    case 3: // Arrow
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M3 21 21 3" />
          <path d="M14 3h7v7" />
          <path d="M3 18l3 3" />
          <path d="M3 21l3-3" />
        </svg>
      );
    case 4: // Cactus
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M10 22V8a2 2 0 0 1 4 0v14" />
          <path d="M10 14H7a1.5 1.5 0 0 1 0-3h3" />
          <path d="M14 12h3a1.5 1.5 0 0 1 0 3h-3" />
        </svg>
      );
    case 5: // Sun
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
        </svg>
      );
    case 6: // Mountain
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M3 20 9 9l4 6 3-4 5 9z" />
        </svg>
      );
    case 7: // Hat
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M4 17c4 1.5 12 1.5 16 0" />
          <path d="M7 17c0-3 1-7 5-7s5 4 5 7" />
          <path d="M5 17c-1 0-1 1 1 1.5s12 .5 13 0 1-1.5 0-1.5" />
        </svg>
      );
    case 8: // Hoof
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M7 5c3-2 7-2 10 0v8c0 4-2 6-5 6s-5-2-5-6z" />
          <path d="M9 13h6" />
        </svg>
      );
    case 9: // Star
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
          <path d="M12 2l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.7 6.1 20l1.7-6.7L2.5 8.9l6.9-.5z" />
        </svg>
      );
    default:
      return null;
  }
}

const GLYPH_LABELS: Record<number, string> = {
  1: 'Feather', 2: 'Horseshoe', 3: 'Arrow', 4: 'Cactus',
  5: 'Sun', 6: 'Mountain', 7: 'Hat', 8: 'Hoof', 9: 'Star',
};

// Today's Phoenix date as YYYY-MM-DD. Use that as the puzzle key.
function phoenixToday(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit' });
  // en-CA gives YYYY-MM-DD already.
  return fmt.format(new Date());
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

// Deterministic mask of which cells are revealed (≈30 givens).
function buildPuzzle(seed: string): { puzzle: Board; solution: Board; givens: boolean[] } {
  const sIdx = hashString(seed) % SOLUTIONS.length;
  const solStr = SOLUTIONS[sIdx];
  const solution: Board = solStr.split('').map((c) => Number(c));
  // Stable per-day mask: every cell starts revealed, then ~50
  // cells are hidden in a deterministic order.
  const order = Array.from({ length: 81 }, (_, i) => i);
  // Fisher-Yates with a deterministic RNG seeded by the day.
  let seedNum = hashString(seed + '|mask');
  const rand = () => {
    // mulberry32
    seedNum |= 0; seedNum = (seedNum + 0x6D2B79F5) | 0;
    let t = Math.imul(seedNum ^ (seedNum >>> 15), 1 | seedNum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const hide = order.slice(0, 50);
  const givens = Array(81).fill(true);
  for (const i of hide) givens[i] = false;
  const puzzle: Board = solution.map((v, i) => (givens[i] ? v : 0));
  return { puzzle, solution, givens };
}

function isComplete(board: Board, solution: Board): boolean {
  for (let i = 0; i < 81; i++) if (board[i] !== solution[i]) return false;
  return true;
}

export default function SaddleSudokuContent() {
  const submitScore = useArcadeScore('saddle_sudoku');
  const puzzleDate = useMemo(() => phoenixToday(), []);
  const { puzzle, solution, givens } = useMemo(() => buildPuzzle(puzzleDate), [puzzleDate]);
  const [board, setBoard] = useState<Board>(() => puzzle.slice());
  const [selected, setSelected] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [solvedSeconds, setSolvedSeconds] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (startedAt !== null) return;
    setStartedAt(Date.now());
  }, [startedAt]);

  // Tick the timer at 1Hz while the puzzle is open + unsolved.
  useEffect(() => {
    if (startedAt === null || solvedSeconds !== null) return;
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [startedAt, solvedSeconds]);

  function setCell(i: number, v: number) {
    if (givens[i]) return;
    if (solvedSeconds !== null) return;
    startTimer();
    setBoard((prev) => {
      const next = prev.slice();
      next[i] = next[i] === v ? 0 : v;
      // Check solved on each change.
      if (isComplete(next, solution)) {
        const s = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
        setSolvedSeconds(s);
      }
      return next;
    });
  }

  // Submit when solved.
  useEffect(() => {
    if (solvedSeconds === null || submitted) return;
    // Score = max(0, 3600 - seconds) so faster solves rank higher
    // on the per-day board. Stays positive up to one hour.
    const score = Math.max(1, 3600 - solvedSeconds);
    void submitScore(score, { puzzle_date: puzzleDate, seconds: solvedSeconds }).then((ok) => {
      setSubmitted(true);
      if (ok) setRefreshKey((k) => k + 1);
    });
  }, [solvedSeconds, submitted, puzzleDate, submitScore]);

  // Keyboard input: 1-9 sets, 0/Backspace clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected === null) return;
      if (e.key >= '1' && e.key <= '9') setCell(selected, Number(e.key));
      else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') setCell(selected, board[selected]);
      else if (e.key === 'ArrowRight') setSelected((i) => (i === null ? 0 : (i + 1) % 81));
      else if (e.key === 'ArrowLeft') setSelected((i) => (i === null ? 0 : (i + 80) % 81));
      else if (e.key === 'ArrowDown') setSelected((i) => (i === null ? 0 : (i + 9) % 81));
      else if (e.key === 'ArrowUp') setSelected((i) => (i === null ? 0 : (i + 72) % 81));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, board]); // eslint-disable-line react-hooks/exhaustive-deps

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const selectedDigit = selected !== null ? board[selected] : 0;

  // Highlight cells that share the same digit as the selected
  // cell — common sudoku UX cue.
  const sameDigitMask = useMemo(() => {
    if (selected === null || board[selected] === 0) return new Set<number>();
    const v = board[selected];
    const out = new Set<number>();
    for (let i = 0; i < 81; i++) if (board[i] === v) out.add(i);
    return out;
  }, [selected, board]);

  // Conflict detection — same row/col/box duplicates flagged red.
  const conflicts = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < 81; i++) {
      const v = board[i];
      if (v === 0) continue;
      const r = Math.floor(i / 9), c = i % 9;
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let j = 0; j < 81; j++) {
        if (j === i || board[j] !== v) continue;
        const jr = Math.floor(j / 9), jc = j % 9;
        if (jr === r || jc === c || (jr >= br && jr < br + 3 && jc >= bc && jc < bc + 3)) {
          set.add(i); set.add(j);
        }
      }
    }
    return set;
  }, [board]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/arcade" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Arcade</Link>
      <header className="mt-3 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Game · Saddle Sudoku</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Today&rsquo;s 9 × 9 — same puzzle for everyone.
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/65 max-w-xl">
          Standard sudoku rules — every row, column, and 3×3 box must contain all nine glyphs. Tap a cell, then tap a glyph to fill it. Solve time today posts to the daily board.
        </p>
        <p className="mt-2 text-[11px] text-foreground/45">
          Puzzle date · <span className="font-semibold text-foreground/70">{puzzleDate}</span> · Phoenix time
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55">Timer</p>
            <p className="font-mono text-[15px] font-bold text-foreground tabular-nums">
              {solvedSeconds !== null ? mmss(solvedSeconds) : mmss(elapsed)}
            </p>
          </div>

          {/* Board · centered, scrolls horizontally on tiny phones
              if the cells happen to overflow the viewport. */}
          <div className="overflow-x-auto -mx-2 px-2 flex justify-center">
            <div
              className="grid bg-foreground/15 p-[2px] rounded-md"
              style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '1px' }}
            >
              {board.map((v, i) => {
                const r = Math.floor(i / 9), c = i % 9;
                const thickRight = c % 3 === 2 && c !== 8;
                const thickBottom = r % 3 === 2 && r !== 8;
                const isSelected = selected === i;
                const sameDigit = sameDigitMask.has(i);
                const inConflict = conflicts.has(i);
                const isGiven = givens[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`relative aspect-square min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center transition-colors active:bg-primary/40 ${
                      isSelected
                        ? 'bg-primary/25'
                        : sameDigit
                          ? 'bg-primary/8'
                          : 'bg-white hover:bg-warm-bg/50'
                    } ${thickRight ? 'mr-[2px]' : ''} ${thickBottom ? 'mb-[2px]' : ''}`}
                  >
                    {v !== 0 && (
                      <GlyphIcon
                        d={v}
                        size={26}
                        color={inConflict ? '#dc2626' : isGiven ? '#1a1a1a' : '#bc6b4a'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Glyph palette */}
          <div className="mt-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55 mb-2">Place a glyph</p>
            <div className="flex flex-wrap gap-1.5">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={selected === null || givens[selected]}
                  onClick={() => selected !== null && setCell(selected, d)}
                  title={GLYPH_LABELS[d]}
                  className={`w-12 h-12 rounded-md border flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 ${
                    selectedDigit === d ? 'bg-primary text-white border-primary' : 'bg-white border-black/10 text-foreground hover:bg-warm-bg/60'
                  }`}
                >
                  <GlyphIcon d={d} size={22} color="currentColor" />
                </button>
              ))}
              <button
                type="button"
                disabled={selected === null || givens[selected] || (selected !== null && board[selected] === 0)}
                onClick={() => selected !== null && setBoard((prev) => { const n = prev.slice(); n[selected] = 0; return n; })}
                className="w-12 h-12 rounded-md border border-black/10 bg-white text-foreground/55 text-[11px] font-semibold hover:bg-warm-bg/60 disabled:opacity-40 active:scale-95"
              >
                Clear
              </button>
            </div>
          </div>

          {solvedSeconds !== null && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-900">Solved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                {mmss(solvedSeconds)}
              </p>
              {submitted && <p className="mt-1 text-[10.5px] text-emerald-700 font-semibold uppercase tracking-wider">✓ Posted to today&rsquo;s board</p>}
            </div>
          )}
        </div>

        <Leaderboard
          game="saddle_sudoku"
          puzzleDate={puzzleDate}
          scoreLabel={`Today · faster = higher`}
          scoreFormat={(s) => mmss(Math.max(0, 3600 - s))}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
