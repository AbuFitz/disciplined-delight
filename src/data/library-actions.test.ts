import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { CatalogueSnapshot } from "@/domain/catalogue";
import { closeDB, get, list, outboxAll, put } from "./db";
import { addExerciseToWorkout, templateExerciseFrom } from "./library-actions";
import { COL, type WorkoutTemplate } from "./types";

const all = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;
const squat = all.find((e) => e.name === "Goblet Squat" || e.tracking === "weight_reps")!;
const plank = all.find((e) => e.tracking === "time")!;
beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});
const tpl = (id: string): WorkoutTemplate => ({
  id,
  letter: "A",
  title: "Mine",
  focus: "",
  weekday: 1,
  exercises: [],
  order: 0,
});

describe("add to workout", () => {
  it("builds an editable prescription with no load", () => {
    const x = templateExerciseFrom(squat);
    expect(x.catalogueId).toBe(squat.id);
    expect(x.startWeightKg).toBeUndefined();
    expect(x.schemeText).toMatch(/^3 × /);
    expect(templateExerciseFrom(plank).schemeText).toMatch(/hold/);
  });
  it("appends once, never duplicates, and queues the sync write", async () => {
    await put(COL.templates, "t1", tpl("t1"));
    const before = (await outboxAll()).length;
    expect((await addExerciseToWorkout(squat, { templateId: "t1" })).added).toBe(true);
    expect((await addExerciseToWorkout(squat, { templateId: "t1" })).added).toBe(false);
    expect((await get<WorkoutTemplate>(COL.templates, "t1"))!.exercises).toHaveLength(1);
    expect((await outboxAll()).length).toBe(before + 1);
  });
  it("can start a new unscheduled workout", async () => {
    const r = await addExerciseToWorkout(squat, { newTitle: "Leg day" });
    const t = (await list<WorkoutTemplate>(COL.templates)).find((x) => x.id === r.templateId)!;
    expect(t.title).toBe("Leg day");
    expect(t.weekday).toBeNull();
  });
  it("refuses an archived or missing workout", async () => {
    await put(COL.templates, "t2", { ...tpl("t2"), archivedAt: "2026-01-01" });
    await expect(addExerciseToWorkout(squat, { templateId: "t2" })).rejects.toBeTruthy();
  });
});
