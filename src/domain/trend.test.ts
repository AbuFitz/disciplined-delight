import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { linearTrend } from "./trend";

describe("trend", () => {
  it("needs enough points and span", () => {
    expect(
      linearTrend([
        { date: "2026-10-01", value: 64 },
        { date: "2026-10-08", value: 64.5 },
      ]),
    ).toBeNull();
    const dense = Array.from({ length: 7 }, (_, i) => ({
      date: addDays("2026-10-01", i),
      value: 64 + i * 0.1,
    }));
    expect(linearTrend(dense)).toBeNull(); // 7 points but only 6 days
  });
  it("fits sparse but sufficient data", () => {
    const pts = [0, 3, 7, 10, 14, 18, 21].map((d) => ({
      date: addDays("2026-09-01", d),
      value: 63 + d * (0.3 / 7),
    }));
    const t = linearTrend(pts)!;
    expect(t.slopePerWeek).toBeCloseTo(0.3, 2);
    expect(t.n).toBe(7);
  });
});
