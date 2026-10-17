import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CatalogueSnapshot, Overrides } from "../domain/catalogue";

type ManifestEntry = {
  id: string;
  exerciseId: string;
  localUrl: string;
  bytes: number;
  sha256: string;
};

const fromRepo = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const snapshot = JSON.parse(
  readFileSync(fromRepo("public/catalogue/v1/exercises.json"), "utf8"),
) as CatalogueSnapshot;
const manifest = JSON.parse(
  readFileSync(fromRepo("public/catalogue/v1/media-manifest.json"), "utf8"),
) as { entries: ManifestEntry[] };
const motionManifestPath = fromRepo("public/catalogue/v1/motion-manifest.json");
const motionManifest = existsSync(motionManifestPath)
  ? (JSON.parse(readFileSync(motionManifestPath, "utf8")) as { entries: ManifestEntry[] })
  : { entries: [] };
const overrides = JSON.parse(
  readFileSync(fromRepo("catalogue/overrides.json"), "utf8"),
) as Overrides;

const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("committed catalogue media", () => {
  it("has one accurate manifest record for every referenced local image", () => {
    const referenced = snapshot.exercises.flatMap((exercise) =>
      exercise.media
        .filter((item) => item.kind === "image")
        .map((item) => ({ ...item, exerciseId: exercise.id })),
    );
    expect(new Set(referenced.map((item) => item.id)).size).toBe(referenced.length);
    expect(new Set(manifest.entries.map((item) => item.id)).size).toBe(manifest.entries.length);
    expect(manifest.entries).toHaveLength(referenced.length);
    expect(readdirSync(fromRepo("public/catalogue/media")).sort()).toEqual(
      manifest.entries.map((entry) => entry.localUrl.split("/").at(-1)!).sort(),
    );

    const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));
    for (const item of referenced) {
      const entry = byId.get(item.id);
      expect(entry, item.id).toBeDefined();
      expect(entry?.exerciseId).toBe(item.exerciseId);
      expect(entry?.localUrl).toBe(item.url);
      expect(item.url.startsWith("/catalogue/media/")).toBe(true);

      const file = fromRepo(`public${item.url}`);
      expect(existsSync(file), file).toBe(true);
      const bytes = readFileSync(file);
      expect(entry?.bytes).toBe(bytes.length);
      expect(entry?.sha256).toBe(digest(file));
    }
  });

  it("requires provenance and hashes for every installed motion asset", () => {
    const referenced = snapshot.exercises.flatMap((exercise) =>
      exercise.media
        .filter((item) => item.kind !== "image")
        .map((item) => ({ ...item, exerciseId: exercise.id })),
    );
    expect(motionManifest.entries).toHaveLength(referenced.length);
    const byId = new Map(motionManifest.entries.map((entry) => [entry.id, entry]));
    for (const item of referenced) {
      expect(item.poster, item.id).toMatch(/^\/catalogue\/media\//);
      expect(item.url, item.id).toMatch(/^\/catalogue\/motion\//);
      const entry = byId.get(item.id);
      expect(entry?.exerciseId).toBe(item.exerciseId);
      const file = fromRepo(`public${item.url}`);
      expect(entry?.sha256).toBe(digest(file));
    }
  });

  it("does not publish rejected images or repeated bytes within one exercise", () => {
    for (const exercise of snapshot.exercises) {
      const rejected = new Set(overrides[exercise.id]?.mediaRemove ?? []);
      expect(
        exercise.media.every((item) => !rejected.has(item.id)),
        exercise.name,
      ).toBe(true);

      const hashes = exercise.media.map((item) => digest(fromRepo(`public${item.url}`)));
      expect(new Set(hashes).size, exercise.name).toBe(hashes.length);
    }
  });
});
