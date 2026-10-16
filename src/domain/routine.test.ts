import { describe, expect, it } from "vitest";
import { localDate, localMinutes } from "./dates";
import type { PrayerName } from "./prayer";
import {
  agendaFor,
  DAY_PARTS,
  freeWindows,
  nextAction,
  placeOnWeekdays,
  planRoutine,
  type AgendaInput,
  type RoutineBlockLike,
} from "./routine";

const D = "2026-10-14"; // Wednesday (weekday index 2)
const blk = (id: string, start: string, o: Partial<RoutineBlockLike> = {}): RoutineBlockLike => ({
  id,
  label: id,
  start,
  end: undefined,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  kind: "routine",
  ...o,
});
const input = (o: Partial<AgendaInput> = {}): AgendaInput => ({
  date: D,
  today: D,
  nowMin: 12 * 60,
  blocks: [],
  exceptions: [],
  completions: [],
  prayer: { enabled: false, start: () => undefined, logged: new Set<PrayerName>() },
  workout: { completed: new Set(), anyCompleted: false },
  mealsLogged: 0,
  mind: new Set(),
  ...o,
});
const find = (r: ReturnType<typeof agendaFor>, k: string) => r.items.find((x) => x.label === k)!;

describe("manual activities", () => {
  it("runs upcoming, now, missed by the clock", () => {
    const b = [blk("read", "13:00", { end: "13:30" })];
    expect(find(agendaFor(input({ blocks: b, nowMin: 12 * 60 })), "read").status).toBe("upcoming");
    expect(find(agendaFor(input({ blocks: b, nowMin: 13 * 60 + 10 })), "read").status).toBe("now");
    expect(find(agendaFor(input({ blocks: b, nowMin: 14 * 60 })), "read").status).toBe("missed");
  });
  it("can be ticked, skipped and corrected back by removing the completion", () => {
    const b = [blk("read", "13:00", { end: "13:30" })];
    const at = (status: "done" | "skipped" | null) =>
      find(
        agendaFor(
          input({
            blocks: b,
            nowMin: 14 * 60,
            completions: status ? [{ blockId: "read", date: D, status }] : [],
          }),
        ),
        "read",
      ).status;
    expect(at("done")).toBe("done");
    expect(at("skipped")).toBe("skipped");
    expect(at(null)).toBe("missed");
  });
  it("counts done, skipped and missed once each; skipped leaves the total", () => {
    const b = [blk("a", "08:00"), blk("b", "09:00"), blk("c", "10:00")];
    const r = agendaFor(
      input({
        blocks: b,
        nowMin: 12 * 60,
        completions: [
          { blockId: "a", date: D, status: "done" },
          { blockId: "b", date: D, status: "skipped" },
        ],
      }),
    );
    expect(r.counts).toEqual({ done: 1, total: 2, skipped: 1, missed: 1 });
  });
});

describe("linked activities complete from the real record, once", () => {
  it("prayer: logging the prayer completes the routine and no duplicate prayer row exists", () => {
    const start = (p: PrayerName) =>
      ({ fajr: "05:00", dhuhr: "12:30", asr: "15:30", maghrib: "18:00", isha: "19:30" })[p];
    const b = [blk("Dhikr after Zuhr", "12:40", { link: { type: "prayer", prayer: "dhuhr" } })];
    const base = input({
      blocks: b,
      prayer: { enabled: true, start, logged: new Set<PrayerName>() },
    });
    const open = agendaFor(base);
    expect(
      open.items.filter(
        (x) => x.link.type === "prayer" && (x.link as { prayer: string }).prayer === "dhuhr",
      ),
    ).toHaveLength(1);
    const done = agendaFor({
      ...base,
      prayer: { ...base.prayer, logged: new Set<PrayerName>(["dhuhr"]) },
    });
    expect(find(done, "Dhikr after Zuhr").status).toBe("done");
    expect(find(done, "Dhikr after Zuhr").derived).toBe(true);
    expect(done.counts.done).toBe(1 + 0);
  });
  it("prayers run from their start to the next one and Isha to the end of the day", () => {
    const start = (p: PrayerName) =>
      ({ fajr: "05:00", dhuhr: "12:30", asr: "15:30", maghrib: "18:00", isha: "19:30" })[p];
    const mk = (nowMin: number, logged: PrayerName[] = []) =>
      agendaFor(input({ nowMin, prayer: { enabled: true, start, logged: new Set(logged) } }));
    expect(find(mk(13 * 60), "Dhuhr").status).toBe("now");
    expect(find(mk(16 * 60), "Dhuhr").status).toBe("missed");
    expect(find(mk(23 * 60 + 30), "Isha").status).toBe("now");
    expect(find(mk(16 * 60, ["dhuhr"]), "Dhuhr").status).toBe("done");
  });
  it("workout: a completed session completes the planned workout; a linked block replaces the default row", () => {
    const planned = { id: "t1", letter: "A", title: "Push" };
    const open = agendaFor(
      input({ workout: { planned, completed: new Set(), anyCompleted: false } }),
    );
    expect(open.items.filter((x) => x.source === "workout")).toHaveLength(1);
    expect(open.items[0]!.floating).toBe(true);
    expect(open.items[0]!.status).toBe("upcoming");
    const done = agendaFor(
      input({ workout: { planned, completed: new Set(["t1"]), anyCompleted: true } }),
    );
    expect(done.items[0]!.status).toBe("done");
    const linked = agendaFor(
      input({
        blocks: [blk("Gym", "18:00", { end: "19:00", link: { type: "workout" } })],
        workout: { planned, completed: new Set(), anyCompleted: false },
      }),
    );
    expect(linked.items.filter((x) => /Gym|Workout/.test(x.label))).toHaveLength(1);
  });
  it("meal and mind links complete from their records", () => {
    const b = [
      blk("Lunch", "13:00", { link: { type: "meal" } }),
      blk("Check-in", "20:00", { link: { type: "mind", kind: "checkin" } }),
    ];
    const r = agendaFor(input({ blocks: b, mealsLogged: 1, mind: new Set(["checkin"]) }));
    expect(find(r, "Lunch").status).toBe("done");
    expect(find(r, "Check-in").status).toBe("done");
    expect(find(agendaFor(input({ blocks: b })), "Lunch").status).toBe("upcoming");
  });
});

describe("rest, skip, move, pause", () => {
  it("a rest day shows as rest and is not counted", () => {
    const b = [blk("Run", "07:00")];
    const r = agendaFor(
      input({ blocks: b, exceptions: [{ blockId: "Run", date: D, kind: "skip", reason: "rest" }] }),
    );
    expect(find(r, "Run").status).toBe("rest");
    expect(r.counts.total).toBe(0);
  });
  it("a single skip leaves the series alone", () => {
    const b = [blk("Run", "07:00")];
    const r = agendaFor(
      input({ blocks: b, exceptions: [{ blockId: "Run", date: D, kind: "skip" }] }),
    );
    expect(find(r, "Run").status).toBe("skipped");
    expect(
      agendaFor(input({ blocks: b, date: "2026-10-15", today: "2026-10-15" })).items,
    ).toHaveLength(1);
  });
  it("moves one occurrence to another day and time without touching the series", () => {
    const b = [blk("Run", "07:00", { end: "08:00" })];
    const ex = [
      { blockId: "Run", date: D, kind: "move" as const, toDate: "2026-10-16", start: "18:00" },
    ];
    const here = agendaFor(input({ blocks: b, exceptions: ex }));
    expect(find(here, "Run").status).toBe("skipped");
    expect(find(here, "Run").moved).toBe(true);
    const there = agendaFor(
      input({ blocks: b, exceptions: ex, date: "2026-10-16", today: "2026-10-16", nowMin: 9 * 60 }),
    );
    const runs = there.items.filter((x) => x.label === "Run");
    expect(runs).toHaveLength(2); // the normal 16th occurrence and the one moved in
    expect(runs.some((x) => x.moved && x.startMin === 18 * 60 && x.endMin === 19 * 60)).toBe(true);
  });
  it("pausing removes it for the span and resuming brings it back", () => {
    const paused = [blk("Read", "09:00", { pausedFrom: "2026-10-10", pausedUntil: "2026-10-20" })];
    expect(agendaFor(input({ blocks: paused })).items).toHaveLength(0);
    const open = [blk("Read", "09:00", { pausedFrom: "2026-10-10", pausedUntil: null })];
    expect(agendaFor(input({ blocks: open })).items).toHaveLength(0);
    const resumed = [blk("Read", "09:00", { pausedFrom: "2026-10-10", pausedUntil: "2026-10-14" })];
    expect(agendaFor(input({ blocks: resumed })).items).toHaveLength(1);
  });
});

describe("midnight and time zones", () => {
  it("shows the part of last night's sleep that runs past midnight, as context", () => {
    const b = [blk("Sleep", "22:30", { end: "06:30", kind: "sleep" })];
    const r = agendaFor(input({ blocks: b, nowMin: 3 * 60 }));
    const cont = r.items.find((x) => x.continued)!;
    expect(cont.startMin).toBe(0);
    expect(cont.endMin).toBe(6 * 60 + 30);
    expect(r.counts.total).toBe(0);
    expect(r.next).toBeNull();
  });
  it("past days read as missed and future days as upcoming, not by today's clock", () => {
    const b = [blk("Read", "23:00")];
    expect(
      find(agendaFor(input({ blocks: b, date: "2026-10-13", nowMin: 8 * 60 })), "Read").status,
    ).toBe("missed");
    expect(
      find(agendaFor(input({ blocks: b, date: "2026-10-15", nowMin: 23 * 60 + 30 })), "Read")
        .status,
    ).toBe("upcoming");
  });
  it("rolls over at local midnight in the person's zone, not UTC", () => {
    const tz = "Pacific/Auckland";
    const justBefore = Date.UTC(2026, 9, 14, 10, 59); // 23:59 NZDT on the 14th
    const justAfter = Date.UTC(2026, 9, 14, 11, 1); // 00:01 NZDT on the 15th
    expect(localDate(justBefore, tz)).toBe("2026-10-14");
    expect(localDate(justAfter, tz)).toBe("2026-10-15");
    expect(localMinutes(justAfter, tz)).toBe(1);
  });
  it("handles a day with a missing hour and a repeated hour (Europe/London)", () => {
    const tz = "Europe/London";
    const b = [blk("Early", "02:30", { end: "02:45" })];
    // Spring forward 2026-03-29: 01:00 UTC -> clocks go 01:00 -> 02:00 BST.
    const day = "2026-03-29";
    const before = Date.UTC(2026, 2, 29, 0, 30); // 00:30 GMT
    const after = Date.UTC(2026, 2, 29, 2, 0); // 03:00 BST
    const run = (inst: number) =>
      agendaFor(
        input({ blocks: b, date: day, today: localDate(inst, tz), nowMin: localMinutes(inst, tz) }),
      );
    expect(find(run(before), "Early").status).toBe("upcoming");
    expect(find(run(after), "Early").status).toBe("missed"); // the skipped 02:30 never happens; it is not "now" forever
    // Fall back 2026-10-25: 01:30 happens twice, but the item still appears once and is "now" in both.
    const b2 = [blk("Late", "01:30", { end: "02:00" })];
    const first = Date.UTC(2026, 9, 25, 0, 40); // 01:40 BST
    const second = Date.UTC(2026, 9, 25, 1, 40); // 01:40 GMT
    for (const inst of [first, second]) {
      const r = agendaFor(
        input({
          blocks: b2,
          date: "2026-10-25",
          today: localDate(inst, tz),
          nowMin: localMinutes(inst, tz),
        }),
      );
      expect(r.items.filter((x) => x.label === "Late")).toHaveLength(1);
      expect(find(r, "Late").status).toBe("now");
    }
  });
});

describe("next action", () => {
  it("prefers what is happening now, then the soonest timed item, then floating; ignores work and sleep", () => {
    const planned = { id: "t", letter: "A", title: "Push" };
    const b = [
      blk("Work", "09:00", { end: "17:00", kind: "work" }),
      blk("Read", "20:00"),
      blk("Stretch", "12:10", { end: "12:30" }),
    ];
    const r = agendaFor(
      input({
        blocks: b,
        nowMin: 12 * 60 + 15,
        workout: { planned, completed: new Set(), anyCompleted: false },
      }),
    );
    expect(r.next!.label).toBe("Stretch");
    const later = agendaFor(
      input({
        blocks: b,
        nowMin: 13 * 60,
        workout: { planned, completed: new Set(), anyCompleted: false },
      }),
    );
    expect(later.next!.label).toBe("Read");
    const onlyFloating = agendaFor(
      input({
        blocks: [],
        nowMin: 13 * 60,
        workout: { planned, completed: new Set(), anyCompleted: false },
      }),
    );
    expect(onlyFloating.next!.label).toContain("Workout A");
    expect(nextAction([])).toBeNull();
  });
  it("flags overlapping activities", () => {
    const r = agendaFor(
      input({ blocks: [blk("A", "10:00", { end: "11:00" }), blk("B", "10:30", { end: "11:30" })] }),
    );
    expect(r.items.every((x) => x.conflict)).toBe(true);
  });
});

describe("building a routine around a real day", () => {
  const items = (wd: number) => [
    {
      startMin: 22 * 60 + 30,
      endMin: 24 * 60,
      status: "upcoming" as const,
      source: "block" as const,
    },
    { startMin: 0, endMin: 6 * 60 + 30, status: "upcoming" as const, source: "block" as const },
    ...(wd < 5
      ? [
          {
            startMin: 9 * 60,
            endMin: 17 * 60,
            status: "upcoming" as const,
            source: "block" as const,
          },
        ]
      : []),
  ];
  const busy = new Map(Array.from({ length: 7 }, (_, d) => [d, items(d)]));
  it("finds free windows between work and sleep with buffers", () => {
    const w = freeWindows(items(0));
    expect(w).toEqual([
      { start: 6 * 60 + 40, end: 8 * 60 + 50 },
      { start: 17 * 60 + 10, end: 22 * 60 + 20 },
    ]);
  });
  it("places an activity at one time free on every chosen weekday, inside the preferred part of the day", () => {
    const start = placeOnWeekdays(
      { durationMin: 45, prefer: DAY_PARTS.evening, weekdays: [0, 2, 4] },
      busy,
    )!;
    expect(start).toBeGreaterThanOrEqual(18 * 60);
    expect(start + 45).toBeLessThanOrEqual(22 * 60 + 20);
    const morning = placeOnWeekdays(
      { durationMin: 45, prefer: DAY_PARTS.morning, weekdays: [0] },
      busy,
    )!;
    expect(morning).toBeGreaterThanOrEqual(6 * 60 + 40);
  });
  it("says so when nothing fits instead of overlapping work", () => {
    expect(
      placeOnWeekdays({ durationMin: 120, prefer: DAY_PARTS.midday, weekdays: [0] }, busy),
    ).toBeNull();
    expect(
      placeOnWeekdays({ durationMin: 120, prefer: DAY_PARTS.midday, weekdays: [5] }, busy),
    ).not.toBeNull();
  });
});

describe("the default workout row can be skipped or rested without a block", () => {
  const planned = { id: "t1", letter: "A", title: "Push" };
  const base = { workout: { planned, completed: new Set<string>(), anyCompleted: false } };
  it("rest day exception", () => {
    const r = agendaFor(
      input({
        ...base,
        exceptions: [{ blockId: "workout:t1", date: D, kind: "skip", reason: "rest" }],
      }),
    );
    expect(r.items[0]!.status).toBe("rest");
    expect(r.restDay).toBe(true);
    expect(r.counts.total).toBe(0);
  });
  it("manual skip, and a finished session still wins over a skip", () => {
    const skipped = agendaFor(
      input({ ...base, completions: [{ blockId: "workout:t1", date: D, status: "skipped" }] }),
    );
    expect(skipped.items[0]!.status).toBe("skipped");
    const doneAnyway = agendaFor(
      input({
        workout: { planned, completed: new Set(["t1"]), anyCompleted: true },
        completions: [{ blockId: "workout:t1", date: D, status: "skipped" }],
      }),
    );
    expect(doneAnyway.items[0]!.status).toBe("done");
  });
});

describe("planRoutine", () => {
  const refDates = [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ];
  const sleep = blk("Sleep", "22:30", { end: "06:30", kind: "sleep" });
  const work = blk("Work", "09:00", { end: "17:30", kind: "work", weekdays: [0, 1, 2, 3, 4] });
  let n = 0;
  const mkId = () => `id${n++}`;
  const spec = (
    label: string,
    durationMin: number,
    part: keyof typeof DAY_PARTS,
    weekdays: number[],
  ) => ({
    label,
    kind: "personal",
    durationMin,
    prefer: DAY_PARTS[part],
    weekdays,
  });
  it("places activities around sleep, work and each other without overlap", () => {
    const { placed, unplaced } = planRoutine({
      existing: [sleep, work],
      specs: [
        spec("Walk", 30, "evening", [0, 1, 2, 3, 4]),
        spec("Reflect", 15, "evening", [0, 1, 2, 3, 4, 5, 6]),
      ],
      refDates,
      mkId,
    });
    expect(unplaced).toEqual([]);
    const [walk, reflect] = placed;
    const sm = (b: typeof walk) => Number(b!.start.slice(0, 2)) * 60 + Number(b!.start.slice(3));
    expect(sm(walk)).toBeGreaterThanOrEqual(17 * 60 + 40);
    expect(sm(reflect) >= sm(walk) + 30 + 10 || sm(reflect) + 15 + 10 <= sm(walk)).toBe(true);
  });
  it("avoids prayer times", () => {
    const prayers = (p: PrayerName) =>
      ({ fajr: "05:00", dhuhr: "12:30", asr: "15:30", maghrib: "18:30", isha: "20:00" })[p];
    const { placed } = planRoutine({
      existing: [sleep],
      specs: [spec("Read", 40, "evening", [0])],
      refDates,
      prayerStart: () => prayers,
      mkId,
    });
    const start = Number(placed[0]!.start.slice(0, 2)) * 60 + Number(placed[0]!.start.slice(3));
    for (const ps of [18 * 60 + 30, 20 * 60])
      expect(start + 40 <= ps - 10 || start >= ps + 30).toBe(true);
  });
  it("reports what cannot fit and where it would", () => {
    const busyAll = blk("Busy", "05:00", { end: "22:00", kind: "work", weekdays: [0, 1, 2, 3, 4] });
    const { placed, unplaced } = planRoutine({
      existing: [sleep, busyAll],
      specs: [spec("Study", 60, "evening", [0, 1, 5, 6])],
      refDates,
      mkId,
    });
    expect(placed).toEqual([]);
    expect(unplaced[0]!.fitsOn).toEqual([5, 6]);
    expect(unplaced[0]!.reason).toMatch(/single time|window/);
  });
});
