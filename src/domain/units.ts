/** Quantities carry a base unit family so only compatible amounts combine. */
export type UnitFamily = "g" | "ml" | "count";
export type Unit = "g" | "kg" | "ml" | "l" | "count";

const TO_BASE: Record<Unit, { family: UnitFamily; factor: number }> = {
  g: { family: "g", factor: 1 },
  kg: { family: "g", factor: 1000 },
  ml: { family: "ml", factor: 1 },
  l: { family: "ml", factor: 1000 },
  count: { family: "count", factor: 1 },
};

export type Quantity = { amount: number; unit: Unit };

export const familyOf = (u: Unit): UnitFamily => TO_BASE[u].family;

/** Convert to base unit amount (g / ml / count). */
export const toBase = (q: Quantity): number => q.amount * TO_BASE[q.unit].factor;

export const compatible = (a: Unit, b: Unit) => familyOf(a) === familyOf(b);
