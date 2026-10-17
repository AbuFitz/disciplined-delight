/** Install a user-supplied licensed RepDB Standard motion bundle. No purchase or preview asset is implied. */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname;
const value = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const source = value("--source"),
  proof = value("--license-file");
if (!source || !proof)
  throw new Error(
    "Pass --source for the licensed Standard bundle and --license-file for your purchase/licence record.",
  );
if (!existsSync(source) || !existsSync(proof) || statSync(proof).size === 0)
  throw new Error("The bundle or licence record does not exist.");
if (source.includes("premium-samples"))
  throw new Error("RepDB preview animations are evaluation-only and cannot be installed.");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
const files = walk(source).filter(
  (file) =>
    [".webp", ".mp4", ".webm"].includes(extname(file).toLowerCase()) &&
    !/-(start|peak)\.webp$/i.test(file),
);
if (files.length < 100)
  throw new Error(
    `Only ${files.length} motion files found; expected a complete licensed bundle, not samples.`,
  );
const catalogueFile = join(ROOT, "public/catalogue/v1/exercises.json");
const manifestFile = join(ROOT, "public/catalogue/v1/motion-manifest.json");
const outputDir = join(ROOT, "public/catalogue/motion");
mkdirSync(outputDir, { recursive: true });
const catalogue = JSON.parse(readFileSync(catalogueFile, "utf8"));
const bySlug = new Map(
  catalogue.exercises
    .map((exercise) => [
      exercise.source.provider === "RepDB"
        ? exercise.source.uuid
        : exercise.media.find((item) => item.id.startsWith("repdb-img:"))?.id.split(":")[1],
      exercise,
    ])
    .filter(([slug]) => slug),
);
const entries = [];
let installed = 0;
for (const file of files) {
  const slug = basename(file, extname(file)).replace(/-(animation|animated|loop)$/i, "");
  const exercise = bySlug.get(slug);
  if (!exercise) continue;
  const extension = extname(file).toLowerCase();
  const filename = `repdb-${slug}${extension}`;
  const output = join(outputDir, filename);
  copyFileSync(file, output);
  const poster =
    exercise.media.find((item) => item.id === `repdb-img:${slug}:start`)?.url ??
    exercise.media[0]?.url;
  if (!poster) continue;
  const id = `repdb-motion:${slug}`;
  exercise.media = exercise.media.filter((item) => item.id !== id);
  exercise.media.unshift({
    id,
    kind: extension === ".webp" ? "animation" : "video",
    url: `/catalogue/motion/${filename}`,
    poster,
    thumb: poster,
    mimeType: extension === ".webp" ? "image/webp" : `video/${extension.slice(1)}`,
    isMain: true,
    licence: {
      id: "RepDB-Standard",
      short: "RepDB Standard commercial licence",
      url: "https://repdb.co/pricing",
    },
    author: "RepDB / Sergei Argutin",
    sourceUrl: "https://repdb.co",
  });
  const bytes = readFileSync(output);
  entries.push({
    id,
    exerciseId: exercise.id,
    localUrl: `/catalogue/motion/${filename}`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  installed += 1;
}
if (installed < 100)
  throw new Error(
    `Only ${installed} bundle files matched catalogue exercises. Refusing a partial or incompatible install.`,
  );
const atomic = (file, data) => {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(data, null, file === catalogueFile ? 0 : 2)}\n`);
  renameSync(temporary, file);
};
atomic(catalogueFile, catalogue);
atomic(manifestFile, {
  schema: 1,
  provider: "RepDB Standard",
  licenceProofSha256: createHash("sha256").update(readFileSync(proof)).digest("hex"),
  entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
});
console.log(`Installed ${installed} licensed RepDB motion loops.`);
