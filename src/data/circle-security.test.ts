import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0006_circle.sql"),
  "utf8",
);
const verifier = readFileSync(
  join(__dirname, "..", "..", "scripts", "verify-supabase.mjs"),
  "utf8",
);
const privacy = readFileSync(join(__dirname, "..", "..", "docs", "PRIVACY.md"), "utf8");

describe("Circle migration security contract", () => {
  it("uses explicit social tables rather than exposing private sync records", () => {
    expect(sql).not.toMatch(/\bpublic\.records\b|\bpublic\.mutation_log\b/);
    expect(sql).toContain("Nothing from the private records/sync tables is copied or exposed here");
    expect(privacy).not.toContain("Nothing social exists yet");
    expect(privacy).toContain("Circle is built, but it uses separate social tables");
    expect(privacy).toMatch(/Workouts,\s+meals, weight and routines are not posted automatically/);
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

  it("requires explicit share RPCs, blocks self-kudos and keeps the real-project verifier current", () => {
    expect(sql).toContain("create or replace function public.circle_share");
    expect(sql).toContain("and p.author_id <> me");

    for (const fn of [
      "push_mutation",
      "replace_reminders",
      "username_available",
      "create_profile",
      "circle_find_people",
      "circle_my_connections",
      "circle_my_blocks",
      "circle_send_request",
      "circle_respond_request",
      "circle_remove_connection",
      "circle_block",
      "circle_unblock",
      "circle_share",
      "circle_delete_post",
      "circle_toggle_kudos",
      "circle_feed",
      "circle_chat_threads",
      "circle_chat_messages",
      "circle_chat_send",
      "circle_chat_mark_read",
      "circle_chat_delete",
      "circle_challenge_create",
      "circle_challenge_respond",
      "circle_challenges",
      "circle_challenge_entries",
      "circle_challenge_add",
      "circle_challenge_delete_entry",
      "circle_challenge_close",
    ]) {
      expect(verifier, fn).toContain(`"${fn}"`);
    }
    for (const table of [
      "records",
      "mutation_log",
      "profiles",
      "push_subscriptions",
      "scheduled_reminders",
      "circle_blocks",
      "circle_connections",
      "circle_posts",
      "circle_kudos",
      "circle_messages",
      "circle_challenges",
      "circle_challenge_entries",
    ]) {
      expect(verifier, table).toContain(`"${table}"`);
    }
    expect(verifier).toContain("p_base_rev: base");
    expect(verifier).not.toContain("p_base_server_rev");
    expect(verifier).toContain('p_unit: "sessions"');
  });
});
