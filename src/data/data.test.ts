import { beforeEach, describe, expect, it } from "vitest";
import { closeDB, get, getDB, list, listRecords, outboxCount, put, remove } from "./db";
import { runMigration, LEGACY_KEYS } from "./legacy";
import { COL, type LegacyDayLog, type RoutineBlock, type WorkoutTemplate } from "./types";

beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});

const store = (o: Record<string, string>) => ({ getItem: (k: string) => o[k] ?? null });

describe("store", () => {
  it("writes the record and its outbox entry together", async () => {
    await put("x", "1", { a: 1 });
    expect(await get("x", "1")).toEqual({ a: 1 });
    expect(await outboxCount()).toBe(1);
  });
  it("tombstones deletes and can list them", async () => {
    await put("x", "1", { a: 1 });
    await remove("x", "1");
    expect(await get("x", "1")).toBeUndefined();
    expect((await listRecords("x"))[0]?.deletedAt).toBeTruthy();
    expect(await outboxCount()).toBe(2);
  });
  it("increments revisions and gives each mutation a unique idempotency key", async () => {
    await put("x", "1", { a: 1 });
    const r = await put("x", "1", { a: 2 });
    expect(r.rev).toBe(2);
    const mids = (await (await getDB()).getAll("outbox")).map((m) => m.mid);
    expect(new Set(mids).size).toBe(2);
  });
});

describe("legacy migration", () => {
  const tracker = {
    activeTab: "a",
    logs: {
      "2026-10-12": { exercises: { a1: { done: true, weight: "30" }, a2: { done: false } }, cardioDone: true, supplements: { vitd: true }, bodyWeightKg: 64.2 },
      "2026-10-13": { exercises: {}, cardioDone: false, supplements: {} }, // empty placeholder
    },
  };
  const schedule = [
    { id: "step-2", key: "fajr", startTime: "03:14", label: "Fajr" },
    { id: "step-5", key: "gym", startTime: "06:00", endTime: "07:00", label: "Gym session" },
  ];
  const ls = store({ [LEGACY_KEYS.tracker]: JSON.stringify(tracker), [LEGACY_KEYS.schedule]: JSON.stringify(schedule) });

  it("preserves single-weight entries as legacy without inventing sets", async () => {
    const rep = await runMigration(ls);
    expect(rep.legacyDays).toBe(1);
    const days = await list<LegacyDayLog>(COL.legacyDays);
    expect(days[0]!.exercises.a1).toEqual({ done: true, weight: "30" });
    expect(await list(COL.sessions)).toHaveLength(0);
    expect(days[0]!.dateBasis).toBe("utc-slice");
  });
  it("keeps raw blobs for recovery", async () => {
    await runMigration(ls);
    expect(await list(COL.legacyRaw)).toHaveLength(2);
  });
  it("is idempotent and never overwrites user edits", async () => {
    await runMigration(ls);
    const tpls = await list<WorkoutTemplate>(COL.templates);
    expect(tpls).toHaveLength(4);
    const a = tpls.find((t) => t.letter === "A")!;
    await put(COL.templates, a.id, { ...a, title: "My push day", weekday: 2 });
    const again = await runMigration(ls);
    expect(again.ran).toBe(false);
    expect((await get<WorkoutTemplate>(COL.templates, a.id))!.title).toBe("My push day");
    expect(await list(COL.legacyDays)).toHaveLength(1);
  });
  it("keeps A/B/C/D on Mon/Tue/Thu/Sat with the original exercises", async () => {
    await runMigration(ls);
    const t = await list<WorkoutTemplate>(COL.templates);
    expect(t.sort((a, b) => a.order - b.order).map((x) => [x.letter, x.weekday])).toEqual([["A", 0], ["B", 1], ["C", 3], ["D", 5]]);
    expect(t.find((x) => x.letter === "A")!.exercises.map((e) => e.name)[0]).toBe("Flat Chest Press Machine");
    expect(t.find((x) => x.letter === "C")!.exercises.find((e) => e.legacyId === "c3")!.alternative).toBe("Cable Face Pull");
  });
  it("archives the old fixed Fajr time instead of treating it as a prayer time", async () => {
    await runMigration(ls);
    const blocks = await list<RoutineBlock>(COL.routine);
    expect(blocks.find((b) => b.legacyKey === "fajr")!.archivedAt).toBeTruthy();
    expect(blocks.find((b) => b.legacyKey === "gym")!.archivedAt).toBeNull();
  });
  it("creates no routine or logs for a fresh browser", async () => {
    const rep = await runMigration(store({}));
    expect(rep.legacyDays).toBe(0);
    expect(rep.routineBlocks).toBe(0);
    expect(await list(COL.weighIns)).toHaveLength(0);
  });
});
