import type { Session, SessionExercise, SessionSet } from "@/data/types";

export const estimatedOneRepMax = (weightKg: number, reps: number) =>
  reps <= 0 || weightKg <= 0 ? 0 : Math.round(weightKg * (1 + reps / 30) * 10) / 10;

const recordedWork = (exercise: SessionExercise) =>
  exercise.sets.filter(
    (set) =>
      set.kind !== "warmup" &&
      set.completed &&
      !set.skipped &&
      (set.weightKg ?? 0) > 0 &&
      (set.reps ?? 0) > 0,
  );

export function livePersonalRecord(
  exercise: SessionExercise,
  sessions: Session[],
  currentSessionId: string,
) {
  const current = Math.max(
    0,
    ...recordedWork(exercise).map((set) => estimatedOneRepMax(set.weightKg!, set.reps!)),
  );
  const previous = Math.max(
    0,
    ...sessions
      .filter(
        (session) =>
          session.id !== currentSessionId &&
          (session.status === "completed" || session.status === "ended-early"),
      )
      .flatMap((session) =>
        session.exercises.filter(
          (item) =>
            (exercise.catalogueId && item.catalogueId === exercise.catalogueId) ||
            item.name === exercise.name,
        ),
      )
      .flatMap(recordedWork)
      .map((set) => estimatedOneRepMax(set.weightKg!, set.reps!)),
  );
  return current > previous && current > 0
    ? {
        current,
        previous: previous || undefined,
        improvement: previous ? current - previous : undefined,
      }
    : null;
}

export function warmupRamp(targetKg: number): Pick<SessionSet, "kind" | "weightKg" | "reps">[] {
  if (targetKg <= 0) return [];
  const round = (value: number) => Math.max(2.5, Math.round(value / 2.5) * 2.5);
  const ramp: Pick<SessionSet, "kind" | "weightKg" | "reps">[] = [
    { kind: "warmup", weightKg: round(targetKg * 0.4), reps: 8 },
    { kind: "warmup", weightKg: round(targetKg * 0.6), reps: 5 },
    { kind: "warmup", weightKg: round(targetKg * 0.8), reps: 3 },
  ];
  return ramp.filter(
    (set, index, all) => all.findIndex((item) => item.weightKg === set.weightKg) === index,
  );
}

export function plateBreakdown(
  totalKg: number,
  barKg = 20,
  plates = [25, 20, 15, 10, 5, 2.5, 1.25],
) {
  let perSide = Math.max(0, (totalKg - barKg) / 2);
  const result: { kg: number; countPerSide: number }[] = [];
  for (const kg of plates) {
    const countPerSide = Math.floor((perSide + 1e-6) / kg);
    if (countPerSide) result.push({ kg, countPerSide });
    perSide = Math.round((perSide - countPerSide * kg) * 100) / 100;
  }
  return { plates: result, remainderPerSide: perSide };
}
