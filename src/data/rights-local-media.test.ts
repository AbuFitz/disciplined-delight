import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogueExercise, CatalogueSnapshot, MediaItem } from "@/domain/catalogue";
import { LOCAL_RESTRICTED_LICENCE_ID, describeMedia } from "@/domain/exercise-media";
// @ts-expect-error plain ESM helper shared with the build guard
import { scanOutput, scanTracked } from "../../scripts/catalogue/restricted-media.mjs";
import { applyLocalMedia } from "./local-media";

const read = (p: string) => readFileSync(p, "utf8");
const snapshot = JSON.parse(read("public/catalogue/v1/exercises.json")) as CatalogueSnapshot;
const index = JSON.parse(read("catalogue/local-media-index.json")) as {
  restricted: boolean;
  entries: Record<string, { datasetId: string; image?: string; gif?: string }[]>;
};

describe("restricted local media guard", () => {
  it("tracks no restricted binaries, cache paths, GIFs or LFS media, and public/ is clean", () => {
    expect(scanTracked(process.cwd())).toEqual([]);
  });

  it("gitignores the local cache and never lists it for public output", () => {
    expect(read(".gitignore")).toMatch(/^\.local-media\/$/m);
    expect(index.restricted).toBe(true);
  });

  it("fails a build output that contains restricted media, GIFs or local-media paths", () => {
    const leaky = mkdtempSync(join(tmpdir(), "leaky-"));
    const first = Object.values(index.entries)[0]![0]!;
    mkdirSync(join(leaky, "assets"), { recursive: true });
    writeFileSync(join(leaky, "assets", first.gif!.split("/").pop()!), "x");
    writeFileSync(join(leaky, "assets", "other.gif"), "x");
    writeFileSync(join(leaky, "assets", "app.js"), 'fetch("/local-media/index.json")');
    const problems = scanOutput(leaky, process.cwd()) as string[];
    expect(problems.some((p) => /restricted Gym visual media/.test(p))).toBe(true);
    expect(
      problems.some((p) => /GIF in build output with no recorded licensed provenance/.test(p)),
    ).toBe(true);
    expect(problems.some((p) => /\/local-media\//.test(p))).toBe(true);

    const clean = mkdtempSync(join(tmpdir(), "clean-"));
    writeFileSync(join(clean, "app.js"), "console.log(1)");
    expect(scanOutput(clean, process.cwd())).toEqual([]);
  });

  it("fails a production output whose dev lab route is more than an empty stub", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab-"));
    mkdirSync(join(dir, "assets"), { recursive: true });
    writeFileSync(join(dir, "assets", "dev.design-lab-abc.js"), "x".repeat(2000));
    expect((scanOutput(dir, process.cwd()) as string[]).some((p) => /empty stub/.test(p))).toBe(
      true,
    );
    writeFileSync(
      join(dir, "assets", "dev.design-lab-abc.js"),
      "var n=()=>null;export{n as component};",
    );
    expect(scanOutput(dir, process.cwd())).toEqual([]);
    const text = mkdtempSync(join(tmpdir(), "labtext-"));
    writeFileSync(join(text, "a.js"), 'x="Living Instrument design lab"');
    expect((scanOutput(text, process.cwd()) as string[]).length).toBeGreaterThan(0);
  });

  it("only activates the adapter in the dev server behind an explicit env flag", () => {
    const adapter = read("src/data/local-media.ts");
    expect(adapter).toMatch(
      /import\.meta\.env\.DEV && import\.meta\.env\.VITE_LOCAL_MEDIA === "gymvisual"/,
    );
    const vite = read("vite.config.ts");
    expect(vite).toMatch(/apply: "serve"/);
    expect(vite).toMatch(/VITE_LOCAL_MEDIA !== "gymvisual"/);
  });

  it("adds nothing without local media and labels local items as restricted when present", () => {
    const base = snapshot.exercises.slice(0, 3);
    expect(applyLocalMedia(base, new Map())).toBe(base);
    const item: MediaItem = {
      id: "local-gv:1",
      kind: "animation",
      url: "/local-media/gymvisual/videos/a.gif",
      isMain: true,
      licence: { id: LOCAL_RESTRICTED_LICENCE_ID, short: "Local", url: "https://example.test" },
      author: "x",
    };
    const out = applyLocalMedia(base, new Map([[base[0]!.id, [item]]]));
    expect(out[0]!.media[0]).toBe(item);
    expect(out[1]).toBe(base[1]);
    expect(describeMedia(out[0]!.media).restricted).toBe(true);
    expect(describeMedia(out[0]!.media).badge).toBe("Local dev media");
  });

  it("ships no media from the dataset in the snapshot", () => {
    for (const e of snapshot.exercises) {
      if (e.source.provider !== "ExercisesDataset") continue;
      expect(e.media, e.id).toEqual([]);
      expect(e.licence.short).toBe("MIT (data)");
    }
  });
});

describe("canonical ids and aliases", () => {
  const ids = new Set(snapshot.exercises.map((e: CatalogueExercise) => e.id));
  const aliases = (
    JSON.parse(read("public/catalogue/v1/aliases.json")) as { aliases: Record<string, string> }
  ).aliases;
  const baseline = (JSON.parse(read("catalogue/id-baseline.json")) as { ids: string[] }).ids;

  it("keeps every pre-merge canonical id, so existing plans and history still resolve", () => {
    expect(baseline.filter((id) => !ids.has(id) && !aliases[id])).toEqual([]);
  });
  it("resolves every dataset id to an existing canonical record", () => {
    expect(Object.values(aliases).filter((to) => !ids.has(to))).toEqual([]);
    expect(Object.keys(aliases).length).toBeGreaterThanOrEqual(1300);
  });
  it("maps local media only to canonical ids that exist", () => {
    expect(Object.keys(index.entries).filter((id) => !ids.has(id))).toEqual([]);
  });
  it("has no duplicate canonical ids", () => {
    expect(ids.size).toBe(snapshot.exercises.length);
  });
});
