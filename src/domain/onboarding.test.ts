import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANSWERS,
  DEFERRED,
  KIT_DEFAULTS,
  QUICK_STEPS,
  WHY,
  furthestValid,
  parseDraft,
  serialiseDraft,
  stepValid,
  toPlanInput,
  toPlanningProfile,
  type Answers,
} from "./onboarding";

const done: Answers = {
  ...DEFAULT_ANSWERS,
  intent: "strength",
  level: "new",
  adult: true,
  days: [0, 2, 4],
  minutes: 45,
  place: "gym",
  kit: KIT_DEFAULTS.gym,
};

describe("quick-start journey", () => {
  it("is eight screens with one decision each", () => {
    expect(QUICK_STEPS).toEqual([
      "intent",
      "experience",
      "constraints",
      "days",
      "time",
      "kit",
      "plan",
      "start",
    ]);
  });
  it("blocks only where a choice is genuinely needed", () => {
    expect(stepValid("intent", DEFAULT_ANSWERS)).toBe(false);
    expect(stepValid("experience", DEFAULT_ANSWERS)).toBe(false);
    expect(stepValid("constraints", DEFAULT_ANSWERS)).toBe(true);
    expect(stepValid("days", { ...DEFAULT_ANSWERS, days: [1] })).toBe(false);
    expect(stepValid("days", DEFAULT_ANSWERS)).toBe(true);
    expect(stepValid("kit", DEFAULT_ANSWERS)).toBe(false);
    expect(stepValid("kit", { ...DEFAULT_ANSWERS, place: "home" })).toBe(true);
    expect(stepValid("start", DEFAULT_ANSWERS)).toBe(true);
    expect(stepValid("start", DEFAULT_ANSWERS, { needsHandle: true })).toBe(false);
  });
  it("never pre-selects a goal, level or place", () => {
    expect(DEFAULT_ANSWERS.intent).toBeNull();
    expect(DEFAULT_ANSWERS.level).toBeNull();
    expect(DEFAULT_ANSWERS.place).toBeNull();
    expect(DEFAULT_ANSWERS.adult).toBe(false);
    expect(DEFAULT_ANSWERS.clinicianRestricted).toBe(false);
  });
  it("maps answers to the plan generator, converting Monday-first days to Sunday-first", () => {
    const input = toPlanInput({ ...done, days: [0, 2, 4] });
    expect(input).toMatchObject({
      goal: "get_stronger",
      experience: "new",
      daysPerWeek: 3,
      preferredDays: [1, 3, 5],
      sessionMinutes: 45,
      adult: true,
      clinicianRestricted: false,
      style: "machines_cables",
    });
    expect(toPlanInput({ ...done, days: [6] }).preferredDays).toEqual([0]);
  });
  it("never infers anything outside the answers when building the profile", () => {
    const p = toPlanningProfile(done);
    expect(p.primaryGoal).toBe("strength");
    expect(p.environment).toBe("gym");
    expect(p.physiology?.medicalSafetyFlag).toBe(false);
    expect(p.dietaryNeeds).toBe("");
    expect(JSON.stringify(p)).not.toMatch(/islam|muslim|prayer|faith|gender/i);
    expect(
      toPlanningProfile({ ...done, clinicianRestricted: true }).physiology?.medicalSafetyFlag,
    ).toBe(true);
  });
  it("explains why each sensitive screen asks, and local storage", () => {
    for (const k of ["intent", "experience", "constraints", "days", "time", "kit"] as const)
      expect(WHY[k]?.length).toBeGreaterThan(30);
    expect(WHY.constraints).toMatch(/this device/i);
    expect(WHY.constraints).toMatch(/medical advice/i);
  });
  it("defers every non-essential area and says so", () => {
    expect(DEFERRED.join(" ")).toMatch(/Food/);
    expect(DEFERRED.join(" ")).toMatch(/never assumed/);
    expect(DEFERRED.length).toBeGreaterThanOrEqual(8);
  });
});

describe("save and resume", () => {
  it("round-trips a draft", () => {
    const raw = serialiseDraft("days", done, 123);
    expect(parseDraft(raw)).toEqual({ v: 2, step: "days", answers: done, savedAt: 123 });
  });
  it("rejects corrupt, old or tampered drafts instead of crashing", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, step: "days", answers: {} }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 2, step: "nope", answers: {} }))).toBeNull();
    const d = parseDraft(
      JSON.stringify({
        v: 2,
        step: "kit",
        answers: {
          intent: "<script>",
          days: [9, "x", 2],
          minutes: 5,
          kit: ["ufo"],
          avoid: ["x"],
          note: 5,
        },
      }),
    )!;
    expect(d.answers.intent).toBeNull();
    expect(d.answers.days).toEqual([2]);
    expect(d.answers.minutes).toBe(45);
    expect(d.answers.kit).toEqual(["bodyweight"]);
    expect(d.answers.avoid).toEqual([]);
    expect(d.answers.note).toBe("");
  });
  it("never resumes past an unanswered screen", () => {
    expect(furthestValid("plan", DEFAULT_ANSWERS)).toBe("intent");
    expect(furthestValid("plan", { ...done })).toBe("plan");
    expect(furthestValid("kit", { ...done, level: null })).toBe("experience");
  });
});
