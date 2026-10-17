import type {
  AdaptationAction,
  ReadinessAction,
  ReadinessCheckIn,
  Session,
  SessionExercise,
} from "@/data/types";

export type ReadinessInput = Pick<
  ReadinessCheckIn,
  "sleep" | "soreness" | "energy" | "stress" | "timeAvailable" | "aggravatingExerciseId"
>;

export type ReadinessEstimate = {
  score: number;
  action: ReadinessAction;
  reason: string;
  contributors: string[];
};

/**
 * Self-report only. The score is deliberately simple and explainable; it is not
 * a medical assessment or a wearable-derived recovery score.
 */
export function estimateReadiness(
  input: ReadinessInput,
  plannedMinutes: number,
): ReadinessEstimate {
  const positive = input.sleep + input.energy + (6 - input.soreness) + (6 - input.stress);
  const score = Math.round(((positive - 4) / 16) * 100);
  const contributors: string[] = [];
  if (input.sleep <= 2) contributors.push("sleep was rated low");
  if (input.energy <= 2) contributors.push("energy was rated low");
  if (input.soreness >= 4) contributors.push("soreness was rated high");
  if (input.stress >= 4) contributors.push("stress was rated high");
  if (input.timeAvailable < plannedMinutes)
    contributors.push(`you have ${input.timeAvailable} minutes`);

  if (input.aggravatingExerciseId)
    return {
      score,
      action: "swap_aggravating",
      contributors: ["you marked a movement as aggravating", ...contributors],
      reason: "Swap that movement for a comfortable alternative with the same movement intent.",
    };
  if (input.timeAvailable <= Math.max(15, plannedMinutes - 15))
    return {
      score,
      action: "shorten",
      contributors,
      reason: "Keep the primary work and trim the lowest-priority accessories to fit your time.",
    };
  if (score <= 30)
    return {
      score,
      action: "lower_load",
      contributors,
      reason: "A small 10% load reduction keeps the movement while lowering today's demand.",
    };
  if (score <= 40)
    return {
      score,
      action: "reduce_set",
      contributors,
      reason: "One fewer working set per exercise is a conservative adjustment for today.",
    };
  return {
    score,
    action: "keep",
    contributors: contributors.length ? contributors : ["ratings are within your usual range"],
    reason: "The check-in does not suggest changing the planned session.",
  };
}

export function applyReadinessAction(session: Session, action: ReadinessAction): Session {
  if (action === "keep" || action === "swap_aggravating") return session;
  if (action === "shorten") {
    const target = session.readiness?.timeAvailable ?? 30;
    const maxExercises = target <= 25 ? 3 : target <= 40 ? 4 : 5;
    return { ...session, exercises: session.exercises.slice(0, maxExercises) };
  }
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets:
        action === "reduce_set"
          ? removeLastWorkingSet(exercise.sets)
          : exercise.sets.map((set) =>
              set.kind === "working" && set.weightKg != null
                ? { ...set, weightKg: roundLoad(set.weightKg * 0.9) }
                : set,
            ),
    })),
  };
}

const removeLastWorkingSet = <T extends { kind: string }>(sets: T[]): T[] => {
  let index = -1;
  for (let position = sets.length - 1; position >= 0; position--) {
    if (sets[position]?.kind === "working") {
      index = position;
      break;
    }
  }
  return index < 0 ? sets : sets.filter((_, i) => i !== index);
};

const roundLoad = (kg: number) => Math.max(0, Math.round(kg * 2) / 2);

export type AdaptationSuggestion = {
  action: AdaptationAction;
  reason: string;
  observations: number;
  confidence: "early" | "developing" | "established";
  weightKg?: number;
  sets?: number;
};

const matchingExercise = (session: Session, exercise: SessionExercise) =>
  session.exercises.find(
    (item) =>
      (exercise.templateExerciseId && item.templateExerciseId === exercise.templateExerciseId) ||
      item.name === exercise.name,
  );

/** Deterministic v1 adaptation. Notes are never read. One poor exposure cannot trigger a deload. */
export function suggestAdaptation(
  exercise: SessionExercise,
  history: Session[],
  now = Date.now(),
): AdaptationSuggestion {
  const completed = history
    .filter((session) => session.status === "completed" || session.status === "ended-early")
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => ({ session, exercise: matchingExercise(session, exercise) }))
    .filter((item): item is { session: Session; exercise: SessionExercise } => !!item.exercise)
    .slice(0, 4);
  const observations = completed.length;
  const confidence = observations >= 4 ? "established" : observations >= 2 ? "developing" : "early";
  const latest = completed[0];
  if (!latest)
    return {
      action: "hold",
      reason: "No completed exposure yet; start conservatively.",
      observations,
      confidence,
    };

  const daysSince = Math.floor((now - latest.session.startedAt) / 86_400_000);
  const latestWorking = latest.exercise.sets.filter(
    (set) => set.kind === "working" || set.kind === "failure" || set.kind === "drop",
  );
  const latestWeight = Math.max(0, ...latestWorking.map((set) => set.weightKg ?? 0));
  if (
    latest.exercise.preference === "never" ||
    latest.exercise.preference === "equipment_unavailable"
  )
    return {
      action: "swap",
      reason:
        latest.exercise.preference === "never"
          ? "You marked this movement as one you do not want."
          : "You marked its equipment unavailable.",
      observations,
      confidence,
    };
  if (daysSince >= 21 && latestWeight > 0)
    return {
      action: "reduce_load",
      weightKg: roundLoad(latestWeight * 0.9),
      reason: `${daysSince} days have passed since this movement; restart about 10% lighter and reassess.`,
      observations,
      confidence,
    };

  const demanding = completed.filter(({ exercise: item }) => {
    const work = item.sets.filter((set) => set.kind !== "warmup" && set.completed && !set.skipped);
    return work.some((set) => set.kind === "failure" || set.rpe === 10 || set.rir === 0);
  }).length;
  if (observations >= 3 && demanding >= 2 && latestWeight > 0)
    return {
      action: "reduce_load",
      weightKg: roundLoad(latestWeight * 0.95),
      reason: `${demanding} of the last ${observations} exposures included failure or maximal effort; try 5% less.`,
      observations,
      confidence,
    };

  const successful = completed.filter(({ exercise: item }) => {
    const work = item.sets.filter((set) => set.kind === "working" && !set.skipped);
    return (
      work.length >= item.prescription.sets &&
      work.every(
        (set) =>
          set.completed &&
          (set.reps ?? 0) >= item.prescription.repMax &&
          (set.rir == null || set.rir >= 2) &&
          (set.rpe == null || set.rpe <= 8),
      )
    );
  }).length;
  if (observations >= 2 && successful >= 2 && latestWeight > 0)
    return {
      action: "increase_load",
      weightKg: roundLoad(latestWeight + (exercise.incrementKg ?? 2.5)),
      reason: `The last ${successful} exposures reached the rep target without maximal effort.`,
      observations,
      confidence,
    };
  if (latest.exercise.preference === "less")
    return {
      action: "reduce_set",
      sets: Math.max(1, exercise.prescription.sets - 1),
      reason: "You asked for less of this movement.",
      observations,
      confidence,
    };
  return {
    action: "hold",
    weightKg: latestWeight || undefined,
    reason: `Keep the current target while the evidence builds (${observations} exposure${observations === 1 ? "" : "s"}).`,
    observations,
    confidence,
  };
}

export function shouldSuggestDeload(sessions: Session[]): boolean {
  const recent = sessions
    .filter((session) => session.status === "completed" || session.status === "ended-early")
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 4);
  if (recent.length < 3) return false;
  const strainSignals = recent.filter((session) => {
    const work = session.exercises
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.kind !== "warmup");
    const maximal = work.some((set) => set.kind === "failure" || set.rpe === 10 || set.rir === 0);
    const incomplete =
      session.status === "ended-early" || work.filter((set) => set.skipped).length >= 2;
    return maximal || incomplete;
  }).length;
  return strainSignals >= 3;
}

export function readinessAssociation(sessions: Session[]) {
  const rows = sessions.filter((session) => session.readiness && session.endedAt).slice(-20);
  if (rows.length < 6) return null;
  const high = rows.filter((session) => (session.readiness?.score ?? 0) >= 60);
  const low = rows.filter((session) => (session.readiness?.score ?? 0) < 60);
  if (high.length < 2 || low.length < 2) return null;
  const completion = (group: Session[]) =>
    group.reduce((sum, session) => {
      const sets = session.exercises
        .flatMap((exercise) => exercise.sets)
        .filter((set) => set.kind !== "warmup");
      return sum + (sets.length ? sets.filter((set) => set.completed).length / sets.length : 0);
    }, 0) / group.length;
  return {
    observations: rows.length,
    highCompletion: completion(high),
    lowCompletion: completion(low),
    statement:
      "In your records, higher self-rated readiness is associated with session completion. This does not show causation.",
  };
}

export function elapsedMinutes(session: Session) {
  const end = session.endedAt ?? Date.now();
  const start = session.workStartedAt ?? session.startedAt;
  return Math.round(Math.max(0, end - start - session.pausedMs) / 60_000);
}
