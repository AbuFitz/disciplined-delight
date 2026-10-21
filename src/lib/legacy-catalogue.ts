import type { CatalogueExercise } from "@/domain/catalogue";

/**
 * The original app's machine and cable exercises, matched to the closest catalogue movement. The original app's own
 * reference photos were removed (their source and licence could not be established), so these workouts now use the same
 * licensed catalogue media as everything else. Matching is by catalogue name and is checked by a test.
 */
export const LEGACY_TO_CATALOGUE_NAME: Record<string, string> = {
  "Flat Chest Press Machine": "Machine Chest Press",
  "Chest Press Machine": "Machine Chest Press",
  "Incline Chest Press Machine": "Machine Incline Chest Press",
  "Cable Chest Fly": "Cable Fly",
  "Rope Tricep Pushdown": "Cable Tricep Pushdown",
  "Overhead Rope Tricep Extension": "Cable Overhead Tricep Extension",
  "Single-Arm Cable Tricep Extension": "Single Arm Tricep Pushdown",
  "Lat Pulldown": "Lat Pulldown",
  "Seated Cable Row": "Seated Cable Row",
  "Straight-Arm Cable/Rope Pulldown": "Straight-Arm Pulldown",
  "Bicep Curl Machine / Standing Cable Curl": "Machine Bicep Curl",
  "Machine Preacher Curl": "Machine Preacher Curl",
  "Standing Cable Bicep Curl": "Cable Curl",
  "Rope Hammer Curl": "Cable Hammer Curl",
  "Shoulder Press Machine": "Machine shoulder press",
  "Cable Lateral Raise": "Cable Lateral Raise",
  "Reverse Pec Deck": "Machine Reverse Fly",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Resolve a template exercise (by catalogue id, then legacy mapping, then exact name) to a catalogue exercise. */
export function resolveCatalogueExercise(
  exercise: { name: string; catalogueId?: string },
  all: readonly CatalogueExercise[],
  byId: Map<string, CatalogueExercise>,
): CatalogueExercise | undefined {
  if (exercise.catalogueId) {
    const hit = byId.get(exercise.catalogueId);
    if (hit) return hit;
  }
  const target = norm(LEGACY_TO_CATALOGUE_NAME[exercise.name] ?? exercise.name);
  return all.find((e) => norm(e.name) === target);
}
