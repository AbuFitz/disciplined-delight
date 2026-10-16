import {
  addDays,
  localDate,
  localMinutes,
  weekdayIndex,
  zonedInstant,
  type ISODate,
} from "./dates";
import { PRAYERS, PRAYER_LABEL, prayerInstant, type PrayerDay, type PrayerName } from "./prayer";

export type ReminderPrefs = {
  prayer: { enabled: boolean; leadMinutes: number; which: PrayerName[] };
  training: { enabled: boolean; leadMinutes: number };
  food: { enabled: boolean; time: string };
  quiet: {
    enabled: boolean;
    start: string;
    end: string;
    /** Explicit choice: still send a wanted Fajr reminder inside quiet hours. */ allowFajr: boolean;
  };
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  prayer: { enabled: false, leadMinutes: 10, which: [...PRAYERS] },
  training: { enabled: false, leadMinutes: 60 },
  food: { enabled: false, time: "20:00" },
  quiet: { enabled: false, start: "22:00", end: "05:00", allowFajr: false },
};

export type Reminder = {
  /** Stable dedupe key: the same reminder always has the same key. */
  key: string;
  kind: "prayer" | "training" | "food";
  fireAt: number;
  title: string;
  body: string;
  url: string;
};

export type ReminderInput = {
  now: number;
  tz: string;
  horizonMs?: number;
  prefs: ReminderPrefs;
  prayerLookup: (d: ISODate) => PrayerDay | undefined;
  training: { id: string; weekday: number | null; time?: string; letter: string; title: string }[];
};

const hm = (s: string) => {
  const [h = 0, m = 0] = s.split(":").map(Number);
  return h * 60 + m;
};

/** Is this local minute-of-day inside the quiet window (which may wrap midnight)? */
export function inQuietHours(min: number, start: string, end: string): boolean {
  const s = hm(start),
    e = hm(end);
  return s <= e ? min >= s && min < e : min >= s || min < e;
}

/** Upcoming reminders within the horizon. Instants are computed per date, so clock changes and moving prayer times are handled. */
export function buildReminders(i: ReminderInput): Reminder[] {
  const horizon = i.horizonMs ?? 48 * 3600_000;
  const end = i.now + horizon;
  const out: Reminder[] = [];
  const today = localDate(i.now, i.tz);
  for (let d = 0; d <= Math.ceil(horizon / 86400_000) + 1; d++) {
    const date = addDays(today, d);
    if (i.prefs.prayer.enabled) {
      const day = i.prayerLookup(date);
      if (day)
        for (const p of PRAYERS) {
          if (!i.prefs.prayer.which.includes(p)) continue;
          const start = prayerInstant(day, p, i.tz);
          const at = start - i.prefs.prayer.leadMinutes * 60_000;
          out.push({
            key: `prayer:${date}:${p}`,
            kind: "prayer",
            fireAt: at,
            title: `${PRAYER_LABEL[p]} soon`,
            body: `${PRAYER_LABEL[p]} starts at ${day.start[p]}.`,
            url: "/salah",
          });
        }
    }
    if (i.prefs.training.enabled) {
      for (const t of i.training) {
        if (t.weekday === weekdayIndex(date) && t.time) {
          const at = zonedInstant(date, t.time, i.tz) - i.prefs.training.leadMinutes * 60_000;
          out.push({
            key: `training:${date}:${t.id}`,
            kind: "training",
            fireAt: at,
            title: `Workout ${t.letter} today`,
            body: t.title,
            url: "/train",
          });
        }
      }
    }
    if (i.prefs.food.enabled) {
      out.push({
        key: `food:${date}`,
        kind: "food",
        fireAt: zonedInstant(date, i.prefs.food.time, i.tz),
        title: "Log today's meals",
        body: "A quick check-in on what you've eaten.",
        url: "/food",
      });
    }
  }
  return out
    .filter((r) => r.fireAt > i.now && r.fireAt <= end)
    .filter((r) => {
      if (!i.prefs.quiet.enabled) return true;
      const quiet = inQuietHours(
        localMinutes(r.fireAt, i.tz),
        i.prefs.quiet.start,
        i.prefs.quiet.end,
      );
      if (!quiet) return true;
      return r.kind === "prayer" && r.key.endsWith(":fajr") && i.prefs.quiet.allowFajr;
    })
    .sort((a, b) => a.fireAt - b.fireAt);
}

/** Does the quiet window swallow a wanted Fajr reminder? Used to ask the user explicitly. */
export function quietConflictsWithFajr(
  i: Pick<ReminderInput, "now" | "tz" | "prefs" | "prayerLookup">,
): boolean {
  if (!i.prefs.quiet.enabled || !i.prefs.prayer.enabled || !i.prefs.prayer.which.includes("fajr"))
    return false;
  const today = localDate(i.now, i.tz);
  for (let d = 0; d < 3; d++) {
    const day = i.prayerLookup(addDays(today, d));
    if (day) {
      const at = prayerInstant(day, "fajr", i.tz) - i.prefs.prayer.leadMinutes * 60_000;
      return inQuietHours(localMinutes(at, i.tz), i.prefs.quiet.start, i.prefs.quiet.end);
    }
  }
  return false;
}
