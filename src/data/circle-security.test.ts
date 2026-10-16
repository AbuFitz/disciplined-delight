import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0006_circle.sql"),
  "utf8",
);

describe("Circle migration security contract", () => {
  it("uses explicit social tables rather than exposing private sync records", () => {
    expect(sql).not.toMatch(/\bpublic\.records\b|\bpublic\.mutation_log\b/);
    expect(sql).toContain("Nothing from the private records/sync tables is copied or exposed here");
  });

  it("enables RLS and denies direct writes on every Circle table", () => {
    for (const table of ["circle_blocks", "circle_connections", "circle_posts", "circle_kudos"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on public\.circle_blocks[\s\S]*from public, anon, authenticated/,
    );
  });

  it("keeps feed visibility connection-only and applies blocks in both directions", () => {
    expect(sql).toContain("c.status = 'accepted'");
    expect(sql).toContain("not public.circle_is_blocked(me, p.author_id)");
    expect(sql).toMatch(
      /\(blocker_id = a and blocked_id = b\) or \(blocker_id = b and blocked_id = a\)/,
    );
  });

  it("requires explicit share RPCs and does not allow self-kudos", () => {
    expect(sql).toContain("create or replace function public.circle_share");
    expect(sql).toContain("and p.author_id <> me");
  });
});
