import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0010_circle_crews.sql"),
  "utf8",
);

describe("Circle crews security contract", () => {
  it("never derives crew activity from private records", () => {
    expect(sql).toContain("Roll calls are deliberate self-reports");
    expect(sql).not.toMatch(/\bpublic\.records\b|\bpublic\.mutation_log\b/);
  });

  it("enables RLS and revokes direct writes on every crew table", () => {
    for (const table of ["circle_crews", "circle_crew_members", "circle_crew_checkins"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toMatch(
      /revoke all on public\.circle_crews, public\.circle_crew_members, public\.circle_crew_checkins[\s\S]*from public, anon, authenticated/,
    );
  });

  it("requires accepted connections for invitations and explicit acceptance", () => {
    expect(sql).toContain("public.circle_chat_allowed(me, invitee)");
    expect(sql).toContain("public.circle_chat_allowed(me, p_user_id)");
    expect(sql).toContain("p_accept");
  });

  it("filters blocked members and limits governance to the owner", () => {
    expect(sql).toContain("not public.circle_is_blocked(me, member.user_id)");
    expect(sql).toContain("crew.owner_id <> me");
    expect(sql).toContain("circle_crew_connection_removed");
  });
});
