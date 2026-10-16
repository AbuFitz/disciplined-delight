/**
 * Download the licensed exercise images used by the catalogue and replace
 * third-party URLs with same-origin files. The committed manifest keeps the
 * original URL and licence metadata for provenance and repeatable refreshes.
 *
 * Usage:
 *   node scripts/catalogue/media.mjs
 *   node scripts/catalogue/media.mjs --check
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const CATALOGUE_FILE = join(ROOT, "public/catalogue/v1/exercises.json");
const MANIFEST_FILE = join(ROOT, "public/catalogue/v1/media-manifest.json");
const MEDIA_DIR = join(ROOT, "public/catalogue/media");
const PUBLIC_PREFIX = "/catalogue/media/";
const USER_AGENT = "VAYVOR-media-importer/1.0 (licensed wger exercise media)";
const MAX_BYTES = 8 * 1024 * 1024;
const CONCURRENCY = 4;

const compactJson = (value) => `${JSON.stringify(value)}\n`;
const prettyJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const atomicWrite = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, file);
};

const extensionFrom = (url, contentType = "") => {
  const pathname = new URL(url).pathname;
  const extension = extname(pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
};

const safeId = (id) => id.replace(/^wger-img:/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function fetchImage(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "wger.de" || !parsed.pathname.startsWith("/media/")) {
    throw new Error(`Refusing unexpected media origin: ${url}`);
  }
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "image/*", "User-Agent": USER_AGENT },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) throw new Error(`unexpected content type ${contentType}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_BYTES) {
        throw new Error(`invalid image size ${bytes.length}`);
      }
      return { bytes, contentType };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`Could not download ${url}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

const catalogue = JSON.parse(readFileSync(CATALOGUE_FILE, "utf8"));
const previousManifest = existsSync(MANIFEST_FILE)
  ? JSON.parse(readFileSync(MANIFEST_FILE, "utf8"))
  : { entries: [] };
const previousById = new Map(previousManifest.entries.map((entry) => [entry.id, entry]));

const jobs = [];
for (const exercise of catalogue.exercises) {
  for (const media of exercise.media ?? []) {
    const existing = previousById.get(media.id);
    const remoteUrl = media.url.startsWith("http")
      ? media.url
      : existing?.originalUrl;
    const remoteThumb = media.thumb?.startsWith("http")
      ? media.thumb
      : existing?.originalThumb;
    if (!remoteUrl) throw new Error(`No original URL recorded for ${media.id}`);
    jobs.push({ exercise, media, remoteUrl, remoteThumb, downloadUrl: remoteThumb ?? remoteUrl, existing });
  }
}

if (process.argv.includes("--check")) {
  const missing = [];
  for (const { media, existing } of jobs) {
    if (!media.url.startsWith(PUBLIC_PREFIX)) missing.push(`${media.id}: not same-origin`);
    else {
      const file = join(ROOT, "public", media.url.slice(1));
      if (!existsSync(file) || statSync(file).size === 0) missing.push(`${media.id}: missing ${media.url}`);
      else if (!existing) missing.push(`${media.id}: missing provenance entry`);
      else {
        const fileBytes = readFileSync(file);
        if (existing.localUrl !== media.url) missing.push(`${media.id}: catalogue/manifest path mismatch`);
        if (existing.bytes !== fileBytes.length) missing.push(`${media.id}: byte count mismatch`);
        if (existing.sha256 !== sha256(fileBytes)) missing.push(`${media.id}: checksum mismatch`);
        if (existing.author !== media.author || existing.licence?.id !== media.licence?.id) {
          missing.push(`${media.id}: attribution mismatch`);
        }
      }
    }
  }
  if (missing.length) throw new Error(`Media check failed:\n${missing.join("\n")}`);
  console.log(`Checked ${jobs.length} self-hosted catalogue images.`);
  process.exit(0);
}

mkdirSync(MEDIA_DIR, { recursive: true });
let completed = 0;
const manifestEntries = new Array(jobs.length);

async function runJob(job, index) {
  const priorPath = job.existing?.localUrl;
  const priorFile = priorPath?.startsWith(PUBLIC_PREFIX)
    ? join(ROOT, "public", priorPath.slice(1))
    : null;
  let localUrl;
  let bytes;
  let digest;
  let contentType;

  if (
    priorFile &&
    existsSync(priorFile) &&
    statSync(priorFile).size > 0 &&
    job.existing.originalUrl === job.remoteUrl &&
    job.existing.originalThumb === job.remoteThumb
  ) {
    localUrl = priorPath;
    bytes = statSync(priorFile).size;
    digest = job.existing.sha256;
    contentType = job.existing.contentType;
  } else {
    const downloaded = await fetchImage(job.downloadUrl);
    const extension = extensionFrom(job.downloadUrl, downloaded.contentType);
    const filename = `${safeId(job.media.id)}${extension}`;
    const output = join(MEDIA_DIR, filename);
    atomicWrite(output, downloaded.bytes);
    localUrl = `${PUBLIC_PREFIX}${filename}`;
    bytes = downloaded.bytes.length;
    digest = sha256(downloaded.bytes);
    contentType = downloaded.contentType;
  }

  job.media.url = localUrl;
  job.media.thumb = localUrl;
  manifestEntries[index] = {
    id: job.media.id,
    exerciseId: job.exercise.id,
    localUrl,
    originalUrl: job.remoteUrl,
    originalThumb: job.remoteThumb,
    author: job.media.author,
    licence: job.media.licence,
    contentType,
    bytes,
    sha256: digest,
  };
  completed += 1;
  if (completed % 25 === 0 || completed === jobs.length) {
    console.log(`Downloaded or verified ${completed}/${jobs.length}`);
  }
}

let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      await runJob(jobs[index], index);
    }
  }),
);

manifestEntries.sort((a, b) => a.id.localeCompare(b.id));
atomicWrite(CATALOGUE_FILE, compactJson(catalogue));
atomicWrite(
  MANIFEST_FILE,
  prettyJson({
    schema: 1,
    provider: "wger",
    note: "Local 400px catalogue copies; original URLs and licence metadata retained for provenance.",
    entries: manifestEntries,
  }),
);
console.log(`Wrote ${jobs.length} self-hosted images and updated ${basename(CATALOGUE_FILE)}.`);
