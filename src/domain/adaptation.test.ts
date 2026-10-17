import { describe, expect, it } from "vitest";
import type { Session, SessionExercise } from "@/data/types";
import {
  estimateReadiness,
  readinessAssociation,
  shouldSuggestDeload,
  suggestAdaptation,
} from "./adaptation";

const exercise = (over: Partial<SessionExercise> = {}): SessionExercise => ({
  id: "e",
  name: "Squat",
  prescription: { sets: 3, repMin: 6, repMax: 8, schemeText: "3 × 6–8" },
  sets: [0, 1, 2].map((i) => ({
    id: String(i),
    kind: "working",
    completed: true,
    weightKg: 80,
    reps: 8,
    rir: 2,
  })),
  ...over,
});
const session = (day: number, ex = exercise(), over: Partial<Session> = {}): Session => ({
  id: `s${day}`,
  date: `2026-10-${String(day).padStart(2, "0")}`,
  templateId: "t",
  templateName: "Full body",
  status: "completed",
  startedAt: Date.UTC(2026, 9, day),
  endedAt: Date.UTC(2026, 9, day, 1),
  pausedMs: 0,
  exercises: [ex],
  ...over,
});

describe("readiness estimate", () => {
  it("keeps the plan for neutral midpoint ratings with enough time", () => {
    const result = estimateReadiness(
      { sleep: 3, soreness: 3, energy: 3, stress: 3, timeAvailable: 60 },
      60,
    );
    expect(result).toMatchObject({ action: "keep", score: 50 });
    expect(result.contributors).toEqual(["ratings are within your usual range"]);
  });
  it("prioritises a user-marked aggravating movement", () => {
    const result = estimateReadiness(
      {
        sleep: 5,
        soreness: 1,
        energy: 5,
        stress: 1,
        timeAvailable: 60,
        aggravatingExerciseId: "e",
      },
      60,
    );
    expect(result.action).toBe("swap_aggravating");
  });
  it("uses time before a generic recovery reduction", () => {
    expect(
      estimateReadiness({ sleep: 1, soreness: 5, energy: 1, stress: 5, timeAvailable: 20 }, 60)
        .action,
    ).toBe("shorten");
  });
  it("is deterministic and explainable", () => {
    const input = {
      sleep: 2 as const,
      soreness: 4 as const,
      energy: 2 as const,
      stress: 4 as const,
      timeAvailable: 60,
    };
    expect(estimateReadiness(input, 60)).toEqual(estimateReadiness(input, 60));
    expect(estimateReadiness(input, 60).contributors.length).toBeGreaterThan(0);
  });
});

describe("adaptation v1", () => {
  it("requires repeated successful exposures before increasing", () => {
    expect(suggestAdaptation(exercise(), [session(1)], Date.UTC(2026, 9, 2)).action).toBe("hold");
    expect(
      suggestAdaptation(exercise(), [session(1), session(3)], Date.UTC(2026, 9, 4)),
    ).toMatchObject({
      action: "increase_load",
      weightKg: 82.5,
    });
  });
  it("uses a conservative return after a break", () => {
    expect(suggestAdaptation(exercise(), [session(1)], Date.UTC(2026, 10, 1))).toMatchObject({
      action: "reduce_load",
      weightKg: 72,
    });
  });
  it("never suggests a deload from one poor day", () => {
    const failed = exercise({ sets: [{ id: "f", kind: "failure", completed: true, rpe: 10 }] });
    expect(shouldSuggestDeload([session(1, failed)])).toBe(false);
    expect(shouldSuggestDeload([session(1, failed), session(3, failed), session(5, failed)])).toBe(
      true,
    );
  });
  it("gates associations until six observations and avoids causal language", () => {
    const withReadiness = (day: number, score: number) =>
      session(day, exercise(), {
        readiness: {
          sleep: 3,
          soreness: 3,
          energy: 3,
          stress: 3,
          timeAvailable: 45,
          submittedAt: day,
          score,
          suggestion: "keep",
          reason: "test",
          contributors: [],
        },
      });
    expect(readinessAssociation([1, 2, 3, 4, 5].map((d) => withReadiness(d, 70)))).toBeNull();
    const result = readinessAssociation(
      [1, 2, 3, 4, 5, 6].map((d) => withReadiness(d, d < 4 ? 70 : 40)),
    );
    expect(result?.statement).toContain("associated");
    expect(result?.statement).toContain("does not show causation");
  });
});
