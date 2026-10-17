import { useEffect, useState, useSyncExternalStore } from "react";

export type MediaPrefs = { autoFlip: boolean; dataSaver: boolean };
const KEY = "vayvor-media-prefs";
const listeners = new Set<() => void>();
let cache: MediaPrefs | null = null;

function read(): MediaPrefs {
  if (cache) return cache;
  let saved: Partial<MediaPrefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<MediaPrefs>;
  } catch {
    /* storage unavailable */
  }
  const conn =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      : undefined;
  cache = { autoFlip: saved.autoFlip ?? false, dataSaver: saved.dataSaver ?? !!conn?.saveData };
  return cache;
}
const SERVER: MediaPrefs = { autoFlip: false, dataSaver: false };

export function setMediaPrefs(patch: Partial<MediaPrefs>) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Device-level media preferences: auto-flip of illustrated steps and data saving. Never synced. */
export function useMediaPrefs(): MediaPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => SERVER,
  );
}

export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(q.matches);
    u();
    q.addEventListener("change", u);
    return () => q.removeEventListener("change", u);
  }, []);
  return reduced;
}
