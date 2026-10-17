/** Merge the auditable RepDB free tier into VAYVOR. Usage: node scripts/catalogue/repdb.mjs --source /path/to/exercise-dataset */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const source = arg("--source");
if (!source) throw new Error("Pass --source pointing to a checked-out RepDB free-tier repository.");
for (const required of ["exercises.json", "LICENSE-DATA.md", "ATTRIBUTION.md", "images/flat"])
  if (!existsSync(join(source, required))) throw new Error(`RepDB source is missing ${required}`);
if (existsSync(join(source, "premium-samples")) && source.includes("premium-samples"))
  throw new Error("Premium samples are evaluation-only and cannot be imported.");

const catalogueFile = join(ROOT, "public/catalogue/v1/exercises.json");
const manifestFile = join(ROOT, "public/catalogue/v1/media-manifest.json");
const mediaDir = join(ROOT, "public/catalogue/media");
const catalogue = JSON.parse(readFileSync(catalogueFile, "utf8"));
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const dataset = JSON.parse(readFileSync(join(source, "exercises.json"), "utf8"));
if (
  !dataset.name?.startsWith("RepDB") ||
  dataset.exercises?.length !== dataset.count ||
  dataset.count < 600
)
  throw new Error("Unexpected RepDB dataset identity or count.");

const licence = {
  id: "RepDB-Free-1.0",
  short: "RepDB Free Tier 1.0",
  url: "https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md",
};
const author = "RepDB / Sergei Argutin";
const normal = (value) => value.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "");
const byName = new Map();
for (const exercise of catalogue.exercises) {
  const key = normal(exercise.name);
  byName.set(key, [...(byName.get(key) ?? []), exercise]);
}
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const muscleMap = (values = []) => [
  ...new Set(
    values
      .map(
        (value) =>
          ({
            pectoralis_major: "chest",
            anterior_deltoid: "shoulders",
            lateral_deltoid: "shoulders",
            posterior_deltoid: "shoulders",
            biceps_brachii: "biceps",
            brachialis: "biceps",
            brachioradialis: "biceps",
            triceps_brachii: "triceps",
            rectus_abdominis: "abs",
            transverse_abdominis: "abs",
            obliques: "obliques",
            latissimus_dorsi: "lats",
            rhomboids: "traps",
            trapezius: "traps",
            quadriceps: "quads",
            hamstrings: "hamstrings",
            gluteus_maximus: "glutes",
            gluteus_medius: "glutes",
            gastrocnemius: "calves",
            soleus: "calves",
            serratus_anterior: "serratus",
          })[value],
      )
      .filter(Boolean),
  ),
];
const equipment = (item) => {
  if (item.is_bodyweight || !item.equipment) return [];
  const value = item.equipment;
  if (value === "dumbbell") return ["dumbbell"];
  if (["barbell", "trap_bar", "plates"].includes(value)) return ["barbell"];
  if (value === "kettlebell") return ["kettlebell"];
  if (value === "ez_bar") return ["ez_bar"];
  if (value === "cable") return ["cable"];
  if (["resistance_band", "loop_band"].includes(value)) return ["band"];
  if (["pull_up_bar", "rings", "dip_station"].includes(value)) return ["pullup_bar"];
  if (value === "flat_bench") return ["bench"];
  if (value === "stability_ball") return ["swiss_ball"];
  if (value === "smith_machine") return ["smith"];
  return ["machine"];
};
const pattern = (item) => {
  const name = item.name_en.toLowerCase();
  if (/stretch|pose|mobility/.test(name)) return "mobility";
  if (/curl/.test(name) && !/leg|hamstring/.test(name)) return "arms_biceps";
  if (/tricep|pushdown|skull crusher/.test(name)) return "arms_triceps";
  if (/calf/.test(name)) return "calf";
  if (/lunge|step[- ]?up/.test(name)) return "lunge";
  if (/deadlift|good morning|pull-through/.test(name)) return "hinge";
  if (/squat|leg press/.test(name)) return "squat";
  if (/row/.test(name)) return "pull_horizontal";
  if (/pull[- ]?up|pulldown|chin[- ]?up/.test(name)) return "pull_vertical";
  if (/shoulder press|overhead press|push press/.test(name)) return "push_vertical";
  if (/bench press|push[- ]?up|chest press/.test(name)) return "push_horizontal";
  if (/fly|pec deck|crossover/.test(name)) return "chest_isolation";
  if (/lateral raise|front raise|reverse fly|rear delt/.test(name)) return "shoulder_isolation";
  if (item.body_part === "core") return "core";
  if (/leg curl|leg extension|adduct|abduct/.test(name)) return "leg_isolation";
  if (/glute|hip thrust/.test(name)) return "glute";
  if (item.category === "cardio") return "cardio";
  return "other";
};
const mediaEntries = manifest.entries.filter((entry) => !entry.id.startsWith("repdb-img:"));
mkdirSync(mediaDir, { recursive: true });
let merged = 0,
  added = 0,
  imageCount = 0;
for (const item of dataset.exercises) {
  const sourceUrl = `https://repdb.co/exercise/${item.id}/`;
  const candidates = (byName.get(normal(item.name_en)) ?? []).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const target = candidates[0];
  for (const duplicate of candidates.slice(1))
    duplicate.media = duplicate.media.filter(
      (entry) => !entry.id.startsWith(`repdb-img:${item.id}:`),
    );
  const media = [];
  for (const [position, relative] of Object.entries(item.images?.flat ?? {})) {
    const input = join(source, relative);
    if (!existsSync(input) || !input.startsWith(join(source, "images/flat")))
      throw new Error(`Missing or unsafe RepDB image ${relative}`);
    const filename = `repdb-${item.id}-${position}.webp`;
    const output = join(mediaDir, filename);
    copyFileSync(input, output);
    const id = `repdb-img:${item.id}:${position}`;
    const localUrl = `/catalogue/media/${filename}`;
    media.push({
      id,
      kind: "image",
      url: localUrl,
      thumb: localUrl,
      isMain: position === "start" || position === "main",
      licence,
      author,
      sourceUrl,
    });
    mediaEntries.push({
      id,
      exerciseId: target?.id ?? `repdb:${item.id}`,
      localUrl,
      originalUrl: `https://raw.githubusercontent.com/RepDB/exercise-dataset/main/${relative}`,
      author,
      licence,
      contentType: "image/webp",
      bytes: statSync(output).size,
      sha256: sha256(output),
    });
    imageCount += 1;
  }
  if (target) {
    const existing = new Set(target.media.map((entry) => entry.id));
    target.media.push(...media.filter((entry) => !existing.has(entry.id)));
    target.flags = [...new Set([...(target.flags ?? []), "repdb_media"])];
    merged += 1;
    continue;
  }
  const primaryMuscles = muscleMap(item.primary_muscles);
  const eq = equipment(item);
  const exercise = {
    id: `repdb:${item.id}`,
    source: {
      provider: "RepDB",
      externalId: item.id,
      uuid: item.id,
      url: sourceUrl,
      sourceUpdatedAt: "2026",
    },
    name: item.name_en,
    aliases: [item.name_de, item.name_es].filter(Boolean),
    category: item.category,
    primaryMuscles,
    secondaryMuscles: muscleMap(item.secondary_muscles).filter(
      (muscle) => !primaryMuscles.includes(muscle),
    ),
    equipment: eq,
    equipmentDerived: [],
    pattern: pattern(item),
    tracking:
      item.category === "cardio"
        ? "distance_time"
        : item.is_bodyweight
          ? "bodyweight_reps"
          : item.category === "mobility" || /stretch|pose/.test(item.name_en.toLowerCase())
            ? "time"
            : "weight_reps",
    instructions: (item.instructions_en ?? []).join("\n"),
    cues: item.tips_en ?? [],
    licence,
    author,
    attribution: `Exercise data and illustrations by RepDB (${sourceUrl}), RepDB Free Tier 1.0 (${licence.url}).`,
    media,
    tier: "library",
    level: item.difficulty === "beginner" ? "new" : undefined,
    flags: ["repdb_free", "not_reviewed_for_generator"],
  };
  catalogue.exercises.push(exercise);
  byName.set(normal(exercise.name), [exercise]);
  added += 1;
}
catalogue.exercises.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
catalogue.counts.published = catalogue.exercises.length;
const priorRepdb = catalogue.providers?.find((provider) => provider.name === "RepDB");
catalogue.providers = [
  catalogue.provider,
  priorRepdb ?? { name: "RepDB", url: "https://repdb.co", fetchedAt: new Date().toISOString() },
];
catalogue.snapshot = `${catalogue.snapshot.replace(/\+repdb-free-[^+]+/g, "")}+repdb-free-${dataset.schema_version}`;
manifest.entries = mediaEntries.sort((a, b) => a.id.localeCompare(b.id));
manifest.provider = "wger + RepDB";
manifest.note =
  "Self-hosted licensed wger media plus RepDB free-tier application assets; original URLs, licences and hashes retained.";
const atomic = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, file === catalogueFile ? 0 : 2)}\n`);
  renameSync(temporary, file);
};
atomic(catalogueFile, catalogue);
atomic(manifestFile, manifest);
console.log(
  `RepDB imported: ${dataset.count} records, ${added} new exercises, ${merged} exact-name media merges, ${imageCount} images.`,
);
