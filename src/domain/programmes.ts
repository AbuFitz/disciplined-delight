/**
 * Authored programme structures and training rules, VERSIONED.
 * Everything a reviewer needs to check lives here and in docs/TRAINING-RULES.md.
 *
 * STATUS: written from general, widely used resistance-training guidance. It has NOT been reviewed by a qualified
 * coach or clinician. Do not offer it as a public template library until that review has happened.
 */
import type { MuscleId, Pattern } from "./catalogue";

export const RULES_VERSION = "2026.1-draft";

export type Goal = "build_muscle" | "get_stronger" | "general_fitness" | "return_to_routine";
export type Experience = "new" | "returning" | "some";
export type SlotRole = "primary" | "secondary" | "accessory" | "core" | "conditioning";
export type RepScheme = "compound" | "isolation" | "core" | "conditioning";

export type Slot = {
  key: string;
  patterns: Pattern[];
  /** Used to pick a different exercise for repeats of the same pattern in one week. */
  role: SlotRole;
  scheme: RepScheme;
  /** 1 = never dropped first; higher numbers are dropped first when time is short. */
  priority: number;
  /** Candidate for pairing with its antagonist slot in a superset when time is tight. */
  pairWith?: string;
};

export type SessionBlueprint = {
  title: string;
  focus: string;
  emphasises: MuscleId[];
  slots: Slot[];
};
export type Programme = {
  id: string;
  name: string;
  daysPerWeek: 2 | 3 | 4 | 5;
  sessions: SessionBlueprint[];
  summary: string;
};

const S = (
  key: string,
  patterns: Pattern[],
  role: SlotRole,
  scheme: RepScheme,
  priority: number,
  pairWith?: string,
): Slot => ({
  key,
  patterns,
  role,
  scheme,
  priority,
  pairWith,
});

const fullA: SessionBlueprint = {
  title: "Full body A",
  focus: "Squat and horizontal push/pull",
  emphasises: ["quads", "chest", "lats"],
  slots: [
    S("squat", ["squat"], "primary", "compound", 1),
    S("push_h", ["push_horizontal"], "primary", "compound", 1, "pull_h"),
    S("pull_h", ["pull_horizontal"], "primary", "compound", 1, "push_h"),
    S("hinge", ["hinge", "glute"], "secondary", "compound", 3),
    S("shoulder", ["shoulder_isolation", "push_vertical"], "accessory", "isolation", 5),
    S("core", ["core"], "core", "core", 4),
  ],
};
const fullB: SessionBlueprint = {
  title: "Full body B",
  focus: "Hinge and vertical push/pull",
  emphasises: ["hamstrings", "shoulders", "lats"],
  slots: [
    S("hinge", ["hinge"], "primary", "compound", 1),
    S("push_v", ["push_vertical", "push_horizontal"], "primary", "compound", 1, "pull_v"),
    S("pull_v", ["pull_vertical", "pull_horizontal"], "primary", "compound", 1, "push_v"),
    S("lunge", ["lunge", "squat"], "secondary", "compound", 3),
    S("biceps", ["arms_biceps"], "accessory", "isolation", 5, "triceps"),
    S("triceps", ["arms_triceps"], "accessory", "isolation", 5, "biceps"),
    S("core", ["core"], "core", "core", 4),
  ],
};
const fullC: SessionBlueprint = {
  title: "Full body C",
  focus: "Lunge, push and pull variations",
  emphasises: ["glutes", "chest", "traps"],
  slots: [
    S("lunge", ["lunge", "squat"], "primary", "compound", 1),
    S("push_h", ["push_horizontal", "chest_isolation"], "primary", "compound", 1, "pull_h"),
    S("pull_h", ["pull_horizontal", "pull_vertical"], "primary", "compound", 1, "push_h"),
    S("glute", ["glute", "hinge", "leg_isolation"], "secondary", "compound", 3),
    S("shoulder", ["shoulder_isolation"], "accessory", "isolation", 5),
    S("calf", ["calf"], "accessory", "isolation", 6),
    S("core", ["core"], "core", "core", 4),
  ],
};
const upperA: SessionBlueprint = {
  title: "Upper A",
  focus: "Horizontal push and pull",
  emphasises: ["chest", "lats", "shoulders"],
  slots: [
    S("push_h", ["push_horizontal"], "primary", "compound", 1, "pull_h"),
    S("pull_h", ["pull_horizontal"], "primary", "compound", 1, "push_h"),
    S("push_v", ["push_vertical", "shoulder_isolation"], "secondary", "compound", 3),
    S("pull_v", ["pull_vertical", "back_isolation"], "secondary", "compound", 3),
    S("biceps", ["arms_biceps"], "accessory", "isolation", 5, "triceps"),
    S("triceps", ["arms_triceps"], "accessory", "isolation", 5, "biceps"),
  ],
};
const lowerA: SessionBlueprint = {
  title: "Lower A",
  focus: "Squat emphasis",
  emphasises: ["quads", "glutes", "hamstrings"],
  slots: [
    S("squat", ["squat"], "primary", "compound", 1),
    S("hinge", ["hinge"], "secondary", "compound", 2),
    S("lunge", ["lunge"], "secondary", "compound", 4),
    S("leg_iso", ["leg_isolation", "glute"], "accessory", "isolation", 5),
    S("calf", ["calf"], "accessory", "isolation", 6),
    S("core", ["core"], "core", "core", 4),
  ],
};
const upperB: SessionBlueprint = {
  title: "Upper B",
  focus: "Vertical pull and overhead push",
  emphasises: ["lats", "shoulders", "chest"],
  slots: [
    S("pull_v", ["pull_vertical", "pull_horizontal"], "primary", "compound", 1, "push_v"),
    S("push_v", ["push_vertical", "push_horizontal"], "primary", "compound", 1, "pull_v"),
    S("push_h", ["push_horizontal", "chest_isolation"], "secondary", "compound", 3),
    S("pull_h", ["pull_horizontal", "back_isolation"], "secondary", "compound", 3),
    S("shoulder", ["shoulder_isolation"], "accessory", "isolation", 5),
    S("biceps", ["arms_biceps"], "accessory", "isolation", 5, "triceps"),
    S("triceps", ["arms_triceps"], "accessory", "isolation", 5, "biceps"),
  ],
};
const lowerB: SessionBlueprint = {
  title: "Lower B",
  focus: "Hinge emphasis",
  emphasises: ["hamstrings", "glutes", "quads"],
  slots: [
    S("hinge", ["hinge"], "primary", "compound", 1),
    S("squat", ["squat", "lunge"], "secondary", "compound", 2),
    S("glute", ["glute", "lunge"], "secondary", "compound", 4),
    S("leg_iso", ["leg_isolation"], "accessory", "isolation", 5),
    S("calf", ["calf"], "accessory", "isolation", 6),
    S("core", ["core"], "core", "core", 4),
  ],
};
const push: SessionBlueprint = {
  title: "Push",
  focus: "Chest, shoulders, triceps",
  emphasises: ["chest", "shoulders", "triceps"],
  slots: [
    S("push_h", ["push_horizontal"], "primary", "compound", 1),
    S("push_v", ["push_vertical", "push_horizontal"], "secondary", "compound", 2),
    S("chest_iso", ["chest_isolation"], "accessory", "isolation", 4),
    S("shoulder", ["shoulder_isolation"], "accessory", "isolation", 5),
    S("triceps", ["arms_triceps"], "accessory", "isolation", 5),
  ],
};
const pull: SessionBlueprint = {
  title: "Pull",
  focus: "Back and biceps",
  emphasises: ["lats", "traps", "biceps"],
  slots: [
    S("pull_v", ["pull_vertical", "pull_horizontal"], "primary", "compound", 1),
    S("pull_h", ["pull_horizontal"], "primary", "compound", 1),
    S("back_iso", ["back_isolation", "shoulder_isolation"], "accessory", "isolation", 4),
    S("biceps", ["arms_biceps"], "accessory", "isolation", 5),
    S("core", ["core"], "core", "core", 4),
  ],
};
const legs: SessionBlueprint = {
  title: "Legs",
  focus: "Quads, hamstrings, glutes, calves",
  emphasises: ["quads", "hamstrings", "glutes"],
  slots: [
    S("squat", ["squat"], "primary", "compound", 1),
    S("hinge", ["hinge"], "primary", "compound", 1),
    S("lunge", ["lunge", "glute"], "secondary", "compound", 3),
    S("leg_iso", ["leg_isolation"], "accessory", "isolation", 5),
    S("calf", ["calf"], "accessory", "isolation", 6),
  ],
};

export const PROGRAMMES: Programme[] = [
  {
    id: "fullbody-2",
    name: "Full body, 2 days",
    daysPerWeek: 2,
    sessions: [fullA, fullB],
    summary: "Two whole-body sessions a week. A simple base for returning or time-short weeks.",
  },
  {
    id: "fullbody-3",
    name: "Full body, 3 days",
    daysPerWeek: 3,
    sessions: [fullA, fullB, fullC],
    summary: "Three whole-body sessions with different variations, spaced across the week.",
  },
  {
    id: "upperlower-4",
    name: "Upper / lower, 4 days",
    daysPerWeek: 4,
    sessions: [upperA, lowerA, upperB, lowerB],
    summary: "Each muscle group trained twice a week across four sessions.",
  },
  {
    id: "ppl-5",
    name: "Push / pull / legs + upper / lower, 5 days",
    daysPerWeek: 5,
    sessions: [push, pull, legs, upperA, lowerB],
    summary: "Five sessions: a push/pull/legs split plus an upper and a lower day.",
  },
];

/* ------------------------------ Rule constants ------------------------------ */

export type RepRange = { min: number; max: number };

export const REPS: Record<Goal, Record<RepScheme, RepRange>> = {
  build_muscle: {
    compound: { min: 6, max: 10 },
    isolation: { min: 10, max: 15 },
    core: { min: 10, max: 15 },
    conditioning: { min: 10, max: 10 },
  },
  get_stronger: {
    compound: { min: 4, max: 6 },
    isolation: { min: 8, max: 12 },
    core: { min: 8, max: 12 },
    conditioning: { min: 10, max: 10 },
  },
  general_fitness: {
    compound: { min: 8, max: 12 },
    isolation: { min: 10, max: 15 },
    core: { min: 10, max: 15 },
    conditioning: { min: 10, max: 15 },
  },
  return_to_routine: {
    compound: { min: 10, max: 15 },
    isolation: { min: 12, max: 15 },
    core: { min: 10, max: 15 },
    conditioning: { min: 10, max: 10 },
  },
};

export const REST_SECONDS: Record<Goal, Record<SlotRole, number>> = {
  build_muscle: { primary: 150, secondary: 105, accessory: 75, core: 45, conditioning: 30 },
  get_stronger: { primary: 180, secondary: 120, accessory: 90, core: 60, conditioning: 30 },
  general_fitness: { primary: 105, secondary: 90, accessory: 60, core: 45, conditioning: 30 },
  return_to_routine: { primary: 120, secondary: 90, accessory: 60, core: 45, conditioning: 30 },
};

/** Working sets per exercise by role. Beginners and people returning start low; no exercise exceeds 4. */
export function setsFor(role: SlotRole, goal: Goal, experience: Experience): number {
  const base: Record<SlotRole, number> = {
    primary: 3,
    secondary: 3,
    accessory: 3,
    core: 2,
    conditioning: 1,
  };
  let n = base[role];
  if (experience === "new" || experience === "returning")
    n = Math.min(n, role === "primary" ? 3 : 2);
  if (goal === "return_to_routine") n = Math.min(n, 2);
  if (goal === "get_stronger" && role === "primary" && experience === "some") n = 4;
  return Math.max(1, Math.min(4, n));
}

/** Hard sets per muscle per week: inclusive guard rails used by validation (primary muscles count 1, secondary 0.5). */
export const WEEKLY_SETS: Record<Experience, { min: number; max: number }> = {
  new: { min: 4, max: 10 },
  returning: { min: 4, max: 10 },
  some: { min: 8, max: 18 },
};

export const TIMING = {
  warmupMinutes: 5,
  setupSeconds: 60,
  transitionSeconds: 20,
  secondsPerRep: 3.5,
};

/** Names we never pick automatically (they stay browsable). Conservative and reviewable. */
export const AUTO_AVOID =
  /behind (the )?neck|good morning|upright row|kipping|snatch|clean|jerk|pistol|muscle[- ]?up|handstand|planche|lever|dislocate|deficit|sissy|archer|one[- ]arm|single[- ]arm pull|bear walk|isometric wipers|jefferson|hercules|fingerboard|sloper|rest \(/i;
export const ADVANCED_ONLY =
  /one[- ]leg|single[- ]leg deadlift|weighted dip|hang(ing)? (power|leg)|ring|trx/i;
