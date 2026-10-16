import { describe, expect, it } from "vitest";
import { zonedInstant } from "./dates";
import { nextPrayer, parseAladhanCalendar, type PrayerDay } from "./prayer";

const day = (date: string, f = "05:52"): PrayerDay => ({
  date, sourceId: "t", start: { fajr: f, dhuhr: "12:47", asr: "15:33", maghrib: "18:06", isha: "19:29" },
});
const table = (...d: PrayerDay[]) => (date: string) => d.find((x) => x.date === date);

describe("next prayer", () => {
  it("picks the next start today", () => {
    const now = zonedInstant("2026-10-16", "13:00");
    const n = nextPrayer(now, table(day("2026-10-16")));
    expect(n).toMatchObject({ status: "ok", prayer: "asr", isTomorrow: false });
  });
  it("rolls to tomorrow's Fajr after Isha, across midnight", () => {
    const now = zonedInstant("2026-10-16", "23:30");
    const n = nextPrayer(now, table(day("2026-10-16"), day("2026-10-17", "05:54")));
    expect(n).toMatchObject({ status: "ok", prayer: "fajr", date: "2026-10-17", isTomorrow: true });
    if (n.status === "ok") expect(n.at).toBe(zonedInstant("2026-10-17", "05:54"));
  });
  it("after midnight but before Fajr uses today's (new date) Fajr", () => {
    const now = zonedInstant("2026-10-17", "00:30");
    const n = nextPrayer(now, table(day("2026-10-17", "05:54")));
    expect(n).toMatchObject({ prayer: "fajr", isTomorrow: false });
  });
  it("never recycles yesterday's times", () => {
    const now = zonedInstant("2026-10-17", "09:00");
    expect(nextPrayer(now, table(day("2026-10-16"))).status).toBe("unavailable");
  });
  it("is unavailable after Isha when tomorrow is missing", () => {
    expect(nextPrayer(zonedInstant("2026-10-16", "23:00"), table(day("2026-10-16"))).status).toBe("unavailable");
  });
  it("handles the clock change night correctly", () => {
    // 24 Oct 22:00 BST → next is 25 Oct Fajr (clocks go back that night; Fajr 05:5x GMT)
    const now = zonedInstant("2026-10-24", "22:00");
    const n = nextPrayer(now, table(day("2026-10-24"), day("2026-10-25", "05:00")));
    if (n.status === "ok") expect(new Date(n.at).toISOString()).toBe("2026-10-25T05:00:00.000Z");
    else throw new Error("expected ok");
  });
});

describe("AlAdhan parsing", () => {
  it("parses the verified response shape and strips tz suffixes", () => {
    const json = { code: 200, data: [{ date: { gregorian: { date: "16-10-2026" } },
      timings: { Fajr: "05:52 (BST)", Sunrise: "07:28 (BST)", Dhuhr: "12:47 (BST)", Asr: "15:33 (BST)", Maghrib: "18:06 (BST)", Isha: "19:29 (BST)" } }] };
    const [d] = parseAladhanCalendar(json, "s1");
    expect(d).toMatchObject({ date: "2026-10-16", start: { fajr: "05:52", isha: "19:29", sunrise: "07:28" } });
  });
  it("rejects bad shapes and skips incomplete days", () => {
    expect(() => parseAladhanCalendar({}, "s")).toThrow();
    expect(parseAladhanCalendar({ data: [{ date: { gregorian: { date: "16-10-2026" } }, timings: { Fajr: "x" } }] }, "s")).toEqual([]);
  });
});
