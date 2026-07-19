import { useCallback, useEffect, useState } from "react";
import { SKELETON } from "@/lib/sunrise-data";

const STORAGE_KEY = "sunrise-strength-schedule-v1";

export type ScheduleStep = {
  id: string;
  time: string;
  label: string;
  detail: string;
  highlight: boolean;
};

const defaultSteps = (): ScheduleStep[] =>
  SKELETON.map((s, i) => ({
    id: `step-${i}`,
    time: s.time,
    label: s.label,
    detail: s.detail ?? "",
    highlight: s.highlight,
  }));

export function useScheduleState() {
  const [steps, setSteps] = useState<ScheduleStep[]>(defaultSteps);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted schedule after mount only — keeps SSR markup deterministic.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScheduleStep[];
        if (Array.isArray(parsed) && parsed.length > 0) setSteps(parsed);
      }
    } catch {
      // corrupt or unavailable storage — fall back to defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(steps));
  }, [steps, hydrated]);

  const updateStep = useCallback((id: string, patch: Partial<ScheduleStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        time: "12:00pm",
        label: "New step",
        detail: "",
        highlight: false,
      },
    ]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[newIdx]!;
      copy[newIdx] = tmp;
      return copy;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setSteps(defaultSteps());
  }, []);

  return { steps, updateStep, addStep, removeStep, moveStep, resetToDefault };
}
