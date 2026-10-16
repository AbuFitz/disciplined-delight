import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { list, subscribe } from "./db";
import { runMigration, type MigrationReport } from "./legacy";
import { COL, type Profile } from "./types";
import { DEFAULT_TZ, localDate } from "@/domain/dates";

type Snap<T> = { items: T[]; ready: boolean };
const cache = new Map<string, Snap<unknown>>();
const loading = new Set<string>();
const EMPTY: Snap<never> = { items: [], ready: false };

function load(col: string) {
  if (typeof indexedDB === "undefined" || loading.has(col)) return;
  loading.add(col);
  list(col)
    .then((items) => cache.set(col, { items, ready: true }))
    .catch(() => cache.set(col, { items: [], ready: true }))
    .finally(() => {
      loading.delete(col);
      listenersFor(col).forEach((f) => f());
    });
}
const local = new Map<string, Set<() => void>>();
const listenersFor = (c: string) => local.get(c) ?? new Set();

/** Live list of non-deleted records in a collection (client only). */
export function useCollection<T>(col: string): Snap<T> {
  const sub = useMemo(
    () => (fn: () => void) => {
      const set = local.get(col) ?? new Set();
      set.add(fn);
      local.set(col, set);
      const off = subscribe(col, () => {
        loading.delete(col);
        load(col);
      });
      if (!cache.has(col)) load(col);
      return () => {
        set.delete(fn);
        off();
      };
    },
    [col],
  );
  return useSyncExternalStore(
    sub,
    () => (cache.get(col) as Snap<T> | undefined) ?? (EMPTY as Snap<T>),
    () => EMPTY as Snap<T>,
  );
}

type Ctx = { ready: boolean; report: MigrationReport | null; error: string | null };
const DataCtx = createContext<Ctx>({ ready: false, report: null, error: null });

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ ready: false, report: null, error: null });
  useEffect(() => {
    let alive = true;
    runMigration()
      .then((report) => alive && setState({ ready: true, report, error: null }))
      .catch(
        (e) => alive && setState({ ready: false, report: null, error: String(e?.message ?? e) }),
      );
    return () => {
      alive = false;
    };
  }, []);
  return createElement(DataCtx.Provider, { value: state }, children);
}
export const useData = () => useContext(DataCtx);

export function useProfile(): { profile: Profile | undefined; ready: boolean } {
  const { items, ready } = useCollection<Profile>(COL.profile);
  return { profile: items[0], ready };
}

/** Current instant, refreshed on an interval and when the tab regains focus. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);
  return now;
}

export function useToday(tz?: string) {
  const now = useNow(30_000);
  return localDate(now, tz ?? DEFAULT_TZ);
}
