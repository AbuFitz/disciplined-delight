import { addDays, type ISODate } from "@/domain/dates";
import { aladhanUrl, parseAladhanCalendar, PRAYERS, type PrayerDay } from "@/domain/prayer";
import { bulkPut, get, list, put, remove } from "./db";
import { COL, type PrayerSettings } from "./types";

export type StoredPrayerDay = PrayerDay & {
  origin: "calculated" | "manual";
  /** Calculated days are only valid for the settings version they were fetched with. */
  settingsVersion?: number;
  fetchedAt: number;
  /** Mosque / Jumu'ah info entered by the user. */
  jumuah?: string;
};

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  id: "main",
  mode: "aladhan",
  locality: "Hemel Hempstead",
  country: "United Kingdom",
  timezone: "Europe/London",
  method: 15,
  school: 0,
  latitudeAdjustmentMethod: 3,
  version: 1,
};

export const sourceIdOf = (s: PrayerSettings) =>
  s.mode === "manual"
    ? `manual:${s.locality}`
    : `aladhan:${s.locality}:${s.country}:m${s.method}:s${s.school}:l${s.latitudeAdjustmentMethod}:v${s.version}`;

const addMinutes = (hhmm: string, mins: number) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const t = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** Builds a lookup that ignores cache from other settings versions and applies minute adjustments. */
export function makeLookup(days: StoredPrayerDay[], settings: PrayerSettings | undefined) {
  const byDate = new Map<ISODate, StoredPrayerDay>();
  for (const d of days) {
    if (d.origin === "manual" || (settings && d.settingsVersion === settings.version))
      byDate.set(d.date, d);
  }
  return (date: ISODate): StoredPrayerDay | undefined => {
    const d = byDate.get(date);
    if (!d) return undefined;
    const adj = d.origin === "calculated" ? settings?.adjustments : undefined;
    if (!adj) return d;
    const start = { ...d.start };
    for (const p of PRAYERS) if (adj[p]) start[p] = addMinutes(start[p], adj[p]!);
    return { ...d, start };
  };
}

export async function fetchMonth(
  settings: PrayerSettings,
  year: number,
  month: number,
  fetchImpl: typeof fetch = fetch,
): Promise<StoredPrayerDay[]> {
  const res = await fetchImpl(
    aladhanUrl(
      {
        city: settings.locality,
        country: settings.country,
        method: settings.method,
        school: settings.school,
        latitudeAdjustmentMethod: settings.latitudeAdjustmentMethod,
      },
      year,
      month,
    ),
  );
  if (!res.ok) throw new Error(`Prayer time service responded ${res.status}`);
  const days = parseAladhanCalendar(await res.json(), sourceIdOf(settings));
  if (days.length === 0) throw new Error("The prayer time service returned no usable days.");
  return days.map((d) => ({
    ...d,
    origin: "calculated" as const,
    settingsVersion: settings.version,
    fetchedAt: Date.now(),
  }));
}

/** Fetch the month of `date` (and next month if within 7 days of month end) and cache it. */
export async function refreshPrayerTimes(
  settings: PrayerSettings,
  date: ISODate,
  fetchImpl: typeof fetch = fetch,
) {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const months = new Set<string>([`${y}-${m}`]);
  const ahead = addDays(date, 7).split("-").map(Number) as [number, number];
  months.add(`${ahead[0]}-${ahead[1]}`);
  let stored = 0;
  for (const key of months) {
    const [yy, mm] = key.split("-").map(Number) as [number, number];
    const days = await fetchMonth(settings, yy, mm, fetchImpl);
    const existingManual = new Set(
      (await list<StoredPrayerDay>(COL.prayerDays))
        .filter((d) => d.origin === "manual")
        .map((d) => d.date),
    );
    const toWrite = days
      .filter((d) => !existingManual.has(d.date))
      .map((d) => ({ collection: COL.prayerDays, id: d.date, data: d }));
    stored += (await bulkPut(toWrite, { overwrite: true, track: false })).written;
  }
  return stored;
}

export async function savePrayerSettings(next: PrayerSettings, prev?: PrayerSettings) {
  const methodChanged =
    !prev ||
    prev.mode !== next.mode ||
    prev.method !== next.method ||
    prev.school !== next.school ||
    prev.latitudeAdjustmentMethod !== next.latitudeAdjustmentMethod ||
    prev.locality !== next.locality ||
    prev.country !== next.country ||
    prev.timezone !== next.timezone;
  const saved = { ...next, version: methodChanged && prev ? prev.version + 1 : next.version };
  await put(COL.prayerSettings, "main", saved);
  return saved;
}

export async function saveManualDay(
  d: Omit<StoredPrayerDay, "origin" | "fetchedAt" | "sourceId">,
  settings: PrayerSettings,
) {
  const day: StoredPrayerDay = {
    ...d,
    origin: "manual",
    sourceId: `manual:${settings.locality}`,
    fetchedAt: Date.now(),
  };
  await put(COL.prayerDays, d.date, day, { track: true });
}

export async function clearManualDay(date: ISODate) {
  await remove(COL.prayerDays, date);
}
export const getPrayerSettings = () => get<PrayerSettings>(COL.prayerSettings, "main");
