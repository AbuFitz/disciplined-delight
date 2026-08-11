import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

type DailyLogRow = {
  id: string;
  log_date: string;
  cardio_done: boolean;
  body_weight_kg: number | null;
  calories_logged: number | null;
};

async function loadAllLogs(
  userId: string,
): Promise<{ logs: Record<string, DayLog>; todayId: string | null }> {
  const [dayRes, exRes, suppRes] = await Promise.all([
    supabase!
      .from("daily_logs")
      .select("id, log_date, cardio_done, body_weight_kg, calories_logged")
      .eq("user_id", userId),
    supabase!
      .from("exercise_entries")
      .select("exercise_id, done, weight, daily_logs!inner(log_date, user_id)")
      .eq("daily_logs.user_id", userId),
    supabase!
      .from("supplement_entries")
      .select("supplement_id, done, daily_logs!inner(log_date, user_id)")
      .eq("daily_logs.user_id", userId),
  ]);

  const logs: Record<string, DayLog> = {};
  let todayId: string | null = null;
  const today = todayISO();

  for (const row of (dayRes.data ?? []) as DailyLogRow[]) {
    logs[row.log_date] = {
      exercises: {},
      cardioDone: row.cardio_done,
      supplements: {},
      bodyWeightKg: row.body_weight_kg ?? undefined,
      caloriesLogged: row.calories_logged ?? undefined,
    };
    if (row.log_date === today) todayId = row.id;
  }

  type ExRow = {
    exercise_id: string;
    done: boolean;
    weight: string | null;
    daily_logs: { log_date: string };
  };
  for (const row of (exRes.data ?? []) as unknown as ExRow[]) {
    const date = row.daily_logs.log_date;
    if (!logs[date]) logs[date] = emptyDay();
    logs[date]!.exercises[row.exercise_id] = { done: row.done, weight: row.weight ?? undefined };
  }

  type SuppRow = { supplement_id: string; done: boolean; daily_logs: { log_date: string } };
  for (const row of (suppRes.data ?? []) as unknown as SuppRow[]) {
    const date = row.daily_logs.log_date;
    if (!logs[date]) logs[date] = emptyDay();
    logs[date]!.supplements[row.supplement_id] = row.done;
  }

  return { logs, todayId };
}

export function useTrackerState() {
  const { user } = useAuth();
  const useDb = isSupabaseConfigured && !!user;

  const [state, setState] = useState<TrackerState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const todayLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (useDb) {
      Promise.all([
        loadAllLogs(user!.id),
        supabase!.from("user_settings").select("active_workout_tab").eq("id", user!.id).single(),
      ]).then(([{ logs, todayId }, settingsRes]) => {
        todayLogIdRef.current = todayId;
        setState({ activeTab: settingsRes.data?.active_workout_tab ?? "a", logs });
        setHydrated(true);
      });
      return;
    }

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
  }, [useDb, user]);

  useEffect(() => {
    if (!hydrated || useDb) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated, useDb]);

  const todayLog = state.logs[todayISO()] ?? emptyDay();

  /** Guarantees a daily_logs row exists for today and returns its id, caching the result. */
  const ensureTodayLogId = useCallback(async (): Promise<string> => {
    if (todayLogIdRef.current) return todayLogIdRef.current;
    const { data, error } = await supabase!
      .from("daily_logs")
      .upsert({ user_id: user!.id, log_date: todayISO() }, { onConflict: "user_id,log_date" })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Failed to create today's log");
    todayLogIdRef.current = data.id;
    return data.id;
  }, [user]);

  const setActiveTab = useCallback(
    (tab: string) => {
      setState((prev) => ({ ...prev, activeTab: tab }));
      if (useDb) {
        supabase!
          .from("user_settings")
          .update({ active_workout_tab: tab })
          .eq("id", user!.id)
          .then();
      }
    },
    [useDb, user],
  );

  const toggleExercise = useCallback(
    (id: string) => {
      let nextDone = false;
      setState((prev) => {
        const t = todayISO();
        const day = prev.logs[t] ?? emptyDay();
        const ex = day.exercises[id] ?? {};
        nextDone = !ex.done;
        return {
          ...prev,
          logs: {
            ...prev.logs,
            [t]: { ...day, exercises: { ...day.exercises, [id]: { ...ex, done: nextDone } } },
          },
        };
      });
      if (useDb) {
        ensureTodayLogId().then((logId) => {
          supabase!
            .from("exercise_entries")
            .upsert(
              { daily_log_id: logId, exercise_id: id, done: nextDone },
              { onConflict: "daily_log_id,exercise_id" },
            )
            .then();
        });
      }
    },
    [useDb, ensureTodayLogId],
  );

  const setExerciseWeight = useCallback(
    (id: string, weight: string) => {
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
      if (useDb) {
        ensureTodayLogId().then((logId) => {
          supabase!
            .from("exercise_entries")
            .upsert(
              { daily_log_id: logId, exercise_id: id, weight },
              { onConflict: "daily_log_id,exercise_id" },
            )
            .then();
        });
      }
    },
    [useDb, ensureTodayLogId],
  );

  const toggleCardio = useCallback(() => {
    let nextDone = false;
    setState((prev) => {
      const t = todayISO();
      const day = prev.logs[t] ?? emptyDay();
      nextDone = !day.cardioDone;
      return { ...prev, logs: { ...prev.logs, [t]: { ...day, cardioDone: nextDone } } };
    });
    if (useDb) {
      ensureTodayLogId().then((logId) => {
        supabase!.from("daily_logs").update({ cardio_done: nextDone }).eq("id", logId).then();
      });
    }
  }, [useDb, ensureTodayLogId]);

  const toggleSupplement = useCallback(
    (id: string) => {
      let nextDone = false;
      setState((prev) => {
        const t = todayISO();
        const day = prev.logs[t] ?? emptyDay();
        nextDone = !day.supplements[id];
        return {
          ...prev,
          logs: {
            ...prev.logs,
            [t]: { ...day, supplements: { ...day.supplements, [id]: nextDone } },
          },
        };
      });
      if (useDb) {
        ensureTodayLogId().then((logId) => {
          supabase!
            .from("supplement_entries")
            .upsert(
              { daily_log_id: logId, supplement_id: id, done: nextDone },
              { onConflict: "daily_log_id,supplement_id" },
            )
            .then();
        });
      }
    },
    [useDb, ensureTodayLogId],
  );

  const setBodyWeight = useCallback(
    (kg: number | undefined) => {
      setState((prev) => {
        const t = todayISO();
        const day = prev.logs[t] ?? emptyDay();
        return { ...prev, logs: { ...prev.logs, [t]: { ...day, bodyWeightKg: kg } } };
      });
      if (useDb) {
        ensureTodayLogId().then((logId) => {
          supabase!
            .from("daily_logs")
            .update({ body_weight_kg: kg ?? null })
            .eq("id", logId)
            .then();
        });
      }
    },
    [useDb, ensureTodayLogId],
  );

  const setCaloriesLogged = useCallback(
    (kcal: number | undefined) => {
      setState((prev) => {
        const t = todayISO();
        const day = prev.logs[t] ?? emptyDay();
        return { ...prev, logs: { ...prev.logs, [t]: { ...day, caloriesLogged: kcal } } };
      });
      if (useDb) {
        ensureTodayLogId().then((logId) => {
          supabase!
            .from("daily_logs")
            .update({ calories_logged: kcal ?? null })
            .eq("id", logId)
            .then();
        });
      }
    },
    [useDb, ensureTodayLogId],
  );

  const reset = useCallback(() => {
    setState(defaultState());
    todayLogIdRef.current = null;
    if (useDb) {
      supabase!.from("daily_logs").delete().eq("user_id", user!.id).then();
    }
  }, [useDb, user]);

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
