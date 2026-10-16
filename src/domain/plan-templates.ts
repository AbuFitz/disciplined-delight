import { EQUIPMENT_LABEL, MUSCLE_LABEL, type CatalogueExercise } from "./catalogue";
import type { Plan, PlannedExercise } from "./planner";
import { formatSeconds } from "./tracking";
import type { TemplateExercise, WorkoutTemplate } from "@/data/types";

const LETTERS = "ABCDEFGH";

export function schemeText(x: PlannedExercise): string {
  if (x.tracking === "time") return `${x.sets} × ${formatSeconds(x.seconds ?? 30)} hold`;
  const reps = x.repMin === x.repMax ? `${x.repMin}` : `${x.repMin}–${x.repMax}`;
  return `${x.sets} × ${reps}`;
}

/** Turn an accepted plan into editable workout templates. No loads are written. Pure: ids come from `mkId`. */
export function planToTemplates(
  plan: Plan,
  byId: Map<string, CatalogueExercise>,
  mkId: () => string,
  startOrder = 0,
): WorkoutTemplate[] {
  return plan.sessions.map((s, i) => {
    const exercises: TemplateExercise[] = s.exercises.map((x) => {
      const cat = byId.get(x.exerciseId);
      const eq = x.equipment.filter((q) => q !== "bodyweight" && q !== "mat");
      const timed = x.tracking === "time";
      return {
        id: mkId(),
        name: x.name,
        sets: x.sets,
        repMin: timed ? 1 : (x.repMin ?? 8),
        repMax: timed ? 1 : (x.repMax ?? 12),
        schemeText: schemeText(x),
        equipment: eq.length ? eq.map((q) => EQUIPMENT_LABEL[q]).join(", ") : "Bodyweight",
        restSeconds: x.restSec,
        cue: cat?.cues[0],
        muscle: x.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(", ") || undefined,
        catalogueId: x.exerciseId,
        tracking: x.tracking,
        targetSeconds: timed ? x.seconds : undefined,
        superset: x.superset,
      };
    });
    return {
      id: mkId(),
      letter: LETTERS[i] ?? String(i + 1),
      title: s.title,
      focus: s.focus,
      weekday: (s.weekday + 6) % 7,
      exercises,
      order: startOrder + i,
    };
  });
}
