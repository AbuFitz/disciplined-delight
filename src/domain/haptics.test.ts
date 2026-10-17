import { describe, expect, it } from "vitest";
import { HAPTIC_PATTERNS, shouldHaptic, type HapticKind, type HapticSettings } from "./haptics";

const on: HapticSettings = { enabled: true, muted: false, quietHours: false };
const ctx = { userActivated: true, passive: false };
const kinds = Object.keys(HAPTIC_PATTERNS) as HapticKind[];

describe("haptic policy", () => {
  it("is off until the person opts in", () => {
    for (const k of kinds)
      expect(shouldHaptic({ ...on, enabled: false }, k, ctx, "vibrate")).toBe(false);
  });
  it("is silent on browsers that cannot vibrate, such as iOS Safari", () => {
    for (const k of kinds) expect(shouldHaptic(on, k, ctx, "none")).toBe(false);
  });
  it("never fires for passive coaching", () => {
    for (const k of kinds)
      expect(shouldHaptic(on, k, { ...ctx, passive: true }, "native")).toBe(false);
  });
  it("needs a prior user interaction on the web", () => {
    expect(shouldHaptic(on, "set_logged", { ...ctx, userActivated: false }, "vibrate")).toBe(false);
    expect(shouldHaptic(on, "set_logged", { ...ctx, userActivated: false }, "native")).toBe(true);
  });
  it("respects mute and quiet hours, except a warning", () => {
    for (const s of [
      { ...on, muted: true },
      { ...on, quietHours: true },
    ]) {
      expect(shouldHaptic(s, "set_logged", ctx, "vibrate")).toBe(false);
      expect(shouldHaptic(s, "personal_best", ctx, "vibrate")).toBe(false);
      expect(shouldHaptic(s, "warning", ctx, "vibrate")).toBe(true);
    }
  });
  it("keeps patterns restrained", () => {
    for (const k of kinds) {
      const p = HAPTIC_PATTERNS[k];
      expect(p.length).toBeLessThanOrEqual(5);
      expect(p.reduce((a, b) => a + b, 0)).toBeLessThan(400);
    }
    expect(HAPTIC_PATTERNS.set_logged.length).toBe(1);
  });
});
