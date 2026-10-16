import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatalogueSnapshot, EquipmentId } from "./catalogue";
import {
  assessPlan,
  fillSlot,
  generatePlan,
  removeExercise,
  rescheduleMissed,
  shortenSession,
  slotCandidates,
  swapExercise,
  validatePlan,
  weeklyCredits,
  type Plan,
  type PlanInput,
} from "./planner";

const cat = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;
const byId = new Map(cat.map((e) => [e.id, e]));
const GYM: EquipmentId[] = [
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "bench",
  "incline_bench",
  "pullup_bar",
  "ez_bar",
];
const base: PlanInput = {
  goal: "general_fitness",
  experience: "new",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: GYM,
  adult: true,
  seed: "t",
  allowPartial: true,
};
const plan = (i: Partial<PlanInput> = {}): Plan => {
  const r = generatePlan({ ...base, ...i }, cat);
  if (!r.ok) throw new Error(r.message);
  return r.plan;
};

describe("curated selection", () => {
  it("only draws from hand-reviewed exercises and respects their level", () => {
    for (const exp of ["new", "returning", "some"] as const) {
      const p = plan({ experience: exp, daysPerWeek: 4 });
      for (const x of p.sessions.flatMap((s) => s.exercises)) {
        const e = byId.get(x.exerciseId)!;
        expect(e.tier).toBe("generator");
        expect(e.level).toBeDefined();
        if (exp !== "some") expect(e.level).toBe("new");
      }
    }
  });
  it("has no unreviewed generator-tier exercise and every curated one has a primary muscle and instructions", () => {
    const gen = cat.filter((e) => e.tier === "generator");
    expect(gen.length).toBeGreaterThan(100);
    for (const e of gen) {
      expect(e.level).toBeDefined();
      expect(e.primaryMuscles.length).toBeGreaterThan(0);
      expect(e.instructions.length).toBeGreaterThan(99);
      expect(e.flags).toContain("overridden");
    }
  });
  it("corrects equipment and tracking that upstream got wrong", () => {
    const curl = cat.find((e) => e.name === "Leg curl (machine)")!;
    expect(curl.equipment).toEqual(["machine"]);
    expect(curl.tracking).toBe("weight_reps");
    const pull = cat.find((e) => e.name === "Pull-ups")!;
    expect(pull.tracking).toBe("bodyweight_reps");
  });
});

describe("volume (investigation outcome: bounds unchanged, counting and selection fixed)", () => {
  it("gives realistic beginner plans no volume warnings with the original bounds", () => {
    for (const equipment of [GYM, ["dumbbell", "bench"] as EquipmentId[], []]) {
      const p = plan({ equipment });
      const issues = validatePlan(p, cat);
      expect(issues.filter((i) => i.code.startsWith("volume"))).toEqual([]);
      for (const n of weeklyCredits(p.sessions).values()) expect(n).toBeLessThanOrEqual(10);
    }
  });
  it("does not count every listed primary muscle in full for compound lifts", () => {
    const p = plan();
    const squat = p.sessions[0]!.exercises.find((x) => x.slotKey === "squat")!;
    expect(squat.primaryMuscles.length).toBeGreaterThan(1);
    const w = weeklyCredits([{ ...p.sessions[0]!, exercises: [squat] }]);
    expect(w.get("quads")).toBe(squat.sets);
    expect(w.get("glutes")).toBe(squat.sets * 0.5);
    expect(w.has("hamstrings")).toBe(false);
  });
});

describe("accepting a plan", () => {
  it("passes for a complete plan", () => {
    const a = assessPlan(plan(), cat);
    expect(a.blockers).toEqual([]);
    expect(a.canAccept).toBe(true);
  });
  it("blocks when a main lift is removed, offers fixes, and clears once filled", () => {
    let p = plan();
    p = removeExercise(p, 0, "squat");
    const a = assessPlan(p, cat);
    expect(a.canAccept).toBe(false);
    const b = a.blockers.find((x) => x.code === "missing_slot" && x.slotKey === "squat")!;
    expect(b.fixes[0]!.kind).toBe("fill_slot");
    const cands = slotCandidates(p, 0, "squat", cat);
    expect(cands.length).toBeGreaterThan(0);
    p = fillSlot(p, 0, "squat", cands[0]!);
    expect(assessPlan(p, cat).canAccept).toBe(true);
  });
  it("blocks empty sessions", () => {
    let p = plan();
    for (const x of [...p.sessions[1]!.exercises]) p = removeExercise(p, 1, x.slotKey);
    const a = assessPlan(p, cat);
    expect(a.blockers.some((b) => b.code === "empty_session")).toBe(true);
    expect(a.canAccept).toBe(false);
  });
  it("recomputes after a swap and keeps blocking if the swap breaks equipment", () => {
    let p = plan();
    const squat = p.sessions[0]!.exercises.find((x) => x.slotKey === "squat")!;
    const other = cat.find(
      (e) => e.tier === "generator" && e.pattern === "squat" && e.id !== squat.exerciseId,
    )!;
    p = swapExercise(p, 0, "squat", other);
    expect(p.sessions[0]!.exercises.find((x) => x.slotKey === "squat")!.exerciseId).toBe(other.id);
    const noKit = { ...p, input: { ...p.input, equipment: [] as EquipmentId[] } };
    const a = assessPlan(noKit, cat);
    expect(a.blockers.some((b) => b.message.includes("needs"))).toBe(true);
  });
  it("keeps equipment suggestions on a partial plan", () => {
    const noPulls = cat
      .filter(
        (e) =>
          e.tier === "generator" &&
          e.pattern.startsWith("pull_") &&
          e.equipment.every((q) => q === "bodyweight" || q === "mat"),
      )
      .map((e) => e.id);
    expect(noPulls.length).toBeGreaterThan(0);
    const r = generatePlan({ ...base, equipment: [], excludedExercises: noPulls }, cat);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.plan;
    expect(p.conflicts.some((c) => c.blocking)).toBe(true);
    expect(p.suggestions.some((s) => s.kind === "add_equipment")).toBe(true);
    const a = assessPlan(p, cat);
    expect(a.canAccept).toBe(false);
    expect(a.blockers.flatMap((b) => b.fixes).some((f) => f.kind === "add_equipment")).toBe(true);
    const strict = generatePlan(
      { ...base, equipment: [], excludedExercises: noPulls, allowPartial: false },
      cat,
    );
    expect(strict.ok).toBe(false);
    if (!strict.ok) expect(strict.suggestions.length).toBeGreaterThan(0);
  });
});

describe("time", () => {
  it("reports when the requested duration cannot fit and offers more time", () => {
    const p = plan({
      experience: "some",
      goal: "build_muscle",
      daysPerWeek: 5,
      sessionMinutes: 20,
    });
    const bad = p.sessions.filter((s) => !s.fits);
    expect(bad.length).toBeGreaterThan(0);
    const a = assessPlan(p, cat);
    const t = a.blockers.find((b) => b.code === "session_too_long")!;
    expect(t.fixes[0]).toMatchObject({ kind: "more_time" });
    expect(a.canAccept).toBe(false);
  });
  it("shortenSession flags a result that still does not fit", () => {
    const p = plan({ sessionMinutes: 90 });
    const out = shortenSession(p.sessions[0]!, 5);
    expect(out.fits).toBe(false);
    expect(out.session.fits).toBe(false);
  });
});

describe("recovery across the Sunday-Monday boundary", () => {
  it("warns for whole-body sessions on Sunday and Monday", () => {
    const p = plan({ preferredDays: [0, 1, 3] });
    expect(validatePlan(p, cat).some((i) => i.code === "recovery")).toBe(true);
    expect(
      validatePlan(plan({ preferredDays: [1, 3, 5] }), cat).some((i) => i.code === "recovery"),
    ).toBe(false);
    expect(
      validatePlan(plan({ preferredDays: [5, 6, 2] }), cat).some((i) => i.code === "recovery"),
    ).toBe(true);
  });
  it("does not reschedule a missed session next to a Sunday session", () => {
    expect(rescheduleMissed("fullbody-3", [0, 3, 5], 1, 1)).toMatchObject({
      action: "move",
      weekday: 2,
    });
  });
});
