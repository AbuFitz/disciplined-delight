import type { PrayerDay } from "./prayer";

/**
 * Parses a pasted mosque timetable. One day per line:
 *   `16/10 05:52 07:28 12:47 15:33 18:06 19:29`   (fajr sunrise dhuhr asr maghrib isha)
 *   or without sunrise (five times). Separators: spaces, tabs, commas.
 * Returns days plus per-line errors; nothing is guessed.
 */
export function parseTimetablePaste(
  text: string,
  year: number,
  sourceId: string,
): { days: PrayerDay[]; errors: string[] } {
  const days: PrayerDay[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/[\s,;|]+/).filter(Boolean);
    const dm = parts[0]!.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
    const times = parts.slice(1);
    const valid = times.every((t) => /^\d{1,2}[:.]\d{2}$/.test(t));
    if (!dm || !valid || (times.length !== 5 && times.length !== 6)) {
      errors.push(`Line ${i + 1}: expected "DD/MM" then 5 or 6 times`);
      return;
    }
    const [d, m] = [Number(dm[1]), Number(dm[2])];
    const y = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : year;
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      errors.push(`Line ${i + 1}: invalid date`);
      return;
    }
    const norm = times.map((t) => {
      const [h, mm] = t.replace(".", ":").split(":");
      const hh = Number(h),
        mi = Number(mm);
      return hh > 23 || mi > 59
        ? null
        : `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    });
    if (norm.includes(null)) {
      errors.push(`Line ${i + 1}: invalid time`);
      return;
    }
    const t = norm as string[];
    const six = t.length === 6;
    days.push({
      date: `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      sourceId,
      start: six
        ? { fajr: t[0]!, sunrise: t[1]!, dhuhr: t[2]!, asr: t[3]!, maghrib: t[4]!, isha: t[5]! }
        : { fajr: t[0]!, dhuhr: t[1]!, asr: t[2]!, maghrib: t[3]!, isha: t[4]! },
    });
  });
  return { days, errors };
}
