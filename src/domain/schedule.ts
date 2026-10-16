import { addDays, weekdayIndex, type ISODate } from "./dates";
import type { PrayerName } from "./prayer";

export type Block = {
  id: string;
  label: string;
  start: string;
  end?: string;
  weekdays: number[];
  relativeTo?: { prayer: PrayerName; offsetMinutes: number };
  archivedAt?: string | null;
  pausedFrom?: ISODate;
  pausedUntil?: ISODate | null;
};
export type Exception = {
  blockId: string;
  /** The date the occurrence normally falls on. */
  date: ISODate;
  kind: "skip" | "move";
  reason?: "rest" | "skip";
  toDate?: ISODate;
  start?: string;
  end?: string;
};

export type Occurrence = {
  key: string;
  blockId: string;
  label: string;
  startMin: number;
  endMin: number;
  moved: boolean;
  relative: boolean;
  /** Set when this occurrence was removed for the day: a rest day or a plain skip. */
  skipped?: "rest" | "skip";
  /** True for the part of a late-evening occurrence that runs past midnight into this date. */
  continued?: boolean;
};

/** Paused from `pausedFrom` (inclusive) until `pausedUntil` (exclusive); open-ended when `pausedUntil` is null. */
export const isPaused = (b: Pick<Block, "pausedFrom" | "pausedUntil">, date: ISODate) =>
  !!b.pausedFrom && date >= b.pausedFrom && (b.pausedUntil == null || date < b.pausedUntil);

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const minToHHMM = (t: number) => {
  const x = ((t % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

function expandOne(
  date: ISODate,
  b: Block,
  ex: Exception | undefined,
  prayerStart: (p: PrayerName) => string | undefined,
  continued = false,
): Occurrence | null {
  let start: number | undefined, end: number | undefined;
  if (b.relativeTo) {
    const ps = prayerStart(b.relativeTo.prayer);
    if (!ps) return null;
    start = toMin(ps) + b.relativeTo.offsetMinutes;
    end = b.end ? start + (toMin(b.end) - toMin(b.start)) : start + 15;
  } else {
    start = toMin(ex?.start ?? b.start);
    end = ex?.end
      ? toMin(ex.end)
      : ex?.start && b.end
        ? start + (toMin(b.end) - toMin(b.start))
        : b.end
          ? toMin(b.end)
          : start + 15;
  }
  if (end <= start) end += 1440; // spans midnight (e.g. sleep)
  return {
    key: `${b.id}:${ex?.date ?? date}`,
    blockId: b.id,
    label: b.label,
    startMin: start,
    endMin: end,
    moved: ex?.kind === "move",
    relative: !!b.relativeTo,
    continued,
  };
}

/**
 * Every occurrence that touches `date`, including ones removed for the day (flagged `skipped`), single-occurrence
 * moves to or from other dates, paused series (excluded) and the part of a late-evening occurrence that runs past
 * midnight into this date (`continued`, shifted so it starts at 00:00).
 */
export function expandOccurrences(
  date: ISODate,
  blocks: Block[],
  exceptions: Exception[],
  prayerStart: (p: PrayerName) => string | undefined,
  prayerStartPrev?: (p: PrayerName) => string | undefined,
): Occurrence[] {
  const out: Occurrence[] = [];
  const live = blocks.filter((b) => !b.archivedAt);
  const wd = weekdayIndex(date);
  for (const b of live) {
    // Normal occurrence on this date.
    if (b.weekdays.includes(wd) && !isPaused(b, date)) {
      const ex = exceptions.find((e) => e.blockId === b.id && e.date === date);
      if (!ex || ex.kind === "skip" || !ex.toDate || ex.toDate === date) {
        const o = expandOne(date, b, ex?.kind === "move" ? ex : undefined, prayerStart);
        if (o) out.push(ex?.kind === "skip" ? { ...o, skipped: ex.reason ?? "skip" } : o);
      } else {
        // moved to another day: present there, absent here (reported as skipped "move" so editors can undo it)
        const o = expandOne(date, b, ex, prayerStart);
        if (o) out.push({ ...o, skipped: "skip", moved: true });
      }
    }
    // Arrivals moved here from another date.
    for (const ex of exceptions) {
      if (ex.blockId !== b.id || ex.kind !== "move" || ex.toDate !== date || ex.date === date)
        continue;
      if (isPaused(b, ex.date)) continue;
      const o = expandOne(ex.date, b, { ...ex, date: ex.date }, prayerStart);
      if (o) out.push({ ...o, key: `${b.id}:${ex.date}`, moved: true });
    }
    // Spill-over from yesterday's late occurrence.
    const prev = addDays(date, -1);
    if (b.weekdays.includes(weekdayIndex(prev)) && !isPaused(b, prev)) {
      const ex = exceptions.find((e) => e.blockId === b.id && e.date === prev);
      if (!ex || (ex.kind === "move" && !ex.toDate)) {
        const o = expandOne(prev, b, ex, prayerStartPrev ?? prayerStart);
        if (o && o.endMin > 1440)
          out.push({
            ...o,
            key: `${b.id}:${prev}:cont`,
            startMin: 0,
            endMin: o.endMin - 1440,
            continued: true,
          });
      }
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin || a.label.localeCompare(b.label));
}

/**
 * Occurrences of recurring blocks on a date. Skips and single-occurrence moves
 * come from exceptions, never from editing the series. Prayer-relative blocks
 * resolve through `prayerStart` and vanish when times aren't available.
 * (Removed, rest and moved-away occurrences are excluded; see `expandOccurrences` for them.)
 */
export function occurrencesFor(
  date: ISODate,
  blocks: Block[],
  exceptions: Exception[],
  prayerStart: (p: PrayerName) => string | undefined,
): Occurrence[] {
  return expandOccurrences(date, blocks, exceptions, prayerStart).filter(
    (o) => !o.skipped && !o.continued,
  );
}

/** Pairs of overlapping occurrences (touching edges don't conflict). */
export function findConflicts(occ: Occurrence[]): [Occurrence, Occurrence][] {
  const res: [Occurrence, Occurrence][] = [];
  for (let i = 0; i < occ.length; i++)
    for (let j = i + 1; j < occ.length; j++)
      if (occ[i]!.startMin < occ[j]!.endMin && occ[j]!.startMin < occ[i]!.endMin)
        res.push([occ[i]!, occ[j]!]);
  return res;
}
