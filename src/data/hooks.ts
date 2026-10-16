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
import { useScope } from "./scope-context";
import { list, subscribe } from "./db";
import { getScope, onScopeChange, scopeGeneration } from "./scope";
import { runMigration, type MigrationReport } from "./legacy";
import { COL, type Profile } from "./types";
import { DEFAULT_TZ, localDate } from "@/domain/dates";

type Snap<T> = { items: T[]; ready: boolean };
const cache = new Map<string, Snap<unknown>>();
const loading = new Set<string>();
const EMPTY: Snap<never> = { items: [], ready: false };

function load(col: string) {
  if (typeof indexedDB === "undefined" || !getScope() || loading.has(col)) return;
  const gen = scopeGeneration();
  loading.add(col);
  list(col)
    .then((items) => {
      // A result from a previous account/guest scope must never populate the current one.
      if (gen === scopeGeneration()) cache.set(col, { items, ready: true });
    })
    .catch(() => {
      if (gen === scopeGeneration()) cache.set(col, { items: [], ready: true });
    })
    .finally(() => {
      if (gen !== scopeGeneration()) return;
      loading.delete(col);
      listenersFor(col).forEach((f) => f());
    });
}
const local = new Map<string, Set<() => void>>();

/** On any scope change drop every cached record and tell mounted hooks to reload from the new scope. */
export function resetCaches() {
  cache.clear();
  loading.clear();
  for (const [col, set] of local) {
    set.forEach((f) => f());
    if (set.size > 0) load(col);
  }
}
onScopeChange(resetCaches);

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
  const scope = useScope();
  const [state, setState] = useState<Ctx>({ ready: false, report: null, error: null });
  useEffect(() => {
    let alive = true;
    // Only the guest scope can hold the original app's browser data; accounts start from their own blank state.
    runMigration(scope.kind === "guest" ? globalThis.localStorage : undefined)
      .then((report) => alive && setState({ ready: true, report, error: null }))
      .catch(
        (e) => alive && setState({ ready: false, report: null, error: String(e?.message ?? e) }),
      );
    return () => {
      alive = false;
    };
  }, [scope]);
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
