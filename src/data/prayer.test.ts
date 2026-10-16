import { describe, expect, it } from "vitest";
import { DEFAULT_PRAYER_SETTINGS, makeLookup, type StoredPrayerDay } from "./prayer";

const mk = (
  date: string,
  origin: "calculated" | "manual",
  v = 1,
  fajr = "05:00",
): StoredPrayerDay => ({
  date,
  sourceId: "s",
  origin,
  settingsVersion: origin === "calculated" ? v : undefined,
  fetchedAt: 0,
  start: { fajr, dhuhr: "12:00", asr: "15:00", maghrib: "18:00", isha: "19:00" },
});

describe("prayer lookup", () => {
  const s = { ...DEFAULT_PRAYER_SETTINGS };
  it("serves calculated days only for the current settings version", () => {
    const l = makeLookup([mk("2026-10-16", "calculated", 1)], s);
    expect(l("2026-10-16")).toBeDefined();
    expect(
      makeLookup([mk("2026-10-16", "calculated", 1)], { ...s, version: 2 })("2026-10-16"),
    ).toBeUndefined();
  });
  it("manual mode never uses calculated days", () => {
    const l = makeLookup([mk("2026-10-16", "calculated", 1), mk("2026-10-17", "manual")], {
      ...s,
      mode: "manual",
    });
    expect(l("2026-10-16")).toBeUndefined();
    expect(l("2026-10-17")).toBeDefined();
  });
  it("manual entries override calculated ones in calculated mode", () => {
    const l = makeLookup(
      [mk("2026-10-16", "calculated", 1, "05:52"), mk("2026-10-16", "manual", 1, "05:40")],
      s,
    );
    expect(l("2026-10-16")!.start.fajr).toBe("05:40");
  });
  it("applies minute adjustments only to calculated times", () => {
    const adj = { ...s, adjustments: { isha: 2 } };
    expect(makeLookup([mk("2026-10-16", "calculated", 1)], adj)("2026-10-16")!.start.isha).toBe(
      "19:02",
    );
    expect(makeLookup([mk("2026-10-16", "manual")], adj)("2026-10-16")!.start.isha).toBe("19:00");
  });
  it("without settings, nothing calculated is trusted", () => {
    expect(
      makeLookup([mk("2026-10-16", "calculated", 1)], undefined)("2026-10-16"),
    ).toBeUndefined();
  });
});
