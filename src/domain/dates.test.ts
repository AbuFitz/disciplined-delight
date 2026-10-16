import { describe, expect, it } from "vitest";
import { addDays, formatClock, localDate, startOfWeek, weekdayIndex, zonedInstant } from "./dates";

describe("local dates (Europe/London)", () => {
  it("uses the London calendar date, not UTC", () => {
    // 23:30 UTC on 20 Jun is 00:30 BST on 21 Jun
    expect(localDate(Date.UTC(2026, 5, 20, 23, 30))).toBe("2026-06-21");
    // winter: same instant stays on the 20th
    expect(localDate(Date.UTC(2026, 11, 20, 23, 30))).toBe("2026-12-20");
  });
  it("converts wall clock to instants across DST", () => {
    // BST (UTC+1)
    expect(new Date(zonedInstant("2026-10-16", "05:52")).toISOString()).toBe(
      "2026-10-16T04:52:00.000Z",
    );
    // GMT after clocks go back on 25 Oct 2026
    expect(new Date(zonedInstant("2026-10-26", "05:52")).toISOString()).toBe(
      "2026-10-26T05:52:00.000Z",
    );
    expect(formatClock(zonedInstant("2026-10-26", "05:52"))).toBe("05:52");
  });
  it("handles the spring-forward gap and autumn repeat", () => {
    // 29 Mar 2026: 01:30 doesn't exist in London → resolves after the gap
    const gap = zonedInstant("2026-03-29", "01:30");
    expect(formatClock(gap)).toBe("02:30");
    // 25 Oct 2026: 01:30 occurs twice → first occurrence (BST)
    expect(new Date(zonedInstant("2026-10-25", "01:30")).toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });
  it("week maths is Monday-first", () => {
    expect(weekdayIndex("2026-10-16")).toBe(4); // Friday
    expect(startOfWeek("2026-10-16")).toBe("2026-10-12");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
