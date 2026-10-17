import { get, list, newId, put, remove } from "./db";
import {
  COL,
  type MealPlanEntry,
  type Profile,
  type Session,
  type SessionExercise,
  type SessionSet,
  type TodayLayout,
  type WidgetId,
  type WorkoutTemplate,
  type PrayerLog,
  type WeighIn,
  type ProgramRevision,
} from "./types";
import { defaultIncrementKg } from "@/domain/progression";
import { localDate, DEFAULT_TZ, type ISODate } from "@/domain/dates";
import type { MealLog, Macros } from "@/domain/nutrition";

/* ------------------------------ Profile ------------------------------ */
export async function saveProfile(patch: Partial<Profile>) {
  const cur = (await get<Profile>(COL.profile, "main")) as Profile;
  await put(COL.profile, "main", { ...cur, ...patch });
}

/* ------------------------------ Sessions ------------------------------ */
const blankSet = (kind: SessionSet["kind"] = "working"): SessionSet => ({
  id: newId(),
  kind,
  completed: false,
});

export function exerciseFromTemplate(t: WorkoutTemplate["exercises"][number]): SessionExercise {
  return {
    id: newId(),
    name: t.name,
    legacyId: t.legacyId,
    templateExerciseId: t.id,
    catalogueId: t.catalogueId,
    tracking: t.tracking,
    targetSeconds: t.targetSeconds,
    perSide: t.perSide,
    superset: t.superset,
    prescription: { sets: t.sets, repMin: t.repMin, repMax: t.repMax, schemeText: t.schemeText },
    equipment: t.equipment,
    muscle: t.muscle,
    incrementKg: defaultIncrementKg(t.equipment),
    restSeconds: t.restSeconds,
    alternative: t.alternative,
    cue: t.cue,
    sets: Array.from({ length: t.sets }, () => blankSet()),
  };
}

export async function startSession(
  t: WorkoutTemplate,
  date: ISODate,
  tz = DEFAULT_TZ,
): Promise<Session> {
  const existing = (await list<Session>(COL.sessions)).find(
    (s) => s.status === "active" || s.status === "paused",
  );
  if (existing) return existing;
  const session: Session = {
    id: newId(),
    date,
    plannedDate: t.weekday != null ? date : undefined,
    templateId: t.id,
    templateName: t.title,
    templateLetter: t.letter,
    status: "active",
    startedAt: Date.now(),
    pausedMs: 0,
    exercises: t.exercises.map(exerciseFromTemplate),
  };
  void tz;
  await put(COL.sessions, session.id, session);
  return session;
}

export async function saveSession(s: Session) {
  await put(COL.sessions, s.id, s);
}

export const pauseSession = (s: Session) =>
  saveSession({ ...s, status: "paused", pausedAt: Date.now() });
export const resumeSession = (s: Session) =>
  saveSession({
    ...s,
    status: "active",
    pausedMs: s.pausedMs + (s.pausedAt ? Date.now() - s.pausedAt : 0),
    pausedAt: undefined,
  });

export async function finishSession(s: Session, how: "completed" | "ended-early", tz = DEFAULT_TZ) {
  const extra = s.status === "paused" && s.pausedAt ? Date.now() - s.pausedAt : 0;
  await saveSession({
    ...s,
    status: how,
    endedAt: Date.now(),
    pausedMs: s.pausedMs + extra,
    pausedAt: undefined,
    rest: undefined,
    date: s.date || localDate(Date.now(), tz),
  });
}

export async function discardSession(id: string) {
  await remove(COL.sessions, id);
}

/** Time spent in a session, excluding pauses. */
export function sessionElapsedMs(s: Session, now = Date.now()): number {
  if (!s.workStartedAt && !s.readiness?.decision && !s.endedAt) return 0;
  const end = s.endedAt ?? (s.status === "paused" && s.pausedAt ? s.pausedAt : now);
  return Math.max(0, end - (s.workStartedAt ?? s.startedAt) - s.pausedMs);
}

/* ------------------------------ Rest timer (timestamp based) ------------------------------ */
export const restRemainingMs = (s: Session, now = Date.now()): number | null => {
  const r = s.rest;
  if (!r) return null;
  if (r.endsAt == null) return r.remainingMs ?? r.durationMs;
  return Math.max(0, r.endsAt - now);
};

/* ------------------------------ Food ------------------------------ */
export async function logMeal(input: {
  date: ISODate;
  name: string;
  macros: Macros;
  portion?: number;
  recipeId?: string;
  planEntryId?: string;
  macrosSource: MealLog["macrosSource"];
  note?: string;
  costPence?: number;
  costCoverage?: number;
}): Promise<MealLog> {
  const log: MealLog = {
    id: newId(),
    date: input.date,
    loggedAt: Date.now(),
    name: input.name,
    recipeId: input.recipeId,
    planEntryId: input.planEntryId,
    portion: input.portion ?? 1,
    macros: input.macros,
    macrosSource: input.macrosSource,
    note: input.note,
    costPence: input.costPence,
    costCoverage: input.costCoverage,
  };
  await put(COL.mealLogs, log.id, log);
  if (input.planEntryId) {
    const pe = await get<MealPlanEntry>(COL.mealPlan, input.planEntryId);
    if (pe) await put(COL.mealPlan, pe.id, { ...pe, status: "eaten", mealLogId: log.id });
  }
  return log;
}

export async function unlogMeal(log: MealLog) {
  await remove(COL.mealLogs, log.id);
  if (log.planEntryId) {
    const pe = await get<MealPlanEntry>(COL.mealPlan, log.planEntryId);
    if (pe && pe.mealLogId === log.id)
      await put(COL.mealPlan, pe.id, { ...pe, status: "planned", mealLogId: undefined });
  }
}

/* ------------------------------ Prayer ------------------------------ */
export async function logPrayer(
  date: ISODate,
  prayer: PrayerLog["prayer"],
  opts: { at?: number; backdated?: boolean; sourceSnapshot?: PrayerLog["sourceSnapshot"] } = {},
) {
  const id = `${date}:${prayer}`;
  const cur = await get<PrayerLog>(COL.prayerLogs, id);
  if (cur) return cur; // never duplicate
  const log: PrayerLog = {
    id,
    date,
    prayer,
    prayedAt: opts.at ?? Date.now(),
    backdated: opts.backdated,
    sourceSnapshot: opts.sourceSnapshot,
  };
  await put(COL.prayerLogs, id, log);
  return log;
}
export const unlogPrayer = (date: ISODate, prayer: PrayerLog["prayer"]) =>
  remove(COL.prayerLogs, `${date}:${prayer}`);
export async function correctPrayerTime(log: PrayerLog, at: number) {
  await put(COL.prayerLogs, log.id, { ...log, prayedAt: at, backdated: true });
}

/* ------------------------------ Weight ------------------------------ */
export async function saveWeighIn(date: ISODate, kg: number, note?: string) {
  const id = `w-${date}`;
  const w: WeighIn = { id, date, kg, source: "user", measuredAt: Date.now(), note };
  await put(COL.weighIns, id, w);
}
export const deleteWeighIn = (id: string) => remove(COL.weighIns, id);

/* ------------------------------ Today layout ------------------------------ */
export const DEFAULT_WIDGETS: TodayLayout["widgets"] = [
  { id: "next-action", visible: true, size: "expanded" },
  { id: "prayer", visible: true, size: "compact" },
  { id: "food", visible: true, size: "compact" },
  { id: "training", visible: true, size: "compact" },
  { id: "weight", visible: true, size: "compact" },
  { id: "budget", visible: true, size: "compact" },
  { id: "timeline", visible: true, size: "compact" },
  { id: "checklist", visible: true, size: "compact" },
];
export const WIDGET_LABEL: Record<WidgetId, string> = {
  "next-action": "Next up",
  prayer: "Next prayer",
  food: "Food",
  training: "Training",
  weight: "Weight trend",
  budget: "Food budget",
  timeline: "Today's timeline",
  checklist: "Reminders",
};

/** Merges saved layout with defaults so new widgets appear and removed ones vanish. */
export function resolveLayout(saved?: TodayLayout): TodayLayout["widgets"] {
  const base = saved?.widgets ?? [];
  const known = new Set(DEFAULT_WIDGETS.map((w) => w.id));
  const kept = base.filter((w) => known.has(w.id));
  const missing = DEFAULT_WIDGETS.filter((d) => !kept.some((k) => k.id === d.id));
  return [...kept, ...missing];
}
export const saveLayout = (widgets: TodayLayout["widgets"]) =>
  put(COL.layout, "today", { id: "today", widgets } satisfies TodayLayout);
export const resetLayout = () => remove(COL.layout, "today");

/* ------------------------------ Programme revisions ------------------------------ */
export async function saveTemplateRevision(
  before: WorkoutTemplate,
  after: WorkoutTemplate,
  reason: string,
  source: ProgramRevision["source"] = "manual",
) {
  const revision: ProgramRevision = {
    id: newId(),
    templateId: before.id,
    createdAt: Date.now(),
    source,
    reason,
    before,
    after,
  };
  await put(COL.programRevisions, revision.id, revision);
  await put(COL.templates, after.id, after);
  return revision;
}

export async function restoreTemplateRevision(revision: ProgramRevision) {
  const current = await get<WorkoutTemplate>(COL.templates, revision.templateId);
  if (current) {
    const id = newId();
    await put(COL.programRevisions, id, {
      id,
      templateId: current.id,
      createdAt: Date.now(),
      source: "manual",
      reason: `Before restoring version from ${new Date(revision.createdAt).toLocaleDateString("en-GB")}`,
      before: current,
      after: revision.before,
    } satisfies ProgramRevision);
  }
  await put(COL.templates, revision.before.id, revision.before);
}

/* ------------------------------ Meal planning ------------------------------ */
import type { DayTemplate, Batch } from "./types";

export async function assignDayTemplate(
  date: ISODate,
  tpl: DayTemplate,
  recipes: Map<string, { name: string }>,
) {
  const existing = (await list<MealPlanEntry>(COL.mealPlan)).filter((e) => e.date === date);
  // Replace only entries that haven't been eaten; eaten history stays.
  for (const e of existing) if (e.status !== "eaten") await remove(COL.mealPlan, e.id);
  for (const m of tpl.meals) {
    const e: MealPlanEntry = {
      id: newId(),
      date,
      slot: m.slot,
      recipeId: m.recipeId,
      name: recipes.get(m.recipeId)?.name ?? "Meal",
      portion: m.portion,
      dayTemplateId: tpl.id,
      status: "planned",
    };
    await put(COL.mealPlan, e.id, e);
  }
}

export async function addPlanEntry(
  e: Omit<MealPlanEntry, "id" | "status"> & { status?: MealPlanEntry["status"] },
) {
  const entry: MealPlanEntry = { ...e, id: newId(), status: e.status ?? "planned" };
  await put(COL.mealPlan, entry.id, entry);
  return entry;
}

export async function copyWeekPlan(fromStart: ISODate, toStart: ISODate) {
  const all = await list<MealPlanEntry>(COL.mealPlan);
  const shift = (d: ISODate) => addDaysISO(toStart, daysBetweenISO(fromStart, d));
  const src = all.filter(
    (e) => e.date >= fromStart && e.date <= addDaysISO(fromStart, 6) && e.status !== "skipped",
  );
  let n = 0;
  for (const e of src) {
    const id = newId();
    await put(COL.mealPlan, id, {
      ...e,
      id,
      date: shift(e.date),
      status: "planned",
      mealLogId: undefined,
      batchId: undefined,
    });
    n++;
  }
  return n;
}

export async function createBatch(
  recipeId: string,
  yieldServings: number,
  cookDate: ISODate,
  eatDates: { date: ISODate; slot: string; name: string }[],
) {
  const b: Batch = { id: newId(), recipeId, yield: yieldServings, cookDate };
  await put(COL.batches, b.id, b);
  for (const d of eatDates)
    await addPlanEntry({
      date: d.date,
      slot: d.slot,
      recipeId,
      name: d.name,
      portion: 1,
      batchId: b.id,
    });
  return b;
}
import { addDays as addDaysISO, daysBetween as daysBetweenISO } from "@/domain/dates";
