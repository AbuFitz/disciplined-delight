import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0009_circle_four.sql"),
  "utf8",
);

describe("Four in a Row security contract", () => {
  it("keeps games connection-only and unrelated to private records", () => {
    expect(sql).toContain("public.circle_chat_allowed(me, p_user_id)");
    expect(sql).toContain("public.circle_is_blocked");
    expect(sql).not.toMatch(/\bpublic\.records\b|\bpublic\.mutation_log\b/);
  });

  it("enables RLS, revokes direct writes and denies anonymous functions", () => {
    expect(sql).toContain("alter table public.circle_four_games enable row level security");
    expect(sql).toMatch(
      /revoke all on public\.circle_four_games[\s\S]*from public, anon, authenticated/,
    );
    expect(sql).toContain(
      "revoke all on function public.circle_four_move(uuid, integer) from public, anon",
    );
  });

  it("serializes moves and validates turn, column and winner on the server", () => {
    expect(sql).toContain("for update");
    expect(sql).toContain("not_your_turn");
    expect(sql).toContain("column_full");
    expect(sql).toContain("public.circle_four_winner(next_board)");
  });

  it("requires each player to author their own dare", () => {
    expect(sql).toContain("p_creator_dare");
    expect(sql).toContain("p_invited_dare");
    expect(sql).toContain("invited_id = me");
  });
});
