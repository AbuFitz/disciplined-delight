import { useMemo } from "react";
import { useCollection } from "./hooks";
import { COL, type MealPlanEntry } from "./types";
import { bySlot } from "./selectors";
import type { ISODate } from "@/domain/dates";
import type { Ingredient, MealLog, Recipe } from "@/domain/nutrition";

export function useFoodData(date: ISODate) {
  const recipes = useCollection<Recipe>(COL.recipes);
  const ings = useCollection<Ingredient>(COL.ingredients);
  const plan = useCollection<MealPlanEntry>(COL.mealPlan);
  const logs = useCollection<MealLog>(COL.mealLogs);
  const recipeMap = useMemo(() => new Map(recipes.items.map((r) => [r.id, r])), [recipes.items]);
  const ingMap = useMemo(() => new Map(ings.items.map((i) => [i.id, i])), [ings.items]);
  return {
    ready: recipes.ready && ings.ready && plan.ready && logs.ready,
    recipes: recipes.items.filter((r) => !r.archivedAt),
    recipeMap,
    ingMap,
    ingredients: ings.items,
    allRecipes: recipes.items,
    plan: plan.items.filter((p) => p.date === date).sort(bySlot),
    allPlan: plan.items,
    logs: logs.items.filter((l) => l.date === date).sort((a, b) => a.loggedAt - b.loggedAt),
    allLogs: logs.items,
  };
}
