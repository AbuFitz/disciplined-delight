import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "sunrise-strength-workout-mode-v1";

export type WorkoutMode = "week" | "day";

export function useWorkoutMode() {
  const { user } = useAuth();
  const useDb = isSupabaseConfigured && !!user;

  const [mode, setModeState] = useState<WorkoutMode>("week");
  const [hydrated, setHydrated] = useState(false);

  // Load persisted mode after mount only — keeps SSR markup deterministic.
  useEffect(() => {
    if (useDb) {
      supabase!
        .from("user_settings")
        .select("workout_mode")
        .eq("id", user!.id)
        .single()
        .then(({ data }) => {
          if (data?.workout_mode === "week" || data?.workout_mode === "day") {
            setModeState(data.workout_mode);
          }
          setHydrated(true);
        });
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "week" || raw === "day") setModeState(raw);
    } catch {
      // corrupt or unavailable storage — fall back to default
    }
    setHydrated(true);
  }, [useDb, user]);

  useEffect(() => {
    if (!hydrated || useDb) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, hydrated, useDb]);

  const setMode = useCallback(
    (next: WorkoutMode) => {
      setModeState(next);
      if (useDb) {
        supabase!.from("user_settings").update({ workout_mode: next }).eq("id", user!.id).then();
      }
    },
    [useDb, user],
  );

  return { mode, setMode };
}
