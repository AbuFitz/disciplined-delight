import type { FoodDay, MindEntry, Session, WeighIn } from "@/data/types";

export type Milestone = {
  id:
    | "first-session"
    | "five-sessions"
    | "twenty-five-sessions"
    | "fifty-sessions"
    | "seven-food-days"
    | "weight-trend"
    | "five-reflections"
    | "focus-hour";
  title: string;
  body: string;
  earned: boolean;
  current: number;
  target: number;
  progressLabel: string;
};

export type MilestoneInput = {
  sessions: Pick<Session, "status">[];
  foodDays: Pick<FoodDay, "date" | "complete">[];
  weighIns: Pick<WeighIn, "date">[];
  mind: Pick<MindEntry, "kind" | "minutes">[];
};

const daysBetween = (first?: string, last?: string) =>
  first && last
    ? Math.round(
        (new Date(`${last}T12:00:00Z`).getTime() - new Date(`${first}T12:00:00Z`).getTime()) /
          86_400_000,
      )
    : 0;

export function progressMilestones(input: MilestoneInput): Milestone[] {
  const sessions = input.sessions.filter(
    ({ status }) => status === "completed" || status === "ended-early",
  ).length;
  const completeFoodDays = new Set(
    input.foodDays.filter(({ complete }) => complete).map(({ date }) => date),
  ).size;
  const weighInDates = [...new Set(input.weighIns.map(({ date }) => date))].sort();
  const weighInSpan = daysBetween(weighInDates[0], weighInDates.at(-1));
  const reflections = input.mind.filter(({ kind }) => kind === "reflection").length;
  const focusMinutes = input.mind
    .filter(({ kind }) => kind === "focus")
    .reduce((total, entry) => total + Math.max(0, entry.minutes ?? 0), 0);

  const sessionMilestone = (
    id: Milestone["id"],
    title: string,
    target: number,
    body: string,
  ): Milestone => ({
    id,
    title,
    body,
    earned: sessions >= target,
    current: sessions,
    target,
    progressLabel: `${Math.min(sessions, target)} of ${target} logged`,
  });

  return [
    sessionMilestone(
      "first-session",
      "First page",
      1,
      "Finish a session—or end it honestly as partial—to begin the record.",
    ),
    sessionMilestone(
      "five-sessions",
      "Found a rhythm",
      5,
      "Five real training sessions, without pretending partial work did not happen.",
    ),
    sessionMilestone(
      "twenty-five-sessions",
      "Twenty-five deep",
      25,
      "A substantial body of logged training, built one visit at a time.",
    ),
    sessionMilestone(
      "fifty-sessions",
      "Built, not announced",
      50,
      "Fifty logged sessions. The record says enough.",
    ),
    {
      id: "seven-food-days",
      title: "Seven complete days",
      body: "Seven days deliberately marked fully logged. Missing days never count as zero.",
      earned: completeFoodDays >= 7,
      current: completeFoodDays,
      target: 7,
      progressLabel: `${Math.min(completeFoodDays, 7)} of 7 complete`,
    },
    {
      id: "weight-trend",
      title: "Trend, not noise",
      body: "Six weigh-ins spread across at least fourteen days unlock a meaningful trend.",
      earned: weighInDates.length >= 6 && weighInSpan >= 14,
      current: weighInDates.length >= 6 ? weighInSpan : weighInDates.length,
      target: weighInDates.length >= 6 ? 14 : 6,
      progressLabel:
        weighInDates.length >= 6
          ? `${Math.min(weighInSpan, 14)} of 14 days spanned`
          : `${weighInDates.length} of 6 weigh-ins`,
    },
    {
      id: "five-reflections",
      title: "Five honest notes",
      body: "Five private reflections. Their words stay yours; only the count appears here.",
      earned: reflections >= 5,
      current: reflections,
      target: 5,
      progressLabel: `${Math.min(reflections, 5)} of 5 reflections`,
    },
    {
      id: "focus-hour",
      title: "One focused hour",
      body: "Sixty finished focus minutes, accumulated at your pace.",
      earned: focusMinutes >= 60,
      current: focusMinutes,
      target: 60,
      progressLabel: `${Math.min(focusMinutes, 60)} of 60 minutes`,
    },
  ];
}

export const nextMilestone = (milestones: Milestone[]) =>
  milestones
    .filter((milestone) => !milestone.earned)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0] ?? null;
