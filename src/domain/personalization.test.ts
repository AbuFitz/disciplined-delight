import { describe, expect, it } from "vitest";
import type { CatalogueExercise, EquipmentId } from "./catalogue";
import type { PlanningProfile } from "@/data/types";
import { derivePlanDefaults } from "./personalization";

const base: PlanningProfile = {
  primaryGoal: "strength",
  secondaryGoals: [],
  experience: "new",
  trainingDays: [0, 2, 4],
  sessionMinutes: 45,
  environment: "gym",
  constraints: "",
  dislikedMovements: "",
  nutritionApproach: "balanced",
  dietaryNeeds: "",
  sleep: { start: "23:00", end: "07:00" },
  work: { start: "09:00", end: "17:00", weekdays: [0, 1, 2, 3, 4] },
  quiet: { start: "21:30", end: "07:30" },
  reminderIntensity: "essential",
};
const exercise = (id: string, name: string) => ({ id, name }) as CatalogueExercise;

describe("planning profile", () => {
  it("changes goal, volume, schedule, style and exclusions deterministically", () => {
    const gym: EquipmentId[] = ["machine", "cable"];
    const first = derivePlanDefaults(
      { ...base, dislikedMovements: "Burpees", constraints: "avoid overhead pressing" },
      gym,
      [exercise("a", "Burpees"), exercise("b", "Row")],
    );
    expect(first).toMatchObject({
      goal: "get_stronger",
      experience: "new",
      daysPerWeek: 3,
      preferredDays: [1, 3, 5],
      sessionMinutes: 45,
      style: "machines_cables",
      avoidPatterns: ["push_vertical"],
      excludedExercises: ["a"],
    });
    expect(
      derivePlanDefaults(
        {
          ...base,
          experience: "returning",
          trainingDays: [1, 4],
          sessionMinutes: 30,
          environment: "home",
        },
        ["bodyweight"],
        [],
      ),
    ).toMatchObject({
      goal: "return_to_routine",
      daysPerWeek: 2,
      sessionMinutes: 30,
      style: "bodyweight",
    });
    expect(derivePlanDefaults(base, gym, []).rationale).toEqual(
      derivePlanDefaults(base, gym, []).rationale,
    );
  });
  it("does not guess around disclosed pain or injury", () => {
    expect(
      derivePlanDefaults({ ...base, constraints: "knee injury" }, ["bodyweight"], [])
        .clinicianRestricted,
    ).toBe(true);
  });
  it("adapts conservatively to low recovery without diagnosing", () => {
    const result = derivePlanDefaults(
      {
        ...base,
        trainingDays: [0, 1, 2, 3, 4],
        sessionMinutes: 75,
        physiology: {
          units: "metric",
          activity: "moderate",
          recovery: "low",
          energy: "low",
          limitations: "",
          medicalSafetyFlag: false,
          typicalSleepHours: 5.5,
        },
      },
      ["bodyweight"],
      [],
    );
    expect(result.daysPerWeek).toBe(3);
    expect(result.sessionMinutes).toBe(45);
    expect(result.rationale.join(" ")).toMatch(/reported sleep or recovery/);
  });
  it("does not jump training frequency by more than one session", () => {
    const result = derivePlanDefaults(
      {
        ...base,
        trainingDays: [0, 1, 2, 3, 4],
        physiology: {
          units: "metric",
          activity: "moderate",
          recovery: "good",
          energy: "good",
          limitations: "",
          medicalSafetyFlag: false,
          currentSessionsPerWeek: 2,
        },
      },
      ["bodyweight"],
      [],
    );
    expect(result.daysPerWeek).toBe(3);
    expect(result.rationale.join(" ")).toMatch(/no more than one session/);
  });
  it("hard-gates medical flags and under-18 setup", () => {
    const physiology = {
      units: "metric" as const,
      activity: "moderate" as const,
      recovery: "okay" as const,
      energy: "okay" as const,
      limitations: "",
      medicalSafetyFlag: true,
    };
    expect(
      derivePlanDefaults({ ...base, physiology }, ["bodyweight"], []).clinicianRestricted,
    ).toBe(true);
    expect(
      derivePlanDefaults(
        {
          ...base,
          physiology: { ...physiology, medicalSafetyFlag: false, ageBand: "under-18" },
        },
        ["bodyweight"],
        [],
      ).clinicianRestricted,
    ).toBe(true);
  });
});
