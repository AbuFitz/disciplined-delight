import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUEST_DB, USER_DB_PREFIX } from "./scope";
import { LEGACY_KEYS } from "./legacy";
import { BACKUP_APP, BACKUP_APP_ALIASES, parseBackup } from "@/domain/backup";
import { BRAND } from "@/lib/brand";

const root = join(__dirname, "..", "..");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("VAYVOR rebrand", () => {
  it("shows the new name and pronunciation", () => {
    expect(BRAND.name).toBe("VAYVOR");
    expect(BRAND.pronunciation).toBe("VAY-vor");
  });

  it("no user-visible 'New Life' remains in source, public assets or unapplied migrations", () => {
    const files = [
      ...walk(join(root, "src")).filter(
        (f) =>
          /\.(ts|tsx)$/.test(f) && !f.endsWith("brand.test.ts") && !f.endsWith("routeTree.gen.ts"),
      ),
      join(root, "public", "manifest.webmanifest"),
      join(root, "public", "sw.js"),
      ...[
        "0003_sync.sql",
        "0004_push_reminders.sql",
        "0005_profiles.sql",
        "0006_circle.sql",
        "0007_circle_chat.sql",
      ].map((f) => join(root, "supabase", "migrations", f)),
      ...walk(join(root, "supabase", "templates")),
      join(root, ".env.example"),
    ];
    const hits = files.filter((f) => /new life/i.test(readFileSync(f, "utf8")));
    expect(hits.map((h) => h.replace(root, ""))).toEqual([]);
  });

  it("install identity is unchanged: manifest id, start URL and scope", () => {
    const m = JSON.parse(readFileSync(join(root, "public", "manifest.webmanifest"), "utf8"));
    expect(m).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      name: "VAYVOR",
      short_name: "VAYVOR",
    });
    expect(m.icons.length).toBeGreaterThanOrEqual(3);
  });

  it("storage identifiers are unchanged", () => {
    expect(GUEST_DB).toBe("new-life");
    expect(USER_DB_PREFIX).toBe("new-life:u:");
    expect(LEGACY_KEYS).toEqual({
      tracker: "sunrise-strength-tracker-v1",
      schedule: "sunrise-strength-schedule-v2",
      shopping: "new-life-shopping-checklist-v1",
    });
    expect(BACKUP_APP).toBe("new-life");
  });

  it("backups from before and after the rebrand both import", () => {
    for (const app of BACKUP_APP_ALIASES) {
      expect(parseBackup(JSON.stringify({ app, schema: 1, collections: {} })).ok).toBe(true);
    }
    const bad = parseBackup(JSON.stringify({ app: "other", schema: 1, collections: {} }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("VAYVOR");
  });

  it("the service worker keeps its cache prefix and the first-party service worker name is VAYVOR", () => {
    const sw = readFileSync(join(root, "public", "sw.js"), "utf8");
    expect(sw).toMatch(/const VERSION = "nl-v\d+"/);
    expect(sw).toContain("VAYVOR");
  });

  it("never hard-codes the future domain in app code", () => {
    const files = walk(join(root, "src")).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("brand.test.ts") && !f.endsWith("brand.ts"),
    );
    const hits = files.filter((f) => /vayvor\.com/i.test(readFileSync(f, "utf8")));
    expect(hits.map((h) => h.replace(root, ""))).toEqual([]);
  });
});
