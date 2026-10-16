import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatalogueSnapshot } from "./catalogue";
import { generatePlan } from "./planner";
import { planToTemplates } from "./plan-templates";
import { searchCatalogue } from "./catalogue-search";

const cat = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;

describe("planToTemplates", () => {
  it("writes editable templates without any starting loads", () => {
    const r = generatePlan(
      {
        goal: "general_fitness",
        experience: "new",
        daysPerWeek: 3,
        sessionMinutes: 60,
        equipment: ["dumbbell", "bench", "cable", "machine", "pullup_bar", "barbell"],
        adult: true,
        seed: "x",
      },
      cat,
    );
    if (!r.ok) throw new Error(r.message);
    let n = 0;
    const tpls = planToTemplates(r.plan, new Map(cat.map((e) => [e.id, e])), () => `id${n++}`);
    expect(tpls.map((t) => t.letter)).toEqual(["A", "B", "C"]);
    expect(tpls.map((t) => t.weekday)).toEqual([0, 2, 4]);
    for (const t of tpls)
      for (const e of t.exercises) {
        expect(e.catalogueId).toMatch(/^wger:/);
        expect(e.startWeightKg).toBeUndefined();
        expect(e.schemeText).toMatch(/^\d+ × /);
      }
  });
});

describe("searchCatalogue", () => {
  it("ranks name matches first and is stable", () => {
    const a = searchCatalogue(cat, { q: "squat" });
    expect(a[0]!.name.toLowerCase()).toContain("squat");
    expect(searchCatalogue(cat, { q: "squat" }).map((e) => e.id)).toEqual(a.map((e) => e.id));
  });
  it("filters by muscle, equipment, owned kit, images", () => {
    expect(
      searchCatalogue(cat, { muscle: "biceps" }).every((e) =>
        [...e.primaryMuscles, ...e.secondaryMuscles].includes("biceps"),
      ),
    ).toBe(true);
    expect(
      searchCatalogue(cat, { haveEquipment: [] }).every((e) =>
        e.equipment.every((q) => q === "bodyweight" || q === "mat"),
      ),
    ).toBe(true);
    expect(searchCatalogue(cat, { withImages: true }).every((e) => e.media.length > 0)).toBe(true);
    expect(searchCatalogue(cat, { q: "zzzzqqq" })).toEqual([]);
  });
});
