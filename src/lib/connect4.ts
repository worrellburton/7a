// Connect-4 rules engine. Pure functions only — no DB, no React;
// callable from both the API route (server-side win check + turn
// enforcement) and the client (optimistic local rendering /
// hover-preview). Keeping the model dumb means the two callers
// can't diverge on what counts as a win.

export const COLS = 7;
export const ROWS = 6;
export type Cell = null | 0 | 1; // 0 = challenger, 1 = opponent

export function buildBoard(moves: number[]): Cell[][] {
  // moves is the canonical column-drop history (newest last).
  // The board reconstructs each frame from scratch so we never
  // have to migrate a stored 2D grid when the rules engine
  // changes.
  const board: Cell[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let i = 0; i < moves.length; i++) {
    const col = moves[i];
    if (col < 0 || col >= COLS) continue;
    const row = lowestEmptyRow(board, col);
    if (row === -1) continue; // column full — invalid move, skip (the API rejects these too)
    board[row][col] = (i % 2) as 0 | 1;
  }
  return board;
}

export function lowestEmptyRow(board: Cell[][], col: number): number {
  // Connect-4 stacks bottom-up; the lowest empty row is the one
  // where the chip lands. Returns -1 when the column is full.
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

export function isColumnFull(board: Cell[][], col: number): boolean {
  return board[0][col] !== null;
}

export function isBoardFull(board: Cell[][]): boolean {
  for (let c = 0; c < COLS; c++) if (!isColumnFull(board, c)) return false;
  return true;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal ↘
  [1, -1], // diagonal ↙
];

export interface WinResult {
  winner: 0 | 1;
  cells: [number, number][]; // four-in-a-row cells, top-left-most first
}

export function findWinner(board: Cell[][]): WinResult | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (cell === null) continue;
      for (const [dr, dc] of DIRECTIONS) {
        // Bail before stepping if the run would walk off the board.
        const endR = r + 3 * dr;
        const endC = c + 3 * dc;
        if (endR < 0 || endR >= ROWS || endC < 0 || endC >= COLS) continue;
        if (
          board[r + dr][c + dc] === cell
          && board[r + 2 * dr][c + 2 * dc] === cell
          && board[endR][endC] === cell
        ) {
          return {
            winner: cell,
            cells: [
              [r, c],
              [r + dr, c + dc],
              [r + 2 * dr, c + 2 * dc],
              [endR, endC],
            ],
          };
        }
      }
    }
  }
  return null;
}

// Turn ownership — derived purely from moves.length so we never
// store "whose turn" separately and risk it drifting from the
// canonical move list. Even index → challenger (player 0, red);
// odd → opponent (player 1, yellow).
export function currentPlayer(moves: number[]): 0 | 1 {
  return (moves.length % 2) as 0 | 1;
}
