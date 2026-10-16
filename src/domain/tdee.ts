import { daysBetween, type ISODate } from "./dates";

export type TdeeDay = { date: ISODate; kcal?: number; kcalComplete?: boolean; weightKg?: number };

export type TdeeResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      maintenanceKcal: number;
      rangeKcal: [number, number];
      windowDays: number;
      loggedDays: number;
      weightSlopeKgPerWeek: number;
    };

const KCAL_PER_KG = 7700;

/** Least-squares slope of weight (kg/day) against day index. */
function slope(points: { x: number; y: number }[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0,
    den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Maintenance estimate = mean logged intake − (weight trend × 7700 / day).
 * Requires a ≥21-day window, ≥70% fully-logged intake days, ≥6 weigh-ins
 * spread across ≥14 days. Otherwise returns "not enough data". It is an
 * estimate only and never changes a target by itself.
 */
export function estimateMaintenance(days: TdeeDay[], minWindow = 21): TdeeResult {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { ok: false, reason: "No logs yet." };
  const start = sorted[0]!.date;
  const end = sorted[sorted.length - 1]!.date;
  const windowDays = daysBetween(start, end) + 1;
  if (windowDays < minWindow)
    return {
      ok: false,
      reason: `Needs at least ${minWindow} days of history (have ${windowDays}).`,
    };

  const intake = sorted.filter((d) => d.kcal != null && d.kcalComplete);
  if (intake.length / windowDays < 0.7) {
    return {
      ok: false,
      reason: `Food is fully logged on ${intake.length} of ${windowDays} days; needs at least 70%.`,
    };
  }
  const weights = sorted.filter((d) => d.weightKg != null);
  if (weights.length < 6)
    return { ok: false, reason: `Needs at least 6 weigh-ins (have ${weights.length}).` };
  const wSpan = daysBetween(weights[0]!.date, weights[weights.length - 1]!.date);
  if (wSpan < 14) return { ok: false, reason: "Weigh-ins need to span at least 14 days." };

  const pts = weights.map((w) => ({ x: daysBetween(start, w.date), y: w.weightKg! }));
  const kgPerDay = slope(pts);
  const meanIntake = intake.reduce((s, d) => s + d.kcal!, 0) / intake.length;
  const maintenance = meanIntake - kgPerDay * KCAL_PER_KG;

  // Uncertainty: residual noise of weights translated into slope error, plus
  // +/-5% intake logging error.
  const mean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const intercept = mean - kgPerDay * (pts.reduce((s, p) => s + p.x, 0) / pts.length);
  const resid = Math.sqrt(
    pts.reduce((s, p) => s + (p.y - (intercept + kgPerDay * p.x)) ** 2, 0) /
      Math.max(1, pts.length - 2),
  );
  const sx = Math.sqrt(
    pts.reduce((s, p) => s + (p.x - pts.reduce((a, q) => a + q.x, 0) / pts.length) ** 2, 0),
  );
  const slopeErr = sx === 0 ? 0 : resid / sx;
  const err = slopeErr * KCAL_PER_KG + meanIntake * 0.05;

  return {
    ok: true,
    maintenanceKcal: Math.round(maintenance),
    rangeKcal: [Math.round(maintenance - err), Math.round(maintenance + err)],
    windowDays,
    loggedDays: intake.length,
    weightSlopeKgPerWeek: Math.round(kgPerDay * 7 * 100) / 100,
  };
}
