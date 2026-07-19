import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sunrise-strength-workout-mode-v1";

export type WorkoutMode = "week" | "day";

export function useWorkoutMode() {
  const [mode, setModeState] = useState<WorkoutMode>("week");
  const [hydrated, setHydrated] = useState(false);

  // Load persisted mode after mount only — keeps SSR markup deterministic.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "week" || raw === "day") setModeState(raw);
    } catch {
      // corrupt or unavailable storage — fall back to default
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, hydrated]);

  const setMode = useCallback((next: WorkoutMode) => setModeState(next), []);

  return { mode, setMode };
}
