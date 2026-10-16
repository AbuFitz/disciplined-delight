import { describe, expect, it } from "vitest";
import { findConflicts, occurrencesFor, type Block } from "./schedule";
import { parseTimetablePaste } from "./timetable";

const gym: Block = {
  id: "gym",
  label: "Gym",
  start: "06:00",
  end: "07:00",
  weekdays: [0, 1, 3, 5],
};
const work: Block = {
  id: "work",
  label: "Work",
  start: "09:30",
  end: "18:00",
  weekdays: [0, 1, 2, 3, 4],
};
const ps = (p: string) => (({ fajr: "05:52", dhuhr: "12:47" }) as Record<string, string>)[p];

describe("schedule occurrences", () => {
  it("applies on the right weekdays", () => {
    expect(occurrencesFor("2026-10-12", [gym], [], ps)).toHaveLength(1); // Monday
    expect(occurrencesFor("2026-10-14", [gym], [], ps)).toHaveLength(0); // Wednesday
  });
  it("skips or moves a single occurrence without touching the series", () => {
    const ex = [
      { blockId: "gym", date: "2026-10-12", kind: "move" as const, start: "07:00", end: "08:00" },
    ];
    expect(occurrencesFor("2026-10-12", [gym], ex, ps)[0]!.startMin).toBe(420);
    expect(occurrencesFor("2026-10-19", [gym], ex, ps)[0]!.startMin).toBe(360);
    expect(
      occurrencesFor(
        "2026-10-12",
        [gym],
        [{ blockId: "gym", date: "2026-10-12", kind: "skip" }],
        ps,
      ),
    ).toHaveLength(0);
  });
  it("resolves prayer-relative blocks per day and hides them if times are missing", () => {
    const pre: Block = {
      id: "r",
      label: "Wake before Fajr",
      start: "00:00",
      weekdays: [0],
      relativeTo: { prayer: "fajr", offsetMinutes: -40 },
    };
    expect(occurrencesFor("2026-10-12", [pre], [], ps)[0]!.startMin).toBe(5 * 60 + 52 - 40);
    expect(occurrencesFor("2026-10-12", [pre], [], () => undefined)).toHaveLength(0);
  });
  it("detects overlaps but not touching blocks", () => {
    const clash: Block = { id: "c", label: "Call", start: "06:30", end: "07:30", weekdays: [0] };
    const touch: Block = { id: "t", label: "Shower", start: "07:00", end: "07:30", weekdays: [0] };
    expect(findConflicts(occurrencesFor("2026-10-12", [gym, clash], [], ps))).toHaveLength(1);
    expect(findConflicts(occurrencesFor("2026-10-12", [gym, touch], [], ps))).toHaveLength(0);
    expect(findConflicts(occurrencesFor("2026-10-12", [work, gym], [], ps))).toHaveLength(0);
  });
  it("handles blocks that span midnight", () => {
    const sleep: Block = { id: "s", label: "Sleep", start: "22:00", end: "05:30", weekdays: [0] };
    const o = occurrencesFor("2026-10-12", [sleep], [], ps)[0]!;
    expect(o.endMin - o.startMin).toBe(450);
  });
});

describe("timetable paste", () => {
  it("parses 5- and 6-time lines and reports bad lines", () => {
    const { days, errors } = parseTimetablePaste(
      "16/10 05:52 07:28 12:47 15:33 18:06 19:29\n17/10 5.54 12:47 15:31 18:04 19:27\nnonsense\n18/10 25:00 12:47 15:31 18:04 19:27",
      2026,
      "x",
    );
    expect(days).toHaveLength(2);
    expect(days[0]!.start.sunrise).toBe("07:28");
    expect(days[1]!.start.fajr).toBe("05:54");
    expect(days[1]!.date).toBe("2026-10-17");
    expect(errors).toHaveLength(2);
  });
});
