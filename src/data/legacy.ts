import { bulkPut, getMeta, setMeta } from "./db";
import {
  COL,
  type DayTemplate,
  type LegacyDayLog,
  type Profile,
  type RoutineBlock,
  type TemplateExercise,
  type WorkoutTemplate,
  type ChecklistItem,
  type WeighIn,
} from "./types";
import { DAY_PLANS, SHOPPING, SUPPLEMENTS, WEEKLY_SPLIT, workouts } from "@/lib/sunrise-data";
import { parseScheme } from "@/domain/progression";
import { DEFAULT_TZ } from "@/domain/dates";
import type { Ingredient, Recipe } from "@/domain/nutrition";
import { LEGACY_UNITS, parseLegacyItems } from "./legacy-lines";

export const LEGACY_KEYS = {
  tracker: "sunrise-strength-tracker-v1",
  schedule: "sunrise-strength-schedule-v2",
  shopping: "new-life-shopping-checklist-v1",
} as const;

export const MIGRATION_VERSION = 1;

type Storage = Pick<globalThis.Storage, "getItem">;

const safeParse = (raw: string | null) => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

type LegacyLogBlob = {
  exercises?: Record<string, { done?: boolean; weight?: string }>;
  cardioDone?: boolean;
  supplements?: Record<string, boolean>;
  bodyWeightKg?: number;
  caloriesLogged?: number;
};
type LegacyStepBlob = {
  id?: string;
  key?: RoutineBlock["legacyKey"];
  label?: string;
  detail?: string;
  startTime?: string;
  endTime?: string;
  approx?: boolean;
  highlight?: boolean;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Programme + meal + routine seed content, taken verbatim from the original app. */
export function buildSeed() {
  const templates: WorkoutTemplate[] = workouts.map((w, i) => {
    const wd = WEEKLY_SPLIT.findIndex((s) => s.letter === w.letter);
    const exercises: TemplateExercise[] = w.exercises.map((e) => {
      const rx = parseScheme(e.scheme) ?? { sets: 3, repMin: 8, repMax: 12 };
      const rest = e.rest?.match(/(\d+)\s*[–-]\s*(\d+)\s*s/);
      return {
        id: `legacy-ex-${e.id}`,
        legacyId: e.id,
        name: e.name,
        sets: rx.sets,
        repMin: rx.repMin,
        repMax: rx.repMax,
        schemeText: e.scheme,
        equipment: e.equipment,
        rest: e.rest,
        restSeconds: rest ? Math.round((Number(rest[1]) + Number(rest[2])) / 2) : undefined,
        cue: e.cue,
        muscle: e.muscle,
        description: e.description,
        alternative: e.alt,
        startWeightKg: e.startWeight,
      };
    });
    return {
      id: `legacy-workout-${w.id}`,
      legacyId: w.id,
      letter: w.letter,
      title: w.title,
      focus: w.focus,
      weekday: wd >= 0 ? wd : null,
      exercises,
      cardio: { machine: w.cardioMachine, text: w.cardio },
      order: i,
    };
  });

  const ingredients: Ingredient[] = SHOPPING.map((s) => {
    const u = LEGACY_UNITS[s.id];
    return {
      id: `legacy-ing-${s.id}`,
      name: u?.name ?? s.item,
      state: u?.state,
      perAmount: u?.unit === "count" ? 1 : 100,
      perUnit: u?.unit ?? "g",
      halalNote:
        s.id === "chicken"
          ? "Original note: Shazans (HFA-approved) at ASDA. Confirm on the pack."
          : undefined,
      // Intentionally no macros or prices: the original app had none at ingredient level.
    };
  });
  // Keep the original shop/notes text alongside.
  const shoppingNotes = SHOPPING.map((s) => ({
    id: `legacy-ing-${s.id}`,
    where: s.where,
    notes: s.notes,
  }));

  const recipes: Recipe[] = [];
  const dayTemplates: DayTemplate[] = [];
  for (const d of DAY_PLANS) {
    const meals = d.meals.map((m) => {
      const id = `legacy-meal-${m.id}`;
      recipes.push({
        id,
        name: m.name,
        slot: m.slot,
        yield: 1,
        lines: parseLegacyItems(m.items),
        items: m.items,
        image: m.image,
        legacyEstimate: { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat },
        notes: "Original author-entered estimate. Replace with ingredient-level data when ready.",
      });
      return { recipeId: id, slot: m.slot, portion: 1 };
    });
    dayTemplates.push({
      id: `legacy-day-${d.id}`,
      legacyId: d.id,
      name: d.label,
      subtitle: d.subtitle,
      meals,
      legacyTotals: {
        kcal: d.totals.kcal,
        protein: d.totals.protein,
        carbs: d.totals.carbs,
        fat: d.totals.fat,
      },
    });
  }

  const checklist: ChecklistItem[] = SUPPLEMENTS.map((s, i) => ({
    id: `legacy-supp-${s.id}`,
    label: s.name,
    detail: `${s.time}. ${s.why}`,
    fromLegacy: true,
    order: i,
  }));

  const profile: Profile = {
    name: "",
    timezone: DEFAULT_TZ,
    goal: { kind: "gain-weight" },
    targets: {
      status: "provisional",
      source: "Original app (not re-validated)",
      kcal: 2760,
      protein: 138,
      carbsRange: [330, 360],
      fatRange: [85, 100],
    },
    setup: { goals: false, routine: false, prayer: false, food: false },
  };

  return { templates, ingredients, shoppingNotes, recipes, dayTemplates, checklist, profile };
}

export type MigrationReport = {
  ran: boolean;
  version: number;
  legacyDays: number;
  routineBlocks: number;
  weighIns: number;
  seeded: boolean;
  skippedExisting: number;
};

/**
 * One-shot, idempotent migration. Never deletes localStorage keys, never
 * overwrites existing records, keeps raw legacy blobs for recovery.
 */
export async function runMigration(
  storage: Storage | undefined = globalThis.localStorage,
): Promise<MigrationReport> {
  const done = await getMeta<MigrationReport>("migration:legacy");
  if (done?.version === MIGRATION_VERSION) return { ...done, ran: false };

  const items: { collection: string; id: string; data: unknown }[] = [];
  const raw: Record<string, string | null> = {};
  for (const [name, key] of Object.entries(LEGACY_KEYS)) {
    let v: string | null = null;
    try {
      v = storage?.getItem(key) ?? null;
    } catch {
      v = null;
    }
    raw[name] = v;
    if (v)
      items.push({
        collection: COL.legacyRaw,
        id: key,
        data: { key, raw: v, capturedAt: Date.now() },
      });
  }

  // Tracker logs → legacy day logs (+ weigh-ins)
  let legacyDays = 0,
    weighIns = 0;
  const tracker = safeParse(raw.tracker ?? null) as
    | { logs?: Record<string, LegacyLogBlob> }
    | undefined;
  for (const [date, log] of Object.entries(tracker?.logs ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !log) continue;
    const exercises: LegacyDayLog["exercises"] = {};
    for (const [k, v] of Object.entries(log.exercises ?? {})) {
      const e = v as { done?: boolean; weight?: string };
      exercises[k] = { done: e.done, weight: e.weight };
    }
    const has =
      Object.keys(exercises).length ||
      log.cardioDone ||
      Object.values(log.supplements ?? {}).some(Boolean) ||
      log.bodyWeightKg ||
      log.caloriesLogged;
    if (!has) continue; // empty placeholder day created by the old app
    const day: LegacyDayLog = {
      date,
      exercises,
      cardioDone: !!log.cardioDone,
      supplements: log.supplements ?? {},
      bodyWeightKg: log.bodyWeightKg,
      caloriesLogged: log.caloriesLogged,
      dateBasis: "utc-slice",
    };
    items.push({ collection: COL.legacyDays, id: date, data: day });
    legacyDays++;
    if (typeof log.bodyWeightKg === "number") {
      const w: WeighIn = { id: `legacy-w-${date}`, date, kg: log.bodyWeightKg, source: "legacy" };
      items.push({ collection: COL.weighIns, id: w.id, data: w });
      weighIns++;
    }
  }

  // Schedule steps → routine blocks (old Fajr time archived, never treated as authoritative).
  let routineBlocks = 0;
  const steps = safeParse(raw.schedule ?? null) as LegacyStepBlob[] | undefined;
  const stepList = Array.isArray(steps) ? steps : []; // no saved schedule → nothing to preserve
  stepList.forEach((s, i) => {
    if (!s || typeof s.startTime !== "string") return;
    const isFajr = s.key === "fajr";
    const block: RoutineBlock = {
      id: `legacy-step-${s.id ?? i}`,
      legacyKey: s.key,
      label: s.label ?? "Step",
      detail: s.detail || undefined,
      start: s.startTime,
      end: s.endTime,
      approx: s.approx,
      highlight: s.highlight,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      kind: s.key === "work" ? "work" : /sleep/i.test(s.label ?? "") ? "sleep" : "routine",
      provisional: true,
      order: i,
      archivedAt: isFajr ? new Date().toISOString() : null,
      archivedReason: isFajr
        ? "Original fixed Fajr time. Prayer times now come from your Salah settings."
        : undefined,
    };
    items.push({ collection: COL.routine, id: block.id, data: block });
    routineBlocks++;
  });

  // Seed content (skipped per-id if present)
  const seed = buildSeed();
  items.push({ collection: COL.profile, id: "main", data: seed.profile });
  seed.templates.forEach((t) => items.push({ collection: COL.templates, id: t.id, data: t }));
  seed.ingredients.forEach((t) => items.push({ collection: COL.ingredients, id: t.id, data: t }));
  seed.shoppingNotes.forEach((t) =>
    items.push({ collection: "ingredientNotes", id: t.id, data: t }),
  );
  seed.recipes.forEach((t) => items.push({ collection: COL.recipes, id: t.id, data: t }));
  seed.dayTemplates.forEach((t) => items.push({ collection: COL.dayTemplates, id: t.id, data: t }));
  seed.checklist.forEach((t) => items.push({ collection: COL.checklist, id: t.id, data: t }));

  const { skipped } = await bulkPut(items, { overwrite: false });
  const report: MigrationReport = {
    ran: true,
    version: MIGRATION_VERSION,
    legacyDays,
    routineBlocks,
    weighIns,
    seeded: true,
    skippedExisting: skipped,
  };
  await setMeta("migration:legacy", report);
  return report;
}

export { slug };
