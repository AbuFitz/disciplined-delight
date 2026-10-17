import { describe, expect, it } from "vitest";
import { DEFAULT_COMPANION, normaliseCompanion, type CompanionConfig } from "../companion";
import {
  BUDDY_STATES,
  POSES,
  STATE_META,
  effectiveMotion,
  initialModel,
  poseSignature,
  reduce,
} from "./state";
import { buddyBrief, shouldSpeak, type BuddyContext, type BuddyScene } from "./brain";

const config: CompanionConfig = {
  ...DEFAULT_COMPANION,
  quiet: { ...DEFAULT_COMPANION.quiet, enabled: false },
};
const ctx = (over: Partial<BuddyContext> = {}): BuddyContext => ({
  pathname: "/",
  minute: 600,
  online: true,
  syncError: false,
  needsSetup: false,
  plannedToday: false,
  completedToday: false,
  mindDoneToday: false,
  hasPlan: true,
  ...over,
});

describe("buddy defaults and legacy config", () => {
  it("is on by default with a calm, world-matched, quiet-sound setup", () => {
    expect(DEFAULT_COMPANION).toMatchObject({
      variant: "tavi",
      haptics: false,
      enabled: true,
      setupDone: false,
      palette: "world",
      sound: "off",
      muted: false,
      placement: "dock_right",
    });
  });
  it("maps old forms and the dashboard placement without losing choices", () => {
    const old = normaliseCompanion({
      enabled: false,
      form: "totem",
      placement: "dashboard",
      palette: "mint",
      name: "Pip",
    });
    expect(old).toMatchObject({
      enabled: false,
      variant: "ollo",
      placement: "dock_right",
      palette: "world",
      name: "Pip",
      setupDone: true,
    });
    expect(normaliseCompanion({ form: "spark" } as never).variant).toBe("zuri");
    expect(normaliseCompanion(null).variant).toBe("tavi");
    expect(normaliseCompanion({ form: "bell" } as never).variant).toBe("tavi");
  });
  it("keeps a fixed colour choice made in the new shape", () => {
    expect(normaliseCompanion({ palette: "coral", setupDone: true }).palette).toBe("coral");
  });
});

describe("animation state machine", () => {
  it("defines a distinct pose for all 14 states", () => {
    expect(BUDDY_STATES).toHaveLength(14);
    expect(new Set(BUDDY_STATES.map(poseSignature)).size).toBe(14);
    for (const s of BUDDY_STATES) expect(POSES[s]).toBeTruthy();
  });
  it("enters, then settles to idle", () => {
    let m = initialModel(0);
    expect(m.state).toBe("enter");
    m = reduce(m, { type: "tick", now: 500 });
    expect(m.state).toBe("enter");
    m = reduce(m, { type: "tick", now: 1200 });
    expect(m.state).toBe("idle");
  });
  it("celebrates then returns to its base state", () => {
    let m = reduce(initialModel(0), { type: "tick", now: 2000 });
    m = reduce(m, { type: "signal", state: "celebrate", now: 3000 });
    expect(m.state).toBe("celebrate");
    m = reduce(m, { type: "tick", now: 3000 + STATE_META.celebrate.hold! + 1 });
    expect(m.state).toBe("idle");
  });
  it("does not let a low-priority state interrupt celebration, but errors do", () => {
    let m = reduce(initialModel(0), { type: "tick", now: 2000 });
    m = reduce(m, { type: "signal", state: "celebrate", now: 3000 });
    expect(reduce(m, { type: "signal", state: "point", now: 3100 }).state).toBe("celebrate");
    expect(reduce(m, { type: "signal", state: "error", now: 3100 }).state).toBe("error");
  });
  it("holds offline as the base and returns to it after a transient state", () => {
    let m = reduce(initialModel(0), { type: "tick", now: 2000 });
    m = reduce(m, { type: "base", base: "offline", now: 2100 });
    expect(m.state).toBe("offline");
    m = reduce(m, { type: "signal", state: "encourage", now: 2200 });
    m = reduce(m, { type: "tick", now: 2200 + 3100 });
    expect(m.state).toBe("offline");
    m = reduce(m, { type: "base", base: "idle", now: 9000 });
    expect(m.state).toBe("idle");
  });
  it("lets reduced motion override every saved motion level", () => {
    expect(effectiveMotion("full", true)).toBe("off");
    expect(effectiveMotion("gentle", true)).toBe("off");
    expect(effectiveMotion("gentle", false)).toBe("gentle");
  });
});

describe("context brain", () => {
  const session = (over = {}) => ({
    resting: false,
    doneSets: 2,
    totalSets: 12,
    readinessAsked: true,
    lowReadiness: false,
    ...over,
  });
  const cases: [string, Partial<BuddyContext>, BuddyScene][] = [
    ["onboarding", { pathname: "/onboarding" }, "onboarding"],
    ["plan setup", { pathname: "/train/build" }, "plan_setup"],
    [
      "workout readiness",
      { pathname: "/train/session", session: session({ readinessAsked: false }) },
      "readiness",
    ],
    [
      "next exercise",
      { pathname: "/train/session", session: session({ next: "Row" }) },
      "next_exercise",
    ],
    [
      "form cue",
      { pathname: "/train/session", session: session({ cue: "Brace first" }) },
      "form_cue",
    ],
    [
      "rest timer",
      { pathname: "/train/session", session: session({ resting: true, next: "Row" }) },
      "rest",
    ],
    [
      "low readiness",
      { pathname: "/train/session", session: session({ lowReadiness: true }) },
      "low_readiness",
    ],
    [
      "personal best",
      { pathname: "/", personalBest: { exercise: "Squat", detail: "100 kg × 5" } },
      "pr",
    ],
    ["missed", { pathname: "/", daysSinceLastSession: 12 }, "missed"],
    ["reflection", { pathname: "/mind" }, "reflection"],
    ["help", { pathname: "/settings" }, "help"],
    ["empty", { pathname: "/food", empty: true }, "empty"],
    ["sync error", { syncError: true }, "error"],
    ["offline", { online: false }, "offline"],
    ["first run", { needsSetup: true }, "first_run"],
    ["library", { pathname: "/library" }, "library"],
  ];
  for (const [name, over, scene] of cases)
    it(`reads the ${name} context`, () => {
      const brief = buddyBrief(ctx(over), config);
      expect(brief.scene).toBe(scene);
      expect(BUDDY_STATES).toContain(brief.state);
      expect(brief.line.length).toBeGreaterThan(3);
    });
  it("rests during quiet hours but still reports sync errors", () => {
    const quiet = { ...config, quiet: { enabled: true, start: "21:30", end: "07:30" } };
    expect(buddyBrief(ctx({ minute: 60 }), quiet).state).toBe("rest");
    expect(buddyBrief(ctx({ minute: 60, syncError: true }), quiet).state).toBe("error");
  });
  it("never shames, guilts, diagnoses or presumes faith in any tone or personality", () => {
    const banned =
      /lazy|failed|fail\b|should have|behind|guilt|ashamed|excuse|disciplin|diagnos|disorder|depress|anxiety|pray|salah|faith|islam|god|streak (lost|broken)|you missed/i;
    for (const tone of ["quiet", "direct", "warm"] as const)
      for (const personality of ["steady", "playful", "dry"] as const)
        for (const [, over] of cases) {
          const b = buddyBrief(ctx(over), { ...config, tone, personality });
          expect(`${b.line} ${b.body} ${b.tips.join(" ")}`).not.toMatch(banned);
        }
  });
  it("speaks up according to frequency and never when muted", () => {
    const b = buddyBrief(ctx({ pathname: "/library" }), config);
    expect(shouldSpeak({ ...config, frequency: "active" }, b)).toBe(true);
    expect(shouldSpeak({ ...config, frequency: "minimal" }, b)).toBe(false);
    expect(shouldSpeak({ ...config, muted: true, frequency: "active" }, b)).toBe(false);
    expect(shouldSpeak({ ...config, placement: "on_demand", frequency: "active" }, b)).toBe(false);
  });
});
