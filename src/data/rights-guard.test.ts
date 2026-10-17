import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script shared with the CLI
import { ALLOWED_LICENCES, computeRights } from "../../scripts/catalogue/rights-lib.mjs";
import type { CatalogueSnapshot } from "@/domain/catalogue";
import { mediaStateOf } from "@/domain/catalogue-facets";

const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? (n === "node_modules" || n === "media" ? [] : walk(p)) : [p];
  });
const sourceFiles = walk(join(ROOT, "src")).filter(
  (f) => [".ts", ".tsx", ".css"].includes(extname(f)) && !/\.test\.tsx?$/.test(f),
);
const IMG = /https?:\/\/[^\s"'`)>]+\.(png|jpe?g|webp|gif|avif|svg)(\?[^\s"'`)>]*)?/gi;
const BANNED_HOSTS =
  /(unsplash|pexels|picsum|placeholder\.com|placehold\.co|loremflickr|imgur|pixabay|shutterstock|istockphoto|gettyimages|dummyimage|lorempixel|images\.ctfassets|wger\.de\/media|raw\.githubusercontent\.com)/i;

describe("no remote or stock imagery in the product", () => {
  it("source, styles and index files contain no remote image URLs", () => {
    const offenders: string[] = [];
    for (const f of [...sourceFiles, join(ROOT, "index.html")].filter(existsSync)) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(IMG)) offenders.push(`${f.replace(ROOT, "")}: ${m[0]}`);
      for (const m of text.matchAll(/<img[^>]+src=["']https?:/gi))
        offenders.push(`${f.replace(ROOT, "")}: ${m[0]}`);
      for (const m of text.matchAll(/url\(\s*["']?https?:/gi))
        offenders.push(`${f.replace(ROOT, "")}: ${m[0]}`);
      if (BANNED_HOSTS.test(text) && !/rights-guard/.test(f))
        offenders.push(`${f.replace(ROOT, "")}: banned image host`);
    }
    expect(offenders).toEqual([]);
  });
  it("has no bundled raster assets in src (everything visual is authored in code or catalogued)", () => {
    const raster = walk(join(ROOT, "src")).filter((f) => /\.(png|jpe?g|webp|gif|avif)$/i.test(f));
    expect(raster).toEqual([]);
  });
});

describe("catalogue media integrity and rights", () => {
  const snap = JSON.parse(
    readFileSync(join(ROOT, "public/catalogue/v1/exercises.json"), "utf8"),
  ) as CatalogueSnapshot;
  it("hosts every media file locally under an allowed licence with an author", () => {
    for (const e of snap.exercises)
      for (const m of e.media) {
        for (const u of [m.url, m.thumb, m.poster].filter(Boolean) as string[]) {
          expect(u, e.id).toMatch(/^\/catalogue\/media\//);
          expect(existsSync(join(ROOT, "public", u)), `${e.id} ${u}`).toBe(true);
        }
        expect(ALLOWED_LICENCES.has(m.licence.short), `${e.id}: ${m.licence.short}`).toBe(true);
        expect(m.author.trim().length, e.id).toBeGreaterThan(1);
        expect(m.licence.url, e.id).toMatch(/^https:\/\//);
      }
  });
  it("never labels a static image as motion", () => {
    for (const e of snap.exercises)
      for (const m of e.media) {
        if (m.kind !== "image") expect(m.poster, `${e.id} needs a poster`).toBeTruthy();
        if (/\.webp$|\.png$|\.jpe?g$/i.test(m.url) && m.kind !== "image")
          expect(m.mimeType, e.id).toMatch(/video|image\/(webp|apng|gif)/);
      }
  });
  it("gives every exercise exactly one deterministic media state", () => {
    const counts: Record<string, number> = {};
    for (const e of snap.exercises) {
      const s = mediaStateOf(e).state;
      expect(["motion", "steps", "still", "authored_fallback"]).toContain(s);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(snap.exercises.length);
  });
  it("keeps the committed rights manifest in sync with the snapshot", () => {
    const committed = JSON.parse(
      readFileSync(join(ROOT, "catalogue/rights-manifest.json"), "utf8"),
    );
    expect(committed).toEqual(computeRights(ROOT));
    expect(committed.totals.remoteUrls).toBe(0);
    expect(committed.totals.missingFiles).toBe(0);
  });
  it("includes no paid RepDB Standard asset", () => {
    expect(JSON.stringify(snap).toLowerCase()).not.toContain("repdb standard");
    expect(JSON.stringify(snap).toLowerCase()).not.toContain("premium-samples");
  });
});
