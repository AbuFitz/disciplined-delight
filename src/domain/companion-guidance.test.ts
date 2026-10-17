import { describe, expect, it } from "vitest";
import { DEFAULT_COMPANION } from "./companion";
import { buddyGuidance } from "./companion-guidance";

const config = {
  ...DEFAULT_COMPANION,
  enabled: true,
  placement: "dashboard" as const,
  quiet: { enabled: false, start: "22:00", end: "07:00" },
};
describe("Buddy contextual guidance", () => {
  it("uses real readiness facts", () => {
    expect(
      buddyGuidance(
        config,
        {
          kind: "readiness",
          score: 42,
          soreness: 4,
          action: "reduce_set",
          reason: "One fewer set is available.",
        },
        undefined,
        1,
        600,
      )?.text,
    ).toContain("soreness 4/5");
  });
  it("respects disabled, quiet, snooze and on-demand placement", () => {
    const event = { kind: "gym_start" as const, exercise: "Squat" };
    expect(buddyGuidance({ ...config, enabled: false }, event, undefined, 10, 600)).toBeNull();
    expect(
      buddyGuidance(
        { ...config, quiet: { enabled: true, start: "09:00", end: "11:00" } },
        event,
        undefined,
        10,
        600,
      ),
    ).toBeNull();
    expect(buddyGuidance(config, event, { id: "gym_start", snoozedUntil: 20 }, 10, 600)).toBeNull();
    expect(
      buddyGuidance({ ...config, placement: "on_demand" }, event, undefined, 10, 600),
    ).toBeNull();
  });
  it("uses frequency as a deterministic intervention threshold", () => {
    const event = { kind: "first_set" as const, exercise: "Row" };
    expect(
      buddyGuidance({ ...config, frequency: "minimal" }, event, undefined, 10, 600),
    ).toBeNull();
    expect(
      buddyGuidance({ ...config, frequency: "active" }, event, undefined, 10, 600),
    ).not.toBeNull();
  });
});
