import { toBase, type Unit } from "./units";

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat,
});
export const scaleMacros = (m: Macros, k: number): Macros => ({
  kcal: m.kcal * k, protein: m.protein * k, carbs: m.carbs * k, fat: m.fat * k,
});
export const roundMacros = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat),
});

export type Provenance = "label" | "user-estimate" | "legacy-estimate";

/** Nutrition declared per `perAmount` of `perUnit`, for a stated food state. */
export type Ingredient = {
  id: string;
  name: string;
  state?: "raw" | "dry" | "cooked" | "prepared";
  perAmount: number;
  perUnit: Unit;
  /** Absent until the user enters label/estimate data — never guessed. */
  macros?: Macros;
  provenance?: Provenance;
  halalNote?: string;
  /** Costed packs: pack size in perUnit family. */
  pack?: { amount: number; unit: Unit; pricePence: number; shop?: string; source?: string; recordedOn: string };
  archivedAt?: string | null;
};

export type RecipeLine = { ingredientId: string; amount: number; unit: Unit };

export type Recipe = {
  id: string;
  name: string;
  slot?: "breakfast" | "lunch" | "dinner" | "evening" | "snack";
  yield: number; // servings produced
  prepMinutes?: number;
  notes?: string;
  image?: string;
  lines: RecipeLine[];
  /** Legacy hand-entered estimate for the whole recipe (per serving) kept until structured data replaces it. */
  legacyEstimate?: Macros;
  items?: string[];
  archivedAt?: string | null;
};

/** Macros for a recipe line, or null if units are not comparable. */
export function lineMacros(line: RecipeLine, ing: Ingredient): Macros | null {
  const perBase = toBase({ amount: ing.perAmount, unit: ing.perUnit });
  const useBase = toBase({ amount: line.amount, unit: line.unit });
  const fam = (u: Unit) => (u === "g" || u === "kg" ? "g" : u === "ml" || u === "l" ? "ml" : "count");
  if (!ing.macros || fam(line.unit) !== fam(ing.perUnit) || perBase <= 0) return null;
  return scaleMacros(ing.macros, useBase / perBase);
}

export type RecipeNutrition = {
  perServing: Macros;
  source: "structured" | "legacy-estimate" | "partial";
  missingIngredients: string[];
};

export function recipeNutrition(r: Recipe, ings: Map<string, Ingredient>): RecipeNutrition {
  const missing: string[] = [];
  let total = ZERO_MACROS;
  for (const l of r.lines) {
    const ing = ings.get(l.ingredientId);
    const m = ing ? lineMacros(l, ing) : null;
    if (!m) { missing.push(ing?.name ?? l.ingredientId); continue; }
    total = addMacros(total, m);
  }
  if (r.lines.length === 0 && r.legacyEstimate) {
    return { perServing: r.legacyEstimate, source: "legacy-estimate", missingIngredients: [] };
  }
  const y = r.yield > 0 ? r.yield : 1;
  return {
    perServing: scaleMacros(total, 1 / y),
    source: missing.length ? "partial" : "structured",
    missingIngredients: missing,
  };
}

/** Cost per serving with explicit coverage (share of lines that could be priced). */
export function recipeCost(r: Recipe, ings: Map<string, Ingredient>) {
  let pence = 0, priced = 0;
  for (const l of r.lines) {
    const ing = ings.get(l.ingredientId);
    if (!ing?.pack) continue;
    const packBase = toBase({ amount: ing.pack.amount, unit: ing.pack.unit });
    const useBase = toBase({ amount: l.amount, unit: l.unit });
    const fam = (u: Unit) => (u === "g" || u === "kg" ? "g" : u === "ml" || u === "l" ? "ml" : "count");
    if (fam(l.unit) !== fam(ing.pack.unit) || packBase <= 0) continue;
    pence += (useBase / packBase) * ing.pack.pricePence;
    priced++;
  }
  const y = r.yield > 0 ? r.yield : 1;
  return {
    perServingPence: Math.round(pence / y),
    coverage: r.lines.length === 0 ? 0 : priced / r.lines.length,
    pricedLines: priced,
    totalLines: r.lines.length,
  };
}

/** A consumed-meal log keeps its own snapshot so later edits never rewrite history. */
export type MealLog = {
  id: string;
  date: string;
  loggedAt: number;
  name: string;
  recipeId?: string;
  planEntryId?: string;
  portion: number;
  macros: Macros; // snapshot, already scaled by portion
  macrosSource: RecipeNutrition["source"] | "manual";
  costPence?: number;
  note?: string;
};

/** Intake summary with explicit coverage: no logs = unknown, not zero. */
export function intakeSummary(logs: MealLog[], dayMarkedComplete: boolean) {
  if (logs.length === 0) return { status: "unknown" as const, macros: null, complete: false };
  const macros = logs.reduce((s, l) => addMacros(s, l.macros), ZERO_MACROS);
  return { status: "logged" as const, macros: roundMacros(macros), complete: dayMarkedComplete };
}
