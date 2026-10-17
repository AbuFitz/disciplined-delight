/**
 * Mirror Mode ("You vs You"). Compares a person only to their own earlier
 * performance. Nothing here ranks people, reads private notes, or implies a
 * smaller number is a failure: a lighter day is reported as information.
 */
import type { Session, SessionExercise } from "@/data/types";
import type { RecordedSet } from "../progression";
import { defaultIncrementKg } from "../progression";
import { formatSeconds, formatSet, trackingOf } from "../tracking";
import { daysBetween } from "../dates";

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const done = (s: RecordedSet) =>
  s.completed && !s.skipped && (s.kind === "working" || s.kind === "failure" || s.kind === "drop");

export type SetScore = { weightKg: number; reps: number; seconds: number; distanceM: number };
const score = (s: RecordedSet): SetScore => ({
  weightKg: s.weightKg ?? 0,
  reps: s.reps ?? 0,
  seconds: s.seconds ?? 0,
  distanceM: s.distanceM ?? 0,
});

/** Best working set of an exercise by the metric its tracking type cares about. */
export function topSet(exercise: SessionExercise): RecordedSet | undefined {
  const t = trackingOf(exercise.tracking);
  const sets = exercise.sets.filter(done);
  if (!sets.length) return undefined;
  const rank = (s: RecordedSet) =>
    t === "weight_reps"
      ? (s.weightKg ?? 0) * 1000 + (s.reps ?? 0)
      : t === "time"
        ? (s.seconds ?? 0)
        : t === "distance_time"
          ? (s.distanceM ?? 0) * 1000 - (s.seconds ?? 0) / 1000
          : t === "assisted_reps"
            ? (s.reps ?? 0) * 1000 - (s.assistKg ?? 0)
            : (s.reps ?? 0);
  return [...sets].sort((a, b) => rank(b) - rank(a))[0];
}

function matches(exercise: SessionExercise, other: SessionExercise) {
  if (exercise.catalogueId && other.catalogueId) return exercise.catalogueId === other.catalogueId;
  return normalise(exercise.name) === normalise(other.name);
}

/** The person's most recent earlier session containing this exercise with a recorded set. */
export function previousPerformance(
  exercise: SessionExercise,
  history: Session[],
  before: { id?: string; date: string },
): { session: Session; exercise: SessionExercise; top: RecordedSet } | undefined {
  const earlier = history
    .filter(
      (s) =>
        s.id !== before.id &&
        (s.status === "completed" || s.status === "ended-early") &&
        s.date <= before.date &&
        (s.date < before.date || (s.endedAt ?? 0) > 0),
    )
    .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt));
  for (const session of earlier) {
    const found = session.exercises.find((e) => matches(exercise, e));
    const top = found && topSet(found);
    if (found && top) return { session, exercise: found, top };
  }
  return undefined;
}

export type Ghost = {
  /** What last time looked like. */
  last: string;
  /** A personal target; optional, never required. */
  match: string;
  stretch?: string;
  /** Structured form for pre-filling or tests. */
  matchSet: Pick<RecordedSet, "weightKg" | "reps" | "seconds" | "distanceM">;
  stretchSet?: Pick<RecordedSet, "weightKg" | "reps" | "seconds" | "distanceM">;
};

/** Personal "ghost" targets from the previous top set: match it, or take one small step. */
export function ghostTarget(exercise: SessionExercise, prev: RecordedSet): Ghost {
  const t = trackingOf(exercise.tracking);
  const last = formatSet(prev, exercise.tracking);
  const { repMax, repMin } = exercise.prescription;
  switch (t) {
    case "weight_reps": {
      const w = prev.weightKg ?? 0;
      const reps = prev.reps ?? repMin;
      const inc = exercise.incrementKg ?? defaultIncrementKg(exercise.equipment);
      const stretchSet =
        reps < repMax
          ? { weightKg: w, reps: reps + 1 }
          : { weightKg: Math.round((w + inc) * 100) / 100, reps: repMin };
      return {
        last,
        match: `${w} kg × ${reps}`,
        stretch: `${stretchSet.weightKg} kg × ${stretchSet.reps}`,
        matchSet: { weightKg: w, reps },
        stretchSet,
      };
    }
    case "time": {
      const s = prev.seconds ?? 0;
      return {
        last,
        match: formatSeconds(s),
        stretch: formatSeconds(s + 5),
        matchSet: { seconds: s },
        stretchSet: { seconds: s + 5 },
      };
    }
    case "distance_time":
      return {
        last,
        match: last,
        matchSet: { distanceM: prev.distanceM, seconds: prev.seconds },
      };
    default: {
      const reps = prev.reps ?? repMin;
      return {
        last,
        match: `${reps} reps`,
        stretch: `${reps + 1} reps`,
        matchSet: { reps },
        stretchSet: { reps: reps + 1 },
      };
    }
  }
}

export type Verdict = "ahead" | "match" | "lighter" | "new";
export type SetComparison = { verdict: Verdict; text: string };

/** Compare one finished or in-progress set to last time's top set. */
export function compareToLast(
  exercise: SessionExercise,
  current: RecordedSet,
  prev: RecordedSet | undefined,
): SetComparison {
  if (!prev) return { verdict: "new", text: "First time on record. This one becomes your mark." };
  const t = trackingOf(exercise.tracking);
  const a = score(current);
  const b = score(prev);
  const cmp =
    t === "time"
      ? Math.sign(a.seconds - b.seconds)
      : t === "distance_time"
        ? Math.sign(a.distanceM - b.distanceM) || Math.sign(b.seconds - a.seconds)
        : Math.sign(a.weightKg - b.weightKg) || Math.sign(a.reps - b.reps);
  if (cmp > 0)
    return {
      verdict: "ahead",
      text: `Ahead of last time (${formatSet(prev, exercise.tracking)}).`,
    };
  if (cmp === 0)
    return { verdict: "match", text: `Matched last time (${formatSet(prev, exercise.tracking)}).` };
  return {
    verdict: "lighter",
    text: `Lighter than last time (${formatSet(prev, exercise.tracking)}). A lighter day is still data.`,
  };
}

export type MirrorLine = {
  kind: "last" | "ghost" | "now" | "new";
  text: string;
};

/** Everything the card and Buddy need for one exercise, using only the person's own history. */
export function mirrorForExercise(
  exercise: SessionExercise,
  history: Session[],
  before: { id?: string; date: string },
): { lines: MirrorLine[]; ghost?: Ghost; comparison?: SetComparison } {
  const prev = previousPerformance(exercise, history, before);
  if (!prev)
    return { lines: [{ kind: "new", text: "No earlier mark yet. Today sets the first one." }] };
  const ghost = ghostTarget(exercise, prev.top);
  const lines: MirrorLine[] = [
    { kind: "last", text: `Last time: ${ghost.last}` },
    {
      kind: "ghost",
      text: ghost.stretch
        ? `Your ghost: match ${ghost.match}, or take one small step to ${ghost.stretch}.`
        : `Your ghost: ${ghost.match}.`,
    },
  ];
  const current = topSet(exercise);
  const comparison = current ? compareToLast(exercise, current, prev.top) : undefined;
  if (comparison) lines.push({ kind: "now", text: comparison.text });
  return { lines, ghost, comparison };
}

export type MirrorSummary = {
  ahead: number;
  matched: number;
  lighter: number;
  fresh: number;
  /** Plain sentences, ordered by what is most encouraging and true. */
  wins: string[];
  comeback?: string;
};

/** After a session: how it compared to the same person's previous marks. */
export function mirrorSummary(session: Session, history: Session[]): MirrorSummary {
  let ahead = 0,
    matched = 0,
    lighter = 0,
    fresh = 0;
  for (const exercise of session.exercises) {
    const top = topSet(exercise);
    if (!top) continue;
    const prev = previousPerformance(exercise, history, session);
    const result = compareToLast(exercise, top, prev?.top);
    if (result.verdict === "ahead") ahead++;
    else if (result.verdict === "match") matched++;
    else if (result.verdict === "lighter") lighter++;
    else fresh++;
  }
  const wins: string[] = [];
  if (ahead)
    wins.push(`${ahead} ${ahead === 1 ? "exercise" : "exercises"} ahead of your last time.`);
  if (matched) wins.push(`${matched} matched your last time, which is steady work.`);
  if (fresh) wins.push(`${fresh} new ${fresh === 1 ? "mark" : "marks"} on record.`);
  const readiness = session.readiness;
  if (readiness?.decision === "accepted" && readiness.suggestion !== "keep")
    wins.push("You adjusted the plan to how you felt. That is part of training well.");
  if (lighter && !ahead && !matched)
    wins.push("A lighter day than last time. Recovery work still builds the next heavy one.");
  const finished = history
    .filter((s) => s.id !== session.id && (s.status === "completed" || s.status === "ended-early"))
    .map((s) => s.date)
    .filter((d) => d < session.date)
    .sort();
  const gap = finished.length ? daysBetween(finished.at(-1)!, session.date) : 0;
  const comeback =
    gap >= 8
      ? `Back after ${gap} days. Showing up again is the hard part, and you did it.`
      : undefined;
  return { ahead, matched, lighter, fresh, wins, comeback };
}

/** Consistency against the person's own recent weeks, not anyone else's. */
export function consistencyMirror(
  sessions: Pick<Session, "date" | "status">[],
  today: string,
): { thisWeek: number; usual: number; text: string } {
  const completed = sessions
    .filter((s) => s.status === "completed" || s.status === "ended-early")
    .map((s) => s.date);
  const inRange = (from: number, to: number) =>
    completed.filter((d) => {
      const age = daysBetween(d, today);
      return age >= from && age < to;
    }).length;
  const thisWeek = inRange(0, 7);
  const prior = inRange(7, 35) / 4;
  const usual = Math.round(prior * 10) / 10;
  if (!completed.length) return { thisWeek, usual, text: "Your first session starts your ledger." };
  if (thisWeek > usual)
    return { thisWeek, usual, text: `${thisWeek} sessions this week against your usual ${usual}.` };
  if (thisWeek === Math.round(usual))
    return { thisWeek, usual, text: `${thisWeek} this week. That is your usual rhythm.` };
  return {
    thisWeek,
    usual,
    text: `${thisWeek} so far this week; your usual is ${usual}. The week is not over.`,
  };
}

/** First exercise in a finished session whose heaviest loaded set beats every earlier one of the person's own. */
export function personalBest(
  session: Session,
  history: Session[],
): { exercise: string; detail: string } | undefined {
  for (const exercise of session.exercises) {
    if (trackingOf(exercise.tracking) !== "weight_reps") continue;
    const top = topSet(exercise);
    if (!top?.weightKg) continue;
    const earlier = history
      .filter(
        (s) =>
          s.id !== session.id &&
          (s.status === "completed" || s.status === "ended-early") &&
          s.date <= session.date,
      )
      .flatMap((s) => s.exercises.filter((e) => matches(exercise, e)))
      .map(topSet)
      .filter((s): s is RecordedSet => !!s?.weightKg);
    if (!earlier.length) continue; // a first mark is a baseline, not a record
    if (top.weightKg > Math.max(...earlier.map((s) => s.weightKg!)))
      return { exercise: exercise.name, detail: `${formatSet(top, exercise.tracking)}.` };
  }
  return undefined;
}
