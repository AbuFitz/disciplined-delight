import { describe, expect, it } from "vitest";
import { addDays, zonedInstant } from "./dates";
import type { PrayerDay } from "./prayer";
import {
  DEFAULT_REMINDER_PREFS,
  buildReminders,
  inQuietHours,
  quietConflictsWithFajr,
  type ReminderPrefs,
} from "./reminders";

const day = (date: string, fajr = "05:52"): PrayerDay => ({
  date,
  sourceId: "t",
  start: { fajr, dhuhr: "12:47", asr: "15:33", maghrib: "18:06", isha: "19:29" },
});
const lookup = (d: string) =>
  d >= "2026-10-16" && d <= "2026-10-30"
    ? day(d, d >= "2026-10-26" ? "05:20" : "05:52")
    : undefined;
const prefs = (p: Partial<ReminderPrefs>): ReminderPrefs => ({ ...DEFAULT_REMINDER_PREFS, ...p });
const base = { tz: "Europe/London", prayerLookup: lookup, training: [] as never[] };

describe("reminder schedule", () => {
  it("is empty when nothing is enabled (opt-in)", () => {
    expect(
      buildReminders({
        ...base,
        now: zonedInstant("2026-10-16", "09:00"),
        prefs: DEFAULT_REMINDER_PREFS,
      }),
    ).toEqual([]);
  });
  it("schedules prayer reminders ahead of the start and skips ones already past", () => {
    const now = zonedInstant("2026-10-16", "13:00");
    const r = buildReminders({
      ...base,
      now,
      prefs: prefs({
        prayer: {
          enabled: true,
          leadMinutes: 10,
          which: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
        },
      }),
    });
    expect(r[0]!.key).toBe("prayer:2026-10-16:asr");
    expect(r[0]!.fireAt).toBe(zonedInstant("2026-10-16", "15:23"));
    expect(r.some((x) => x.key === "prayer:2026-10-16:dhuhr")).toBe(false);
    expect(r.some((x) => x.key === "prayer:2026-10-17:fajr")).toBe(true);
  });
  it("uses the right instant on each side of the clock change", () => {
    const r = buildReminders({
      ...base,
      now: zonedInstant("2026-10-24", "12:00"),
      prefs: prefs({ prayer: { enabled: true, leadMinutes: 0, which: ["fajr"] } }),
    });
    const next = r.find((x) => x.key === "prayer:2026-10-25:fajr")!;
    const mon = r.find((x) => x.key === "prayer:2026-10-26:fajr");
    // Clocks go back at 02:00 on 25 Oct 2026, so Fajr that morning is already GMT (UTC+0).
    expect(new Date(next.fireAt).toISOString()).toBe("2026-10-25T05:52:00.000Z");
    expect(new Date(mon!.fireAt).toISOString()).toBe("2026-10-26T05:20:00.000Z"); // GMT, 41h ahead, inside the horizon
  });
  it("keys are stable for deduplication", () => {
    const a = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: prefs({ prayer: { enabled: true, leadMinutes: 5, which: ["asr"] } }),
    });
    const b = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:30"),
      prefs: prefs({ prayer: { enabled: true, leadMinutes: 5, which: ["asr"] } }),
    });
    expect(a[0]!.key).toBe(b[0]!.key);
  });
  it("training reminders follow the template weekday and time", () => {
    const r = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: prefs({ training: { enabled: true, leadMinutes: 60 } }),
      training: [{ id: "t1", weekday: 5, time: "06:00", letter: "D", title: "Arms" }],
    }); // Saturday
    expect(r).toHaveLength(1);
    expect(r[0]!.fireAt).toBe(zonedInstant("2026-10-17", "05:00"));
  });
  it("quiet hours wrap midnight and hold back reminders", () => {
    expect(inQuietHours(23 * 60, "22:00", "05:00")).toBe(true);
    expect(inQuietHours(4 * 60, "22:00", "05:00")).toBe(true);
    expect(inQuietHours(12 * 60, "22:00", "05:00")).toBe(false);
    const p = prefs({
      prayer: { enabled: true, leadMinutes: 10, which: ["fajr", "isha"] },
      quiet: { enabled: true, start: "22:00", end: "06:00", allowFajr: false },
    });
    const r = buildReminders({ ...base, now: zonedInstant("2026-10-16", "09:00"), prefs: p });
    expect(r.every((x) => !x.key.endsWith("fajr"))).toBe(true); // 05:42 is inside quiet hours
    expect(
      quietConflictsWithFajr({ ...base, now: zonedInstant("2026-10-16", "09:00"), prefs: p }),
    ).toBe(true);
  });
  it("lets a wanted Fajr reminder through quiet hours only when explicitly allowed", () => {
    const p = prefs({
      prayer: { enabled: true, leadMinutes: 10, which: ["fajr"] },
      quiet: { enabled: true, start: "22:00", end: "06:00", allowFajr: true },
    });
    const r = buildReminders({ ...base, now: zonedInstant("2026-10-16", "09:00"), prefs: p });
    expect(r.some((x) => x.key === "prayer:2026-10-17:fajr")).toBe(true);
  });
  it("omits prayer reminders when times are unavailable rather than guessing", () => {
    const r = buildReminders({
      ...base,
      prayerLookup: () => undefined,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: prefs({ prayer: { enabled: true, leadMinutes: 10, which: ["fajr"] } }),
    });
    expect(r).toEqual([]);
  });
  void addDays;
});
