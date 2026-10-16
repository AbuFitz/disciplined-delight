import { addDays, DEFAULT_TZ, localDate, zonedInstant, type ISODate } from "./dates";

export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABEL: Record<PrayerName | "sunrise", string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

/** Start times are authoritative timings; iqamah/jamaat times are separate. */
export type PrayerDay = {
  date: ISODate;
  /** Identifies the settings snapshot these times came from. */
  sourceId: string;
  start: Record<PrayerName, string> & { sunrise?: string };
  iqamah?: Partial<Record<PrayerName, string>>;
};

export type NextPrayer =
  | { status: "ok"; prayer: PrayerName; at: number; date: ISODate; isTomorrow: boolean }
  | { status: "unavailable"; reason: string };

export function prayerInstant(day: PrayerDay, prayer: PrayerName, tz = DEFAULT_TZ): number {
  return zonedInstant(day.date, day.start[prayer], tz);
}

/**
 * Next upcoming prayer start. Looks at today's timetable, then tomorrow's
 * Fajr after Isha. Missing timetables yield "unavailable" — never recycled.
 */
export function nextPrayer(
  now: number,
  lookup: (d: ISODate) => PrayerDay | undefined,
  tz = DEFAULT_TZ,
): NextPrayer {
  const today = localDate(now, tz);
  const t = lookup(today);
  if (!t) return { status: "unavailable", reason: "No prayer times for today." };
  for (const p of PRAYERS) {
    const at = prayerInstant(t, p, tz);
    if (at > now) return { status: "ok", prayer: p, at, date: today, isTomorrow: false };
  }
  const tomorrow = addDays(today, 1);
  const tm = lookup(tomorrow);
  if (!tm) return { status: "unavailable", reason: "Tomorrow's prayer times aren't loaded yet." };
  return {
    status: "ok",
    prayer: "fajr",
    at: prayerInstant(tm, "fajr", tz),
    date: tomorrow,
    isTomorrow: true,
  };
}

/** The most recent prayer whose start has passed (for "current prayer" UI). */
export function currentPrayer(
  now: number,
  lookup: (d: ISODate) => PrayerDay | undefined,
  tz = DEFAULT_TZ,
) {
  const today = localDate(now, tz);
  const t = lookup(today);
  if (!t) return null;
  let cur: PrayerName | null = null;
  for (const p of PRAYERS) if (prayerInstant(t, p, tz) <= now) cur = p;
  return cur;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/* ---- AlAdhan calendar parsing (contract verified 16 Oct 2026) ---- */

export type AladhanSettings = {
  city: string;
  country: string;
  method: number;
  /** 0 = Shafi/standard, 1 = Hanafi */
  school: 0 | 1;
  /** 1 middle of night, 2 one-seventh, 3 angle based */
  latitudeAdjustmentMethod: 1 | 2 | 3;
};

export function aladhanUrl(s: AladhanSettings, year: number, month: number): string {
  const q = new URLSearchParams({
    city: s.city,
    country: s.country,
    method: String(s.method),
    school: String(s.school),
    latitudeAdjustmentMethod: String(s.latitudeAdjustmentMethod),
  });
  return `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?${q}`;
}

type AladhanRow = {
  date?: { gregorian?: { date?: string } };
  timings?: Record<string, unknown>;
};

const hhmm = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : null;
};

/** Parses a calendar response; returns only fully valid days. Throws on bad shape. */
export function parseAladhanCalendar(json: unknown, sourceId: string): PrayerDay[] {
  const data = (json as { code?: number; data?: unknown[] })?.data;
  if (!Array.isArray(data)) throw new Error("Unexpected prayer-time response");
  const out: PrayerDay[] = [];
  for (const row of data as AladhanRow[]) {
    const g: string | undefined = row?.date?.gregorian?.date; // DD-MM-YYYY
    const t = row?.timings;
    if (!g || !t) continue;
    const [dd, mm, yyyy] = g.split("-");
    const start = {
      fajr: hhmm(t.Fajr),
      dhuhr: hhmm(t.Dhuhr),
      asr: hhmm(t.Asr),
      maghrib: hhmm(t.Maghrib),
      isha: hhmm(t.Isha),
      sunrise: hhmm(t.Sunrise),
    };
    if (!start.fajr || !start.dhuhr || !start.asr || !start.maghrib || !start.isha) continue;
    out.push({
      date: `${yyyy}-${mm}-${dd}`,
      sourceId,
      start: { ...(start as Record<PrayerName, string>), sunrise: start.sunrise ?? undefined },
    });
  }
  return out;
}
