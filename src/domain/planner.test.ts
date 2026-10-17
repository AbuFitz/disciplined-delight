import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatalogueSnapshot, EquipmentId } from "./catalogue";
import {
  estimateMinutes,
  generatePlan,
  rescheduleMissed,
  shortenSession,
  substitutes,
  validatePlan,
  type PlanInput,
} from "./planner";

const snap = JSON.parse(
  readFileSync("public/catalogue/v1/exercises.json", "utf8"),
) as CatalogueSnapshot;
const cat = snap.exercises;
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
};

function plan(i: Partial<PlanInput>) {
  const r = generatePlan({ ...base, ...i }, cat);
  if (!r.ok) throw new Error(r.message + JSON.stringify(r.conflicts));
  return r.plan;
}

describe("generatePlan", () => {
  it("builds a beginner 3-day plan inside session time with no loads", () => {
    const p = plan({});
    expect(p.programmeId).toBe("fullbody-3");
    expect(p.sessions).toHaveLength(3);
    for (const s of p.sessions) {
      expect(s.estimatedMinutes).toBeLessThanOrEqual(60);
      expect(new Set(s.exercises.map((e) => e.exerciseId)).size).toBe(s.exercises.length);
      for (const e of s.exercises)
        expect(Object.keys(e).some((k) => /^(load|weight|kg|lb)/i.test(k))).toBe(false);
    }
    expect(validatePlan(p, cat).filter((i) => i.severity === "error")).toEqual([]);
  });
  it("is deterministic and the seed changes the result", () => {
    const a = JSON.stringify(plan({}));
    expect(JSON.stringify(plan({}))).toBe(a);
    expect(JSON.stringify(plan({ seed: "other" }))).not.toBe(a);
  });
  it("caps days for beginners and says why", () => {
    const p = plan({ daysPerWeek: 5 });
    expect(p.sessions).toHaveLength(3);
    expect(p.rationale.join(" ")).toMatch(/plenty to start/);
  });
  it("experienced 5-day and returning 2-day fixtures validate", () => {
    const e = plan({
      experience: "some",
      goal: "build_muscle",
      daysPerWeek: 5,
      sessionMinutes: 75,
    });
    expect(e.programmeId).toBe("ppl-5");
    expect(validatePlan(e, cat).filter((i) => i.severity === "error")).toEqual([]);
    const r = plan({
      experience: "returning",
      goal: "return_to_routine",
      daysPerWeek: 2,
      sessionMinutes: 40,
    });
    expect(r.programmeId).toBe("fullbody-2");
    for (const s of r.sessions) for (const x of s.exercises) expect(x.sets).toBeLessThanOrEqual(2);
  });
  it("bodyweight-only uses only bodyweight movements", () => {
    const p = plan({ equipment: [], style: "bodyweight", allowPartial: true });
    for (const s of p.sessions)
      for (const x of s.exercises)
        expect(x.equipment.every((q) => q === "bodyweight" || q === "mat")).toBe(true);
  });
  it("reports an honest conflict with equipment suggestions", () => {
    const r = generatePlan({ ...base, equipment: [] }, cat);
    if (r.ok) {
      expect(r.plan.conflicts.some((c) => c.blocking)).toBe(false);
      return;
    }
    expect(r.kind).toBe("conflict");
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.partial).toBeDefined();
  });
  it("refuses minors, clinician-restricted users and nonsense input", () => {
    expect(generatePlan({ ...base, adult: false }, cat)).toMatchObject({
      ok: false,
      kind: "unsupported",
    });
    expect(generatePlan({ ...base, clinicianRestricted: true }, cat)).toMatchObject({
      ok: false,
      kind: "unsupported",
    });
    expect(generatePlan({ ...base, daysPerWeek: 1 }, cat)).toMatchObject({
      ok: false,
      kind: "invalid",
    });
    expect(generatePlan({ ...base, sessionMinutes: 10 }, cat)).toMatchObject({
      ok: false,
      kind: "invalid",
    });
  });
  it("honours exclusions, avoided patterns and favourites", () => {
    const first = plan({}).sessions[0]!.exercises[0]!;
    const ex = plan({ excludedExercises: [first.exerciseId] });
    expect(
      ex.sessions.flatMap((s) => s.exercises).some((x) => x.exerciseId === first.exerciseId),
    ).toBe(false);
    const av = plan({ avoidPatterns: ["lunge"] });
    expect(av.sessions.flatMap((s) => s.exercises).some((x) => x.pattern === "lunge")).toBe(false);
    const fav = plan({}).sessions[0]!.exercises.find((x) => x.slotKey === "squat")!;
    const alt = cat.find(
      (e) =>
        e.tier === "generator" &&
        e.level !== "some" &&
        e.pattern === "squat" &&
        e.id !== fav.exerciseId &&
        e.equipment.every((q) => [...GYM, "bodyweight", "mat"].includes(q)),
    )!;
    const p2 = plan({ favourites: [alt.id] });
    expect(p2.sessions.flatMap((s) => s.exercises).some((x) => x.exerciseId === alt.id)).toBe(true);
  });
});

describe("shortenSession / substitutes / reschedule", () => {
  it("fits a 30 minute window, keeps primary lifts, and reports what was dropped", () => {
    const p = plan({ sessionMinutes: 60 });
    const s = p.sessions[0]!;
    const out = shortenSession(s, 30);
    expect(out.session.estimatedMinutes).toBeLessThanOrEqual(out.fits ? 30 : 99);
    expect(out.session.exercises.filter((x) => x.priority === 1).length).toBe(
      s.exercises.filter((x) => x.priority === 1).length,
    );
    expect(estimateMinutes(out.session.exercises)).toBe(out.session.estimatedMinutes);
  });
  it("offers same-pattern substitutes that avoid a busy machine", () => {
    const p = plan({});
    const x = p.sessions[0]!.exercises[0]!;
    const cur = cat.find((e) => e.id === x.exerciseId)!;
    const subs = substitutes(cur, cat, p.input, {
      inSession: p.sessions[0]!.exercises.map((e) => e.exerciseId),
      unavailable: ["machine"],
    });
    for (const s of subs) {
      expect(s.exercise.pattern).toBe(cur.pattern);
      expect(s.exercise.equipment).not.toContain("machine");
      expect(s.exercise.id).not.toBe(cur.id);
    }
  });
  it("moves a missed whole-body session only where it keeps a rest day, else skips", () => {
    expect(rescheduleMissed("fullbody-3", [1, 3, 5], 0, 2)).toMatchObject({
      action: "move",
      weekday: 0,
    });
    expect(rescheduleMissed("fullbody-3", [1, 3, 5], 0, 6)).toMatchObject({
      action: "move",
      weekday: 0,
    });
    expect(rescheduleMissed("fullbody-3", [1, 3, 5], 0, 0)).toMatchObject({
      action: "move",
      weekday: 0,
    });
    expect(rescheduleMissed("fullbody-2", [1, 4], 0, 1)).toMatchObject({
      action: "move",
      weekday: 1,
    });
    expect(rescheduleMissed("fullbody-3", [1, 4, 6], 0, 6)).toMatchObject({ action: "skip" });
  });
});
