import type { TemplateExercise, WorkoutTemplate } from "@/data/types";

export type ExerciseKey = { catalogueId?: string; name: string; sets: number; schemeText: string };
const key = (x: ExerciseKey) => x.catalogueId ?? `name:${x.name.toLowerCase()}`;

export type SessionDiff = {
  title: string;
  added: string[];
  removed: string[];
  changed: { name: string; from: string; to: string }[];
  unchanged: number;
};

/** Compare two ordered sessions of exercises. Matches by catalogue id (or name for hand-added exercises). */
export function diffSession(title: string, from: ExerciseKey[], to: ExerciseKey[]): SessionDiff {
  const f = new Map(from.map((x) => [key(x), x]));
  const t = new Map(to.map((x) => [key(x), x]));
  const added = to.filter((x) => !f.has(key(x))).map((x) => x.name);
  const removed = from.filter((x) => !t.has(key(x))).map((x) => x.name);
  const changed: SessionDiff["changed"] = [];
  let unchanged = 0;
  for (const [k, a] of f) {
    const b = t.get(k);
    if (!b) continue;
    if (a.sets !== b.sets || a.schemeText !== b.schemeText)
      changed.push({ name: b.name, from: a.schemeText, to: b.schemeText });
    else unchanged++;
  }
  return { title, added, removed, changed, unchanged };
}

/** Pair old and new sessions by position (programmes are ordered) and describe what regeneration would change. */
export function diffPlans(
  oldSessions: { title: string; exercises: ExerciseKey[] }[],
  newSessions: { title: string; exercises: ExerciseKey[] }[],
): { sessions: SessionDiff[]; sessionsAdded: string[]; sessionsRemoved: string[] } {
  const n = Math.min(oldSessions.length, newSessions.length);
  return {
    sessions: Array.from({ length: n }, (_, i) =>
      diffSession(newSessions[i]!.title, oldSessions[i]!.exercises, newSessions[i]!.exercises),
    ),
    sessionsAdded: newSessions.slice(n).map((s) => s.title),
    sessionsRemoved: oldSessions.slice(n).map((s) => s.title),
  };
}

export const toKey = (x: TemplateExercise): ExerciseKey => ({
  catalogueId: x.catalogueId,
  name: x.name,
  sets: x.sets,
  schemeText: x.schemeText,
});

/** True when the person has changed a plan's workouts since it was accepted (so regeneration must not silently replace them). */
export function editedSince(
  snapshot: { templateId: string; exercises: ExerciseKey[] }[],
  current: WorkoutTemplate[],
): boolean {
  return snapshot.some((s) => {
    const t = current.find((c) => c.id === s.templateId);
    if (!t || t.archivedAt) return true;
    const a = s.exercises.map((x) => `${key(x)}|${x.sets}|${x.schemeText}`);
    const b = t.exercises.map((x) => `${key(toKey(x))}|${x.sets}|${x.schemeText}`);
    return a.length !== b.length || a.some((v, i) => v !== b[i]);
  });
}
