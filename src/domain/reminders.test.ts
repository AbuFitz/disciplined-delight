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
  it("schedules an explicitly opted-in routine occurrence at its chosen lead time", () => {
    const r = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: DEFAULT_REMINDER_PREFS,
      routine: [
        {
          date: "2026-10-16",
          key: "read:2026-10-16",
          label: "Read ten pages",
          detail: "Phone away. Book open.",
          startMin: 19 * 60,
          leadMinutes: 15,
          status: "upcoming",
        },
      ],
    });
    expect(r).toEqual([
      expect.objectContaining({
        key: "routine:read:2026-10-16",
        kind: "routine",
        fireAt: zonedInstant("2026-10-16", "18:45"),
        title: "Read ten pages",
        body: "Phone away. Book open.",
        url: "/",
      }),
    ]);
  });
  it("does not schedule completed, skipped, rested or missed routine occurrences", () => {
    const routine = (["done", "skipped", "rest", "missed"] as const).map((status, index) => ({
      date: "2026-10-16" as const,
      key: `${status}:2026-10-16`,
      label: status,
      startMin: 12 * 60 + index,
      leadMinutes: 0,
      status,
    }));
    expect(
      buildReminders({
        ...base,
        now: zonedInstant("2026-10-16", "09:00"),
        prefs: DEFAULT_REMINDER_PREFS,
        routine,
      }),
    ).toEqual([]);
  });
  it("rejects malformed routine lead times instead of scheduling surprising pushes", () => {
    expect(
      buildReminders({
        ...base,
        now: zonedInstant("2026-10-16", "09:00"),
        prefs: DEFAULT_REMINDER_PREFS,
        routine: [-1, 241, Number.NaN].map((leadMinutes, index) => ({
          date: "2026-10-16",
          key: `bad-${index}:2026-10-16`,
          label: "Bad reminder",
          startMin: 19 * 60,
          leadMinutes,
          status: "upcoming" as const,
        })),
      }),
    ).toEqual([]);
  });
  it("bounds user-written routine payloads to the server contract", () => {
    const [reminder] = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: DEFAULT_REMINDER_PREFS,
      routine: [
        {
          date: "2026-10-16",
          key: "long:2026-10-16",
          label: "🏋️".repeat(121),
          detail: "x".repeat(301),
          startMin: 19 * 60,
          leadMinutes: 0,
          status: "upcoming",
        },
      ],
    });
    expect(Array.from(reminder!.title)).toHaveLength(120);
    expect(Array.from(reminder!.body)).toHaveLength(300);
  });
  it("applies quiet hours to routine reminders too", () => {
    const r = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "09:00"),
      prefs: prefs({
        quiet: { enabled: true, start: "22:00", end: "06:00", allowFajr: false },
      }),
      routine: [
        {
          date: "2026-10-17",
          key: "wind-down:2026-10-17",
          label: "Wind down",
          startMin: 22 * 60 + 30,
          leadMinutes: 0,
          status: "upcoming",
        },
      ],
    });
    expect(r).toEqual([]);
  });
  it("keeps a prayer-relative activity that crosses midnight on the correct instant", () => {
    const r = buildReminders({
      ...base,
      now: zonedInstant("2026-10-16", "20:00"),
      prefs: DEFAULT_REMINDER_PREFS,
      routine: [
        {
          date: "2026-10-17",
          key: "night-practice:2026-10-17",
          label: "Night practice",
          startMin: -15,
          leadMinutes: 0,
          status: "upcoming",
        },
      ],
    });
    expect(r[0]!.fireAt).toBe(zonedInstant("2026-10-16", "23:45"));
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
