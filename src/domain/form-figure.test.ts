import { describe, expect, it } from "vitest";
import { FORM_GUIDES, SEG, guideFor, solveLeg, solvePose } from "./form-figure";

describe("form figure geometry", () => {
  it("keeps bone lengths and straightens an out-of-reach leg", () => {
    const l = solveLeg([50, 44], [52, 90]);
    expect(Math.hypot(l.knee[0] - 50, l.knee[1] - 44)).toBeCloseTo(SEG.thigh, 1);
    expect(Math.hypot(l.knee[0] - l.ankle[0], l.knee[1] - l.ankle[1])).toBeCloseTo(SEG.shin, 1);
    const far = solveLeg([50, 44], [50, 200]);
    expect(Math.hypot(far.ankle[0] - 50, far.ankle[1] - 44)).toBeLessThan(SEG.thigh + SEG.shin);
  });
  it("bends the knee toward the facing side", () => {
    const l = solveLeg([40, 66], [52, 90]);
    expect(l.knee[0]).toBeGreaterThan(46);
  });
});

describe("authored guides", () => {
  const all = Object.values(FORM_GUIDES);
  it("have three frames, cues and a keep/ease line each", () => {
    expect(all.length).toBeGreaterThanOrEqual(10);
    for (const g of all) {
      expect(g.frames).toHaveLength(3);
      for (const f of g.frames) expect(f.cue.length).toBeGreaterThan(15);
      expect(g.keep.length).toBeGreaterThan(10);
      expect(g.ease).toMatch(/stop|lighter|shorten|support|assist|drop|skip|lighten/i);
    }
  });
  it("keep every joint inside the drawing box", () => {
    for (const g of all)
      for (const f of g.frames) {
        const s = solvePose(f.pose);
        const pts = [
          s.head,
          s.shoulder,
          s.hip,
          s.elbow,
          s.hand,
          ...s.legs.flatMap((l) => [l.knee, l.ankle]),
        ];
        for (const [x, y] of pts) {
          expect(x, `${g.id}/${f.label} x`).toBeGreaterThan(-1);
          expect(x, `${g.id}/${f.label} x`).toBeLessThan(101);
          expect(y, `${g.id}/${f.label} y`).toBeGreaterThan(-14);
          expect(y, `${g.id}/${f.label} y`).toBeLessThan(96);
        }
      }
  });
  it("make no clinical claims", () => {
    const text = JSON.stringify(all);
    for (const word of ["injury", "rehab", "treat", "cure", "diagnos", "therapy", "prevent"])
      expect(text.toLowerCase()).not.toContain(word);
  });
  it("map catalogue patterns to guides and leave the rest honest", () => {
    expect(guideFor("squat")?.id).toBe("squat");
    expect(guideFor("chest_isolation")?.id).toBe("push_horizontal");
    expect(guideFor("cardio")).toBeUndefined();
    expect(guideFor(undefined)).toBeUndefined();
  });
});
