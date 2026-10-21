/**
 * Merge the MIT-licensed text/data of hasaneyldrm/exercises-dataset into the VAYVOR catalogue.
 *
 *   node scripts/catalogue/exercises-dataset.mjs --source /path/to/exercises-dataset [--dry-run]
 *
 * What is imported: names, categories, muscles, equipment, instructions and the nine non-English
 * instruction translations (MIT, see the dataset's LICENSE).
 * What is NOT imported: the images and GIFs. They are (c) Gym visual and are not licensed to us.
 * Only a path index (catalogue/local-media-index.json, outside public/) is written so the
 * development-only local media adapter can find files in a local checkout.
 *
 * Existing records keep their canonical IDs. A dataset record whose normalised name equals an existing
 * name or alias is merged into it (cross-reference + alias); everything else is added as `xd:<id>`.
 * public/catalogue/v1/aliases.json maps every dataset id to its canonical id so references keep working.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const dry = process.argv.includes("--dry-run");
const source = arg("--source");
if (!source)
  throw new Error("Pass --source pointing to a checkout of hasaneyldrm/exercises-dataset.");
for (const f of ["data/exercises.json", "LICENSE", "NOTICE.md"])
  if (!existsSync(join(source, f))) throw new Error(`Dataset checkout is missing ${f}`);
const dataset = JSON.parse(readFileSync(join(source, "data/exercises.json"), "utf8"));
if (!Array.isArray(dataset) || dataset.length < 1000) throw new Error("Unexpected dataset shape.");

const catalogueFile = join(ROOT, "public/catalogue/v1/exercises.json");
const aliasFile = join(ROOT, "public/catalogue/v1/aliases.json");
const i18nDir = join(ROOT, "public/catalogue/v1/i18n");
const mediaIndexFile = join(ROOT, "catalogue/local-media-index.json");
const catalogue = JSON.parse(readFileSync(catalogueFile, "utf8"));
// Re-runnable: drop a previous import before merging again.
catalogue.exercises = catalogue.exercises.filter((e) => !e.id.startsWith("xd:"));
for (const e of catalogue.exercises) {
  if (e.source?.merged) delete e.source.merged;
  e.flags = (e.flags ?? []).filter((f) => f !== "xd_text");
}

const PROVIDER = "ExercisesDataset";
const licence = {
  id: "MIT",
  short: "MIT (data)",
  url: "https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE",
};
const author = "Hasan Emir Yıldırım (exercises-dataset)";
const normal = (v) => v.toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/g, "");
/** Word-order and plural insensitive key: "Dumbbell Incline Press" and "incline dumbbell presses" match. */
const tokenKey = (v) =>
  v
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "with", "a", "of", "version"].includes(w))
    .map((w) => w.replace(/(es|s)$/, ""))
    .sort()
    .join(" ");
const pretty = (name) =>
  name
    .trim()
    .replace(/^\(|\)$/g, "")
    .split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("en-GB") + w.slice(1) : w))
    .join(" ");

const MUSCLE = {
  abs: "abs",
  pectorals: "chest",
  biceps: "biceps",
  triceps: "triceps",
  delts: "shoulders",
  shoulders: "shoulders",
  glutes: "glutes",
  lats: "lats",
  "upper back": "traps",
  traps: "traps",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  "serratus anterior": "serratus",
  "levator scapulae": "traps",
  abductors: "glutes",
  obliques: "obliques",
  chest: "chest",
};
const muscles = (values) => [
  ...new Set(values.map((v) => MUSCLE[String(v).toLowerCase()]).filter(Boolean)),
];
const EQUIPMENT = {
  "body weight": ["bodyweight"],
  weighted: ["bodyweight"],
  dumbbell: ["dumbbell"],
  barbell: ["barbell"],
  "olympic barbell": ["barbell"],
  "trap bar": ["barbell"],
  "ez barbell": ["ez_bar"],
  cable: ["cable"],
  band: ["band"],
  "resistance band": ["band"],
  kettlebell: ["kettlebell"],
  "leverage machine": ["machine"],
  "sled machine": ["machine"],
  "skierg machine": ["machine"],
  "elliptical machine": ["machine"],
  "stepmill machine": ["machine"],
  "upper body ergometer": ["machine"],
  "stationary bike": ["machine"],
  assisted: ["machine"],
  hammer: ["machine"],
  "smith machine": ["smith"],
  "stability ball": ["swiss_ball"],
  "bosu ball": ["swiss_ball"],
  "medicine ball": ["bodyweight"],
  rope: ["bodyweight"],
  roller: ["mat"],
  "wheel roller": ["bodyweight"],
  tire: ["bodyweight"],
};
const pattern = (x) => {
  const n = x.name.toLowerCase();
  if (x.category === "cardio" || x.target === "cardiovascular system") return "cardio";
  if (/stretch|mobility|pose/.test(n)) return "mobility";
  if (/curl/.test(n) && !/leg|hamstring|nordic/.test(n)) return "arms_biceps";
  if (/tricep|pushdown|skull crusher|dip/.test(n)) return "arms_triceps";
  if (/calf|toe raise/.test(n)) return "calf";
  if (/lunge|split squat|step[- ]?up/.test(n)) return "lunge";
  if (/deadlift|good morning|pull[- ]through|hyperextension|back extension/.test(n)) return "hinge";
  if (/squat|leg press|hack/.test(n)) return "squat";
  if (/row/.test(n)) return "pull_horizontal";
  if (/pull[- ]?up|pulldown|pull down|chin[- ]?up/.test(n)) return "pull_vertical";
  if (/shoulder press|overhead press|push press|military press|arnold/.test(n))
    return "push_vertical";
  if (/bench press|push[- ]?up|chest press|floor press/.test(n)) return "push_horizontal";
  if (/fly|flye|pec deck|crossover|pullover/.test(n)) return "chest_isolation";
  if (/lateral raise|front raise|rear delt|reverse fly|upright row/.test(n))
    return "shoulder_isolation";
  if (/leg curl|leg extension|adductor|abductor/.test(n)) return "leg_isolation";
  if (/glute|hip thrust|kickback|bridge/.test(n)) return "glute";
  if (x.body_part === "waist") return "core";
  if (x.body_part === "back") return "back_isolation";
  return "other";
};
const tracking = (x) => {
  const n = x.name.toLowerCase();
  if (x.category === "cardio" || x.target === "cardiovascular system") return "distance_time";
  if (/stretch|plank|hold|hang|isometric|wall sit/.test(n)) return "time";
  if (x.equipment === "assisted") return "assisted_reps";
  if (x.equipment === "body weight") return "bodyweight_reps";
  return "weight_reps";
};

const byName = new Map();
const byTokens = new Map();
const push = (map, k, e) => {
  if (!k) return;
  const list = map.get(k) ?? [];
  if (!list.includes(e)) list.push(e);
  map.set(k, list);
};
const index = (e) => {
  for (const name of [e.name, ...(e.aliases ?? [])]) {
    push(byName, normal(name), e);
    const t = tokenKey(name);
    if (t.includes(" ")) push(byTokens, t, e);
  }
};
catalogue.exercises.forEach(index);
const rank = (e) => (e.id.startsWith("wger:") ? 0 : e.id.startsWith("repdb:") ? 1 : 2);

const aliases = {};
const mediaIndex = {};
const i18n = {};
let merged = 0,
  added = 0,
  folded = 0;
const sorted = [...dataset].sort((a, b) => a.id.localeCompare(b.id));
for (const x of sorted) {
  const key = normal(x.name);
  const tk = tokenKey(x.name);
  const exact = byName.get(key) ?? [];
  const candidates = (exact.length ? exact : tk.includes(" ") ? (byTokens.get(tk) ?? []) : [])
    .slice()
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  let target = candidates[0];
  const dsId = `xd:${x.id}`;
  const steps = x.instruction_steps ?? {};
  if (target) {
    if (target.id.startsWith("xd:")) folded += 1;
    else merged += 1;
    target.source.merged = [...new Set([...(target.source.merged ?? []), dsId])];
    target.flags = [...new Set([...(target.flags ?? []), "xd_text"])];
    if (!target.instructions && steps.en?.length) target.instructions = steps.en.join("\n");
  } else {
    const primary = muscles([x.target, x.muscle_group].filter(Boolean));
    const eq = EQUIPMENT[String(x.equipment).toLowerCase()] ?? ["bodyweight"];
    target = {
      id: dsId,
      source: {
        provider: PROVIDER,
        externalId: x.id,
        uuid: x.id,
        url: "https://github.com/hasaneyldrm/exercises-dataset",
        sourceUpdatedAt: String(x.created_at ?? "").slice(0, 10) || "2026",
      },
      name: pretty(x.name),
      aliases: [],
      category: x.category,
      primaryMuscles: primary.slice(0, 2),
      secondaryMuscles: muscles(x.secondary_muscles ?? []).filter(
        (m) => !primary.slice(0, 2).includes(m),
      ),
      equipment: eq,
      equipmentDerived: [],
      pattern: pattern(x),
      tracking: tracking(x),
      instructions: (steps.en ?? []).join("\n"),
      cues: [],
      licence,
      author,
      attribution: `Exercise data and instructions from hasaneyldrm/exercises-dataset (${"https://github.com/hasaneyldrm/exercises-dataset"}), MIT (${licence.url}). Images and animations are not included.`,
      media: [],
      tier: "library",
      flags: ["xd_mit", "not_reviewed_for_generator"],
    };
    catalogue.exercises.push(target);
    index(target);
    added += 1;
  }
  aliases[dsId] = target.id;
  mediaIndex[target.id] ??= [];
  mediaIndex[target.id].push({
    datasetId: x.id,
    mediaId: x.media_id,
    image: x.image,
    gif: x.gif_url,
    attribution: x.attribution,
  });
  const tr = {};
  for (const lang of Object.keys(steps))
    if (lang !== "en" && steps[lang]?.length) tr[lang] = steps[lang];
  if (Object.keys(tr).length) i18n[target.id] = { ...(i18n[target.id] ?? {}), ...tr };
}
catalogue.exercises.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
catalogue.counts.published = catalogue.exercises.length;
catalogue.providers = [
  ...(catalogue.providers ?? [catalogue.provider]).filter((p) => p.name !== PROVIDER),
  {
    name: PROVIDER,
    url: "https://github.com/hasaneyldrm/exercises-dataset",
    fetchedAt: "2026-10-21",
  },
];
catalogue.snapshot = `${catalogue.snapshot.replace(/\+xd-mit-[^+]+/g, "")}+xd-mit-1`;

const byLang = {};
for (const [id, langs] of Object.entries(i18n))
  for (const [lang, st] of Object.entries(langs)) (byLang[lang] ??= {})[id] = st;

console.log(
  `dataset ${dataset.length}: ${merged} merged into existing, ${folded} folded into an earlier dataset record, ${added} added; total ${catalogue.exercises.length}; languages ${Object.keys(byLang).join(",")}`,
);
if (dry) process.exit(0);
const atomic = (file, value, space = 0) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, space)}\n`);
  renameSync(`${file}.tmp`, file);
};
atomic(catalogueFile, catalogue);
atomic(aliasFile, {
  schema: 1,
  note: "Maps retired or merged ids to canonical ids.",
  aliases: Object.fromEntries(Object.entries(aliases).sort()),
});
for (const [lang, v] of Object.entries(byLang))
  atomic(join(i18nDir, `${lang}.json`), { schema: 1, lang, steps: v });
atomic(
  mediaIndexFile,
  {
    schema: 1,
    restricted: true,
    note: "Paths into a LOCAL checkout of the dataset. The media is (c) Gym visual and is NOT licensed for distribution. Never move this file or its media into public/.",
    entries: mediaIndex,
  },
  1,
);
console.log("written");
