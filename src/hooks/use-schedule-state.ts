import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sunrise-strength-schedule-v2";

export type ScheduleStep = {
  id: string;
  /** Stable handle for the "key times" quick-editor in Settings — never shown to the user. */
  key?: "fajr" | "wake" | "gym" | "work" | "dinner";
  startTime: string; // 24h "HH:MM"
  endTime?: string; // 24h "HH:MM"
  approx?: boolean;
  label: string;
  detail: string;
  highlight: boolean;
};

const defaultSteps = (): ScheduleStep[] => [
  {
    id: "step-0",
    startTime: "21:00",
    endTime: "21:30",
    label: "Phone charges outside the bedroom",
    detail: "Magnesium supplement. Wind down.",
    highlight: false,
  },
  { id: "step-1", startTime: "21:30", approx: true, label: "Sleep", detail: "", highlight: false },
  {
    id: "step-2",
    key: "fajr",
    startTime: "03:14",
    label: "Fajr",
    detail: "Pray, then straight back to bed — don't touch your phone.",
    highlight: true,
  },
  {
    id: "step-3",
    key: "wake",
    startTime: "05:00",
    label: "Alarm",
    detail:
      "Phone across the room, not on the bed. Get up, get dressed. No phone until you're back from the gym.",
    highlight: false,
  },
  {
    id: "step-4",
    startTime: "05:15",
    endTime: "05:45",
    label: "Light stretch, water, out the door",
    detail: "",
    highlight: false,
  },
  {
    id: "step-5",
    key: "gym",
    startTime: "06:00",
    endTime: "07:00",
    label: "Gym session",
    detail: "GymGroup — today's rotation.",
    highlight: true,
  },
  {
    id: "step-6",
    startTime: "07:00",
    endTime: "07:30",
    label: "Shower, breakfast, morning supplements",
    detail: "",
    highlight: false,
  },
  {
    id: "step-7",
    key: "work",
    startTime: "09:30",
    endTime: "18:00",
    label: "Work",
    detail: "",
    highlight: false,
  },
  {
    id: "step-8",
    key: "dinner",
    startTime: "18:30",
    endTime: "19:00",
    label: "Dinner",
    detail: "",
    highlight: false,
  },
  {
    id: "step-9",
    startTime: "19:00",
    endTime: "21:00",
    label: "Life admin, food prep for tomorrow",
    detail: "",
    highlight: false,
  },
];

const isValidSteps = (v: unknown): v is ScheduleStep[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.every((s) => s && typeof s === "object" && typeof (s as ScheduleStep).startTime === "string");

const pad = (n: number) => String(n).padStart(2, "0");

const to12h = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${pad(m)}${period}`;
};

export function formatStepTime(step: Pick<ScheduleStep, "startTime" | "endTime" | "approx">) {
  const start = `${step.approx ? "~" : ""}${to12h(step.startTime)}`;
  return step.endTime ? `${start}–${to12h(step.endTime)}` : start;
}

export function useScheduleState() {
  const [steps, setSteps] = useState<ScheduleStep[]>(defaultSteps);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted schedule after mount only — keeps SSR markup deterministic.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidSteps(parsed)) setSteps(parsed);
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

  const updateStepByKey = useCallback((key: ScheduleStep["key"], patch: Partial<ScheduleStep>) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }, []);

  const addStep = useCallback(() => {
    const id = `step-${Date.now()}`;
    setSteps((prev) => [
      ...prev,
      { id, startTime: "12:00", label: "New step", detail: "", highlight: false },
    ]);
    return id;
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

  const findByKey = useCallback(
    (key: ScheduleStep["key"]) => steps.find((s) => s.key === key),
    [steps],
  );

  return {
    steps,
    updateStep,
    updateStepByKey,
    addStep,
    removeStep,
    moveStep,
    resetToDefault,
    findByKey,
  };
}
