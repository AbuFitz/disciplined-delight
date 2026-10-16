import { beforeEach, describe, expect, it } from "vitest";
import { applyBackup, buildBackup, previewBackup } from "./backup";
import { closeDB, get, list, put } from "./db";
import { runMigration } from "./legacy";
import { parseBackup } from "@/domain/backup";
import { COL, type WorkoutTemplate } from "./types";

beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});
// The owner's browser: original-app data present, so the legacy programme is migrated.
const ls = {
  getItem: (k: string) =>
    k === "sunrise-strength-tracker-v1" ? JSON.stringify({ logs: {} }) : null,
};

describe("backup", () => {
  it("round-trips templates, edits and settings", async () => {
    await runMigration(ls);
    const t = (await list<WorkoutTemplate>(COL.templates))[0]!;
    await put(COL.templates, t.id, { ...t, title: "My edited day" });
    const text = JSON.stringify(await buildBackup());
    await closeDB();
    indexedDB.deleteDatabase("new-life");
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const pre = await previewBackup(parsed.backup, "merge");
    expect(pre.totals.added).toBeGreaterThan(10);
    await applyBackup(parsed.backup, "merge");
    expect((await get<WorkoutTemplate>(COL.templates, t.id))!.title).toBe("My edited day");
  });
  it("merge never overwrites what you already have", async () => {
    await runMigration(ls);
    const t = (await list<WorkoutTemplate>(COL.templates))[0]!;
    const backup = await buildBackup();
    await put(COL.templates, t.id, { ...t, title: "Changed after backup" });
    const pre = await previewBackup(backup, "merge");
    expect(pre.totals.conflicting).toBe(1);
    await applyBackup(backup, "merge");
    expect((await get<WorkoutTemplate>(COL.templates, t.id))!.title).toBe("Changed after backup");
    await applyBackup(backup, "replace");
    expect((await get<WorkoutTemplate>(COL.templates, t.id))!.title).toBe(t.title);
  });
  it("rejects foreign, malformed and newer-schema files", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other" })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "new-life", schema: 99, collections: {} })).ok).toBe(
      false,
    );
    expect(
      parseBackup(JSON.stringify({ app: "new-life", schema: 1, collections: { x: [{ nope: 1 }] } }))
        .ok,
    ).toBe(false);
  });
});
