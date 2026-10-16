import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { estimateMaintenance, type TdeeDay } from "./tdee";

const mk = (n: number, f: (i: number) => Partial<TdeeDay>): TdeeDay[] =>
  Array.from({ length: n }, (_, i) => ({ date: addDays("2026-09-01", i), ...f(i) }));

describe("maintenance estimate", () => {
  it("says not enough data for short or sparse history", () => {
    expect(estimateMaintenance(mk(14, () => ({ kcal: 2800, kcalComplete: true, weightKg: 65 }))).ok).toBe(false);
    expect(estimateMaintenance(mk(30, (i) => (i % 5 === 0 ? { kcal: 2800, kcalComplete: true, weightKg: 65 } : {}))).ok).toBe(false);
  });
  it("never falls back to the old 2,760 target", () => {
    const r = estimateMaintenance([]);
    expect(r.ok).toBe(false);
  });
  it("estimates maintenance from intake minus weight trend, with a range", () => {
    // 3000 kcal/day, +0.1 kg/week → surplus ~110 kcal/day → maintenance ~2890
    const r = estimateMaintenance(mk(28, (i) => ({ kcal: 3000, kcalComplete: true, weightKg: 65 + (i / 7) * 0.1 })));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.maintenanceKcal).toBeGreaterThan(2850);
      expect(r.maintenanceKcal).toBeLessThan(2930);
      expect(r.rangeKcal[0]).toBeLessThan(r.maintenanceKcal);
    }
  });
  it("ignores partially logged days", () => {
    const r = estimateMaintenance(mk(28, (i) => ({ kcal: 900, kcalComplete: i % 2 === 0 ? false : true, weightKg: 65 })));
    expect(r.ok).toBe(false);
  });
});
