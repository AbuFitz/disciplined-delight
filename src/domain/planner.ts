/**
 * Constraint-based plan generator. Pure and deterministic: same input + seed + catalogue + RULES_VERSION => same plan.
 * It selects only from the generator tier, only from equipment the person has, and NEVER assigns a load: the person
 * finds their own working weight (see `effort`). Scope: healthy adults. Anything outside that is refused, not guessed.
 */
import type { CatalogueExercise, EquipmentId, MuscleId, Pattern, TrackingType } from "./catalogue";
import {
  MAX_EXERCISES,
  PATTERN_CREDIT,
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

export type SlotRef = {
  key: string;
  patterns: Pattern[];
  role: SlotRole;
  scheme: RepScheme;
  priority: number;
  pairWith?: string;
};

export type PlannedSession = {
  title: string;
  focus: string;
  /** 0 = Sunday. */
  weekday: number;
  exercises: PlannedExercise[];
  /** Every slot the programme defines for this session; a slot with no exercise and not in `droppedSlots` is a gap. */
  slots: SlotRef[];
  /** Slots deliberately left out (time or weekly-volume limits). They are not gaps. */
  droppedSlots: string[];
  estimatedMinutes: number;
  /** False when even the shortest version of the session is longer than the requested duration. */
  fits: boolean;
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
  /** Ways to resolve gaps found while generating (for example, equipment that would unlock options). */
  suggestions: Suggestion[];
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
  if (e.level === "some" && input.experience !== "some") return false;
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
  // An explicit favourite should win over ordinary quality nudges when it is otherwise valid.
  if (input.favourites?.includes(e.id)) s += 100;
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

const slotRef = (s: Slot): SlotRef => ({
  key: s.key,
  patterns: s.patterns,
  role: s.role,
  scheme: s.scheme,
  priority: s.priority,
  pairWith: s.pairWith,
});

function buildPlanned(slot: SlotRef, e: CatalogueExercise, input: PlanInput): PlannedExercise {
  const r = repsFor(input.goal, slot.scheme);
  let sets = setsFor(slot.role, input.goal, input.experience);
  if (
    input.experience === "some" &&
    slot.role === "accessory" &&
    e.primaryMuscles.some((m) => input.priorityMuscles?.includes(m))
  )
    sets = Math.min(4, sets + 1);
  const timed = e.tracking === "time";
  return {
    slotKey: slot.key,
    role: slot.role,
    scheme: slot.scheme,
    priority: slot.priority,
    exerciseId: e.id,
    name: e.name,
    pattern: e.pattern,
    tracking: e.tracking,
    sets,
    ...(timed
      ? { seconds: input.experience === "some" ? 45 : 30 }
      : { repMin: r.min, repMax: r.max }),
    restSec: REST_SECONDS[input.goal][slot.role],
    pairWith: slot.pairWith,
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    equipment: e.equipment,
  };
}

/** Hard-set credit one set of this exercise gives each muscle (see PATTERN_CREDIT). */
export function creditFor(
  x: Pick<PlannedExercise, "pattern" | "primaryMuscles" | "secondaryMuscles">,
): Map<MuscleId, number> {
  const out = new Map<MuscleId, number>();
  const table = PATTERN_CREDIT[x.pattern];
  if (table) {
    for (const [m, c] of Object.entries(table)) out.set(m as MuscleId, c!);
    return out;
  }
  for (const m of x.primaryMuscles) out.set(m, 1);
  for (const m of x.secondaryMuscles) if (!out.has(m)) out.set(m, 0.5);
  return out;
}

export function weeklyCredits(sessions: PlannedSession[]): Map<MuscleId, number> {
  const w = new Map<MuscleId, number>();
  for (const s of sessions)
    for (const x of s.exercises)
      for (const [m, c] of creditFor(x)) w.set(m, (w.get(m) ?? 0) + c * x.sets);
  return w;
}

/**
 * Keeps weekly hard sets inside the experience bound by trimming the least important contributors (fewer sets first,
 * then dropping accessories). If only main lifts remain over the bound, the warning stays: the bound is never widened.
 */
function balanceVolume(sessions: PlannedSession[], experience: Experience) {
  const max = WEEKLY_SETS[experience].max;
  for (let guard = 0; guard < 60; guard++) {
    const w = weeklyCredits(sessions);
    const over = [...w.entries()].filter(([, n]) => n > max).sort((a, b) => b[1] - a[1])[0];
    if (!over) return;
    const [muscle] = over;
    const contributors = sessions
      .flatMap((s) => s.exercises.map((x) => ({ s, x })))
      .filter(({ x }) => (creditFor(x).get(muscle) ?? 0) > 0)
      .sort(
        (a, b) =>
          b.x.priority - a.x.priority ||
          (creditFor(b.x).get(muscle) ?? 0) - (creditFor(a.x).get(muscle) ?? 0),
      );
    const target =
      contributors.find(({ x }) => x.sets > 2) ?? contributors.find(({ x }) => x.priority >= 3);
    if (!target) return;
    if (target.x.sets > 2) target.x.sets -= 1;
    else {
      target.s.exercises = target.s.exercises.filter((x) => x !== target.x);
      target.s.droppedSlots.push(target.x.slotKey);
      target.s.dropped.push(target.x.name);
    }
  }
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

/** Days between two weekdays (Monday-first indexes), wrapping across Sunday into Monday. */
function dayGap(a: number, b: number) {
  const d = Math.abs(a - b);
  return Math.min(d, 7 - d);
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
      chosen.push(buildPlanned(slotRef(slot), best, input));
    }
    const droppedSlots: string[] = [];
    const dropped: string[] = [];
    while (chosen.length > MAX_EXERCISES[input.experience]) {
      const worst = [...chosen].sort((a, b) => b.priority - a.priority)[0]!;
      chosen.splice(chosen.indexOf(worst), 1);
      droppedSlots.push(worst.slotKey);
      dropped.push(worst.name);
    }
    // Restore the blueprint's order (primary lifts first by authoring).
    chosen.sort(
      (a, b) =>
        bp.slots.findIndex((s) => s.key === a.slotKey) -
        bp.slots.findIndex((s) => s.key === b.slotKey),
    );
    sessions.push({
      title: bp.title,
      focus: bp.focus,
      weekday: weekdays[si]!,
      exercises: chosen,
      slots: bp.slots.map(slotRef),
      droppedSlots,
      estimatedMinutes: estimateMinutes(chosen),
      fits: true,
      dropped,
    });
  });

  balanceVolume(sessions, input.experience);
  sessions.forEach((s, i) => {
    s.estimatedMinutes = estimateMinutes(s.exercises);
    if (s.estimatedMinutes > input.sessionMinutes)
      sessions[i] = shortenSession(s, input.sessionMinutes).session;
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
    suggestions,
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
  const droppedSlots = [...session.droppedSlots];
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
    droppedSlots.push(worst.slotKey);
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
    session: {
      ...session,
      exercises: exs,
      estimatedMinutes: est(),
      dropped,
      droppedSlots,
      fits: est() <= minutes,
    },
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
    if (others.every((o) => dayGap(o, d) >= gap)) {
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
  const weekly = weeklyCredits(plan.sessions);
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
    }
    if (s.estimatedMinutes > plan.input.sessionMinutes)
      issues.push({
        severity: "error",
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
        message: `${m}: about ${Math.round(n * 10) / 10} hard sets a week is above the usual ${bounds.max} for your level.`,
      });
  }
  for (const m of ["chest", "lats", "quads", "hamstrings", "shoulders", "glutes"] as MuscleId[]) {
    if ((weekly.get(m) ?? 0) < bounds.min)
      issues.push({
        severity: "warn",
        code: "volume_low",
        message: `${m}: only about ${Math.round((weekly.get(m) ?? 0) * 10) / 10} hard sets a week.`,
      });
  }
  const p = PROGRAMMES.find((x) => x.id === plan.programmeId);
  if (p && wholeBody(p)) {
    const days = plan.sessions.map((s) => monFirst(s.weekday)).sort((a, b) => a - b);
    const gaps = days
      .map((d, i) => dayGap(d, days[(i + 1) % days.length]!))
      .filter(() => days.length > 1);
    if (gaps.some((g) => g < 2))
      issues.push({
        severity: "warn",
        code: "recovery",
        message:
          "Whole-body sessions on back-to-back days (including Sunday into Monday) leave little time to recover.",
      });
  }
  return issues;
}

/* ------------------------------ editing and assessment ------------------------------ */

export type Fix =
  | { kind: "fill_slot"; sessionIndex: number; slotKey: string; label: string }
  | { kind: "add_equipment"; equipment: EquipmentId; label: string }
  | { kind: "more_time"; minutes: number; label: string };

export type Blocker = {
  code: "empty_session" | "missing_slot" | "session_too_long" | "invalid";
  session?: string;
  slotKey?: string;
  message: string;
  fixes: Fix[];
};

export type Assessment = {
  /** Anything here stops the plan being accepted. */
  blockers: Blocker[];
  /** Worth knowing, never blocking. */
  warnings: Issue[];
  canAccept: boolean;
};

const label = (s: string) => s.replace(/_/g, " ");

/**
 * The single gate for "Use this plan". Recomputed from the plan as it stands (after any swap, removal or fill), never
 * cached: unresolved main-lift gaps, validation errors, empty sessions and sessions that cannot fit the requested time
 * all block, each with ways to resolve it.
 */
export function assessPlan(plan: Plan, catalogue: CatalogueExercise[]): Assessment {
  const blockers: Blocker[] = [];
  plan.sessions.forEach((s, si) => {
    if (s.exercises.length === 0) {
      blockers.push({
        code: "empty_session",
        session: s.title,
        message: `${s.title} has no exercises.`,
        fixes: s.slots
          .filter((x) => !s.droppedSlots.includes(x.key))
          .slice(0, 3)
          .map((x) => ({
            kind: "fill_slot" as const,
            sessionIndex: si,
            slotKey: x.key,
            label: `Add a ${label(x.patterns[0]!)} exercise`,
          })),
      });
    }
    for (const slot of s.slots) {
      if (slot.priority > 2 || s.droppedSlots.includes(slot.key)) continue;
      if (s.exercises.some((x) => x.slotKey === slot.key)) continue;
      const cands = slotCandidates(plan, si, slot.key, catalogue, 1);
      const fixes: Fix[] = [];
      if (cands.length)
        fixes.push({
          kind: "fill_slot",
          sessionIndex: si,
          slotKey: slot.key,
          label: `Choose a ${label(slot.patterns[0]!)} exercise`,
        });
      else
        for (const q of neededEquipment(slot as Slot, plan.input, catalogue))
          fixes.push({ kind: "add_equipment", equipment: q, label: `Add ${label(q)} to your kit` });
      blockers.push({
        code: "missing_slot",
        session: s.title,
        slotKey: slot.key,
        message: `${s.title} has no main ${label(slot.patterns[0]!)} exercise.`,
        fixes,
      });
    }
  });
  const warnings: Issue[] = [];
  for (const i of validatePlan(plan, catalogue)) {
    if (i.severity === "warn") {
      warnings.push(i);
      continue;
    }
    const si = plan.sessions.findIndex((s) => s.title === i.session);
    const fixes: Fix[] = [];
    if (i.code === "session_too_long" && si >= 0) {
      const mins = Math.ceil(plan.sessions[si]!.estimatedMinutes / 5) * 5;
      fixes.push({ kind: "more_time", minutes: mins, label: `Allow ${mins} minutes` });
    }
    blockers.push({
      code: i.code === "session_too_long" ? "session_too_long" : "invalid",
      session: i.session,
      message: i.message,
      fixes,
    });
  }
  return { blockers, warnings, canAccept: blockers.length === 0 };
}

/** Exercises that could fill a slot, best first: same movement patterns, your kit, not already in that session. */
export function slotCandidates(
  plan: Plan,
  sessionIndex: number,
  slotKey: string,
  catalogue: CatalogueExercise[],
  limit = 8,
): CatalogueExercise[] {
  const s = plan.sessions[sessionIndex];
  const slot = s?.slots.find((x) => x.key === slotKey);
  if (!s || !slot) return [];
  const inSession = new Set(s.exercises.map((x) => x.exerciseId));
  const used = new Map<string, number>();
  for (const ss of plan.sessions)
    for (const x of ss.exercises) used.set(x.exerciseId, (used.get(x.exerciseId) ?? 0) + 1);
  return catalogue
    .filter(
      (e) =>
        baseOk(e, plan.input) &&
        slot.patterns.includes(e.pattern) &&
        available(e, plan.input.equipment) &&
        !inSession.has(e.id),
    )
    .map((e) => ({
      e,
      s: score(e, slot as Slot, plan.input, plan.input.seed ?? "vayvor", used, []),
    }))
    .sort((a, b) => b.s - a.s || a.e.id.localeCompare(b.e.id))
    .slice(0, limit)
    .map((x) => x.e);
}

function withSession(plan: Plan, si: number, fn: (s: PlannedSession) => PlannedSession): Plan {
  return { ...plan, sessions: plan.sessions.map((s, i) => (i === si ? fn(s) : s)) };
}

function refreshed(s: PlannedSession, exercises: PlannedExercise[]): PlannedSession {
  const order = (k: string) => s.slots.findIndex((x) => x.key === k);
  const sorted = [...exercises].sort((a, b) => order(a.slotKey) - order(b.slotKey));
  return { ...s, exercises: sorted, estimatedMinutes: estimateMinutes(sorted) };
}

/** Put an exercise into an empty slot (clears any "dropped" note for it). Pure. */
export function fillSlot(
  plan: Plan,
  sessionIndex: number,
  slotKey: string,
  e: CatalogueExercise,
): Plan {
  return withSession(plan, sessionIndex, (s) => {
    const slot = s.slots.find((x) => x.key === slotKey);
    if (!slot) return s;
    const kept = s.exercises.filter((x) => x.slotKey !== slotKey);
    return {
      ...refreshed(s, [...kept, buildPlanned(slot, e, plan.input)]),
      droppedSlots: s.droppedSlots.filter((k) => k !== slotKey),
    };
  });
}

/** Replace the exercise in a slot, keeping its sets, reps and rest unless the tracking type changes. Pure. */
export function swapExercise(
  plan: Plan,
  sessionIndex: number,
  slotKey: string,
  e: CatalogueExercise,
): Plan {
  return withSession(plan, sessionIndex, (s) => {
    const old = s.exercises.find((x) => x.slotKey === slotKey);
    const slot = s.slots.find((x) => x.key === slotKey);
    if (!old || !slot) return s;
    const fresh = buildPlanned(slot, e, plan.input);
    const next: PlannedExercise =
      old.tracking === e.tracking ? { ...fresh, sets: old.sets, superset: old.superset } : fresh;
    return refreshed(
      s,
      s.exercises.map((x) => (x.slotKey === slotKey ? next : x)),
    );
  });
}

/** Remove an exercise. A removed main lift becomes a gap the assessment reports. Pure. */
export function removeExercise(plan: Plan, sessionIndex: number, slotKey: string): Plan {
  return withSession(plan, sessionIndex, (s) => {
    const kept = s.exercises.filter((x) => x.slotKey !== slotKey);
    const next = kept.map((x) =>
      x.superset && kept.filter((y) => y.superset === x.superset).length < 2
        ? { ...x, superset: undefined }
        : x,
    );
    return refreshed(s, next);
  });
}
