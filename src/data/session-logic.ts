import type { LegacyDayLog, Session, SessionExercise, SessionSet } from "./types";
import { suggestNext, type Suggestion } from "@/domain/progression";

export type Previous = { date: string; sets: SessionSet[]; sessionId: string };

/** Latest earlier session containing the same exercise with ≥1 completed working set. */
export function previousComparable(
  ex: SessionExercise,
  sessions: Session[],
  currentId: string,
): Previous | null {
  const done = sessions
    .filter((s) => s.id !== currentId && (s.status === "completed" || s.status === "ended-early"))
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const s of done) {
    const match = s.exercises.find(
      (e) =>
        (ex.templateExerciseId && e.templateExerciseId === ex.templateExerciseId) ||
        e.name === ex.name,
    );
    if (!match) continue;
    const sets = match.sets.filter(
      (x) => x.kind === "working" && x.completed && !x.skipped && x.weightKg != null,
    );
    if (sets.length) return { date: s.date, sets, sessionId: s.id };
  }
  return null;
}

/** Old single-weight entry for display only. Never expanded into sets. */
export function legacyHint(
  ex: SessionExercise,
  days: LegacyDayLog[],
): { date: string; weight: string } | null {
  if (!ex.legacyId) return null;
  const hit = [...days]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((d) => d.exercises[ex.legacyId!]?.weight);
  return hit ? { date: hit.date, weight: hit.exercises[ex.legacyId!]!.weight! } : null;
}

export function suggestionFor(ex: SessionExercise, prev: Previous | null): Suggestion {
  if (!prev) return { kind: "none", reason: "No earlier session to compare with." };
  return suggestNext(prev.sets, ex.prescription, ex.incrementKg ?? 2.5);
}

/** Value placeholders for a working set: previous set this session, else same set last time. */
export function placeholderFor(
  ex: SessionExercise,
  index: number,
  prev: Previous | null,
): { weightKg?: number; reps?: number } {
  const before = [...ex.sets.slice(0, index)]
    .reverse()
    .find((s) => s.completed && s.kind === "working" && s.weightKg != null);
  const prevSet = prev?.sets[Math.min(index, prev.sets.length - 1)];
  return { weightKg: before?.weightKg ?? prevSet?.weightKg, reps: before?.reps ?? prevSet?.reps };
}

export function sessionSummary(s: Session) {
  let planned = 0,
    completed = 0,
    skipped = 0,
    volume = 0,
    exercisesTouched = 0;
  for (const e of s.exercises) {
    const working = e.sets.filter((x) => x.kind === "working");
    planned += working.length;
    const done = working.filter((x) => x.completed && !x.skipped);
    completed += done.length;
    skipped += working.filter((x) => x.skipped).length;
    if (done.length) exercisesTouched++;
    for (const x of done) if (x.weightKg != null && x.reps != null) volume += x.weightKg * x.reps;
  }
  return {
    planned,
    completed,
    skipped,
    volume: Math.round(volume),
    exercisesTouched,
    exerciseCount: s.exercises.length,
  };
}
