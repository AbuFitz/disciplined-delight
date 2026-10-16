import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { CatalogueSnapshot, EquipmentId } from "@/domain/catalogue";
import { generatePlan, type PlanInput } from "@/domain/planner";
import { acceptPlan, NeedsChoice, restoreTemplate } from "./plan-actions";
import { applyBatch, closeDB, get, list, outboxAll, put } from "./db";
import { scopeGeneration } from "./scope";
import { COL, type PlanRecord, type WorkoutTemplate } from "./types";

const cat = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;
const byId = new Map(cat.map((e) => [e.id, e]));
const input: PlanInput = {
  goal: "general_fitness",
  experience: "new",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: ["dumbbell", "bench"] as EquipmentId[],
  adult: true,
  seed: "s",
};
const mk = (i: Partial<PlanInput> = {}) => {
  const r = generatePlan({ ...input, ...i }, cat);
  if (!r.ok) throw new Error(r.message);
  return r.plan;
};
const tpl = (
  id: string,
  weekday: number | null,
  extra: Partial<WorkoutTemplate> = {},
): WorkoutTemplate => ({
  id,
  letter: "A",
  title: `Mine ${id}`,
  focus: "",
  weekday,
  exercises: [],
  order: 0,
  ...extra,
});

beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});

describe("acceptPlan", () => {
  it("writes templates, the plan record and their sync mutations together", async () => {
    const out = await acceptPlan({ plan: mk(), byId, equipment: ["dumbbell", "bench"] });
    const templates = await list<WorkoutTemplate>(COL.templates);
    expect(templates).toHaveLength(3);
    expect(templates.every((t) => out.templateIds.includes(t.id))).toBe(true);
    const rec = await get<PlanRecord>(COL.plans, out.planId);
    expect(rec?.status).toBe("active");
    expect(rec?.snapshot).toHaveLength(3);
    const ob = await outboxAll();
    expect(ob.map((m) => m.collection).sort()).toEqual(
      [COL.equipmentProfile, COL.plans, COL.templates, COL.templates, COL.templates].sort(),
    );
  });

  it("requires an explicit choice when workouts already exist, and writes nothing until then", async () => {
    await put(COL.templates, "old", tpl("old", 0));
    const before = (await outboxAll()).length;
    await expect(acceptPlan({ plan: mk(), byId })).rejects.toBeInstanceOf(NeedsChoice);
    expect(await list(COL.templates)).toHaveLength(1);
    expect((await outboxAll()).length).toBe(before);
  });

  it("add keeps the current schedule and adds the new workouts unscheduled", async () => {
    await put(COL.templates, "old", tpl("old", 0));
    await acceptPlan({ plan: mk(), byId, handle: "add" });
    const all = await list<WorkoutTemplate>(COL.templates);
    expect(all).toHaveLength(4);
    expect(all.find((t) => t.id === "old")!.archivedAt).toBeUndefined();
    expect(all.filter((t) => t.id !== "old").every((t) => t.weekday === null)).toBe(true);
  });

  it("replace archives (never deletes) the current workouts and schedules the new ones", async () => {
    await put(COL.templates, "old", tpl("old", 0));
    await acceptPlan({ plan: mk(), byId, handle: "replace" });
    const all = await list<WorkoutTemplate>(COL.templates);
    expect(all.find((t) => t.id === "old")!.archivedAt).toBeTruthy();
    expect(all.filter((t) => !t.archivedAt && t.weekday != null)).toHaveLength(3);
  });

  it("a failed save changes nothing: previous schedule, plans and outbox are intact", async () => {
    await put(COL.templates, "old", tpl("old", 0));
    const before = JSON.stringify(await list(COL.templates));
    const ob = (await outboxAll()).length;
    const bad = mk();
    (bad.input as unknown as { seed: unknown }).seed = () => 1; // cannot be stored: aborts the transaction
    await expect(acceptPlan({ plan: bad, byId, handle: "replace" })).rejects.toBeTruthy();
    expect(JSON.stringify(await list(COL.templates))).toBe(before);
    expect(await list(COL.plans)).toHaveLength(0);
    expect((await outboxAll()).length).toBe(ob);
    // and the very same call succeeds once the problem is fixed (retry)
    await acceptPlan({ plan: mk(), byId, handle: "replace" });
    expect((await list(COL.plans)).length).toBe(1);
  });

  it("drops a write whose account scope has since changed", async () => {
    const stale = scopeGeneration() - 1;
    await expect(
      applyBatch([{ collection: COL.plans, id: "x", op: "put", data: {} }], { generation: stale }),
    ).rejects.toBeTruthy();
    expect(await list(COL.plans)).toHaveLength(0);
  });

  it("regeneration archives only that plan's workouts, marks it replaced and links the lineage", async () => {
    await put(COL.templates, "mine", tpl("mine", 6));
    const first = await acceptPlan({ plan: mk(), byId, handle: "add" });
    const from = (await get<PlanRecord>(COL.plans, first.planId))!;
    const next = await acceptPlan({ plan: mk({ seed: "s2" }), byId, from, handle: "replace" });
    const all = await list<WorkoutTemplate>(COL.templates);
    expect(all.find((t) => t.id === "mine")!.archivedAt).toBeUndefined();
    for (const id of first.templateIds)
      expect(all.find((t) => t.id === id)!.archivedAt).toBeTruthy();
    expect((await get<PlanRecord>(COL.plans, first.planId))!.status).toBe("replaced");
    const rec = (await get<PlanRecord>(COL.plans, next.planId))!;
    expect(rec.regeneratedFrom).toBe(first.planId);
    expect(rec.generation).toBe(1);
  });
});

describe("restoreTemplate", () => {
  it("restores on its day when free, unscheduled when the day is taken", async () => {
    await put(COL.templates, "a", tpl("a", 2, { archivedAt: "2026-01-01" }));
    expect(await restoreTemplate("a")).toEqual({ scheduled: true });
    expect((await get<WorkoutTemplate>(COL.templates, "a"))!.archivedAt).toBeNull();
    await put(COL.templates, "b", tpl("b", 2, { archivedAt: "2026-01-01" }));
    expect(await restoreTemplate("b")).toEqual({ scheduled: false });
    expect((await get<WorkoutTemplate>(COL.templates, "b"))!.weekday).toBeNull();
  });
});
