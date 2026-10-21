import { WEEKDAY_LONG, addDays, weekdayIndex, type ISODate } from "./dates";

type T = {
  id: string;
  title: string;
  letter?: string;
  weekday: number | null;
  archivedAt?: string | null;
  exercises: unknown[];
};
export type Upcoming<TT extends T = T> = {
  template: TT;
  daysAway: number;
  label: string;
  date: ISODate;
};

/** The next scheduled workout, today included. Weekdays are Monday-first, matching templates. */
export function upcomingWorkout<TT extends T>(
  templates: TT[],
  today: ISODate,
): Upcoming<TT> | null {
  const live = templates.filter(
    (t) => !t.archivedAt && t.weekday !== null && t.exercises.length > 0,
  );
  if (!live.length) return null;
  for (let d = 0; d < 7; d++) {
    const date = addDays(today, d);
    const hit = live.filter((t) => t.weekday === weekdayIndex(date));
    if (hit.length)
      return {
        template: hit[0]!,
        daysAway: d,
        date,
        label: d === 0 ? "Today" : d === 1 ? "Tomorrow" : WEEKDAY_LONG[weekdayIndex(date)]!,
      };
  }
  return null;
}
