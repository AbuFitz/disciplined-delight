#!/usr/bin/env node
/**
 * Developer command: copy the (c) Gym visual thumbnails and GIFs from a LOCAL checkout of
 * hasaneyldrm/exercises-dataset into the gitignored cache .local-media/gymvisual/.
 *
 *   npm run catalogue:local-media -- --source /path/to/exercises-dataset
 *   npm run catalogue:local-media -- --check
 *
 * The media is NOT licensed to this project. The cache is for local evaluation only: it is gitignored,
 * never copied into public/ or a build, and only served by the dev server when VITE_LOCAL_MEDIA=gymvisual.
 * catalogue/local-media-index.json maps canonical exercise ids to file names (no binaries).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { CACHE_DIR } from "./restricted-media.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const cache = join(ROOT, CACHE_DIR);
const index = JSON.parse(readFileSync(join(ROOT, "catalogue/local-media-index.json"), "utf8"));
const wanted = Object.values(index.entries).flatMap((l) =>
  l.flatMap((e) => [e.image, e.gif]).filter(Boolean),
);

const ignored = () => {
  try {
    execFileSync("git", ["check-ignore", "-q", join(CACHE_DIR, "x")], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
};
if (!ignored())
  throw new Error(`${CACHE_DIR} is not gitignored; refusing to write restricted media.`);

if (process.argv.includes("--check")) {
  const missing = wanted.filter((p) => !existsSync(join(cache, p)));
  console.log(
    `${wanted.length - missing.length}/${wanted.length} media files present in ${CACHE_DIR}`,
  );
  process.exit(missing.length ? 1 : 0);
}
const source = arg("--source");
if (!source)
  throw new Error("Pass --source pointing to a checkout of hasaneyldrm/exercises-dataset.");
if (!existsSync(join(source, "NOTICE.md")))
  throw new Error("--source does not look like the exercises-dataset checkout.");
let copied = 0,
  missing = 0;
for (const rel of wanted) {
  const from = join(source, rel);
  if (!existsSync(from)) {
    missing += 1;
    continue;
  }
  const to = join(cache, rel);
  mkdirSync(dirname(to), { recursive: true });
  if (!existsSync(to) || statSync(to).size !== statSync(from).size) {
    copyFileSync(from, to);
    copied += 1;
  }
}
writeFileSync(
  join(cache, "PROVENANCE.txt"),
  `(c) Gym visual - https://gymvisual.com/\nSource: hasaneyldrm/exercises-dataset (media redistributed there with permission at 180x180).\nTerms: https://gymvisual.com/content/3-terms-and-conditions-of-use\nThis project holds NO licence for this media. Local evaluation only. Do not commit, bundle, publish or copy.\n`,
);
console.log(
  `Local media cache ${CACHE_DIR}: ${copied} copied, ${wanted.length - copied - missing} already present, ${missing} missing.`,
);
