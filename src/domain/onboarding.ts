/**
 * Quick-start journey. One decision per screen; everything else is deferred.
 * Pure logic only: screen map, answers, validation, draft (de)serialisation and the mapping to
 * the existing profile and plan-generator inputs. Nothing here infers goals, health conditions,
 * religion or gender; every answer is the person's own, and every sensitive screen is optional.
 */
import type { EquipmentId } from "./catalogue";
import type { PlanInput, Style } from "./planner";
import type { Experience, Goal } from "./programmes";
import type { PlanningProfile } from "@/data/types";

export const QUICK_STEPS = [
  "intent",
  "experience",
  "constraints",
  "days",
  "time",
  "kit",
  "plan",
  "start",
] as const;
export type StepId = (typeof QUICK_STEPS)[number] | "personalise";

export const STEP_LABEL: Record<StepId, string> = {
  intent: "Outcome",
  experience: "Experience",
  constraints: "Safety",
  days: "Days",
  time: "Time",
  kit: "Kit",
  plan: "Your plan",
  start: "Start",
  personalise: "Make it yours",
};

export type Intent = "strength" | "muscle" | "fitness" | "lose-weight" | "unsure";
export type Level = "new" | "returning" | "some" | "experienced";
export type Place = "gym" | "home" | "outdoors" | "mixed";
export type AvoidId = "lunge" | "push_vertical" | "hinge" | "squat";

export type Answers = {
  intent: Intent | null;
  level: Level | null;
  /** Plain-language movements to leave out. Optional. */
  avoid: AvoidId[];
  note: string;
  /** Required by the plan generator; the person must tick it. */
  adult: boolean;
  /** A clinician has restricted exercise. VAYVOR then builds no plan. */
  clinicianRestricted: boolean;
  /** Monday-first weekday indices. */
  days: number[];
  minutes: number;
  place: Place | null;
  kit: EquipmentId[];
  name: string;
  username: string;
};

export const DEFAULT_ANSWERS: Answers = {
  intent: null,
  level: null,
  avoid: [],
  note: "",
  adult: false,
  clinicianRestricted: false,
  days: [0, 2, 4],
  minutes: 45,
  place: null,
  kit: ["bodyweight"],
  name: "",
  username: "",
};

/** Sensible starting kit per place. Editable on the same screen. */
export const KIT_DEFAULTS: Record<Place, EquipmentId[]> = {
  gym: ["bodyweight", "dumbbell", "barbell", "machine", "cable", "bench"],
  home: ["bodyweight", "dumbbell", "band", "mat"],
  outdoors: ["bodyweight", "band"],
  mixed: ["bodyweight", "dumbbell", "band"],
};
export const KIT_CHOICES: EquipmentId[] = [
  "bodyweight",
  "dumbbell",
  "kettlebell",
  "barbell",
  "bench",
  "machine",
  "cable",
  "band",
  "pullup_bar",
];

export const INTENT_OPTIONS: { id: Intent; title: string; text: string }[] = [
  { id: "strength", title: "Get stronger", text: "Lift more over time." },
  { id: "muscle", title: "Build muscle", text: "Add size with steady volume." },
  { id: "fitness", title: "Feel fitter", text: "General strength and energy." },
  { id: "lose-weight", title: "Lose weight", text: "Training that supports your own plan." },
  { id: "unsure", title: "Not sure yet", text: "Start balanced. Change it any time." },
];
export const LEVEL_OPTIONS: { id: Level; title: string; text: string }[] = [
  { id: "new", title: "New to lifting", text: "Learning the basic movements." },
  { id: "returning", title: "Coming back", text: "Trained before, a break since." },
  { id: "some", title: "Some experience", text: "Comfortable with the main lifts." },
  { id: "experienced", title: "Experienced", text: "Years of regular training." },
];
export const AVOID_OPTIONS: { id: AvoidId; label: string }[] = [
  { id: "lunge", label: "Lunges and step-ups" },
  { id: "push_vertical", label: "Overhead pressing" },
  { id: "hinge", label: "Deadlift-type hinges" },
  { id: "squat", label: "Squats and leg press" },
];
export const MINUTE_OPTIONS = [30, 45, 60, 75];
export const PLACE_OPTIONS: { id: Place; title: string; text: string }[] = [
  { id: "gym", title: "A gym", text: "Machines, cables and free weights." },
  { id: "home", title: "At home", text: "A few weights and bands." },
  { id: "outdoors", title: "Outdoors", text: "Bodyweight and portable kit." },
  { id: "mixed", title: "A bit of both", text: "A mix of places." },
];

const GOAL: Record<Intent, { profile: PlanningProfile["primaryGoal"]; plan: Goal }> = {
  strength: { profile: "strength", plan: "get_stronger" },
  muscle: { profile: "gain-weight", plan: "build_muscle" },
  fitness: { profile: "maintain", plan: "general_fitness" },
  "lose-weight": { profile: "lose-weight", plan: "general_fitness" },
  unsure: { profile: "maintain", plan: "general_fitness" },
};
const LEVEL: Record<Level, { profile: PlanningProfile["experience"]; plan: Experience }> = {
  new: { profile: "new", plan: "new" },
  returning: { profile: "returning", plan: "returning" },
  some: { profile: "some", plan: "some" },
  experienced: { profile: "experienced", plan: "some" },
};

/** Which screens apply. Accounts add one decision (a handle) only when signed in. */
export function stepsFor(): readonly StepId[] {
  return QUICK_STEPS;
}

/** A screen is valid when the person has made the choice it needs. Optional screens always are. */
export function stepValid(
  step: StepId,
  a: Answers,
  ctx: { needsHandle: boolean } = { needsHandle: false },
): boolean {
  switch (step) {
    case "intent":
      return a.intent !== null;
    case "experience":
      return a.level !== null;
    case "constraints":
      return true; // optional: skipping leaves the plan generator in conservative defaults
    case "days":
      return a.days.length >= 2;
    case "time":
      return a.minutes >= 20;
    case "kit":
      return a.place !== null && a.kit.length > 0;
    case "plan":
      return true;
    case "start":
      return !ctx.needsHandle || (a.username.trim().length >= 3 && a.name.trim().length > 0);
    case "personalise":
      return true;
  }
}

export function styleFor(place: Place | null, kit: EquipmentId[]): Style {
  if (place === "outdoors" || kit.every((k) => k === "bodyweight" || k === "mat" || k === "band"))
    return "bodyweight";
  if (kit.some((k) => k === "machine" || k === "cable")) return "machines_cables";
  if (kit.some((k) => k === "dumbbell" || k === "barbell" || k === "kettlebell"))
    return "free_weights";
  return "mixed";
}

/** Input for the existing plan generator. Never invents data the person did not provide. */
export function toPlanInput(a: Answers): PlanInput {
  const days = [...a.days].sort((x, y) => x - y);
  return {
    goal: GOAL[a.intent ?? "unsure"].plan,
    experience: LEVEL[a.level ?? "new"].plan,
    daysPerWeek: days.length,
    // PlanInput weekdays are Sunday-first; the journey is Monday-first.
    preferredDays: days.map((d) => (d + 1) % 7),
    sessionMinutes: a.minutes,
    equipment: a.kit,
    style: styleFor(a.place, a.kit),
    avoidPatterns: a.avoid,
    adult: a.adult,
    clinicianRestricted: a.clinicianRestricted,
    seed: "vayvor",
    allowPartial: true,
  };
}

const DEFAULT_SLEEP = { start: "23:00", end: "07:00" };
export function toPlanningProfile(a: Answers): PlanningProfile {
  return {
    primaryGoal: GOAL[a.intent ?? "unsure"].profile,
    secondaryGoals: [],
    experience: LEVEL[a.level ?? "new"].profile,
    trainingDays: [...a.days].sort((x, y) => x - y),
    sessionMinutes: a.minutes,
    environment: a.place ?? "mixed",
    constraints: a.note.trim(),
    dislikedMovements: "",
    nutritionApproach: "balanced",
    dietaryNeeds: "",
    sleep: DEFAULT_SLEEP,
    work: { start: "09:00", end: "17:00", weekdays: [0, 1, 2, 3, 4] },
    quiet: { start: "21:30", end: "07:30" },
    reminderIntensity: "essential",
    physiology: {
      units: "metric",
      activity: "moderate",
      recovery: "okay",
      energy: "okay",
      limitations: a.note.trim(),
      medicalSafetyFlag: a.clinicianRestricted,
    },
  };
}

/* ------------------------------ draft / resume ------------------------------ */

export const DRAFT_KEY = "vayvor:onboarding:v2";
export type Draft = { v: 2; step: StepId; answers: Answers; savedAt: number };

const STEP_IDS = new Set<string>([...QUICK_STEPS, "personalise"]);
const INTENTS = new Set(INTENT_OPTIONS.map((o) => o.id));
const LEVELS = new Set(LEVEL_OPTIONS.map((o) => o.id));
const PLACES = new Set(PLACE_OPTIONS.map((o) => o.id));
const AVOIDS = new Set(AVOID_OPTIONS.map((o) => o.id));
const KITS = new Set<string>(KIT_CHOICES.concat(["mat"]));

/** Validates stored JSON field by field, so an old or tampered draft can never crash the journey. */
export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft> & { answers?: Partial<Answers> };
    if (d.v !== 2 || !d.step || !STEP_IDS.has(d.step) || !d.answers) return null;
    const a = d.answers;
    const days = Array.isArray(a.days)
      ? [...new Set(a.days.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))]
      : DEFAULT_ANSWERS.days;
    const answers: Answers = {
      intent: INTENTS.has(a.intent as Intent) ? (a.intent as Intent) : null,
      level: LEVELS.has(a.level as Level) ? (a.level as Level) : null,
      avoid: Array.isArray(a.avoid)
        ? a.avoid.filter((x): x is AvoidId => AVOIDS.has(x as AvoidId))
        : [],
      note: typeof a.note === "string" ? a.note.slice(0, 400) : "",
      adult: a.adult === true,
      clinicianRestricted: a.clinicianRestricted === true,
      days,
      minutes:
        typeof a.minutes === "number" && a.minutes >= 20 && a.minutes <= 180 ? a.minutes : 45,
      place: PLACES.has(a.place as Place) ? (a.place as Place) : null,
      kit: Array.isArray(a.kit)
        ? (a.kit.filter((x): x is EquipmentId => KITS.has(String(x))) as EquipmentId[])
        : DEFAULT_ANSWERS.kit,
      name: typeof a.name === "string" ? a.name.slice(0, 60) : "",
      username: typeof a.username === "string" ? a.username.slice(0, 30) : "",
    };
    if (answers.kit.length === 0) answers.kit = ["bodyweight"];
    return { v: 2, step: d.step, answers, savedAt: typeof d.savedAt === "number" ? d.savedAt : 0 };
  } catch {
    return null;
  }
}
export const serialiseDraft = (step: StepId, answers: Answers, now = Date.now()): string =>
  JSON.stringify({ v: 2, step, answers, savedAt: now } satisfies Draft);

/** The furthest step the answers allow, so a resumed draft never lands past an unanswered screen. */
export function furthestValid(step: StepId, a: Answers, ctx = { needsHandle: false }): StepId {
  const order = QUICK_STEPS as readonly StepId[];
  const target = order.indexOf(step === "personalise" ? "start" : step);
  for (let i = 0; i < target; i++) if (!stepValid(order[i]!, a, ctx)) return order[i]!;
  return step;
}

/* ------------------------------ copy ------------------------------ */

export const WHY: Partial<Record<StepId, string>> = {
  intent:
    "Your choice sets the programme style and rep ranges. VAYVOR never guesses a goal for you, and you can change it later in Settings.",
  experience:
    "This decides how many exercises and sets we start with, so week one feels doable. It is not a test.",
  constraints:
    "We use this only to leave out movements you name and to stay conservative. It stays on this device. VAYVOR can't give medical advice. If a clinician has limited your exercise, say so and we'll build no plan.",
  days: "Plans work best on days you can really keep. You can swap days later.",
  time: "Session length changes how many exercises fit, and which are dropped first.",
  kit: "We only pick exercises you can actually do with what you have.",
};

/** What the first day looks like, for the dry run. */
export const FIRST_DAY_STEPS = [
  {
    title: "Open Today",
    text: "Your first session is waiting. Nothing starts until you tap Start.",
  },
  {
    title: "Optional check-in",
    text: "Five quick sliders can adjust the plan. Skip it if you like.",
  },
  {
    title: "Warm up, then one set at a time",
    text: "Gym Mode shows only the current set with big controls.",
  },
  {
    title: "Log and rest",
    text: "Tick a set, the rest timer starts. Weights default to what you did last time.",
  },
  { title: "Finish", text: "You see how it compares with your own earlier sessions only." },
] as const;

/** Deferred areas, listed so nothing is hidden: none was asked, all are in Settings. */
export const DEFERRED = [
  "Food style and targets",
  "Sleep and work hours",
  "Mindset and reflection",
  "Faith and reflection (optional, never assumed)",
  "Crews and community",
  "Music, health and location connections",
  "Notifications and reminders",
  "Colour world and companion",
] as const;
