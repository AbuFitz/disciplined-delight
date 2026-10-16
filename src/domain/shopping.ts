import { compatible, toBase, type Quantity, type Unit, familyOf } from "./units";
import type { Ingredient, Recipe } from "./nutrition";

export type Requirement = {
  ingredientId: string;
  baseAmount: number;
  family: ReturnType<typeof familyOf>;
};

export type PlannedUse = {
  recipe: Recipe;
  /** Servings eaten from this recipe in the period. */
  servings: number;
  /** If set, servings come out of this batch; ingredients are counted once per batch. */
  batchId?: string;
};

/**
 * Requirements for a set of planned uses. Cooked-batch servings are counted
 * once for the whole batch (yield servings), never per leftover serving.
 */
export function requirements(
  uses: PlannedUse[],
  batches: { id: string; recipeId: string }[] = [],
): Requirement[] {
  const totals = new Map<string, Requirement>();
  const add = (ingredientId: string, q: Quantity) => {
    const key = `${ingredientId}:${familyOf(q.unit)}`;
    const cur = totals.get(key) ?? { ingredientId, baseAmount: 0, family: familyOf(q.unit) };
    cur.baseAmount += toBase(q);
    totals.set(key, cur);
  };
  const countedBatches = new Set<string>();
  for (const u of uses) {
    if (u.batchId) {
      if (countedBatches.has(u.batchId)) continue;
      countedBatches.add(u.batchId);
      // Whole batch: full recipe lines once.
      for (const l of u.recipe.lines) add(l.ingredientId, { amount: l.amount, unit: l.unit });
      continue;
    }
    const k = u.recipe.yield > 0 ? u.servings / u.recipe.yield : u.servings;
    for (const l of u.recipe.lines) add(l.ingredientId, { amount: l.amount * k, unit: l.unit });
  }
  void batches;
  return [...totals.values()];
}

export type ShoppingRow = {
  ingredientId: string;
  needBase: number;
  pantryBase: number;
  toBuyBase: number;
  packs: number | null; // whole packs; null if no compatible pack data
  packCostPence: number | null;
  family: Requirement["family"];
};

export function buildShoppingList(
  reqs: Requirement[],
  ings: Map<string, Ingredient>,
  pantry: Record<string, Quantity | undefined>,
): ShoppingRow[] {
  return reqs.map((r) => {
    const ing = ings.get(r.ingredientId);
    const stock = pantry[r.ingredientId];
    const pantryBase =
      stock &&
      compatible(stock.unit, (r.family === "g" ? "g" : r.family === "ml" ? "ml" : "count") as Unit)
        ? toBase(stock)
        : 0;
    const toBuy = Math.max(0, r.baseAmount - pantryBase);
    let packs: number | null = null,
      cost: number | null = null;
    if (ing?.pack && familyOf(ing.pack.unit) === r.family) {
      const size = toBase({ amount: ing.pack.amount, unit: ing.pack.unit });
      packs = size > 0 ? Math.ceil(toBuy / size - 1e-9) : null;
      cost = packs == null ? null : packs * ing.pack.pricePence;
    }
    return {
      ingredientId: r.ingredientId,
      needBase: r.baseAmount,
      pantryBase,
      toBuyBase: toBuy,
      packs,
      packCostPence: cost,
      family: r.family,
    };
  });
}

/** Three distinct numbers: never conflated. `coverage` shows how much is priced. */
export function budgetSummary(rows: ShoppingRow[], actualSpendPence: number, budgetPence?: number) {
  const priced = rows.filter((r) => r.packCostPence != null);
  const checkout = priced.reduce((s, r) => s + (r.packCostPence ?? 0), 0);
  return {
    estimatedCheckoutPence: checkout,
    coverage: rows.length === 0 ? 1 : priced.length / rows.length,
    unpricedCount: rows.length - priced.length,
    actualSpendPence,
    budgetPence,
    remainingPence: budgetPence == null ? undefined : budgetPence - actualSpendPence,
  };
}
