/**
 * Guards against restricted media (Gym visual images/GIFs: (c) Gym visual, not licensed to us) entering
 * tracked source, public/ or any build output. Pure functions so tests can exercise them on fixtures.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { execFileSync } from "node:child_process";

export const CACHE_DIR = ".local-media/gymvisual";
/** Output folders a build may write to. */
export const OUTPUT_DIRS = ["dist", ".output", ".vercel/output", ".vinxi", ".nitro"];
const BINARY = new Set([
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".mp4",
  ".webm",
  ".mov",
]);
/** Strings that must never appear in shipped output. */
/** Development-only UI must not be in a build (the route stays registered but 404s; its code must be absent). */
const DEV_ONLY_TEXT = ["Living Instrument design lab", "Two specimens, one decision"];
const FORBIDDEN_TEXT = [".local-media", "/local-media/", "local-media-index"];

export function restrictedFileNames(root) {
  const file = join(root, "catalogue/local-media-index.json");
  if (!existsSync(file)) return new Set();
  const index = JSON.parse(readFileSync(file, "utf8"));
  const names = new Set();
  for (const list of Object.values(index.entries ?? {}))
    for (const e of list) for (const p of [e.image, e.gif]) if (p) names.add(p.split("/").pop());
  return names;
}

/** File names of media with recorded, licensed provenance (the media manifest). Anything else GIF-like is suspect. */
export function licensedMediaNames(root) {
  const file = join(root, "public/catalogue/v1/media-manifest.json");
  if (!existsSync(file)) return new Set();
  const m = JSON.parse(readFileSync(file, "utf8"));
  return new Set(
    (m.entries ?? []).map((e) =>
      String(e.localUrl ?? "")
        .split("/")
        .pop(),
    ),
  );
}

function walk(dir, visit, base = dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, visit, base);
    else visit(full, relative(base, full), st);
  }
}

/** Scan a built output directory. Returns a list of human-readable violations. */
export function scanOutput(dir, root = process.cwd()) {
  const restricted = restrictedFileNames(root);
  const licensed = licensedMediaNames(root);
  const problems = [];
  walk(dir, (full, rel, st) => {
    const ext = extname(rel).toLowerCase();
    if (restricted.has(rel.split("/").pop()))
      problems.push(`${rel}: file name matches restricted Gym visual media`);
    else if (ext === ".gif" && !licensed.has(rel.split("/").pop()))
      problems.push(`${rel}: GIF in build output with no recorded licensed provenance`);
    // The dev route stays registered (file-based routing) but must be a stub that renders the 404 page.
    if (/(^|\/)dev\.design-lab-[^/]*\.js$/.test(rel) && st.size > 1024)
      problems.push(
        `${rel}: design-lab route chunk is ${st.size} bytes; it must be an empty stub in production`,
      );
    if (/(^|\/)\.?local-media(\/|$)/.test(rel))
      problems.push(`${rel}: local-media path in build output`);
    if ([".js", ".mjs", ".css", ".html", ".json", ".map"].includes(ext)) {
      const text = readFileSync(full, "utf8");
      for (const t of [...FORBIDDEN_TEXT, ...DEV_ONLY_TEXT])
        if (text.includes(t)) problems.push(`${rel}: contains "${t}"`);
    }
  });
  return problems;
}

/** Tracked files and public/ must hold no restricted binaries or cache paths. */
export function scanTracked(root = process.cwd()) {
  const problems = [];
  const restricted = restrictedFileNames(root);
  const licensed = licensedMediaNames(root);
  let tracked = [];
  try {
    tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
      .toString()
      .split("\0")
      .filter(Boolean);
  } catch {
    /* not a git checkout (for example a source archive): fall back to walking public/ below */
  }
  for (const rel of tracked) {
    if (rel.startsWith(".local-media/"))
      problems.push(`${rel}: tracked file inside the local media cache`);
    if (restricted.has(rel.split("/").pop()))
      problems.push(`${rel}: tracked file named like restricted media`);
    if (extname(rel).toLowerCase() === ".gif" && !licensed.has(rel.split("/").pop()))
      problems.push(`${rel}: tracked GIF with no recorded licensed provenance`);
  }
  walk(join(root, "public"), (full, rel) => {
    if (restricted.has(rel.split("/").pop()))
      problems.push(`public/${rel}: restricted media in public/`);
    if (extname(rel).toLowerCase() === ".gif" && !licensed.has(rel.split("/").pop()))
      problems.push(`public/${rel}: GIF in public/ with no recorded licensed provenance`);
    if (/local-media/.test(rel)) problems.push(`public/${rel}: local-media path in public/`);
  });
  // Git LFS must not be used for media.
  const attrs = join(root, ".gitattributes");
  if (existsSync(attrs) && /filter=lfs/.test(readFileSync(attrs, "utf8")))
    problems.push(
      ".gitattributes: Git LFS is configured; restricted media must never be stored there",
    );
  return problems;
}

export function scanAll(root = process.cwd()) {
  const problems = scanTracked(root);
  for (const d of OUTPUT_DIRS)
    problems.push(...scanOutput(join(root, d), root).map((p) => `${d}/${p}`));
  return problems;
}
