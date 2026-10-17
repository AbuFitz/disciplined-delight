import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CatalogueExercise, CatalogueSnapshot } from "./catalogue";
import { summariseCatalogueCredits } from "./catalogue-credits";

const licence = (short: string) => ({
  id: short,
  short,
  url: `https://example.test/${encodeURIComponent(short)}`,
});

const exercise = (
  id: string,
  exerciseLicence: string,
  author: string,
  media: Array<[string, string]>,
): CatalogueExercise => ({
  id,
  source: { provider: "test", externalId: 1, uuid: id, url: "", sourceUpdatedAt: "" },
  name: id,
  aliases: [],
  category: "Test",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  equipmentDerived: [],
  pattern: "other",
  tracking: "weight_reps",
  instructions: "",
  cues: [],
  licence: licence(exerciseLicence),
  author,
  attribution: "Test attribution",
  media: media.map(([mediaLicence, mediaAuthor], index) => ({
    id: `${id}:${index}`,
    kind: "image",
    url: `/image-${id}-${index}.webp`,
    isMain: index === 0,
    licence: licence(mediaLicence),
    author: mediaAuthor,
  })),
  tier: "library",
  flags: [],
});

describe("catalogue credits", () => {
  it("counts text, media, licences and distinct contributors from the shipped records", () => {
    const exercises = [
      exercise("one", "CC BY-SA 4.0", "Alex", [["CC BY-SA 3.0", "Robin"]]),
      exercise("two", "CC BY-SA 4.0", " alex ", [
        ["CC BY-SA 4.0", "Robin"],
        ["CC BY-SA 4.0", "Sam"],
      ]),
    ];
    const snapshot = {
      schema: 1,
      snapshot: "test",
      provider: { name: "Test", url: "https://example.test", fetchedAt: "" },
      counts: { published: 2, generator: 0, quarantined: 0 },
      exercises,
    } satisfies CatalogueSnapshot;

    expect(summariseCatalogueCredits(snapshot)).toEqual({
      exercises: 2,
      media: 3,
      exerciseContributors: 1,
      mediaContributors: 2,
      licences: [
        { ...licence("CC BY-SA 4.0"), exerciseCount: 2, mediaCount: 2 },
        { ...licence("CC BY-SA 3.0"), exerciseCount: 0, mediaCount: 1 },
      ],
    });

    const committed = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../public/catalogue/v1/exercises.json", import.meta.url)),
        "utf8",
      ),
    ) as CatalogueSnapshot;
    const summary = summariseCatalogueCredits(committed);

    expect(summary.exercises).toBe(committed.counts.published);
    expect(summary.media).toBe(
      committed.exercises.reduce((count, item) => count + item.media.length, 0),
    );
    expect(summary.licences.map((item) => item.short).sort()).toEqual([
      "CC BY-SA 3.0",
      "CC BY-SA 4.0",
      "CC0 1.0",
      "RepDB Free Tier 1.0",
    ]);
    expect(summary.licences.every((item) => item.url.startsWith("https://"))).toBe(true);

    for (const item of committed.exercises) {
      expect(item.attribution, item.name).toContain(item.source.url);
      expect(item.attribution, item.name).toContain(item.licence.url);
      if (item.source.provider === "wger")
        expect(item.attribution, item.name).toContain("Adapted: formatting simplified");
      for (const image of item.media) {
        expect(image.author.trim().length, `${item.name}: ${image.id}`).toBeGreaterThan(0);
        expect(image.licence.url, `${item.name}: ${image.id}`).toMatch(/^https:\/\//);
      }
    }
  });
});
