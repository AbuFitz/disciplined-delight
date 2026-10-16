import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0008_circle_challenges.sql"),
  "utf8",
);

describe("Circle challenges security contract", () => {
  it("never reads or copies private fitness and wellbeing records", () => {
    expect(sql).not.toMatch(/\bpublic\.records\b|\bpublic\.mutation_log\b/);
    expect(sql).toContain("Progress is explicitly self-reported");
  });

  it("enables RLS and revokes direct writes", () => {
    for (const table of ["circle_challenges", "circle_challenge_entries"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on public\.circle_challenges[\s\S]*from public, anon, authenticated/,
    );
  });

  it("requires an accepted unblocked connection and explicit acceptance", () => {
    expect(sql).toContain("public.circle_chat_allowed(me, p_user_id)");
    expect(sql).toContain("c.status = 'accepted'");
    expect(sql).toContain("p_accept");
    expect(sql).toContain("public.circle_is_blocked");
  });

  it("only lets a participant delete their own check-in", () => {
    expect(sql).toContain("where id = p_entry_id and user_id = me");
  });
});
