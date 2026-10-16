import { describe, expect, it } from "vitest";
import raw from "./__fixtures__/wger-sample.json";
import { htmlToText, inferPattern, inferTracking } from "./catalogue";
import { normaliseWger, type WgerExercise } from "./catalogue-wger";

const all = raw as unknown as WgerExercise[];
const byName = (n: string) => all.find((e) => e.translations[0]!.name === n)!;
const ok = (n: string) => {
  const r = normaliseWger(byName(n));
  if (!r.ok) throw new Error(`${n} quarantined: ${r.quarantined.reasons}`);
  return r.exercise;
};

describe("wger adapter (real entries)", () => {
  it("maps a barbell press to a horizontal push with weighted tracking and stable id", () => {
    const e = ok("Bench Press");
    expect(e.id).toBe(`wger:${byName("Bench Press").uuid}`);
    expect(e.pattern).toBe("push_horizontal");
    expect(e.tracking).toBe("weight_reps");
    expect(e.primaryMuscles).toContain("chest");
    expect(e.source.url).toMatch(/^https:\/\/wger\.de\/en\/exercise\/\d+\/view\/$/);
  });
  it("derives machine metadata from the name and labels it as derived", () => {
    const e = ok("Leg Press");
    expect(e.pattern).toBe("squat");
    expect(e.equipment).toContain("machine");
    expect(e.equipmentDerived).toContain("machine");
    expect(e.flags).toContain("equipment_derived");
    expect(ok("Leverage Machine Chest Press").equipment).toContain("machine");
  });
  it("uses time tracking for holds and bodyweight reps for unloaded movements", () => {
    expect(ok("Plank").tracking).toBe("time");
    expect(inferTracking("Push Ups", "Chest", ["bodyweight"])).toBe("bodyweight_reps");
    expect(inferTracking("Assisted Pull Up", "Back", ["machine"])).toBe("assisted_reps");
    expect(inferTracking("Treadmill Run", "Cardio", [])).toBe("distance_time");
  });
  it("keeps licence, author and an attribution line on every record", () => {
    for (const e of all) {
      const r = normaliseWger(e);
      if (!r.ok) continue;
      expect(r.exercise.licence.id).toMatch(/^CC/);
      expect(r.exercise.attribution).toContain(r.exercise.licence.url);
      expect(r.exercise.attribution).toContain("wger");
    }
  });
  it("never publishes AI-generated images and records that it excluded them", () => {
    const withAi = all.find((e) => e.images.some((i) => i.is_ai_generated))!;
    const r = normaliseWger(withAi);
    if (r.ok) {
      expect(r.exercise.media.every((m) => !m.id.includes("ai"))).toBe(true);
      const aiUuids = new Set(
        withAi.images.filter((i) => i.is_ai_generated).map((i) => `wger-img:${i.uuid}`),
      );
      expect(r.exercise.media.every((m) => !aiUuids.has(m.id))).toBe(true);
      expect(r.exercise.flags).toContain("ai_images_excluded");
    }
  });
  it("only publishes media with an allowed licence and an author credit", () => {
    for (const e of all) {
      const r = normaliseWger(e);
      if (r.ok)
        for (const m of r.exercise.media) {
          expect(m.author.length).toBeGreaterThan(0);
          expect(m.licence.id).toMatch(/^CC/);
        }
    }
  });
  it("quarantines entries without usable instructions, with reasons, instead of publishing them", () => {
    const r = normaliseWger(byName("Abdominal Stabilization"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.quarantined.reasons).toContain("instructions_missing");
  });
  it("quarantines instructions that contain links", () => {
    const e = structuredClone(byName("Bench Press"));
    e.translations[0]!.description =
      "<p>See https://example.com/promo for the full course and many more words to pass the length check.</p>";
    const r = normaliseWger(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.quarantined.reasons).toContain("instructions_contain_link");
  });
  it("quarantines a disallowed licence", () => {
    const e = structuredClone(byName("Bench Press"));
    e.translations[0]!.license = 5; // ODbL isn't on the allowlist
    const r = normaliseWger(e);
    expect(r.ok).toBe(false);
  });
  it("is deterministic", () => {
    expect(JSON.stringify(all.map((e) => normaliseWger(e)))).toBe(
      JSON.stringify(all.map((e) => normaliseWger(e))),
    );
  });
  it("applies human overrides without touching the upstream record, and can hide", () => {
    const id = `wger:${byName("Bench Press").uuid}`;
    const r = normaliseWger(byName("Bench Press"), {
      [id]: { pattern: "chest_isolation", equipmentAdd: ["bench"] },
    });
    expect(r.ok && r.exercise.pattern).toBe("chest_isolation");
    expect(normaliseWger(byName("Bench Press"), { [id]: { hide: true } }).ok).toBe(false);
  });
  it("never marks an exercise generator-eligible without a hand-reviewed override", () => {
    const e = ok("Bench Press");
    expect(e.tier).toBe("library");
    const id = e.id;
    const r = normaliseWger(byName("Bench Press"), { [id]: { curated: "new" } });
    expect(r.ok && r.exercise.tier).toBe("generator");
    expect(r.ok && r.exercise.level).toBe("new");
  });
  it("replaces wrong upstream equipment, tracking and muscles when corrected", () => {
    const id = ok("Bench Press").id;
    const r = normaliseWger(byName("Bench Press"), {
      [id]: {
        equipment: ["machine"],
        tracking: "bodyweight_reps",
        primaryMuscles: ["triceps"],
        curated: "some",
      },
    });
    expect(r.ok && r.exercise.equipment).toEqual(["machine"]);
    expect(r.ok && r.exercise.equipmentDerived).toEqual([]);
    expect(r.ok && r.exercise.tracking).toBe("bodyweight_reps");
    expect(r.ok && r.exercise.primaryMuscles).toEqual(["triceps"]);
  });
  it("removes media rejected by human semantic review", () => {
    const source = byName("Bench Press");
    const rejected = `wger-img:${source.images[0]!.uuid}`;
    const id = `wger:${source.uuid}`;
    const r = normaliseWger(source, { [id]: { mediaRemove: [rejected] } });
    expect(r.ok && r.exercise.media.some((item) => item.id === rejected)).toBe(false);
    expect(source.images).toHaveLength(2);
  });
});

describe("rules", () => {
  it("classifies common movements", () => {
    const cases: [string, string, string][] = [
      ["Leg Presses (wide)", "Legs", "squat"],
      ["Facepull", "Shoulders", "pull_horizontal"],
      ["Overhead Squat", "Legs", "squat"],
      ["Overhead Press", "Shoulders", "push_vertical"],
      ["Lat Pull Down", "Back", "pull_vertical"],
      ["Hammer Curls", "Arms", "arms_biceps"],
      ["Leg Curl", "Legs", "leg_isolation"],
      ["Leg Raises, Lying", "Abs", "core"],
      ["Romanian Deadlift", "Legs", "hinge"],
      ["Neck stretch", "Back", "mobility"],
      ["Fly With Dumbbells", "Chest", "chest_isolation"],
    ];
    for (const [n, c, p] of cases) expect(inferPattern(n, c), n).toBe(p);
  });
  it("turns provider HTML into readable text", () => {
    expect(htmlToText("<p>Stand tall.</p><ul><li>Brace</li><li>Pull</li></ul>")).toBe(
      "Stand tall.\n• Brace\n• Pull",
    );
  });
});
