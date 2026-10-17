import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeed } from "@/data/legacy";
import { readFileSync } from "node:fs";
import type { CatalogueSnapshot } from "@/domain/catalogue";
import { LEGACY_TO_CATALOGUE_NAME } from "./legacy-catalogue";
import { DAY_PLANS, WEEKLY_SPLIT, workouts } from "./sunrise-data";

const catalogue = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;

describe("curated seed content and media", () => {
  it("keeps every original workout, prescription and media reference intact", () => {
    expect(workouts.map((workout) => workout.letter)).toEqual(["A", "B", "C", "D"]);
    expect(WEEKLY_SPLIT.map(({ day, letter }) => [day, letter])).toEqual([
      ["Mon", "A"],
      ["Tue", "B"],
      ["Wed", null],
      ["Thu", "C"],
      ["Fri", null],
      ["Sat", "D"],
      ["Sun", null],
    ]);

    const sourceExercises = workouts.flatMap((workout) => workout.exercises);
    expect(sourceExercises).toHaveLength(22);
    expect(new Set(sourceExercises.map((exercise) => exercise.id)).size).toBe(22);

    const templates = buildSeed().templates;
    expect(templates).toHaveLength(4);
    expect(templates.flatMap((template) => template.exercises)).toHaveLength(22);
    for (const workout of workouts) {
      const template = templates.find((item) => item.legacyId === workout.id);
      expect(template, workout.id).toBeDefined();

      for (const exercise of workout.exercises) {
        const seeded = template?.exercises.find((item) => item.legacyId === exercise.id);
        expect(seeded, exercise.id).toMatchObject({
          name: exercise.name,
          schemeText: exercise.scheme,
          alternative: exercise.alt,
          startWeightKg: exercise.startWeight,
        });
        // no unsourced photo is kept: every original exercise resolves to a catalogue exercise (licensed media, or the authored fallback)
        const hit = catalogue.find(
          (entry) => entry.name === (LEGACY_TO_CATALOGUE_NAME[exercise.name] ?? exercise.name),
        );
        expect(hit, exercise.name).toBeDefined();
      }
    }

    const missing = DAY_PLANS.flatMap((day) => day.meals)
      .map((meal) => meal.image)
      .filter((image) => !existsSync(resolve(process.cwd(), "public", image.replace(/^\//, ""))));

    expect(missing).toEqual([]);

    for (const day of DAY_PLANS) {
      expect(
        day.meals.reduce(
          (totals, meal) => ({
            kcal: totals.kcal + meal.kcal,
            carbs: totals.carbs + meal.carbs,
            fat: totals.fat + meal.fat,
            protein: totals.protein + meal.protein,
          }),
          { kcal: 0, carbs: 0, fat: 0, protein: 0 },
        ),
        day.label,
      ).toEqual(day.totals);
    }
  });
});
