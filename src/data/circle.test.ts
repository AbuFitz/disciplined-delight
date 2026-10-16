import { describe, expect, it } from "vitest";
import { circleMessage, validateCircleDraft } from "./circle";

describe("Circle sharing", () => {
  it("requires a deliberate title and enforces server-sized fields", () => {
    expect(validateCircleDraft({ kind: "training", title: "  " })).toBe("Add a short title.");
    expect(validateCircleDraft({ kind: "training", title: "x".repeat(81) })).toMatch(/80/);
    expect(
      validateCircleDraft({ kind: "milestone", title: "First 5K", body: "x".repeat(501) }),
    ).toMatch(/500/);
    expect(
      validateCircleDraft({
        kind: "training",
        title: "Strong session",
        metricLabel: "Volume",
        metricValue: "4,250 kg",
      }),
    ).toBeNull();
  });

  it("turns expected privacy and network failures into useful copy", () => {
    expect(circleMessage({ message: "profile_required" })).toMatch(/profile/i);
    expect(circleMessage({ message: "connection_unavailable" })).toMatch(/unavailable/i);
    expect(circleMessage({ message: "Failed to fetch" })).toMatch(/offline/i);
  });
});
