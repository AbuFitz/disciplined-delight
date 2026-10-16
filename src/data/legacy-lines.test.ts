import { describe, expect, it } from "vitest";
import { buildSeed } from "./legacy";
import { parseLegacyItem } from "./legacy-lines";
import { recipeNutrition } from "@/domain/nutrition";
import { buildShoppingList, requirements } from "@/domain/shopping";

describe("legacy item parsing", () => {
  it("parses clear quantities and ignores vague lines", () => {
    expect(parseLegacyItem("300ml whole milk")).toEqual({
      ingredientId: "legacy-ing-milk",
      amount: 300,
      unit: "ml",
    });
    expect(parseLegacyItem("2 boiled eggs")).toEqual({
      ingredientId: "legacy-ing-eggs",
      amount: 2,
      unit: "count",
    });
    expect(parseLegacyItem("90g cooked halal chicken breast")?.ingredientId).toBe(
      "legacy-ing-chicken",
    );
    expect(parseLegacyItem("Water or ice to thin it out")).toBeNull();
    expect(parseLegacyItem("Seasoning or sauce")).toBeNull();
    expect(parseLegacyItem("250ml orange juice")?.unit).toBe("ml");
    expect(parseLegacyItem("1 Arla Protein Chocolate 482ml (225 kcal)")?.ingredientId).toBe(
      "legacy-ing-arla",
    );
  });
  it("never converts between unit families", () => {
    expect(parseLegacyItem("2 oats")).toBeNull(); // count of a gram ingredient
    expect(parseLegacyItem("100ml bagel")).toBeNull();
  });
});

describe("seed recipes", () => {
  const seed = buildSeed();
  const ings = new Map(seed.ingredients.map((i) => [i.id, i]));
  const recipes = new Map(seed.recipes.map((r) => [r.id, r]));
  it("keeps the original estimate (labelled) because ingredients have no nutrition data", () => {
    const n = recipeNutrition(recipes.get("legacy-meal-a-breakfast")!, ings);
    expect(n.source).toBe("legacy-estimate");
    expect(n.perServing.kcal).toBe(768);
  });
  it("gives Day A and Day B real ingredient requirements", () => {
    const a = seed.dayTemplates.find((d) => d.legacyId === "a")!;
    const uses = a.meals.map((m) => ({ recipe: recipes.get(m.recipeId)!, servings: 1 }));
    const rows = buildShoppingList(requirements(uses), ings, {});
    const milk = rows.find((r) => r.ingredientId === "legacy-ing-milk")!;
    expect(milk.needBase).toBe(300);
    expect(rows.find((r) => r.ingredientId === "legacy-ing-chicken")!.needBase).toBe(90);
    expect(rows.find((r) => r.ingredientId === "legacy-ing-eggs")!.needBase).toBe(2);
  });
});
