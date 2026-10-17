import { describe, expect, it } from "vitest";
import { companionState, DEFAULT_COMPANION } from "./companion";

describe("companion state machine", () => {
  it("is silent when disabled or during quiet hours", () => {
    expect(companionState(DEFAULT_COMPANION, { minute: 600 }).kind).toBe("hidden");
    expect(
      companionState({ ...DEFAULT_COMPANION, enabled: true }, { minute: 60, activeWorkout: true })
        .kind,
    ).toBe("hidden");
  });
  it("prioritises safe system and active states without reading private content", () => {
    const config = {
      ...DEFAULT_COMPANION,
      enabled: true,
      quiet: { ...DEFAULT_COMPANION.quiet, enabled: false },
    };
    expect(companionState(config, { minute: 600, syncError: true, activeWorkout: true }).kind).toBe(
      "sync",
    );
    expect(companionState(config, { minute: 600, activeWorkout: true }).kind).toBe(
      "active_workout",
    );
    expect(
      companionState({ ...config, modules: ["mind"] }, { minute: 600, activeWorkout: true }).kind,
    ).toBe("idle");
  });
  it("never produces shaming or faith-inference language", () => {
    const config = {
      ...DEFAULT_COMPANION,
      enabled: true,
      quiet: { ...DEFAULT_COMPANION.quiet, enabled: false },
    };
    for (const signals of [
      { minute: 600, workoutCompleted: true },
      { minute: 600, recoveryDay: true },
      { minute: 600, offline: true },
    ])
      expect(companionState(config, signals).message).not.toMatch(
        /lazy|failed|should have|prayer|faith|relig/i,
      );
  });
});
