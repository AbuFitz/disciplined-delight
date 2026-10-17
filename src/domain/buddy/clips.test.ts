import { describe, expect, it } from "vitest";
import { BUDDY_STATES, poseSignature } from "./state";
import { KEY_POSES, clipFor, idleVariation } from "./clips";
import { VARIANTS, VARIANT_IDS } from "./variants";

const neutral = VARIANTS.tavi.profile;

describe("authored clips", () => {
  it("has a clip for every state with real duration and at least two keyframes per track", () => {
    for (const state of BUDDY_STATES) {
      const c = clipFor(state, neutral);
      expect(c.tracks.length, state).toBeGreaterThan(0);
      expect(c.length, state).toBeGreaterThan(300);
      for (const t of c.tracks) {
        expect(t.keyframes.length, `${state}/${t.part}`).toBeGreaterThanOrEqual(2);
        expect(t.duration).toBeGreaterThan(0);
      }
    }
  });
  it("only animates transform and opacity so layout never shifts", () => {
    for (const state of BUDDY_STATES)
      for (const t of clipFor(state, neutral).tracks)
        for (const kf of t.keyframes)
          for (const key of Object.keys(kf))
            expect(["transform", "opacity", "offset"], `${state}:${key}`).toContain(key);
  });
  it("loops only the ambient states", () => {
    const loops = BUDDY_STATES.filter((s) => clipFor(s, neutral).loop).sort();
    expect(loops).toEqual(["breathe", "explain", "idle", "offline", "rest", "think"].sort());
  });
  it("builds action clips from anticipation, action, overshoot and settle", () => {
    for (const state of ["enter", "encourage", "celebrate", "point"] as const) {
      const body = clipFor(state, neutral).tracks.find(
        (t) => t.part === "body" || t.part === "root",
      )!;
      expect(body.keyframes.length, state).toBeGreaterThanOrEqual(4);
    }
    // Celebrate crouches (squash) before it launches (stretch).
    const kf = clipFor("celebrate", neutral).tracks[0]!.keyframes.map((k) => String(k.transform));
    const scaleY = (t: string) => Number(t.match(/scale\(([^,]+), ([^)]+)\)/)![2]);
    expect(scaleY(kf[1]!)).toBeLessThan(1);
    expect(scaleY(kf[2]!)).toBeGreaterThan(1);
  });
  it("gives each variant a different motion personality", () => {
    const lengths = VARIANT_IDS.map((id) => clipFor("celebrate", VARIANTS[id].profile).length);
    expect(new Set(lengths).size).toBe(4);
    const quick = clipFor("enter", VARIANTS.tavi.profile).length;
    const calm = clipFor("enter", VARIANTS.ollo.profile).length;
    expect(quick).toBeLessThan(calm);
    const bold = JSON.stringify(clipFor("celebrate", VARIANTS.zuri.profile).tracks[0]!.keyframes);
    const refl = JSON.stringify(clipFor("celebrate", VARIANTS.eira.profile).tracks[0]!.keyframes);
    expect(bold).not.toEqual(refl);
  });
  it("picks idle variations from each variant's favourites", () => {
    for (const id of VARIANT_IDS) {
      const p = VARIANTS[id].profile;
      for (let i = 0; i < p.idleMoves.length; i++) {
        const c = idleVariation(p, i / p.idleMoves.length + 0.01);
        expect(c.state).toBe("idle-variation");
        expect(c.loop).toBe(false);
        expect(c.length).toBeGreaterThan(300);
      }
      expect(p.idleEvery[0]).toBeLessThan(p.idleEvery[1]);
    }
  });
  it("supplies a static key pose for every state for reduced motion", () => {
    for (const state of BUDDY_STATES) expect(KEY_POSES[state]).toBeTruthy();
    expect(new Set(BUDDY_STATES.map(poseSignature)).size).toBe(BUDDY_STATES.length);
  });
});

describe("variants", () => {
  it("covers four energies on four silhouettes with unique names", () => {
    expect(new Set(VARIANT_IDS.map((i) => VARIANTS[i].energy)).size).toBe(4);
    expect(new Set(VARIANT_IDS.map((i) => VARIANTS[i].defaultName)).size).toBe(4);
  });
  it("avoids names that collide with known products", () => {
    for (const id of VARIANT_IDS)
      expect(VARIANTS[id].defaultName).not.toMatch(/^(velo|nomi|kiro|luma|miro|aven)$/i);
  });
});
