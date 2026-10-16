import { daysBetween, type ISODate } from "./dates";

export type Point = { date: ISODate; value: number };

/** Least-squares trend over real observations. Returns null unless there is enough data to say anything. */
export function linearTrend(points: Point[], minPoints = 6, minSpanDays = 14) {
  const pts = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < minPoints) return null;
  const x0 = pts[0]!.date;
  const span = daysBetween(x0, pts[pts.length - 1]!.date);
  if (span < minSpanDays) return null;
  const xs = pts.map((p) => daysBetween(x0, p.date));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.value, 0) / pts.length;
  let num = 0,
    den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (pts[i]!.value - my);
    den += (x - mx) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slopePerWeek: slope * 7, intercept: my - slope * mx, x0, spanDays: span, n: pts.length };
}
