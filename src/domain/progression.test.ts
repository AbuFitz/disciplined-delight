import { describe, expect, it } from "vitest";
import { defaultIncrementKg, parseScheme, suggestNext, type RecordedSet } from "./progression";

const w = (weightKg: number, reps: number, extra: Partial<RecordedSet> = {}): RecordedSet => ({
  kind: "working",
  weightKg,
  reps,
  completed: true,
  ...extra,
});
const rx = { sets: 3, repMin: 8, repMax: 12 };

describe("double progression", () => {
  it("suggests an increase only when every working set hits the top of the range", () => {
    const s = suggestNext([w(40, 12), w(40, 12), w(40, 12)], rx, 2.5);
    expect(s).toMatchObject({ kind: "increase", fromKg: 40, toKg: 42.5 });
  });
  it("does not increase on a last-set-only result (legacy bug)", () => {
    const s = suggestNext([w(40, 9), w(40, 8), w(40, 12)], rx, 2.5);
    expect(s.kind).toBe("hold");
  });
  it("makes no suggestion when sets/reps are missing", () => {
    expect(
      suggestNext(
        [w(40, 12), { kind: "working", completed: true, weightKg: 40 }, w(40, 12)],
        rx,
        2.5,
      ).kind,
    ).toBe("none");
    expect(suggestNext([w(40, 12)], rx, 2.5).kind).toBe("none");
    expect(suggestNext([], rx, 2.5).kind).toBe("none");
  });
  it("ignores warm-ups and skipped sets", () => {
    const s = suggestNext(
      [
        { kind: "warmup", weightKg: 20, reps: 15, completed: true },
        w(40, 12),
        w(40, 12),
        w(40, 12),
      ],
      rx,
      1,
    );
    expect(s).toMatchObject({ kind: "increase", toKg: 41 });
  });
  it("does not require optional effort data to suggest", () => {
    expect(suggestNext([w(40, 12, { rir: 0 }), w(40, 12), w(40, 12)], rx, 2.5).kind).toBe(
      "increase",
    );
  });
  it("uses equipment-specific increments", () => {
    expect(defaultIncrementKg("Cable stack + rope")).toBe(1);
    expect(defaultIncrementKg("Chest press machine")).toBe(2.5);
  });
  it("parses legacy scheme strings", () => {
    expect(parseScheme("3 × 12–15 per arm")).toEqual({ sets: 3, repMin: 12, repMax: 15 });
    expect(parseScheme("2 × 10–12")).toEqual({ sets: 2, repMin: 10, repMax: 12 });
  });
});
