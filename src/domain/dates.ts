/**
 * Timezone-aware date helpers. "Local date" is always the calendar date in an
 * explicit IANA timezone (default Europe/London) — never a UTC string slice.
 */
export const DEFAULT_TZ = "Europe/London";

export type ISODate = string; // "YYYY-MM-DD"

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(instant: Date | number, tz: string) {
  const out: Record<string, number> = {};
  for (const p of fmt(tz).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Calendar date of an instant in `tz`. */
export function localDate(instant: Date | number = Date.now(), tz = DEFAULT_TZ): ISODate {
  const p = parts(instant, tz);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since local midnight of an instant in `tz`. */
export function localMinutes(instant: Date | number, tz = DEFAULT_TZ): number {
  const p = parts(instant, tz);
  return p.hour * 60 + p.minute;
}

/** Offset (ms) of `tz` from UTC at the given instant. */
export function tzOffsetMs(instant: number, tz: string): number {
  const p = parts(instant, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant / 1000) * 1000;
}

/**
 * Instant for a wall-clock time on a local date in `tz`. For a time skipped by
 * a spring-forward gap, resolves to the instant just after the gap; for an
 * ambiguous autumn time, resolves to the first (earlier) occurrence.
 */
export function zonedInstant(date: ISODate, hhmm: string, tz = DEFAULT_TZ): number {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, m);
  // Try both candidate offsets around the date; prefer the earliest valid one.
  const o1 = tzOffsetMs(naive - 12 * 3600_000, tz);
  const o2 = tzOffsetMs(naive + 12 * 3600_000, tz);
  const candidates = [...new Set([o1, o2])].map((o) => naive - o);
  const valid = candidates.filter((c) => {
    const p = parts(c, tz);
    return p.hour === h && p.minute === m && p.day === d;
  });
  if (valid.length) return Math.min(...valid);
  // Nonexistent local time (spring forward): shift forward by the gap.
  return Math.max(...candidates);
}

export function addDays(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date));
}

export function weekDates(date: ISODate): ISODate[] {
  const s = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const t = (s: ISODate) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400_000);
}

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function formatDateLong(date: ISODate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatClock(instant: number, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  }).format(instant);
}

export const to12h = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${pad(m)}${period}`;
};
