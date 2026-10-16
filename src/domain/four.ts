export const FOUR_COLUMNS = 7;
export const FOUR_ROWS = 6;
export const FOUR_CELLS = FOUR_COLUMNS * FOUR_ROWS;

export type FourToken = 0 | 1 | 2;
export type FourBoard = FourToken[];

export const emptyFourBoard = (): FourBoard => Array<FourToken>(FOUR_CELLS).fill(0);

export function normaliseFourBoard(value: unknown): FourBoard {
  if (!Array.isArray(value) || value.length !== FOUR_CELLS) return emptyFourBoard();
  return value.map((cell) => (cell === 1 || cell === 2 ? cell : 0));
}

export const fourCell = (board: readonly FourToken[], row: number, column: number) =>
  board[row * FOUR_COLUMNS + column] ?? 0;

export function fourWinner(board: readonly FourToken[]): FourToken {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    for (let column = 0; column < FOUR_COLUMNS; column += 1) {
      const token = fourCell(board, row, column);
      if (!token) continue;
      for (const [rowStep, columnStep] of directions) {
        const endRow = row + rowStep * 3;
        const endColumn = column + columnStep * 3;
        if (endRow < 0 || endRow >= FOUR_ROWS || endColumn < 0 || endColumn >= FOUR_COLUMNS)
          continue;
        if (
          [1, 2, 3].every(
            (offset) =>
              fourCell(board, row + rowStep * offset, column + columnStep * offset) === token,
          )
        )
          return token;
      }
    }
  }
  return 0;
}

export function dropFourToken(
  board: readonly FourToken[],
  column: number,
  token: Exclude<FourToken, 0>,
): { board: FourBoard; row: number; winner: FourToken; draw: boolean } | null {
  if (!Number.isInteger(column) || column < 0 || column >= FOUR_COLUMNS) return null;
  for (let row = FOUR_ROWS - 1; row >= 0; row -= 1) {
    if (fourCell(board, row, column) !== 0) continue;
    const next = normaliseFourBoard(board);
    next[row * FOUR_COLUMNS + column] = token;
    return {
      board: next,
      row,
      winner: fourWinner(next),
      draw: next.every(Boolean),
    };
  }
  return null;
}

export const fourColumnFull = (board: readonly FourToken[], column: number) =>
  fourCell(board, 0, column) !== 0;
