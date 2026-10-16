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
} as const;

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
  setup: { goals: boolean; routine: boolean; prayer: boolean; food: boolean; skipped?: boolean };
  returnToTraining?: boolean;
  wakeLock?: boolean;
  /** Social identity (mirrors the server profile; the server is the source of truth for the handle). */
  username?: string;
  /** Which pillars the person chose to use; others are hidden. */
  pillars?: ("body" | "mind" | "soul")[];
  faithRoutines?: boolean;
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
  incrementKg?: number;
  restSeconds?: number;
  alternative?: string;
  cue?: string;
  sets: SessionSet[];
  note?: string;
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
  startedAt: number;
  endedAt?: number;
  pausedAt?: number;
  pausedMs: number;
  exercises: SessionExercise[];
  rest?: RestTimer;
  note?: string;
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
  kind: "routine" | "work" | "sleep" | "meal-prep" | "personal";
  provisional?: boolean;
  /** Anchor to a prayer instead of a clock time. */
  relativeTo?: { prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"; offsetMinutes: number };
  archivedAt?: string | null;
  archivedReason?: string;
  order: number;
};

export type RoutineException = {
  id: string;
  blockId: string;
  date: string;
  kind: "skip" | "move";
  start?: string;
  end?: string;
};

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
