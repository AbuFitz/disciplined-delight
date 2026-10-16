import { describe, expect, it } from "vitest";
import {
  dropFourToken,
  emptyFourBoard,
  FOUR_CELLS,
  fourWinner,
  normaliseFourBoard,
  type FourBoard,
} from "./four";

const boardWith = (cells: Array<[number, number, 1 | 2]>): FourBoard => {
  const board = emptyFourBoard();
  for (const [row, column, token] of cells) board[row * 7 + column] = token;
  return board;
};

describe("Four in a Row rules", () => {
  it("drops a token into the lowest open cell without mutating the old board", () => {
    const board = emptyFourBoard();
    const first = dropFourToken(board, 2, 1);
    const second = dropFourToken(first!.board, 2, 2);
    expect(board.every((cell) => cell === 0)).toBe(true);
    expect(first).toMatchObject({ row: 5, winner: 0, draw: false });
    expect(second).toMatchObject({ row: 4, winner: 0, draw: false });
  });

  it("detects horizontal, vertical and both diagonal wins", () => {
    expect(
      fourWinner(
        boardWith([
          [5, 0, 1],
          [5, 1, 1],
          [5, 2, 1],
          [5, 3, 1],
        ]),
      ),
    ).toBe(1);
    expect(
      fourWinner(
        boardWith([
          [2, 6, 2],
          [3, 6, 2],
          [4, 6, 2],
          [5, 6, 2],
        ]),
      ),
    ).toBe(2);
    expect(
      fourWinner(
        boardWith([
          [2, 0, 1],
          [3, 1, 1],
          [4, 2, 1],
          [5, 3, 1],
        ]),
      ),
    ).toBe(1);
    expect(
      fourWinner(
        boardWith([
          [5, 0, 2],
          [4, 1, 2],
          [3, 2, 2],
          [2, 3, 2],
        ]),
      ),
    ).toBe(2);
  });

  it("refuses invalid and full columns", () => {
    const full = boardWith(Array.from({ length: 6 }, (_, row) => [row, 0, 1] as const));
    expect(dropFourToken(full, 0, 2)).toBeNull();
    expect(dropFourToken(full, -1, 2)).toBeNull();
    expect(dropFourToken(full, 7, 2)).toBeNull();
  });

  it("normalises malformed remote boards to a safe 42-cell board", () => {
    expect(normaliseFourBoard(null)).toEqual(emptyFourBoard());
    expect(normaliseFourBoard([1, 2])).toHaveLength(FOUR_CELLS);
    expect(normaliseFourBoard(Array(FOUR_CELLS).fill(7))).toEqual(emptyFourBoard());
  });
});
