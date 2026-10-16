import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, localDate } from "@/domain/dates";
import { useCollection } from "./hooks";
import {
  DEFAULT_PRAYER_SETTINGS,
  makeLookup,
  refreshPrayerTimes,
  type StoredPrayerDay,
} from "./prayer";
import { COL, type PrayerLog, type PrayerSettings } from "./types";
import { put } from "./db";

/** Prayer settings, cached days and logs; refreshes the cache when today/tomorrow are missing and online. */
export function usePrayer(now: number) {
  const s = useCollection<PrayerSettings>(COL.prayerSettings);
  const d = useCollection<StoredPrayerDay>(COL.prayerDays);
  const l = useCollection<PrayerLog>(COL.prayerLogs);
  const settings = s.items[0];
  const lookup = useMemo(() => makeLookup(d.items, settings), [d.items, settings]);
  const tz = settings?.timezone ?? "Europe/London";
  const today = localDate(now, tz);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef<string>("");

  const needs =
    !!settings &&
    settings.mode === "aladhan" &&
    d.ready &&
    (!lookup(today) || !lookup(addDays(today, 1)));
  const key = settings ? `${settings.version}:${today}` : "";

  const refresh = async () => {
    if (!settings || settings.mode !== "aladhan") return;
    setRefreshing(true);
    setError(null);
    try {
      await refreshPrayerTimes(settings, today);
    } catch (e) {
      setError(navigator.onLine ? (e as Error).message : "You're offline.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!needs || tried.current === key || !navigator.onLine) return;
    tried.current = key;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needs, key]);

  return {
    ready: s.ready && d.ready && l.ready,
    settings,
    lookup,
    logs: l.items,
    days: d.items,
    today,
    tz,
    refreshing,
    error,
    refresh,
    configured: !!settings,
  };
}

export async function ensureDefaultPrayerSettings(): Promise<PrayerSettings> {
  const s = { ...DEFAULT_PRAYER_SETTINGS };
  await put(COL.prayerSettings, "main", s);
  return s;
}
