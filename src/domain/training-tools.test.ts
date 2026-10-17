import { describe, expect, it } from "vitest";
import { estimatedOneRepMax, plateBreakdown, warmupRamp } from "./training-tools";

describe("training tools", () => {
  it("builds a conservative three-step warmup ramp", () => {
    expect(warmupRamp(100)).toEqual([
      { kind: "warmup", weightKg: 40, reps: 8 },
      { kind: "warmup", weightKg: 60, reps: 5 },
      { kind: "warmup", weightKg: 80, reps: 3 },
    ]);
  });
  it("calculates plates per side and preserves unavailable remainder", () => {
    expect(plateBreakdown(100)).toEqual({
      plates: [
        { kg: 25, countPerSide: 1 },
        { kg: 15, countPerSide: 1 },
      ],
      remainderPerSide: 0,
    });
    expect(plateBreakdown(101).remainderPerSide).toBe(0.5);
  });
  it("labels strength as estimated", () => {
    expect(estimatedOneRepMax(100, 5)).toBe(116.7);
  });
});
