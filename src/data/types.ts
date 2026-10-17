import type { TrackingType } from "@/domain/catalogue";
import type { RecordedSet } from "@/domain/progression";
import type { Macros } from "@/domain/nutrition";

export const COL = {
  profile: "profile",
  templates: "templates",
  sessions: "sessions",
  legacyDays: "legacyDays",
  legacyRaw: "legacyRaw",
  ingredients: "ingredients",
  recipes: "recipes",
  dayTemplates: "dayTemplates",
  mealPlan: "mealPlan",
  mealLogs: "mealLogs",
  batches: "batches",
  pantry: "pantry",
  purchases: "purchases",
  shopChecks: "shopChecks",
  prayerSettings: "prayerSettings",
  prayerDays: "prayerDays",
  prayerLogs: "prayerLogs",
  routine: "routine",
  routineExceptions: "routineExceptions",
  weighIns: "weighIns",
  checklist: "checklist",
  checklistLogs: "checklistLogs",
  layout: "layout",
  foodDays: "foodDays",
  reminderPrefs: "reminderPrefs",
  routineDone: "routineDone",
  mind: "mind",
  modules: "modules",
  plans: "plans",
  exercisePrefs: "exercisePrefs",
  customExercises: "customExercises",
  equipmentProfile: "equipmentProfile",
  companion: "companion",
  programRevisions: "programRevisions",
  workoutLibraryPrefs: "workoutLibraryPrefs",
  programEnrollments: "programEnrollments",
  gymLocations: "gymLocations",
  buddyGuidance: "buddyGuidance",
} as const;

export type AppModule =
  | "training"
  | "nutrition"
  | "mind"
  | "routines"
  | "community"
  | "spirituality";

export type PlanningProfile = {
  primaryGoal: Profile["goal"]["kind"];
  secondaryGoals: ("mobility" | "endurance" | "energy" | "consistency")[];
  experience: "new" | "returning" | "some" | "experienced";
  trainingDays: number[];
  sessionMinutes: number;
  environment: "gym" | "home" | "outdoors" | "mixed";
  constraints: string;
  dislikedMovements: string;
  nutritionApproach: "balanced" | "high-protein" | "plant-based" | "intuitive" | "custom";
  dietaryNeeds: string;
  sleep: { start: string; end: string };
  work: { start: string; end: string; weekdays: number[] };
  quiet: { start: string; end: string };
  reminderIntensity: "off" | "essential" | "supportive" | "active";
  /** Optional, minimal physiology inputs used only for conservative volume/time guardrails. */
  physiology?: {
    ageBand?: "under-18" | "18-29" | "30-44" | "45-64" | "65-plus";
    units: "metric" | "imperial";
    heightCm?: number;
    weightKg?: number;
    activity: "low" | "moderate" | "high";
    trainingYears?: number;
    currentSessionsPerWeek?: number;
    typicalSleepHours?: number;
    recovery: "low" | "okay" | "good";
    energy: "low" | "okay" | "good";
    limitations: string;
    medicalSafetyFlag: boolean;
  };
};

export type Profile = {
  name: string;
  timezone: string;
  goal: {
    kind: "gain-weight" | "maintain" | "lose-weight" | "strength" | "custom";
    targetWeightKg?: number;
    note?: string;
  };
  /** Nutrition targets. "provisional" = carried over from the original app, not newly validated. */
  targets: {
    status: "unset" | "provisional" | "confirmed";
    source?: string;
    kcal?: number;
    protein?: number;
    carbsRange?: [number, number];
    fatRange?: [number, number];
  };
  budgetPencePerWeek?: number;
  allergies?: string;
  dietaryNotes?: string;
  setup: {
    goals: boolean;
    routine: boolean;
    prayer: boolean;
    food: boolean;
    skipped?: boolean;
    completed?: boolean;
  };
  returnToTraining?: boolean;
  wakeLock?: boolean;
  /** Social identity (mirrors the server profile; the server is the source of truth for the handle). */
  username?: string;
  /** Which pillars the person chose to use; others are hidden. */
  pillars?: ("body" | "mind" | "soul")[];
  faithRoutines?: boolean;
  /** Optional private faith/reflection configuration. Never inferred from identity or locale. */
  faith?: FaithProfile;
  /** Selected product areas. Missing on old profiles means all non-faith areas remain available. */
  modules?: AppModule[];
  /** Inputs used by deterministic programme, schedule and reminder decisions. */
  planning?: PlanningProfile;
  gymMode?: { voice: boolean; haptics: boolean; autoMedia: boolean; livePulse?: boolean };
  trainingMusic?: { provider: "spotify" | "apple"; url: string };
};

export type FaithTradition =
  | "not_for_me"
  | "prefer_not_to_say"
  | "islam"
  | "christianity"
  | "judaism"
  | "hindu_traditions"
  | "buddhist_traditions"
  | "sikhism"
  | "jainism"
  | "bahai"
  | "shinto"
  | "indigenous_traditional"
  | "spiritual"
  | "custom";

export type FaithPractice =
  | "prayer_remembrance"
  | "scripture_reading"
  | "meditation_contemplation"
  | "fasting_dietary"
  | "sacred_dates"
  | "weekly_rest_worship"
  | "community_service"
  | "pilgrimage_preparation"
  | "custom_ritual";

export type FaithProfile = {
  enabled: boolean;
  traditions: FaithTradition[];
  branch?: string;
  customLabel?: string;
  practices: FaithPractice[];
  private: true;
};

export type GymLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  enabled: boolean;
  createdAt: number;
};

export type TemplateExercise = {
  id: string;
  legacyId?: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Original scheme text, preserved as written (e.g. "3 × 12–15 per arm"). */
  schemeText: string;
  equipment?: string;
  rest?: string;
  restSeconds?: number;
  cue?: string;
  muscle?: string;
  description?: string;
  alternative?: string;
  links?: { label: string; url: string }[];
  startWeightKg?: number;
  catalogueId?: string;
  tracking?: TrackingType;
  targetSeconds?: number;
  perSide?: boolean;
  superset?: string;
};

export type WorkoutTemplate = {
  id: string;
  legacyId?: string;
  letter: string;
  title: string;
  focus: string;
  /** 0 = Monday … 6 = Sunday; null = unscheduled. */
  weekday: number | null;
  time?: string;
  exercises: TemplateExercise[];
  cardio?: { machine: string; text: string };
  order: number;
  archivedAt?: string | null;
  source?: { kind: "authored"; workoutId: string; version: string };
};

export type SessionSet = RecordedSet & { id: string; suggested?: boolean };

export type SessionExercise = {
  id: string;
  name: string;
  legacyId?: string;
  templateExerciseId?: string;
  catalogueId?: string;
  tracking?: TrackingType;
  targetSeconds?: number;
  perSide?: boolean;
  superset?: string;
  substitutedFrom?: string;
  prescription: { sets: number; repMin: number; repMax: number; schemeText: string };
  equipment?: string;
  /** Editable training classification used only for estimated set summaries. */
  muscle?: string;
  incrementKg?: number;
  restSeconds?: number;
  alternative?: string;
  cue?: string;
  sets: SessionSet[];
  note?: string;
  /** Optional post-exercise preference; never inferred from private notes. */
  preference?: "more" | "less" | "never" | "equipment_unavailable";
  adaptation?: AdaptationDecision;
};

export type RestTimer = { durationMs: number; endsAt: number | null; remainingMs?: number };

export type Session = {
  id: string;
  date: string; // local date it was performed
  plannedDate?: string;
  templateId: string;
  templateName: string;
  templateLetter?: string;
  status: "active" | "paused" | "completed" | "ended-early";
  /** Logging clock begins after optional readiness is accepted, kept or skipped. */
  workStartedAt?: number;
  startedAt: number;
  endedAt?: number;
  pausedAt?: number;
  pausedMs: number;
  exercises: SessionExercise[];
  rest?: RestTimer;
  note?: string;
  readiness?: ReadinessCheckIn;
};

export type ReadinessAction = "keep" | "reduce_set" | "lower_load" | "shorten" | "swap_aggravating";

export type ReadinessCheckIn = {
  sleep: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  timeAvailable: number;
  aggravatingExerciseId?: string;
  submittedAt: number;
  score: number;
  suggestion: ReadinessAction;
  reason: string;
  contributors: string[];
  decision?: "accepted" | "kept_plan" | "dismissed";
  decidedAt?: number;
};

export type AdaptationAction = "increase_load" | "hold" | "reduce_load" | "reduce_set" | "swap";
export type AdaptationDecision = {
  id: string;
  action: AdaptationAction;
  status: "accepted" | "modified" | "dismissed";
  reason: string;
  suggestedWeightKg?: number;
  appliedWeightKg?: number;
  suggestedSets?: number;
  appliedSets?: number;
  decidedAt: number;
};

export type ProgramRevision = {
  id: string;
  templateId: string;
  createdAt: number;
  source: "adaptation" | "manual";
  reason: string;
  before: WorkoutTemplate;
  after: WorkoutTemplate;
};

export type LegacyDayLog = {
  date: string;
  exercises: Record<string, { done?: boolean; weight?: string }>;
  cardioDone: boolean;
  supplements: Record<string, boolean>;
  bodyWeightKg?: number;
  caloriesLogged?: number;
  /** Legacy dates were formed from a UTC string slice. */
  dateBasis: "utc-slice";
};

export type DayTemplate = {
  id: string;
  legacyId?: string;
  name: string;
  subtitle?: string;
  /** Ordered list of recipe ids + portion. */
  meals: { recipeId: string; slot: string; portion: number }[];
  /** Hand-entered whole-day estimate kept from the original app. */
  legacyTotals?: Macros;
  archivedAt?: string | null;
};

export type MealPlanEntry = {
  id: string;
  date: string;
  slot: string;
  recipeId?: string;
  name: string;
  portion: number;
  dayTemplateId?: string;
  batchId?: string;
  status: "planned" | "prepared" | "eaten" | "skipped";
  mealLogId?: string;
};

export type Batch = {
  id: string;
  recipeId: string;
  yield: number;
  cookDate: string;
  servingsUsed?: number;
};

export type PantryItem = {
  ingredientId: string;
  amount: number;
  unit: "g" | "kg" | "ml" | "l" | "count";
  updatedAt: number;
};
export type Purchase = {
  id: string;
  date: string;
  shop?: string;
  totalPence: number;
  note?: string;
  items?: { ingredientId?: string; name: string; pence?: number }[];
};

export type PrayerSettings = {
  id: "main";
  mode: "aladhan" | "manual";
  locality: string;
  country: string;
  timezone: string;
  method: number;
  school: 0 | 1;
  latitudeAdjustmentMethod: 1 | 2 | 3;
  /** Minute offsets per prayer (e.g. +2 for Isha). */
  adjustments?: Partial<Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", number>>;
  mosqueName?: string;
  reminderLeadMinutes?: number;
  /** Bumped when settings change so cached days from older settings are invalid. */
  version: number;
};

export type PrayerLog = {
  id: string; // `${date}:${prayer}`
  date: string;
  prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  prayedAt: number;
  backdated?: boolean;
  sourceSnapshot?: { sourceId: string; startTime: string };
};

export type RoutineBlock = {
  id: string;
  legacyKey?: string;
  label: string;
  detail?: string;
  start: string;
  end?: string;
  approx?: boolean;
  highlight?: boolean;
  weekdays: number[]; // 0 = Mon
  kind:
    | "routine"
    | "work"
    | "sleep"
    | "meal-prep"
    | "personal"
    | "workout"
    | "meal"
    | "mind"
    | "soul";
  /** What completes this activity. Absent or "manual" = tick it off yourself. Linked kinds complete from the real record. */
  link?: RoutineLink;
  /** Planned length in minutes (used when `end` is absent, and by the routine builder). */
  durationMin?: number;
  /** Optional background reminder lead time. Absent/null means this activity never schedules one. */
  reminderMinutes?: number | null;
  /** Paused from this date (inclusive) until `pausedUntil` (exclusive); open-ended when `pausedUntil` is null. */
  pausedFrom?: string;
  pausedUntil?: string | null;
  provisional?: boolean;
  /** Anchor to a prayer instead of a clock time. */
  relativeTo?: { prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"; offsetMinutes: number };
  archivedAt?: string | null;
  archivedReason?: string;
  order: number;
};

export type RoutineLink =
  | { type: "manual" }
  | { type: "workout"; templateId?: string }
  | { type: "prayer"; prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" }
  | { type: "meal" }
  | { type: "mind"; kind: MindKind };

export type RoutineException = {
  id: string;
  blockId: string;
  /** The date the occurrence normally falls on. */
  date: string;
  kind: "skip" | "move";
  /** "rest" = a deliberate rest day (shown as such), "skip" = just not doing it this time. */
  reason?: "rest" | "skip";
  /** Move to another day (otherwise a move only changes the time). */
  toDate?: string;
  start?: string;
  end?: string;
};

/** A manual tick or an acknowledged skip for one occurrence. Linked activities derive done-ness from their own records instead. */
export type RoutineCompletion = {
  id: string; // `${blockId}:${date}`
  blockId: string;
  date: string;
  status: "done" | "skipped";
  at: number;
};

export type MindKind = "checkin" | "reflection" | "focus";

/** Private by default: owner-only in storage and sync, never read by anything social. */
export type MindEntry = {
  id: string;
  date: string;
  at: number;
  kind: MindKind;
  /** Which space it belongs to (Soul reflections are kept apart from Mind ones). */
  space: "mind" | "soul";
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  prompt?: string;
  text?: string;
  minutes?: number;
  visibility: "private";
};

export type Modules = { id: "main"; salah?: boolean };

/** Collections that hold personal reflections and religious practice. Nothing social may read these. */
export const PRIVATE_COLLECTIONS: string[] = [
  "mind",
  "prayerLogs",
  "prayerSettings",
  "prayerDays",
  "modules",
  "programRevisions",
  "workoutLibraryPrefs",
  "programEnrollments",
  "gymLocations",
  "buddyGuidance",
];

export type WeighIn = {
  id: string;
  date: string;
  kg: number;
  source: "user" | "legacy";
  measuredAt?: number;
  note?: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  detail?: string;
  time?: string;
  fromLegacy?: boolean;
  archivedAt?: string | null;
  order: number;
};
export type ChecklistLog = { id: string; date: string; itemId: string; done: boolean };

export type WidgetId =
  | "next-action"
  | "prayer"
  | "food"
  | "training"
  | "weight"
  | "budget"
  | "timeline"
  | "checklist";
export type TodayLayout = {
  id: "today";
  widgets: { id: WidgetId; visible: boolean; size: "compact" | "expanded" }[];
};

/** Marks a day as fully food-logged, so intake isn't misread as a partial day. */
export type FoodDay = { id: string; date: string; complete: boolean };

/** An accepted generated plan: the inputs, rule version and what it produced, so it can be regenerated or audited. */
export type PlanRecord = {
  id: string;
  createdAt: string;
  rulesVersion: string;
  programmeId: string;
  input: import("@/domain/planner").PlanInput;
  seed: string;
  /** How many times this lineage has been regenerated (changes the seed so the result can differ). */
  generation: number;
  regeneratedFrom?: string;
  status: "active" | "replaced";
  supersededBy?: string;
  templateIds: string[];
  /** What the templates contained when accepted; used to tell whether the person has edited them since. */
  snapshot: {
    templateId: string;
    title: string;
    exercises: { catalogueId?: string; name: string; sets: number; schemeText: string }[];
  }[];
  attribution: string;
};
