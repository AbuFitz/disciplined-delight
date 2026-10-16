/**
 * The daily routine engine. Pure: given the day's blocks, exceptions and the person's real records (prayer logs,
 * sessions, meals, mind entries) it produces one agenda with a status per activity and a single next action.
 *
 * Linked activities (workout, prayer, meal, mind) are DONE when their own record exists, so finishing the real thing
 * updates the routine exactly once and there is nothing separate to tick. Only manual activities use completions.
 */
import { addDays, type ISODate } from "./dates";
import { PRAYER_LABEL, PRAYERS, type PrayerName } from "./prayer";
import {
  expandOccurrences,
  isPaused,
  minToHHMM,
  type Block,
  type Exception,
  type Occurrence,
} from "./schedule";

export type MindKind = "checkin" | "reflection" | "focus";
export type Link =
  | { type: "manual" }
  | { type: "workout"; templateId?: string }
  | { type: "prayer"; prayer: PrayerName }
  | { type: "meal" }
  | { type: "mind"; kind: MindKind };

export type RoutineBlockLike = Block & {
  kind: string;
  link?: Link;
  detail?: string;
  durationMin?: number;
};
export type Completion = { blockId: string; date: ISODate; status: "done" | "skipped" };

export type Status = "upcoming" | "now" | "done" | "skipped" | "missed" | "rest";
export type Source = "block" | "prayer" | "workout";

export type AgendaItem = {
  key: string;
  source: Source;
  blockId?: string;
  label: string;
  detail?: string;
  kind: string;
  link: Link;
  startMin: number;
  endMin: number;
  status: Status;
  moved: boolean;
  continued: boolean;
  /** No fixed time: it can happen any time today, so it is never "missed" before the day ends. */
  floating: boolean;
  /** Context (work, sleep) rather than something to do. Never the next action. */
  context: boolean;
  conflict: boolean;
  /** Done because the linked record exists (true) or because it was ticked (false). */
  derived: boolean;
};

export type AgendaInput = {
  date: ISODate;
  today: ISODate;
  /** Wall-clock minutes since local midnight in the person's timezone. */
  nowMin: number;
  blocks: RoutineBlockLike[];
  exceptions: Exception[];
  completions: Completion[];
  prayer: {
    enabled: boolean;
    start: (p: PrayerName) => string | undefined;
    startPrev?: (p: PrayerName) => string | undefined;
    logged: Set<PrayerName>;
  };
  workout: {
    planned?: { id: string; letter: string; title: string; time?: string };
    /** Template ids with a completed session on `date`. */
    completed: Set<string>;
    anyCompleted: boolean;
    resting?: boolean;
  };
  mealsLogged: number;
  mind: Set<MindKind>;
};

const CONTEXT_KINDS = new Set(["work", "sleep"]);
const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const DAY = 1440;

/** Nominal clock position of "now" relative to `date`: before the day, during it, or after it. */
function clockFor(date: ISODate, today: ISODate, nowMin: number) {
  return date < today ? DAY + 1 : date > today ? -1 : nowMin;
}

function statusFor(
  o: { startMin: number; endMin: number; floating: boolean; skipped?: "rest" | "skip" },
  clock: number,
  done: boolean,
  manual: "done" | "skipped" | undefined,
): Status {
  if (o.skipped === "rest") return "rest";
  if (done || manual === "done") return "done";
  if (manual === "skipped") return "skipped";
  if (o.skipped) return "skipped";
  if (o.floating) return clock > DAY ? "missed" : "upcoming";
  if (clock >= o.endMin) return "missed";
  if (clock >= o.startMin) return "now";
  return "upcoming";
}

export function agendaFor(i: AgendaInput): {
  items: AgendaItem[];
  next: AgendaItem | null;
  counts: Counts;
  restDay: boolean;
} {
  const clock = clockFor(i.date, i.today, i.nowMin);
  const occ = expandOccurrences(i.date, i.blocks, i.exceptions, i.prayer.start, i.prayer.startPrev);
  const byBlock = new Map(i.blocks.map((b) => [b.id, b]));
  const items: AgendaItem[] = [];
  const doneFor = (b: string) =>
    i.completions.find((c) => c.blockId === b && c.date === i.date)?.status;
  const linkedPrayers = new Set<PrayerName>();
  let workoutLinked = false;

  for (const o of occ as Occurrence[]) {
    const b = byBlock.get(o.blockId)!;
    const link: Link = b.link ?? { type: "manual" };
    if (link.type === "prayer") linkedPrayers.add(link.prayer);
    if (link.type === "workout") workoutLinked = true;
    const manual = doneFor(o.blockId);
    // a moved occurrence belongs to its original date for completion purposes
    const mkey =
      o.key.split(":")[1] === i.date
        ? undefined
        : i.completions.find((c) => c.blockId === o.blockId && c.date === o.key.split(":")[1])
            ?.status;
    const derived = derivedDone(link, i, o.blockId);
    items.push({
      key: o.key,
      source: "block",
      blockId: o.blockId,
      label: o.label,
      detail: b.detail,
      kind: b.kind,
      link,
      startMin: o.startMin,
      endMin: o.endMin,
      status: statusFor({ ...o, floating: false }, clock, derived, manual ?? mkey),
      moved: o.moved,
      continued: !!o.continued,
      floating: false,
      context: CONTEXT_KINDS.has(b.kind),
      conflict: false,
      derived,
    });
  }

  // Default prayer items (unless a block already stands for that prayer).
  if (i.prayer.enabled) {
    PRAYERS.forEach((p, idx) => {
      if (linkedPrayers.has(p)) return;
      const st = i.prayer.start(p);
      if (!st) return;
      const nextStart = PRAYERS[idx + 1] ? i.prayer.start(PRAYERS[idx + 1]!) : undefined;
      const startMin = toMin(st);
      const endMin = nextStart ? toMin(nextStart) : DAY - 1; // Isha runs to the end of the day
      const done = i.prayer.logged.has(p);
      items.push({
        key: `prayer:${p}:${i.date}`,
        source: "prayer",
        label: PRAYER_LABEL[p],
        kind: "prayer",
        link: { type: "prayer", prayer: p },
        startMin,
        endMin,
        status: statusFor({ startMin, endMin, floating: false }, clock, done, undefined),
        moved: false,
        continued: false,
        floating: false,
        context: false,
        conflict: false,
        derived: done,
      });
    });
  }

  // Planned workout unless a block already stands for it.
  const w = i.workout.planned;
  let restToday = !!i.workout.resting;
  if (w && !workoutLinked) {
    const wid = `workout:${w.id}`;
    const wex = i.exceptions.find(
      (e) => e.blockId === wid && e.date === i.date && e.kind === "skip",
    );
    const wman = i.completions.find((c) => c.blockId === wid && c.date === i.date)?.status;
    if (wex?.reason === "rest") restToday = true;
    const hasTime = !!w.time;
    const startMin = hasTime ? toMin(w.time!) : 0;
    const endMin = hasTime ? startMin + 60 : DAY - 1;
    const done = i.workout.completed.has(w.id);
    items.push({
      key: wid + ":" + i.date,
      source: "workout",
      blockId: wid,
      label: `Workout ${w.letter}: ${w.title}`,
      kind: "workout",
      link: { type: "workout", templateId: w.id },
      startMin,
      endMin,
      status: statusFor(
        {
          startMin,
          endMin,
          floating: !hasTime,
          skipped: restToday ? "rest" : wex ? "skip" : undefined,
        },
        clock,
        done,
        wman,
      ),
      moved: false,
      continued: false,
      floating: !hasTime,
      context: false,
      conflict: false,
      derived: done,
    });
  }

  items.sort(
    (a, b) =>
      Number(a.floating) - Number(b.floating) ||
      a.startMin - b.startMin ||
      a.label.localeCompare(b.label),
  );
  // conflicts: overlapping fixed, actionable, non-prayer items
  const fixed = items.filter(
    (x) =>
      !x.floating &&
      x.status !== "rest" &&
      x.status !== "skipped" &&
      !x.context &&
      x.source !== "prayer",
  );
  for (let a = 0; a < fixed.length; a++)
    for (let b = a + 1; b < fixed.length; b++)
      if (fixed[a]!.startMin < fixed[b]!.endMin && fixed[b]!.startMin < fixed[a]!.endMin)
        fixed[a]!.conflict = fixed[b]!.conflict = true;

  const counts = countsOf(items);
  const restDay = !!(
    restToday ||
    (!w && !workoutLinked && !i.blocks.some((b) => b.link?.type === "workout" && !b.archivedAt))
  );
  return { items, next: nextAction(items), counts, restDay };
}

function derivedDone(link: Link, i: AgendaInput, blockId: string): boolean {
  switch (link.type) {
    case "workout":
      return link.templateId ? i.workout.completed.has(link.templateId) : i.workout.anyCompleted;
    case "prayer":
      return i.prayer.logged.has(link.prayer);
    case "meal":
      return i.mealsLogged > 0;
    case "mind":
      return i.mind.has(link.kind);
    default:
      return blockId === "" ? false : false;
  }
}

export type Counts = { done: number; total: number; skipped: number; missed: number };
export function countsOf(items: AgendaItem[]): Counts {
  const act = items.filter((x) => !x.context && !x.continued && x.status !== "rest");
  return {
    total: act.filter((x) => x.status !== "skipped").length,
    done: act.filter((x) => x.status === "done").length,
    skipped: act.filter((x) => x.status === "skipped").length,
    missed: act.filter((x) => x.status === "missed").length,
  };
}

/** The one thing to do next: something happening now, otherwise the soonest upcoming thing. Context (work, sleep) never counts. */
export function nextAction(items: AgendaItem[]): AgendaItem | null {
  const live = items.filter(
    (x) => !x.context && !x.continued && (x.status === "now" || x.status === "upcoming"),
  );
  const now = live.filter((x) => x.status === "now");
  const pool = now.length ? now : live;
  // Prefer timed items; floating ones come last unless nothing timed remains.
  return (
    [...pool].sort(
      (a, b) => Number(a.floating) - Number(b.floating) || a.startMin - b.startMin,
    )[0] ?? null
  );
}

/* ------------------------------ free time and placement ------------------------------ */

export type Window = { start: number; end: number };

/** Gaps in the day (minutes since midnight) between busy items, with a buffer either side, at least `minLen` long. */
export function freeWindows(
  items: Pick<AgendaItem, "startMin" | "endMin" | "status" | "source">[],
  opts: { from?: number; to?: number; buffer?: number; minLen?: number } = {},
): Window[] {
  const { from = 0, to = DAY, buffer = 10, minLen = 15 } = opts;
  const busy = items
    .filter((x) => x.status !== "rest" && x.status !== "skipped")
    .map((x) => ({
      start: x.startMin - buffer,
      end: (x.source === "prayer" ? Math.min(x.endMin, x.startMin + 20) : x.endMin) + buffer,
    }))
    .sort((a, b) => a.start - b.start);
  const out: Window[] = [];
  let cursor = from;
  for (const b of busy) {
    if (b.start - cursor >= minLen) out.push({ start: cursor, end: Math.min(b.start, to) });
    cursor = Math.max(cursor, b.end);
  }
  if (to - cursor >= minLen) out.push({ start: cursor, end: to });
  return out.filter((w) => w.end - w.start >= minLen && w.end > from);
}

export type ActivitySpec = {
  label: string;
  kind: string;
  link?: Link;
  durationMin: number;
  /** Preferred part of the day as [earliest, latest start] in minutes. */
  prefer: [number, number];
  weekdays: number[];
};

export const DAY_PARTS: Record<"morning" | "midday" | "afternoon" | "evening", [number, number]> = {
  morning: [5 * 60, 10 * 60],
  midday: [11 * 60, 14 * 60],
  afternoon: [14 * 60, 18 * 60],
  evening: [18 * 60, 21 * 60 + 30],
};

/**
 * Place an activity at ONE start time that is free on every chosen weekday, given the busy items for each weekday.
 * Returns null when no such time exists (so the caller can suggest fewer days or a shorter activity).
 */
export function placeOnWeekdays(
  spec: Pick<ActivitySpec, "durationMin" | "prefer" | "weekdays">,
  busyByWeekday: Map<number, Pick<AgendaItem, "startMin" | "endMin" | "status" | "source">[]>,
): number | null {
  const [lo, hi] = spec.prefer;
  for (let start = lo; start <= hi; start += 15) {
    const ok = spec.weekdays.every((wd) => {
      const w = freeWindows(busyByWeekday.get(wd) ?? [], {
        from: 0,
        to: DAY,
        minLen: spec.durationMin,
      });
      return w.some((x) => start >= x.start && start + spec.durationMin <= x.end);
    });
    if (ok) return start;
  }
  return null;
}

/** Local-midnight rollover: the date the agenda should show after `nowMs`, and how many ms until it changes. */
export function untilMidnightMs(nowMin: number, nowSec = 0): number {
  return ((DAY - nowMin) * 60 - nowSec) * 1000;
}

export { addDays, isPaused };

/* ------------------------------ routine builder ------------------------------ */

export type Unplaced = {
  spec: ActivitySpec;
  reason: string;
  /** Weekdays (0 = Monday) where it would fit, so the person can keep those. */
  fitsOn: number[];
};

/**
 * Place activities around the person's actual day (sleep, work, existing activities, prayers). Each activity gets ONE
 * start time that works on all its weekdays; when none does, it is left out and the weekdays where it would fit are
 * reported instead of overlapping anything.
 */
export function planRoutine(args: {
  existing: RoutineBlockLike[];
  specs: ActivitySpec[];
  /** The date used to evaluate each weekday (index 0 = Monday). */
  refDates: ISODate[];
  prayerStart?: (date: ISODate) => ((p: PrayerName) => string | undefined) | undefined;
  mkId: () => string;
  firstOrder?: number;
}): { placed: RoutineBlockLike[]; unplaced: Unplaced[] } {
  const blocks = [...args.existing];
  const placed: RoutineBlockLike[] = [];
  const unplaced: Unplaced[] = [];
  const busyFor = (wd: number) => {
    const date = args.refDates[wd]!;
    const ps = args.prayerStart?.(date);
    const occ = expandOccurrences(date, blocks, [], ps ?? (() => undefined)).filter(
      (o) => !o.skipped,
    );
    const out: Pick<AgendaItem, "startMin" | "endMin" | "status" | "source">[] = occ.map((o) => ({
      startMin: o.startMin,
      endMin: o.endMin,
      status: "upcoming",
      source: "block",
    }));
    if (ps)
      for (const p of PRAYERS) {
        const s = ps(p);
        if (s)
          out.push({
            startMin: toMin(s),
            endMin: toMin(s) + 20,
            status: "upcoming",
            source: "prayer",
          });
      }
    return out;
  };
  const order = (n: number) => (args.firstOrder ?? 0) + n;
  for (const spec of args.specs) {
    const busy = new Map(Array.from({ length: 7 }, (_, wd) => [wd, busyFor(wd)] as const));
    const parts: [number, number][] = [
      spec.prefer,
      ...Object.values(DAY_PARTS).filter((p) => p !== spec.prefer),
    ];
    let start: number | null = null;
    for (const prefer of parts) {
      start = placeOnWeekdays({ ...spec, prefer }, busy);
      if (start != null) break;
    }
    if (start == null) {
      const fitsOn = spec.weekdays.filter((wd) =>
        parts.some((prefer) => placeOnWeekdays({ ...spec, prefer, weekdays: [wd] }, busy) != null),
      );
      unplaced.push({
        spec,
        fitsOn,
        reason: fitsOn.length
          ? "There is no single time that is free on all of those days."
          : "There is no free window long enough on those days.",
      });
      continue;
    }
    const end = start + spec.durationMin;
    const b: RoutineBlockLike = {
      id: args.mkId(),
      label: spec.label,
      kind: spec.kind,
      link: spec.link,
      start: minToHHMM(start),
      end: minToHHMM(end % DAY),
      weekdays: [...spec.weekdays].sort((a, b) => a - b),
      durationMin: spec.durationMin,
      detail: undefined,
    };
    (b as RoutineBlockLike & { order: number }).order = order(placed.length);
    blocks.push(b);
    placed.push(b);
  }
  return { placed, unplaced };
}
