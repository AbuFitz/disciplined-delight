/** Money is stored as integer pence. */
export type Pence = number;

export function toPence(pounds: number | string): Pence | null {
  const n = typeof pounds === "string" ? Number(pounds.replace(/[£,\s]/g, "")) : pounds;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatGBP(p: Pence): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
}
