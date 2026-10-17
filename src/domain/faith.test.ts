import { describe, expect, it } from "vitest";
import { hasIslamicPrayerPack, normalizeFaithProfile, resolveFaithProfile } from "./faith";

describe("faith and reflection privacy", () => {
  it("does not infer a faith when data is absent", () => {
    expect(resolveFaithProfile({})).toEqual({
      enabled: false,
      traditions: ["not_for_me"],
      practices: [],
      private: true,
    });
  });

  it("migrates only an explicit legacy prayer opt-in", () => {
    const faith = resolveFaithProfile({ faithRoutines: true });
    expect(hasIslamicPrayerPack(faith)).toBe(true);
  });

  it("supports custom and multiple traditions without enabling Islamic tools", () => {
    const faith = resolveFaithProfile({
      faith: {
        enabled: true,
        traditions: ["christianity", "indigenous_traditional"],
        branch: "Family traditions",
        practices: ["meditation_contemplation", "custom_ritual"],
        private: true,
      },
    });
    expect(faith.practices).toHaveLength(2);
    expect(hasIslamicPrayerPack(faith)).toBe(false);
  });

  it("never combines opt-out choices with enabled practice packs", () => {
    expect(
      normalizeFaithProfile({
        enabled: true,
        traditions: ["not_for_me", "islam"],
        practices: ["prayer_remembrance"],
        private: true,
      }),
    ).toEqual({
      enabled: false,
      traditions: ["not_for_me"],
      practices: [],
      private: true,
    });
  });
});
