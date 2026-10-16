/**
 * Double progression, set-aware. A weight increase is only *suggested* when
 * every working set was completed at the top of its rep range at one weight.
 * Nothing here ever writes to logs; the user accepts a suggestion.
 */
export type RecordedSet = {
  kind: "warmup" | "working";
  weightKg?: number;
  reps?: number;
  /** Timed holds and distance work. */
  seconds?: number;
  distanceM?: number;
  /** Assistance in kg for assisted movements (not a load lifted). */
  assistKg?: number;
  completed: boolean;
  skipped?: boolean;
  rir?: number;
};

export type Prescription = { sets: number; repMin: number; repMax: number };

export type Suggestion =
  | { kind: "increase"; fromKg: number; toKg: number; reason: string }
  | { kind: "hold"; weightKg: number; reason: string }
  | { kind: "none"; reason: string };

export function defaultIncrementKg(equipment?: string): number {
  const e = (equipment ?? "").toLowerCase();
  if (/dumbbell/.test(e)) return 2;
  if (/cable|rope|pulley|pushdown|lateral|fly|pec deck/.test(e)) return 1;
  return 2.5; // plate-loaded / selectorised machines
}

export function suggestNext(
  previous: RecordedSet[],
  rx: Prescription,
  incrementKg: number,
): Suggestion {
  const working = previous.filter((s) => s.kind === "working" && !s.skipped);
  if (working.length === 0) return { kind: "none", reason: "No working sets recorded yet." };

  const recorded = working.filter((s) => s.completed && s.weightKg != null && s.reps != null);
  if (recorded.length < Math.min(rx.sets, working.length) || recorded.length === 0) {
    return { kind: "none", reason: "Some sets are missing weight or reps, so no suggestion." };
  }
  if (recorded.length < rx.sets) {
    return { kind: "none", reason: `Only ${recorded.length} of ${rx.sets} working sets recorded.` };
  }

  const weights = new Set(recorded.map((s) => s.weightKg));
  const base = Math.min(...(recorded.map((s) => s.weightKg!) as number[]));
  const allTop = recorded.every((s) => s.reps! >= rx.repMax);
  const sameWeight = weights.size === 1;

  if (allTop && sameWeight) {
    return {
      kind: "increase",
      fromKg: base,
      toKg: Math.round((base + incrementKg) * 100) / 100,
      reason: `All ${rx.sets} sets reached ${rx.repMax} reps at ${base} kg.`,
    };
  }
  if (allTop && !sameWeight) {
    return {
      kind: "hold",
      weightKg: base,
      reason: "Sets were at different weights; repeat one weight across all sets.",
    };
  }
  const short = recorded.filter((s) => s.reps! < rx.repMax).length;
  return {
    kind: "hold",
    weightKg: base,
    reason: `${short} of ${rx.sets} sets are below ${rx.repMax} reps. Stay at ${base} kg and aim for the top of the range.`,
  };
}

export function parseScheme(scheme: string): Prescription | null {
  const m = scheme.match(/(\d+)\s*[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  if (!m) return null;
  const min = Number(m[2]);
  return { sets: Number(m[1]), repMin: min, repMax: m[3] ? Number(m[3]) : min };
}
