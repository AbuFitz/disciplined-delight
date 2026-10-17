import { describe, expect, it } from "vitest";
import { safeDiagnostics, validateFeedback } from "./feedback";

describe("feedback privacy and validation", () => {
  it("keeps only allowlisted diagnostics and strips query data", () => {
    expect(
      safeDiagnostics({
        appVersion: "1",
        route: "/train?token=secret",
        platform: "web",
        online: true,
        syncMode: "attention",
        errorIds: ["SYNC_42", "not valid!"],
        password: "secret",
        prayerLog: "private",
        workoutNote: "private",
      }),
    ).toEqual({
      appVersion: "1",
      route: "/train",
      platform: "web",
      online: true,
      syncMode: "attention",
      errorIds: ["SYNC_42"],
    });
  });
  it("validates description, email and screenshot without requiring contact details", () => {
    expect(
      validateFeedback({
        category: "bug",
        description: "A clear reproducible issue happened here.",
      }),
    ).toEqual([]);
    expect(
      validateFeedback({
        category: "bug",
        description: "too short",
        contactEmail: "bad",
        screenshot: { name: "x.txt", type: "text/plain", size: 20_000_000 },
      }),
    ).toHaveLength(3);
  });
});
