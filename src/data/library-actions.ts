import { EQUIPMENT_LABEL, MUSCLE_LABEL, type CatalogueExercise } from "@/domain/catalogue";
import { applyBatch, list, newId } from "./db";
import { scopeGeneration } from "./scope";
import { COL, type TemplateExercise, type WorkoutTemplate } from "./types";

/** A sensible, editable starting prescription for a catalogue exercise. No load is ever suggested. */
export function templateExerciseFrom(
  e: CatalogueExercise,
  mk: () => string = newId,
): TemplateExercise {
  const timed = e.tracking === "time";
  const eq = e.equipment.filter((q) => q !== "bodyweight" && q !== "mat");
  const [min, max] = timed ? [1, 1] : e.tracking === "bodyweight_reps" ? [8, 15] : [8, 12];
  return {
    id: mk(),
    name: e.name,
    sets: timed ? 2 : 3,
    repMin: min,
    repMax: max,
    schemeText: timed ? "2 × 30 s hold" : `3 × ${min}–${max}`,
    equipment: eq.length ? eq.map((q) => EQUIPMENT_LABEL[q]).join(", ") : "Bodyweight",
    restSeconds: 90,
    cue: e.cues[0],
    muscle: e.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(", ") || undefined,
    catalogueId: e.id,
    tracking: e.tracking,
    targetSeconds: timed ? 30 : undefined,
  };
}

/** Append an exercise to one of the person's workouts (or start a new unscheduled one). One atomic write. */
export async function addExerciseToWorkout(
  e: CatalogueExercise,
  target: { templateId: string } | { newTitle: string },
): Promise<{ templateId: string; added: boolean }> {
  const all = await list<WorkoutTemplate>(COL.templates);
  const gen = scopeGeneration();
  if ("templateId" in target) {
    const t = all.find((x) => x.id === target.templateId && !x.archivedAt);
    if (!t) throw new Error("That workout is no longer available.");
    if (t.exercises.some((x) => x.catalogueId === e.id)) return { templateId: t.id, added: false };
    await applyBatch(
      [
        {
          collection: COL.templates,
          id: t.id,
          op: "put",
          data: { ...t, exercises: [...t.exercises, templateExerciseFrom(e)] },
        },
      ],
      { generation: gen },
    );
    return { templateId: t.id, added: true };
  }
  const id = newId();
  const order = all.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  const tpl: WorkoutTemplate = {
    id,
    letter: "NEW",
    title: target.newTitle.trim() || e.name,
    focus: "Built from the library",
    weekday: null,
    exercises: [templateExerciseFrom(e)],
    order,
  };
  await applyBatch([{ collection: COL.templates, id, op: "put", data: tpl }], { generation: gen });
  return { templateId: id, added: true };
}
