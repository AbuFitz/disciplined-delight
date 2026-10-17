import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CatalogueSnapshot } from "./catalogue";
import { accessTagsOf, difficultyOf, mediaStateOf, modalityOf } from "./catalogue-facets";
import { searchCatalogue } from "./catalogue-search";

const all = (
  JSON.parse(readFileSync("public/catalogue/v1/exercises.json", "utf8")) as CatalogueSnapshot
).exercises;
const by = (n: string) => all.find((e) => e.name.toLowerCase().includes(n.toLowerCase()))!;

describe("library facets", () => {
  it("gives every exercise a modality, difficulty and a deterministic media state", () => {
    const states = new Set<string>();
    for (const e of all) {
      expect(modalityOf(e)).toBeTruthy();
      expect(difficultyOf(e).level).toBeTruthy();
      const m = mediaStateOf(e);
      expect(["motion", "steps", "still", "authored_fallback"]).toContain(m.state);
      states.add(m.state);
    }
    expect(states.has("steps")).toBe(true);
    expect(states.has("authored_fallback")).toBe(true);
  });
  it("uses reviewed levels where they exist and says when it is estimating", () => {
    const reviewed = all.find((e) => e.level === "new")!;
    expect(difficultyOf(reviewed)).toEqual({ level: "beginner", reviewed: true });
    const est = all.find((e) => !e.level && difficultyOf(e).level === "advanced");
    if (est) expect(difficultyOf(est).reviewed).toBe(false);
  });
  it("estimates access tags from equipment and name", () => {
    expect(accessTagsOf(by("Push-Up"))).toContain("no_equipment");
    expect(accessTagsOf(by("Push-Up"))).not.toContain("no_floor_work");
    expect(accessTagsOf(by("Leg curl (machine)"))).toEqual(
      expect.arrayContaining(["seated_supported", "single_joint"]),
    );
  });
  it("filters by the new facets", () => {
    expect(
      searchCatalogue(all, { modality: "mobility" }).every((e) => modalityOf(e) === "mobility"),
    ).toBe(true);
    expect(searchCatalogue(all, { difficulty: "beginner" }).length).toBeGreaterThan(100);
    expect(searchCatalogue(all, { access: ["no_equipment", "low_impact"] }).length).toBeGreaterThan(
      20,
    );
    expect(
      searchCatalogue(all, { media: "authored_fallback" }).every((e) => e.media.length === 0),
    ).toBe(true);
    expect(
      searchCatalogue(all, { provider: "RepDB" }).every((e) => e.source.provider === "RepDB"),
    ).toBe(true);
  });
});
