/**
 * Constraint-based plan generator. Pure and deterministic: same input + seed + catalogue + RULES_VERSION => same plan.
 * It selects only from the generator tier, only from equipment the person has, and NEVER assigns a load: the person
 * finds their own working weight (see `effort`). Scope: healthy adults. Anything outside that is refused, not guessed.
 */
import type { CatalogueExercise, EquipmentId, MuscleId, Pattern, TrackingType } from "./catalogue";
import {
  ADVANCED_ONLY,
  AUTO_AVOID,
  PROGRAMMES,
  REPS,
  REST_SECONDS,
  RULES_VERSION,
  TIMING,
  WEEKLY_SETS,
  setsFor,
  type Experience,
  type Goal,
  type Programme,
  type RepScheme,
  type Slot,
  type SlotRole,
} from "./programmes";

export type Style = "machines_cables" | "free_weights" | "bodyweight" | "mixed";

export type PlanInput = {
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  /** 0 = Sunday. Used only when its length equals the number of sessions. */
  preferredDays?: number[];
  sessionMinutes: number;
  equipment: EquipmentId[];
  style?: Style;
  priorityMuscles?: MuscleId[];
  excludedExercises?: string[];
  avoidPatterns?: Pattern[];
  favourites?: string[];
  /** exercise id -> times logged; nudges selection toward familiar movements. */
  history?: Record<string, number>;
  adult: boolean;
  /** True when a clinician has restricted exercise. The generator will not produce a plan. */
  clinicianRestricted?: boolean;
  seed?: string;
  /** Return a plan even when slots cannot be filled (the gaps are listed). */
  allowPartial?: boolean;
};

export type PlannedExercise = {
  slotKey: string;
  role: SlotRole;
  scheme: RepScheme;
  priority: number;
  exerciseId: string;
  name: string;
  pattern: Pattern;
  tracking: TrackingType;
  sets: number;
  repMin?: number;
  repMax?: number;
  /** For timed holds. */
  seconds?: number;
  restSec: number;
  /** Exercises sharing a value are done back to back, resting after the pair. */
  superset?: string;
  pairWith?: string;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment: EquipmentId[];
};

export type PlannedSession = {
  title: string;
  focus: string;
  /** 0 = Sunday. */
  weekday: number;
  exercises: PlannedExercise[];
  estimatedMinutes: number;
  dropped: string[];
};

export type Conflict = {
  session: string;
  slotKey: string;
  patterns: Pattern[];
  blocking: boolean;
  message: string;
};
export type Suggestion = {
  kind: "add_equipment" | "more_time" | "more_days" | "fewer_days";
  equipment?: EquipmentId;
  message: string;
};

export type Plan = {
  rulesVersion: string;
  programmeId: string;
  programmeName: string;
  input: PlanInput;
  sessions: PlannedSession[];
  rationale: string[];
  conflicts: Conflict[];
  /** How hard to work, expressed without a load. */
  effort: string;
};

export type PlanResult =
  | { ok: true; plan: Plan }
  | {
      ok: false;
      kind: "unsupported" | "invalid" | "conflict";
      message: string;
      conflicts: Conflict[];
      suggestions: Suggestion[];
      partial?: Plan;
    };

/* ------------------------------ helpers ------------------------------ */

const ALWAYS: EquipmentId[] = ["bodyweight", "mat"];
const LOADED_STYLE: EquipmentId[] = ["dumbbell", "barbell", "kettlebell", "ez_bar", "smith"];
const MACHINE_STYLE: EquipmentId[] = ["machine", "cable"];

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

const available = (e: CatalogueExercise, have: EquipmentId[]) => {
  const set = new Set<EquipmentId>([...have, ...ALWAYS]);
  return e.equipment.every((q) => set.has(q));
};

const SETS_TRACKED: TrackingType[] = ["weight_reps", "bodyweight_reps", "assisted_reps", "time"];

function baseOk(e: CatalogueExercise, input: PlanInput): boolean {
  if (e.tier !== "generator") return false;
  if (!SETS_TRACKED.includes(e.tracking)) return false;
  if (input.excludedExercises?.includes(e.id)) return false;
  if (input.avoidPatterns?.includes(e.pattern)) return false;
  if (AUTO_AVOID.test(e.name)) return false;
  if (input.experience !== "some" && ADVANCED_ONLY.test(e.name)) return false;
  return true;
}

function styleBonus(e: CatalogueExercise, style: Style | undefined): number {
  if (!style || style === "mixed") return 0;
  const eq = e.equipment.filter(
    (q) => !ALWAYS.includes(q) && q !== "bench" && q !== "incline_bench",
  );
  if (style === "bodyweight") return eq.length === 0 ? 15 : -10;
  if (style === "machines_cables") return eq.some((q) => MACHINE_STYLE.includes(q)) ? 15 : 0;
  return eq.some((q) => LOADED_STYLE.includes(q)) ? 15 : 0;
}

function score(
  e: CatalogueExercise,
  slot: Slot,
  input: PlanInput,
  seed: string,
  used: Map<string, number>,
  emphasised: MuscleId[],
): number {
  let s = 0;
  const idx = slot.patterns.indexOf(e.pattern);
  s -= idx * 6;
  if (input.favourites?.includes(e.id)) s += 30;
  s += Math.min(input.history?.[e.id] ?? 0, 10);
  s += styleBonus(e, input.style);
  const gear = e.equipment.filter((q) => !ALWAYS.includes(q)).length;
  s += gear <= 1 ? 5 : gear === 2 ? 2 : 0;
  if (e.media.length) s += 4;
  if (e.cues.length) s += 2;
  if (slot.scheme === "compound")
    s += Math.min(e.primaryMuscles.length + e.secondaryMuscles.length, 5);
  if (slot.scheme === "isolation") s += e.primaryMuscles.length === 1 ? 4 : 0;
  if (input.experience === "new" && e.equipment.includes("barbell")) s -= 8;
  if (e.primaryMuscles.some((m) => emphasised.includes(m))) s += 4;
  if (e.primaryMuscles.some((m) => input.priorityMuscles?.includes(m))) s += 8;
  s -= (used.get(e.id) ?? 0) * 50; // variety across the week
  s += fnv(`${e.id}|${seed}|${slot.key}`); // stable tie-break in [0,1]
  return s;
}

function repsFor(goal: Goal, scheme: RepScheme) {
  return REPS[goal][scheme];
}

function workSeconds(
  x: Pick<PlannedExercise, "tracking" | "repMax" | "repMin" | "seconds">,
): number {
  if (x.tracking === "time") return x.seconds ?? 30;
  const reps = ((x.repMin ?? 8) + (x.repMax ?? 12)) / 2;
  return reps * TIMING.secondsPerRep;
}

export function estimateMinutes(exs: PlannedExercise[]): number {
  let sec = TIMING.warmupMinutes * 60;
  const seen = new Set<string>();
  for (const x of exs) {
    if (x.superset) {
      if (seen.has(x.superset)) continue;
      seen.add(x.superset);
      const pair = exs.filter((y) => y.superset === x.superset);
      const sets = Math.max(...pair.map((y) => y.sets));
      const rest = Math.max(...pair.map((y) => y.restSec));
      sec +=
        pair.length * TIMING.setupSeconds +
        sets * (pair.reduce((a, y) => a + workSeconds(y), 0) + TIMING.transitionSeconds + rest);
    } else {
      sec += TIMING.setupSeconds + x.sets * (workSeconds(x) + x.restSec);
    }
  }
  return Math.round(sec / 60);
}

/* ------------------------------ scheduling ------------------------------ */

const SPREAD: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
};

function monFirst(d: number) {
  return (d + 6) % 7;
}

function chooseWeekdays(n: number, preferred?: number[]): number[] {
  if (
    preferred &&
    preferred.length === n &&
    new Set(preferred).size === n &&
    preferred.every((d) => d >= 0 && d <= 6)
  ) {
    return [...preferred].sort((a, b) => monFirst(a) - monFirst(b));
  }
  return SPREAD[n] ?? SPREAD[5]!;
}

function wholeBody(p: Programme) {
  return p.id.startsWith("fullbody");
}

function minGap(p: Programme) {
  return wholeBody(p) ? 2 : 1;
}

/* ------------------------------ generation ------------------------------ */

export function pickProgramme(input: PlanInput): {
  programme: Programme;
  days: number;
  notes: string[];
} {
  const notes: string[] = [];
  let days = Math.round(input.daysPerWeek);
  const cap =
    input.experience === "new"
      ? 3
      : input.experience === "returning" || input.goal === "return_to_routine"
        ? 4
        : 5;
  if (days > cap) {
    notes.push(
      `${cap} days a week is plenty to start; add more once the routine feels easy to keep.`,
    );
    days = cap;
  }
  days = Math.max(2, Math.min(5, days));
  return { programme: PROGRAMMES.find((p) => p.daysPerWeek === days)!, days, notes };
}

function neededEquipment(
  slot: Slot,
  input: PlanInput,
  catalogue: CatalogueExercise[],
): EquipmentId[] {
  const count = new Map<EquipmentId, number>();
  const have = new Set<EquipmentId>([...input.equipment, ...ALWAYS]);
  for (const e of catalogue) {
    if (!baseOk(e, input) || !slot.patterns.includes(e.pattern)) continue;
    const missing = e.equipment.filter((q) => !have.has(q));
    if (missing.length === 1) count.set(missing[0]!, (count.get(missing[0]!) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([q]) => q);
}

export function generatePlan(input: PlanInput, catalogue: CatalogueExercise[]): PlanResult {
  if (!input.adult)
    return refuse(
      "unsupported",
      "VAYVOR plans are for adults. Please ask a coach or clinician about training for under-18s.",
    );
  if (input.clinicianRestricted)
    return refuse(
      "unsupported",
      "A clinician has restricted your exercise, so VAYVOR won't generate a programme. Ask them what's safe, then build one by hand if you like.",
    );
  if (!Number.isFinite(input.daysPerWeek) || input.daysPerWeek < 2)
    return refuse(
      "invalid",
      "Choose at least 2 training days a week; one session a week is too little to build a routine on.",
      [{ kind: "more_days", message: "Try 2 days a week." }],
    );
  if (!Number.isFinite(input.sessionMinutes) || input.sessionMinutes < 20)
    return refuse(
      "invalid",
      "Sessions under 20 minutes can't fit a warm-up and a useful workout.",
      [{ kind: "more_time", message: "Try 25 to 30 minutes." }],
    );

  const seed = input.seed ?? "vayvor";
  const { programme, days, notes } = pickProgramme(input);
  const weekdays = chooseWeekdays(programme.sessions.length, input.preferredDays);
  const usedWeek = new Map<string, number>();
  const conflicts: Conflict[] = [];
  const suggestions: Suggestion[] = [];
  const sessions: PlannedSession[] = [];

  programme.sessions.forEach((bp, si) => {
    const chosen: PlannedExercise[] = [];
    const inSession = new Set<string>();
    const sorted = [...bp.slots].sort((a, b) => a.priority - b.priority);
    for (const slot of sorted) {
      const cands = catalogue.filter(
        (e) =>
          baseOk(e, input) &&
          slot.patterns.includes(e.pattern) &&
          available(e, input.equipment) &&
          !inSession.has(e.id),
      );
      if (!cands.length) {
        const blocking = slot.priority <= 2;
        conflicts.push({
          session: bp.title,
          slotKey: slot.key,
          patterns: slot.patterns,
          blocking,
          message: `No ${slot.patterns[0]!.replace(/_/g, " ")} exercise fits the equipment you have.`,
        });
        for (const q of neededEquipment(slot, input, catalogue)) {
          if (!suggestions.some((s) => s.equipment === q))
            suggestions.push({
              kind: "add_equipment",
              equipment: q,
              message: `Adding ${q.replace(/_/g, " ")} would open up ${slot.patterns[0]!.replace(/_/g, " ")} options.`,
            });
        }
        continue;
      }
      const best = cands
        .map((e) => ({ e, s: score(e, slot, input, seed, usedWeek, bp.emphasises) }))
        .sort((a, b) => b.s - a.s || a.e.id.localeCompare(b.e.id))[0]!.e;
      inSession.add(best.id);
      usedWeek.set(best.id, (usedWeek.get(best.id) ?? 0) + 1);
      const r = repsFor(input.goal, slot.scheme);
      let sets = setsFor(slot.role, input.goal, input.experience);
      if (
        input.experience === "some" &&
        slot.role === "accessory" &&
        best.primaryMuscles.some((m) => input.priorityMuscles?.includes(m))
      )
        sets = Math.min(4, sets + 1);
      const timed = best.tracking === "time";
      chosen.push({
        slotKey: slot.key,
        role: slot.role,
        scheme: slot.scheme,
        priority: slot.priority,
        exerciseId: best.id,
        name: best.name,
        pattern: best.pattern,
        tracking: best.tracking,
        sets,
        ...(timed
          ? { seconds: input.experience === "some" ? 45 : 30 }
          : { repMin: r.min, repMax: r.max }),
        restSec: REST_SECONDS[input.goal][slot.role],
        pairWith: slot.pairWith,
        primaryMuscles: best.primaryMuscles,
        secondaryMuscles: best.secondaryMuscles,
        equipment: best.equipment,
      });
    }
    // Restore the blueprint's order (primary lifts first by authoring).
    chosen.sort(
      (a, b) =>
        bp.slots.findIndex((s) => s.key === a.slotKey) -
        bp.slots.findIndex((s) => s.key === b.slotKey),
    );
    const sess: PlannedSession = {
      title: bp.title,
      focus: bp.focus,
      weekday: weekdays[si]!,
      exercises: chosen,
      estimatedMinutes: estimateMinutes(chosen),
      dropped: [],
    };
    sessions.push(
      sess.estimatedMinutes > input.sessionMinutes
        ? shortenSession(sess, input.sessionMinutes).session
        : sess,
    );
  });

  const effort =
    input.experience === "new"
      ? "Choose a weight you could lift about 3 more times at the end of each set. Learn the movement first; add weight only when every set feels controlled."
      : "Choose a weight you could lift about 2 more times at the end of each set (1 to 2 on the last set). Add a little when you hit the top of the rep range on every set.";

  const rationale = [
    `${programme.name}: ${programme.summary}`,
    ...notes,
    `Sets and reps follow your goal (${input.goal.replace(/_/g, " ")}); every exercise comes from equipment you said you have.`,
    "No starting weights are given: bodyweight and past numbers can't tell us what's right for you.",
    ...(wholeBody(programme)
      ? ["Whole-body days are spaced at least a day apart so you recover between them."]
      : []),
  ];

  const plan: Plan = {
    rulesVersion: RULES_VERSION,
    programmeId: programme.id,
    programmeName: programme.name,
    input: { ...input, daysPerWeek: days },
    sessions,
    rationale,
    conflicts,
    effort,
  };

  if (conflicts.some((c) => c.blocking) && !input.allowPartial) {
    return {
      ok: false,
      kind: "conflict",
      message: "Some of the main lifts can't be built from your equipment.",
      conflicts,
      suggestions,
      partial: plan,
    };
  }
  return { ok: true, plan };

  function refuse(
    kind: "unsupported" | "invalid",
    message: string,
    s: Suggestion[] = [],
  ): PlanResult {
    return { ok: false, kind, message, conflicts: [], suggestions: s };
  }
}

/* ------------------------------ shortening ------------------------------ */

/** "I only have N minutes": pair antagonists into supersets, then drop the least important work, then trim sets. */
export function shortenSession(
  session: PlannedSession,
  minutes: number,
): { session: PlannedSession; fits: boolean } {
  let exs = session.exercises.map((x) => ({ ...x, superset: undefined as string | undefined }));
  const dropped = [...session.dropped];
  const est = () => estimateMinutes(exs);

  const pair = () => {
    let n = 0;
    for (const x of exs) {
      if (x.superset || !x.pairWith) continue;
      const mate = exs.find(
        (y) => y.slotKey === x.pairWith && !y.superset && y.pairWith === x.slotKey,
      );
      if (!mate) continue;
      x.superset = mate.superset = `S${++n}`;
    }
    // keep pairs adjacent
    const out: typeof exs = [];
    for (const x of exs) {
      if (out.includes(x)) continue;
      out.push(x);
      if (x.superset) {
        const m = exs.find((y) => y !== x && y.superset === x.superset);
        if (m) out.push(m);
      }
    }
    exs = out;
  };

  if (est() > minutes) pair();
  while (est() > minutes && exs.length > 3) {
    const worst = [...exs].sort((a, b) => b.priority - a.priority)[0]!;
    if (worst.priority <= 1) break;
    exs = exs.filter((x) => x !== worst);
    dropped.push(worst.name);
    for (const y of exs)
      if (y.superset && exs.filter((z) => z.superset === y.superset).length < 2)
        y.superset = undefined;
  }
  while (est() > minutes) {
    const trim = [...exs].filter((x) => x.sets > 2).sort((a, b) => b.priority - a.priority)[0];
    if (!trim) break;
    trim.sets -= 1;
  }
  return {
    session: { ...session, exercises: exs, estimatedMinutes: est(), dropped },
    fits: est() <= minutes,
  };
}

/* ------------------------------ substitutes ------------------------------ */

export type Substitute = { exercise: CatalogueExercise; reason: string };

/** "Machine busy" / "can't do this": same movement, equipment you have, not already in the session. */
export function substitutes(
  current: CatalogueExercise,
  catalogue: CatalogueExercise[],
  input: PlanInput,
  opts: { inSession?: string[]; unavailable?: EquipmentId[]; limit?: number } = {},
): Substitute[] {
  const blocked = new Set(opts.unavailable ?? []);
  const inSession = new Set([...(opts.inSession ?? []), current.id]);
  return catalogue
    .filter(
      (e) =>
        baseOk(e, input) &&
        !inSession.has(e.id) &&
        e.pattern === current.pattern &&
        available(e, input.equipment) &&
        !e.equipment.some((q) => blocked.has(q)),
    )
    .map((e) => {
      const overlap = e.primaryMuscles.filter((m) => current.primaryMuscles.includes(m)).length;
      const different = e.equipment.join() !== current.equipment.join();
      return {
        e,
        s:
          overlap * 10 +
          (blocked.size && different ? 5 : 0) +
          (e.media.length ? 2 : 0) +
          fnv(e.id + (input.seed ?? "")),
        overlap,
      };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.s - a.s || a.e.id.localeCompare(b.e.id))
    .slice(0, opts.limit ?? 5)
    .map(({ e }) => ({
      exercise: e,
      reason: `Same movement (${e.pattern.replace(/_/g, " ")}), works ${e.primaryMuscles.join(", ")}${e.equipment.length ? ` with ${e.equipment.join(", ")}` : ""}.`,
    }));
}

/* ------------------------------ missed day ------------------------------ */

export type Reschedule = { action: "move" | "skip"; weekday?: number; message: string };

/**
 * A session was missed. Move it to the first remaining day this week that keeps enough gap from other sessions;
 * otherwise skip it. Never doubles up, never "makes up" volume.
 */
export function rescheduleMissed(
  programmeId: string,
  weekdays: number[],
  missedIndex: number,
  today: number,
): Reschedule {
  const p = PROGRAMMES.find((x) => x.id === programmeId);
  const gap = p ? minGap(p) : 2;
  const others = weekdays.filter((_, i) => i !== missedIndex).map(monFirst);
  const t = monFirst(today);
  for (let d = t; d <= 6; d++) {
    if (others.every((o) => Math.abs(o - d) >= gap)) {
      return {
        action: "move",
        weekday: (d + 1) % 7,
        message: d === t ? "Do it today." : "Move it to the next free day this week.",
      };
    }
  }
  return {
    action: "skip",
    message: "Skip it. One missed session doesn't need making up; carry on with the next one.",
  };
}

/* ------------------------------ validation ------------------------------ */

export type Issue = { severity: "error" | "warn"; code: string; message: string; session?: string };

/** Independent check of a plan (also run on plans the person has edited). */
export function validatePlan(plan: Plan, catalogue: CatalogueExercise[]): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(catalogue.map((e) => [e.id, e]));
  const have = new Set<EquipmentId>([...plan.input.equipment, ...ALWAYS]);
  const weekly = new Map<MuscleId, number>();
  for (const s of plan.sessions) {
    const ids = new Set<string>();
    for (const x of s.exercises) {
      const e = byId.get(x.exerciseId);
      if (!e) {
        issues.push({
          severity: "error",
          code: "unknown_exercise",
          message: `${x.name} isn't in the catalogue.`,
          session: s.title,
        });
        continue;
      }
      const missing = e.equipment.filter((q) => !have.has(q));
      if (missing.length)
        issues.push({
          severity: "error",
          code: "equipment_unavailable",
          message: `${e.name} needs ${missing.join(", ")}.`,
          session: s.title,
        });
      if (ids.has(x.exerciseId))
        issues.push({
          severity: "error",
          code: "duplicate_in_session",
          message: `${e.name} appears twice.`,
          session: s.title,
        });
      ids.add(x.exerciseId);
      if (x.sets > 4)
        issues.push({
          severity: "warn",
          code: "many_sets",
          message: `${e.name} has ${x.sets} sets.`,
          session: s.title,
        });
      for (const k of Object.keys(x))
        if (/^(load|weight|kg|lb)/i.test(k))
          issues.push({
            severity: "error",
            code: "load_assigned",
            message: `${e.name} has a starting load.`,
            session: s.title,
          });
      for (const m of x.primaryMuscles) weekly.set(m, (weekly.get(m) ?? 0) + x.sets);
      for (const m of x.secondaryMuscles) weekly.set(m, (weekly.get(m) ?? 0) + x.sets * 0.5);
    }
    if (s.estimatedMinutes > plan.input.sessionMinutes + 5)
      issues.push({
        severity: "warn",
        code: "session_too_long",
        message: `${s.title} is about ${s.estimatedMinutes} min, over your ${plan.input.sessionMinutes}.`,
        session: s.title,
      });
  }
  const bounds = WEEKLY_SETS[plan.input.experience];
  for (const [m, n] of weekly) {
    if (n > bounds.max)
      issues.push({
        severity: "warn",
        code: "volume_high",
        message: `${m}: about ${n} hard sets a week is above the usual ${bounds.max} for your level.`,
      });
  }
  for (const m of ["chest", "lats", "quads", "hamstrings", "shoulders", "glutes"] as MuscleId[]) {
    if ((weekly.get(m) ?? 0) < bounds.min)
      issues.push({
        severity: "warn",
        code: "volume_low",
        message: `${m}: only about ${weekly.get(m) ?? 0} hard sets a week.`,
      });
  }
  const p = PROGRAMMES.find((x) => x.id === plan.programmeId);
  if (p && wholeBody(p)) {
    const days = plan.sessions.map((s) => monFirst(s.weekday)).sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++)
      if (days[i]! - days[i - 1]! < 2)
        issues.push({
          severity: "warn",
          code: "recovery",
          message: "Whole-body sessions on back-to-back days leave little time to recover.",
        });
  }
  return issues;
}
