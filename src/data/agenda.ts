import { useMemo } from "react";
import { addDays, localMinutes, type ISODate } from "@/domain/dates";
import type { MealLog } from "@/domain/nutrition";
import type { PrayerName } from "@/domain/prayer";
import { agendaFor, type RoutineBlockLike } from "@/domain/routine";
import { useCollection, useNow } from "./hooks";
import { usePrayer } from "./prayer-hooks";
import { plannedTemplateFor } from "./selectors";
import {
  COL,
  type MindEntry,
  type Modules,
  type PrayerLog,
  type RoutineBlock,
  type RoutineCompletion,
  type RoutineException,
  type Session,
  type WorkoutTemplate,
} from "./types";

/** Whether Salah features are on: an explicit choice wins, otherwise on only if the person already set it up. */
export function useSalahEnabled() {
  const mods = useCollection<Modules>(COL.modules);
  const prayerSettings = useCollection<{ id: string }>(COL.prayerSettings);
  const explicit = mods.items.find((m) => m.id === "main")?.salah;
  return {
    ready: mods.ready && prayerSettings.ready,
    enabled: explicit ?? prayerSettings.items.length > 0,
    explicit,
  };
}

/** One agenda for `date` (default: today in the person's timezone), recomputed as the clock moves. */
export function useAgenda(date?: ISODate) {
  const now = useNow(30_000);
  const prayer = usePrayer(now);
  const salah = useSalahEnabled();
  const blocks = useCollection<RoutineBlock>(COL.routine);
  const exceptions = useCollection<RoutineException>(COL.routineExceptions);
  const completions = useCollection<RoutineCompletion>(COL.routineDone);
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const meals = useCollection<MealLog>(COL.mealLogs);
  const mind = useCollection<MindEntry>(COL.mind);
  const today = prayer.today;
  const d = date ?? today;
  const ready = prayer.ready && blocks.ready && templates.ready && sessions.ready && salah.ready;

  const agenda = useMemo(() => {
    const day = prayer.lookup(d);
    const prev = prayer.lookup(addDays(d, -1));
    const logged = new Set<PrayerName>(
      (prayer.logs as PrayerLog[]).filter((l) => l.date === d).map((l) => l.prayer),
    );
    const planned = plannedTemplateFor(templates.items, d);
    const done = sessions.items.filter((s) => s.date === d && s.status === "completed");
    return agendaFor({
      date: d,
      today,
      nowMin: localMinutes(now, prayer.tz),
      blocks: blocks.items as RoutineBlockLike[],
      exceptions: exceptions.items,
      completions: completions.items,
      prayer: {
        enabled: salah.enabled,
        start: (p) => day?.start[p],
        startPrev: (p) => prev?.start[p],
        logged,
      },
      workout: {
        planned: planned
          ? { id: planned.id, letter: planned.letter, title: planned.title, time: planned.time }
          : undefined,
        completed: new Set(done.map((s) => s.templateId)),
        anyCompleted: done.length > 0,
      },
      mealsLogged: meals.items.filter((m) => m.date === d).length,
      mind: new Set(mind.items.filter((m) => m.date === d).map((m) => m.kind)),
    });
  }, [
    d,
    today,
    now,
    prayer,
    salah.enabled,
    blocks.items,
    exceptions.items,
    completions.items,
    templates.items,
    sessions.items,
    meals.items,
    mind.items,
  ]);

  return { ...agenda, ready, today, date: d, tz: prayer.tz, salahEnabled: salah.enabled, now };
}
