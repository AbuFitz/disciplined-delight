import type { TemplateExercise, WorkoutTemplate } from "@/data/types";

export const AUTHORED_LIBRARY_VERSION = "2026.10.1";
export type LibraryGoal = "strength" | "muscle" | "fitness" | "mobility" | "return";
export type LibraryLevel = "new" | "returning" | "some";
export type LibraryLocation = "home" | "gym" | "anywhere";
export type AuthoredExercise = TemplateExercise & {
  block: "prepare" | "primary" | "support" | "finish";
  rirTarget: number;
  intent: string;
  substitutions: string[];
};
export type AuthoredWorkout = {
  id: string;
  version: string;
  title: string;
  summary: string;
  goal: LibraryGoal[];
  level: LibraryLevel[];
  duration: number;
  location: LibraryLocation;
  equipment: string[];
  muscles: string[];
  constraints: string[];
  exercises: AuthoredExercise[];
};
export type AuthoredProgramme = {
  id: string;
  version: string;
  title: string;
  summary: string;
  goal: LibraryGoal;
  level: LibraryLevel[];
  weeks: number;
  daysPerWeek: number;
  workoutIds: string[];
  progression: string;
  deload: string;
  returnRule: string;
};

const E = (
  id: string,
  name: string,
  sets: number,
  reps: [number, number],
  restSeconds: number,
  block: AuthoredExercise["block"],
  rirTarget: number,
  equipment: string,
  muscle: string,
  intent: string,
  substitutions: string[] = [],
): AuthoredExercise => ({
  id: `${id}:${sets}:${reps.join("-")}`,
  catalogueId: id,
  name,
  sets,
  repMin: reps[0],
  repMax: reps[1],
  schemeText: `${sets} × ${reps[0]}–${reps[1]} @ ${rirTarget} RIR`,
  restSeconds,
  equipment,
  muscle,
  tracking: "weight_reps",
  block,
  rirTarget,
  intent,
  substitutions,
});

const squat = E(
  "repdb:goblet-squat",
  "Goblet Squat",
  3,
  [8, 12],
  90,
  "primary",
  2,
  "Dumbbell",
  "Quads",
  "Knee-dominant squat",
  ["Bodyweight Squat", "Leg Press"],
);
const hinge = E(
  "wger:65d12ecf-54b8-466d-a412-e55c396cad69",
  "Dumbbell Romanian Deadlift",
  3,
  [8, 12],
  105,
  "primary",
  2,
  "Dumbbell",
  "Hamstrings",
  "Hip hinge",
  ["Glute Bridge", "Barbell Romanian Deadlift (RDL)"],
);
const push = E(
  "repdb:db-bench-press",
  "Dumbbell Bench Press",
  3,
  [8, 12],
  105,
  "primary",
  2,
  "Dumbbell + bench",
  "Chest",
  "Horizontal push",
  ["Push Ups", "Chest Press Machine"],
);
const row = E(
  "repdb:bent-over-db-row",
  "Bent Over Dumbbell Row",
  3,
  [8, 12],
  90,
  "primary",
  2,
  "Dumbbell",
  "Back",
  "Horizontal pull",
  ["Seated Cable Row", "Ring Row"],
);
const press = E(
  "repdb:dumbbell-shoulder-press",
  "Dumbbell Shoulder Press",
  3,
  [8, 12],
  90,
  "support",
  2,
  "Dumbbell",
  "Shoulders",
  "Vertical push",
  ["Machine Shoulder Press", "Pike Push Ups"],
);
const pulldown = E(
  "repdb:lat-pulldown",
  "Lat Pulldown",
  3,
  [8, 12],
  90,
  "support",
  2,
  "Cable",
  "Lats",
  "Vertical pull",
  ["Band Assisted Pull Ups", "Neutral Grip Pull Ups"],
);
const split = E(
  "repdb:bulgarian-split-squat",
  "Bulgarian Split Squat",
  2,
  [8, 12],
  75,
  "support",
  2,
  "Dumbbell",
  "Quads + glutes",
  "Single-leg squat",
  ["Reverse Lunge", "Step Ups"],
);
const bridge = E(
  "wger:ceb0c2d0-06ac-4a49-89e7-8d7b1c1e5672",
  "Glute Bridge",
  3,
  [10, 15],
  75,
  "support",
  3,
  "Bodyweight",
  "Glutes",
  "Hip extension",
  ["Hip Thrust"],
);
const plank = {
  ...E(
    "wger:dd9dcfd2-879f-422a-ad06-d2c187c58d1f",
    "Front Plank",
    3,
    [30, 45],
    45,
    "finish",
    3,
    "Bodyweight",
    "Core",
    "Anti-extension core",
  ),
  tracking: "time" as const,
  targetSeconds: 30,
  schemeText: "3 × 30–45 sec",
};
const pushup = E(
  "repdb:wall-push-ups",
  "Wall Push Ups",
  3,
  [8, 15],
  60,
  "primary",
  3,
  "Bodyweight",
  "Chest",
  "Accessible horizontal push",
  ["Push Ups", "Incline Push Ups"],
);
const bodySquat = E(
  "repdb:bodyweight-squat",
  "Bodyweight Squat",
  3,
  [10, 15],
  60,
  "primary",
  3,
  "Bodyweight",
  "Quads",
  "Bodyweight squat",
  ["Goblet Squat"],
);
const facePull = E(
  "wger:d7a418d4-d0cb-4f85-8a7c-1e9d97152cbd",
  "Cable Face Pull",
  2,
  [12, 15],
  60,
  "finish",
  3,
  "Cable",
  "Upper back",
  "Scapular pull",
  ["Band Face Pull"],
);
const legPress = E(
  "wger:66a42396-c207-44da-bc75-758a89d32404",
  "Leg Press",
  4,
  [6, 10],
  150,
  "primary",
  2,
  "Machine",
  "Quads",
  "Heavy knee-dominant press",
  ["Goblet Squat"],
);
const cableRow = E(
  "wger:0ecfec6f-5d0f-4e8a-8d37-f6203a8923b8",
  "Seated Cable Row",
  4,
  [6, 10],
  120,
  "primary",
  2,
  "Cable",
  "Back",
  "Heavy horizontal pull",
  ["Bent Over Dumbbell Row"],
);
const hipThrust = E(
  "repdb:hip-thrust",
  "Barbell Hip Thrust",
  4,
  [6, 10],
  120,
  "primary",
  2,
  "Barbell + bench",
  "Glutes",
  "Loaded hip extension",
  ["Glute Bridge"],
);

const W = (input: Omit<AuthoredWorkout, "version">): AuthoredWorkout => ({
  ...input,
  version: AUTHORED_LIBRARY_VERSION,
});

export const AUTHORED_WORKOUTS: AuthoredWorkout[] = [
  W({
    id: "foundation-a",
    title: "Foundation A",
    summary: "A measured full-body session built around squat, push and pull.",
    goal: ["fitness", "return"],
    level: ["new", "returning"],
    duration: 40,
    location: "home",
    equipment: ["dumbbell", "bench"],
    muscles: ["full body", "quads", "chest", "back"],
    constraints: ["low impact"],
    exercises: [squat, push, row, plank],
  }),
  W({
    id: "foundation-b",
    title: "Foundation B",
    summary: "Hinge, vertical work and single-leg practice without junk volume.",
    goal: ["fitness", "return"],
    level: ["new", "returning"],
    duration: 42,
    location: "home",
    equipment: ["dumbbell", "bench"],
    muscles: ["full body", "hamstrings", "shoulders"],
    constraints: ["low impact"],
    exercises: [hinge, press, split, plank],
  }),
  W({
    id: "express-full",
    title: "Full body express",
    summary: "Three large movement patterns for a time-limited day.",
    goal: ["fitness", "muscle"],
    level: ["returning", "some"],
    duration: 25,
    location: "anywhere",
    equipment: ["dumbbell"],
    muscles: ["full body"],
    constraints: ["time-short"],
    exercises: [squat, push, row],
  }),
  W({
    id: "bodyweight-base",
    title: "Bodyweight base",
    summary: "An accessible no-equipment session with controlled ranges.",
    goal: ["return", "fitness"],
    level: ["new", "returning"],
    duration: 28,
    location: "anywhere",
    equipment: ["bodyweight"],
    muscles: ["full body", "core"],
    constraints: ["no equipment", "low impact"],
    exercises: [bodySquat, pushup, bridge, plank],
  }),
  W({
    id: "upper-build",
    title: "Upper build",
    summary: "Balanced upper-body hypertrophy with push and pull symmetry.",
    goal: ["muscle"],
    level: ["returning", "some"],
    duration: 50,
    location: "gym",
    equipment: ["dumbbell", "cable", "bench"],
    muscles: ["chest", "back", "shoulders"],
    constraints: [],
    exercises: [push, cableRow, press, pulldown, facePull],
  }),
  W({
    id: "lower-build",
    title: "Lower build",
    summary: "Quad, hinge and glute work with a stable progression base.",
    goal: ["muscle"],
    level: ["returning", "some"],
    duration: 52,
    location: "gym",
    equipment: ["machine", "dumbbell", "barbell"],
    muscles: ["quads", "hamstrings", "glutes"],
    constraints: [],
    exercises: [legPress, hinge, hipThrust, split],
  }),
  W({
    id: "strength-upper",
    title: "Strength upper",
    summary: "Lower-rep pressing and rowing with enough support work to stay balanced.",
    goal: ["strength"],
    level: ["some"],
    duration: 60,
    location: "gym",
    equipment: ["dumbbell", "cable", "bench"],
    muscles: ["chest", "back", "shoulders"],
    constraints: [],
    exercises: [
      { ...push, sets: 4, repMin: 5, repMax: 8, schemeText: "4 × 5–8 @ 2 RIR", restSeconds: 150 },
      cableRow,
      press,
      pulldown,
      facePull,
    ],
  }),
  W({
    id: "strength-lower",
    title: "Strength lower",
    summary: "Heavy leg press and hip extension, then controlled unilateral work.",
    goal: ["strength"],
    level: ["some"],
    duration: 60,
    location: "gym",
    equipment: ["machine", "barbell", "dumbbell"],
    muscles: ["quads", "hamstrings", "glutes"],
    constraints: [],
    exercises: [legPress, hipThrust, hinge, split],
  }),
  W({
    id: "posterior-chain",
    title: "Posterior chain",
    summary: "Hinge, glute and back work for a strong posterior line.",
    goal: ["muscle", "strength"],
    level: ["returning", "some"],
    duration: 45,
    location: "gym",
    equipment: ["dumbbell", "cable", "barbell"],
    muscles: ["hamstrings", "glutes", "back"],
    constraints: [],
    exercises: [hinge, hipThrust, cableRow, facePull],
  }),
  W({
    id: "push-pull-30",
    title: "Push / pull 30",
    summary: "Antagonist upper-body work that fits a lunch break.",
    goal: ["muscle", "fitness"],
    level: ["returning", "some"],
    duration: 30,
    location: "gym",
    equipment: ["dumbbell", "cable"],
    muscles: ["chest", "back"],
    constraints: ["time-short"],
    exercises: [push, cableRow, press, pulldown],
  }),
  W({
    id: "lower-30",
    title: "Lower 30",
    summary: "A compact lower-body day without rushing the primary work.",
    goal: ["muscle", "fitness"],
    level: ["returning", "some"],
    duration: 30,
    location: "gym",
    equipment: ["machine", "dumbbell"],
    muscles: ["quads", "hamstrings", "glutes"],
    constraints: ["time-short"],
    exercises: [legPress, hinge, bridge],
  }),
  W({
    id: "reset-session",
    title: "Return reset",
    summary: "Two working sets per pattern for the first weeks back.",
    goal: ["return"],
    level: ["returning"],
    duration: 32,
    location: "anywhere",
    equipment: ["dumbbell", "bodyweight"],
    muscles: ["full body"],
    constraints: ["low volume", "low impact"],
    exercises: [squat, push, row, bridge].map((exercise) => ({
      ...exercise,
      sets: 2,
      schemeText: `2 × ${exercise.repMin}–${exercise.repMax} @ 3 RIR`,
      rirTarget: 3,
    })),
  }),
];

export const AUTHORED_PROGRAMMES: AuthoredProgramme[] = [
  {
    id: "foundation-6",
    version: AUTHORED_LIBRARY_VERSION,
    title: "Foundation 6",
    summary: "Two repeatable full-body days for six weeks.",
    goal: "return",
    level: ["new", "returning"],
    weeks: 6,
    daysPerWeek: 2,
    workoutIds: ["foundation-a", "foundation-b"],
    progression:
      "Add reps inside the range first. Add load only after two comfortable exposures at the top of the range.",
    deload: "Week 4 is optional: remove one set only if repeated strain signals are present.",
    returnRule: "After 3+ weeks away, use Return reset for one week before resuming.",
  },
  {
    id: "build-8",
    version: AUTHORED_LIBRARY_VERSION,
    title: "Build 8",
    summary: "Upper/lower hypertrophy twice each week.",
    goal: "muscle",
    level: ["returning", "some"],
    weeks: 8,
    daysPerWeek: 4,
    workoutIds: ["upper-build", "lower-build", "upper-build", "lower-build"],
    progression:
      "Double progression with 2 RIR: reps first, then the smallest available load step.",
    deload:
      "Week 5 reduces one set per exercise only after repeated fatigue evidence or by user choice.",
    returnRule: "After 3+ weeks away, restart at about 90% of the last load.",
  },
  {
    id: "strength-8",
    version: AUTHORED_LIBRARY_VERSION,
    title: "Strength base 8",
    summary: "Two focused strength days plus one short full-body practice.",
    goal: "strength",
    level: ["some"],
    weeks: 8,
    daysPerWeek: 3,
    workoutIds: ["strength-upper", "strength-lower", "express-full"],
    progression:
      "Increase only after two exposures meet all targets without failure or maximal effort.",
    deload:
      "No automatic calendar deload. Suggest reduced load only after at least three repeated strain observations.",
    returnRule: "After 3+ weeks away, reduce recent loads by about 10% for the first exposure.",
  },
  {
    id: "consistent-4",
    version: AUTHORED_LIBRARY_VERSION,
    title: "Consistency 4",
    summary: "Three short sessions designed to make restarting manageable.",
    goal: "fitness",
    level: ["new", "returning"],
    weeks: 4,
    daysPerWeek: 3,
    workoutIds: ["bodyweight-base", "express-full", "reset-session"],
    progression: "First build attendance and clean reps; load changes are optional.",
    deload: "Not scheduled at this low volume. Choose a shorter session when needed.",
    returnRule: "Resume at the next session; there is no broken-streak penalty.",
  },
];

export function authoredWorkoutToTemplate(workout: AuthoredWorkout, order = 0): WorkoutTemplate {
  return {
    id: `authored:${workout.id}:${Date.now()}`,
    letter: "LIB",
    title: workout.title,
    focus: workout.summary,
    weekday: null,
    exercises: workout.exercises.map(
      ({ block: _block, rirTarget: _rir, intent, substitutions, ...exercise }) => ({
        ...exercise,
        id: `${exercise.id}:${Date.now()}`,
        cue: `${intent}. Target ${_rir} reps in reserve.`,
        alternative: substitutions[0],
      }),
    ),
    order,
    source: { kind: "authored", workoutId: workout.id, version: workout.version },
  };
}

export function filterAuthoredWorkouts(
  workouts: AuthoredWorkout[],
  query: {
    text?: string;
    goal?: string;
    level?: string;
    duration?: number;
    equipment?: string;
    location?: string;
    muscle?: string;
    constraint?: string;
  },
) {
  const text = query.text?.trim().toLowerCase();
  return workouts.filter((workout) => {
    if (
      text &&
      !`${workout.title} ${workout.summary} ${workout.muscles.join(" ")}`
        .toLowerCase()
        .includes(text)
    )
      return false;
    if (query.goal && !workout.goal.includes(query.goal as LibraryGoal)) return false;
    if (query.level && !workout.level.includes(query.level as LibraryLevel)) return false;
    if (query.duration && workout.duration > query.duration) return false;
    if (query.equipment && !workout.equipment.includes(query.equipment)) return false;
    if (query.location && workout.location !== query.location && workout.location !== "anywhere")
      return false;
    if (query.muscle && !workout.muscles.includes(query.muscle)) return false;
    if (query.constraint && !workout.constraints.includes(query.constraint)) return false;
    return true;
  });
}
