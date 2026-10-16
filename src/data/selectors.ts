import { addDays, weekDates, weekdayIndex, type ISODate } from "@/domain/dates";
import {
  addMacros,
  ZERO_MACROS,
  recipeNutrition,
  type Ingredient,
  type MealLog,
  type Recipe,
  type Macros,
} from "@/domain/nutrition";
import type { MealPlanEntry, Session, WorkoutTemplate } from "./types";

export const activeTemplates = (t: WorkoutTemplate[]) =>
  t.filter((x) => !x.archivedAt).sort((a, b) => a.order - b.order);

export const plannedTemplateFor = (templates: WorkoutTemplate[], date: ISODate) =>
  activeTemplates(templates).find((t) => t.weekday === weekdayIndex(date));

const finished = (s: Session) => s.status === "completed";

export function weekTraining(templates: WorkoutTemplate[], sessions: Session[], date: ISODate) {
  const days = weekDates(date);
  const planned = activeTemplates(templates).filter((t) => t.weekday != null).length;
  const inWeek = sessions.filter((s) => days.includes(s.date));
  return {
    planned,
    completed: inWeek.filter(finished).length,
    partial: inWeek.filter((s) => s.status === "ended-early").length,
  };
}

export function sessionForDate(sessions: Session[], date: ISODate, templateId?: string) {
  return sessions
    .filter((s) => s.date === date && (!templateId || s.templateId === templateId))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** Planned totals for a day (clearly distinct from eaten). Entries without nutrition are counted separately. */
export function plannedTotals(
  entries: MealPlanEntry[],
  recipes: Map<string, Recipe>,
  ings: Map<string, Ingredient>,
) {
  let macros: Macros = ZERO_MACROS;
  let unknown = 0;
  for (const e of entries) {
    if (e.status === "skipped") continue;
    const r = e.recipeId ? recipes.get(e.recipeId) : undefined;
    if (!r) {
      unknown++;
      continue;
    }
    macros = addMacros(macros, scale(recipeNutrition(r, ings).perServing, e.portion));
  }
  return { macros, entries: entries.filter((e) => e.status !== "skipped").length, unknown };
}
const scale = (m: Macros, k: number): Macros => ({
  kcal: m.kcal * k,
  protein: m.protein * k,
  carbs: m.carbs * k,
  fat: m.fat * k,
});

export const eatenTotals = (logs: MealLog[]) =>
  logs.reduce((s, l) => addMacros(s, l.macros), ZERO_MACROS);

export const weekRange = (date: ISODate) => ({
  start: weekDates(date)[0]!,
  end: addDays(weekDates(date)[0]!, 6),
});

export const SLOT_ORDER = ["breakfast", "lunch", "dinner", "evening", "snack"];
export const bySlot = <T extends { slot: string }>(a: T, b: T) =>
  SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
