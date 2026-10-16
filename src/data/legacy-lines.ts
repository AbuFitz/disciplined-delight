import type { RecipeLine } from "@/domain/nutrition";
import type { Unit } from "@/domain/units";

/** Keyword → legacy ingredient id (order matters: more specific first). */
const KEYWORDS: [RegExp, string][] = [
  [/tuna/i, "tuna-sandwich"],
  [/arla/i, "arla"],
  [/egg/i, "eggs"],
  [/bagel/i, "bagels"],
  [/banana/i, "bananas"],
  [/peanut butter/i, "peanut-butter"],
  [/honey/i, "honey"],
  [/oats/i, "oats"],
  [/milk/i, "milk"],
  [/olive oil/i, "oil"],
  [/chicken/i, "chicken"],
  [/rice/i, "rice"],
  [/vegetable|sweetcorn/i, "veg"],
  [/orange juice/i, "oj"],
  [/nut/i, "nuts"],
];

/** The unit each legacy ingredient is counted in (chicken and rice are COOKED weights, as the original app weighed them). */
export const LEGACY_UNITS: Record<
  string,
  { unit: Unit; name?: string; state?: "cooked" | "dry" | "raw" }
> = {
  chicken: { unit: "g", name: "Halal chicken breast (cooked weight)", state: "cooked" },
  rice: { unit: "g", name: "White basmati rice (cooked weight)", state: "cooked" },
  eggs: { unit: "count" },
  milk: { unit: "ml" },
  bagels: { unit: "count" },
  oats: { unit: "g" },
  "peanut-butter": { unit: "g" },
  honey: { unit: "g" },
  bananas: { unit: "count" },
  nuts: { unit: "g" },
  oil: { unit: "g" },
  oj: { unit: "ml" },
  veg: { unit: "g" },
  "tuna-sandwich": { unit: "count" },
  arla: { unit: "count" },
  skyr: { unit: "count" },
};

/**
 * Turns the original author's item text ("300ml whole milk", "2 boiled eggs")
 * into quantity lines. Anything without a clear quantity or a known ingredient
 * ("Water or ice", "Seasoning") is left as plain text, never guessed.
 */
export function parseLegacyItem(text: string): RecipeLine | null {
  const t = text.trim();
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b\s*(.+)$/i);
  const c = !m ? t.match(/^(\d+)\s+(.+)$/) : null;
  const rest = m ? m[3]! : c ? c[2]! : null;
  if (!rest) return null;
  const hit = KEYWORDS.find(([re]) => re.test(rest));
  if (!hit) return null;
  const id = hit[1];
  const want = LEGACY_UNITS[id]!.unit;
  if (m) {
    const amount = Number(m[1]);
    const u = m[2]!.toLowerCase() as Unit;
    // Only accept lines already in the ingredient's own unit family; no conversions between g/ml/count.
    if ((u === "g" || u === "kg") && want === "g")
      return { ingredientId: `legacy-ing-${id}`, amount, unit: u };
    if ((u === "ml" || u === "l") && want === "ml")
      return { ingredientId: `legacy-ing-${id}`, amount, unit: u };
    return null;
  }
  if (want !== "count") return null;
  return { ingredientId: `legacy-ing-${id}`, amount: Number(c![1]), unit: "count" };
}

export function parseLegacyItems(items: string[]): RecipeLine[] {
  return items.map(parseLegacyItem).filter((x): x is RecipeLine => !!x);
}
