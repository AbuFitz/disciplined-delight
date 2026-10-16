import { describe, expect, it } from "vitest";
import {
  intakeSummary,
  recipeCost,
  recipeNutrition,
  type Ingredient,
  type Recipe,
} from "./nutrition";
import { budgetSummary, buildShoppingList, requirements } from "./shopping";

const rice: Ingredient = {
  id: "rice",
  name: "Rice",
  state: "dry",
  perAmount: 100,
  perUnit: "g",
  macros: { kcal: 350, protein: 7, carbs: 78, fat: 1 },
  provenance: "label",
  pack: { amount: 2, unit: "kg", pricePence: 300, recordedOn: "2026-10-16" },
};
const chicken: Ingredient = {
  id: "chicken",
  name: "Chicken",
  state: "raw",
  perAmount: 100,
  perUnit: "g",
  macros: { kcal: 110, protein: 23, carbs: 0, fat: 2 },
  provenance: "label",
}; // no price
const bowl: Recipe = {
  id: "r",
  name: "Bowl",
  yield: 2,
  lines: [
    { ingredientId: "rice", amount: 200, unit: "g" },
    { ingredientId: "chicken", amount: 300, unit: "g" },
  ],
};
const map = new Map([rice, chicken].map((i) => [i.id, i]));

describe("recipes", () => {
  it("computes per-serving macros from structured ingredients", () => {
    const n = recipeNutrition(bowl, map);
    expect(n.source).toBe("structured");
    expect(n.perServing.kcal).toBe((700 + 330) / 2);
  });
  it("flags partial data instead of inventing it", () => {
    const n = recipeNutrition(
      { ...bowl, lines: [...bowl.lines, { ingredientId: "mystery", amount: 1, unit: "count" }] },
      map,
    );
    expect(n.source).toBe("partial");
    expect(n.missingIngredients.length).toBe(1);
  });
  it("keeps legacy estimates labelled", () => {
    const n = recipeNutrition(
      {
        id: "x",
        name: "x",
        yield: 1,
        lines: [],
        legacyEstimate: { kcal: 700, protein: 30, carbs: 80, fat: 20 },
      },
      map,
    );
    expect(n.source).toBe("legacy-estimate");
  });
  it("reports cost coverage when some ingredients have no price", () => {
    const c = recipeCost(bowl, map);
    expect(c.coverage).toBe(0.5);
    expect(c.perServingPence).toBe(Math.round(((200 / 2000) * 300) / 2));
  });
});

describe("shopping", () => {
  it("rounds to whole packs after pantry deductions", () => {
    const reqs = requirements([
      { recipe: bowl, servings: 2 },
      { recipe: bowl, servings: 2 },
    ]);
    const rows = buildShoppingList(reqs, map, { rice: { amount: 100, unit: "g" } });
    const r = rows.find((x) => x.ingredientId === "rice")!;
    expect(r.needBase).toBe(400);
    expect(r.toBuyBase).toBe(300);
    expect(r.packs).toBe(1);
    expect(r.packCostPence).toBe(300);
    const c = rows.find((x) => x.ingredientId === "chicken")!;
    expect(c.packs).toBeNull();
  });
  it("counts a batch's ingredients once however many leftovers", () => {
    const uses = [1, 2, 3, 4].map(() => ({ recipe: bowl, servings: 1, batchId: "b1" }));
    const reqs = requirements(uses);
    expect(reqs.find((r) => r.ingredientId === "rice")!.baseAmount).toBe(200);
  });
  it("keeps estimated checkout, coverage and actual spend separate", () => {
    const rows = buildShoppingList(requirements([{ recipe: bowl, servings: 2 }]), map, {});
    const s = budgetSummary(rows, 450, 3000);
    expect(s.estimatedCheckoutPence).toBe(300);
    expect(s.coverage).toBe(0.5);
    expect(s.unpricedCount).toBe(1);
    expect(s.actualSpendPence).toBe(450);
    expect(s.remainingPence).toBe(2550);
  });
});

describe("intake", () => {
  it("no logs means unknown, not zero", () => {
    expect(intakeSummary([], false)).toEqual({ status: "unknown", macros: null, complete: false });
  });
});
