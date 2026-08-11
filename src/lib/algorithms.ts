/**
 * Adaptive TDEE — estimates true maintenance calories from 14 days of logged
 * intake + body weight, instead of trusting a fixed formula. Needs at least
 * 14 days of {caloriesLogged, weightKg} to produce anything better than the
 * baseline target.
 */
export type TDEELog = { date: string; caloriesLogged: number; weightKg: number };

export function calculateAdaptiveTDEE(logs: TDEELog[], baseline = 2760): number {
  if (logs.length < 14) return baseline;

  const recent = logs.slice(-14);
  const avgCalories = recent.reduce((sum, log) => sum + log.caloriesLogged, 0) / 14;

  const weightChangeKg = recent[13]!.weightKg - recent[0]!.weightKg;
  // 1kg body mass ~ 7700 kcal energy surplus/deficit.
  const surplusDeficitPerDay = (weightChangeKg * 7700) / 14;

  const estimatedTDEE = Math.round(avgCalories - surplusDeficitPerDay);
  return Math.min(Math.max(estimatedTDEE, 1500), 4500);
}

/**
 * Double-progression / auto-overload recommendation for the next session's
 * weight on a given exercise, based on the last logged set.
 */
export type SetLog = {
  repsCompleted: number;
  weightKg: number;
  targetRepsMax: number;
  /** Rate of perceived exertion, 1–10. */
  rpe?: number;
};

export function getNextSessionTarget(previousSets: SetLog[]): {
  newWeight: number;
  note: string;
} {
  const lastSet = previousSets[previousSets.length - 1];
  if (!lastSet) return { newWeight: 0, note: "No prior sets logged yet." };

  if (lastSet.repsCompleted >= lastSet.targetRepsMax && (lastSet.rpe ? lastSet.rpe <= 8 : true)) {
    return {
      newWeight: lastSet.weightKg + 2.5,
      note: "Top rep target hit cleanly. Weight increased by +2.5kg.",
    };
  }

  if (lastSet.repsCompleted < lastSet.targetRepsMax - 3) {
    return {
      newWeight: Math.max(lastSet.weightKg - 2.5, 0),
      note: "Volume target missed. Reduced weight by -2.5kg to rebuild form.",
    };
  }

  return {
    newWeight: lastSet.weightKg,
    note: "Maintain current weight. Focus on controlled eccentric phase.",
  };
}
