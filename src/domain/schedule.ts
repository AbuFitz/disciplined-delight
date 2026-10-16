import { weekdayIndex, type ISODate } from "./dates";
import type { PrayerName } from "./prayer";

export type Block = {
  id: string;
  label: string;
  start: string;
  end?: string;
  weekdays: number[];
  relativeTo?: { prayer: PrayerName; offsetMinutes: number };
  archivedAt?: string | null;
};
export type Exception = {
  blockId: string;
  date: ISODate;
  kind: "skip" | "move";
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
};

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const minToHHMM = (t: number) => {
  const x = ((t % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/**
 * Occurrences of recurring blocks on a date. Skips and single-occurrence moves
 * come from exceptions, never from editing the series. Prayer-relative blocks
 * resolve through `prayerStart` and vanish when times aren't available.
 */
export function occurrencesFor(
  date: ISODate,
  blocks: Block[],
  exceptions: Exception[],
  prayerStart: (p: PrayerName) => string | undefined,
): Occurrence[] {
  const wd = weekdayIndex(date);
  const out: Occurrence[] = [];
  for (const b of blocks) {
    if (b.archivedAt || !b.weekdays.includes(wd)) continue;
    const ex = exceptions.find((e) => e.blockId === b.id && e.date === date);
    if (ex?.kind === "skip") continue;
    let start: number | undefined, end: number | undefined;
    if (b.relativeTo) {
      const ps = prayerStart(b.relativeTo.prayer);
      if (!ps) continue;
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
    out.push({
      key: `${b.id}:${date}`,
      blockId: b.id,
      label: b.label,
      startMin: start,
      endMin: end,
      moved: ex?.kind === "move",
      relative: !!b.relativeTo,
    });
  }
  return out.sort((a, b) => a.startMin - b.startMin);
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
