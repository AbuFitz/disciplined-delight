import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORED_PROGRAMMES,
  AUTHORED_WORKOUTS,
  authoredWorkoutToTemplate,
  filterAuthoredWorkouts,
} from "./workout-library";

describe("authored workout library", () => {
  it("ships a meaningful, connected set of sessions and programmes", () => {
    expect(AUTHORED_WORKOUTS).toHaveLength(12);
    expect(AUTHORED_PROGRAMMES).toHaveLength(4);
    const ids = new Set(AUTHORED_WORKOUTS.map((workout) => workout.id));
    for (const programme of AUTHORED_PROGRAMMES)
      expect(programme.workoutIds.every((id) => ids.has(id))).toBe(true);
  });

  it("uses only exercise ids in the committed licensed catalogue", () => {
    const snapshot = JSON.parse(
      readFileSync(join(process.cwd(), "public/catalogue/v1/exercises.json"), "utf8"),
    ) as { exercises: { id: string }[] };
    const ids = new Set(snapshot.exercises.map((exercise) => exercise.id));
    for (const exercise of AUTHORED_WORKOUTS.flatMap((workout) => workout.exercises))
      expect(ids.has(exercise.catalogueId!)).toBe(true);
  });

  it("filters deterministically across multiple dimensions", () => {
    const result = filterAuthoredWorkouts(AUTHORED_WORKOUTS, {
      goal: "return",
      duration: 35,
      equipment: "bodyweight",
    });
    expect(result.map((workout) => workout.id)).toEqual(["bodyweight-base", "reset-session"]);
  });

  it("converts to a versioned, customisable template", () => {
    const template = authoredWorkoutToTemplate(AUTHORED_WORKOUTS[0]!, 3);
    expect(template.source).toMatchObject({ kind: "authored", workoutId: "foundation-a" });
    expect(template.weekday).toBeNull();
    expect(template.exercises.every((exercise) => !!exercise.catalogueId)).toBe(true);
  });
});
