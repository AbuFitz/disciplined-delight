import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FourGame } from "@/data/circle-four";
import { emptyFourBoard } from "@/domain/four";
import { FourBoard } from "./circle_.four";

const game = (overrides: Partial<FourGame> = {}): FourGame => ({
  id: "game-1",
  other_user_id: "person-2",
  other_username: "amina",
  other_display_name: "Amina",
  board: emptyFourBoard(),
  mine_token: 1,
  current_turn_id: "person-1",
  winner_id: null,
  status: "active",
  invited_me: false,
  my_turn: true,
  creator_dare: "Walk for twenty minutes",
  invited_dare: "Prepare tomorrow's lunch",
  created_at: "2026-10-16T12:00:00Z",
  updated_at: "2026-10-16T12:00:00Z",
  ...overrides,
});

describe("Four in a Row board UI", () => {
  it("renders seven named column controls and a useful board label", () => {
    const html = renderToStaticMarkup(<FourBoard game={game()} canMove onMove={() => {}} />);
    expect(html).toContain(
      "Four in a Row board. Your tokens are green; Amina&#x27;s tokens are warm.",
    );
    expect(html.match(/aria-label="Drop a token in column/g)).toHaveLength(7);
    expect(html).not.toContain('disabled=""');
  });

  it("disables every column when the game is waiting on the opponent", () => {
    const html = renderToStaticMarkup(
      <FourBoard game={game()} canMove={false} onMove={() => {}} />,
    );
    expect(html.match(/disabled=""/g)).toHaveLength(7);
  });
});
