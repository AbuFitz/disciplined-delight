import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sunrise-strength-tracker-v1";

export type ExerciseLog = { done?: boolean; weight?: string };

export type DayLog = {
  exercises: Record<string, ExerciseLog>;
  cardioDone: boolean;
  supplements: Record<string, boolean>;
  /** Optional daily check-in — powers the adaptive-TDEE estimate on /progress. */
  bodyWeightKg?: number;
  caloriesLogged?: number;
};

type TrackerState = {
  activeTab: string;
  logs: Record<string, DayLog>;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const dateAt = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const dayLetter = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2).toUpperCase();
};

const emptyDay = (): DayLog => ({ exercises: {}, cardioDone: false, supplements: {} });

const defaultState = (): TrackerState => ({ activeTab: "a", logs: { [todayISO()]: emptyDay() } });

const isDayDone = (log: DayLog | undefined) =>
  !!log && (log.cardioDone || Object.values(log.exercises).some((e) => e.done));

export function useTrackerState() {
  const [state, setState] = useState<TrackerState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state after mount only — keeps SSR markup deterministic.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TrackerState;
        const t = todayISO();
        setState({
          activeTab: parsed.activeTab ?? "a",
          logs: { ...parsed.logs, [t]: parsed.logs?.[t] ?? emptyDay() },
        });
      }
    } catch {
      // corrupt or unavailable storage — fall back to defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const todayLog = state.logs[todayISO()] ?? emptyDay();

  const setActiveTab = useCallback((tab: string) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleExercise = useCallback((id: string) => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      const ex = day.exercises[id] ?? {};
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [t]: { ...day, exercises: { ...day.exercises, [id]: { ...ex, done: !ex.done } } },
        },
      };
    });
  }, []);

  const setExerciseWeight = useCallback((id: string, weight: string) => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      const ex = day.exercises[id] ?? {};
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [t]: { ...day, exercises: { ...day.exercises, [id]: { ...ex, weight } } },
        },
      };
    });
  }, []);

  const toggleCardio = useCallback(() => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      return { ...prev, logs: { ...prev.logs, [t]: { ...day, cardioDone: !day.cardioDone } } };
    });
  }, []);

  const toggleSupplement = useCallback((id: string) => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [t]: { ...day, supplements: { ...day.supplements, [id]: !day.supplements[id] } },
        },
      };
    });
  }, []);

  const setBodyWeight = useCallback((kg: number | undefined) => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      return { ...prev, logs: { ...prev.logs, [t]: { ...day, bodyWeightKg: kg } } };
    });
  }, []);

  const setCaloriesLogged = useCallback((kcal: number | undefined) => {
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      return { ...prev, logs: { ...prev.logs, [t]: { ...day, caloriesLogged: kcal } } };
    });
  }, []);

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const weekCount = [0, -1, -2, -3, -4, -5, -6].filter((o) =>
    isDayDone(state.logs[dateAt(o)]),
  ).length;
  const totalSessions = Object.values(state.logs).filter(isDayDone).length;
  const last7Days = [-6, -5, -4, -3, -2, -1, 0].map((offset) => ({
    offset,
    letter: dayLetter(offset),
    done: isDayDone(state.logs[dateAt(offset)]),
    isToday: offset === 0,
  }));

  let currentStreak = 0;
  for (let o = 0; ; o--) {
    if (!isDayDone(state.logs[dateAt(o)])) break;
    currentStreak++;
  }

  return {
    hydrated,
    activeTab: state.activeTab,
    setActiveTab,
    todayLog,
    /** Every day ever logged, keyed by ISO date — for PR/volume history on /progress. */
    logs: state.logs,
    toggleExercise,
    setExerciseWeight,
    toggleCardio,
    toggleSupplement,
    setBodyWeight,
    setCaloriesLogged,
    reset,
    weekCount,
    totalSessions,
    currentStreak,
    last7Days,
  };
}
