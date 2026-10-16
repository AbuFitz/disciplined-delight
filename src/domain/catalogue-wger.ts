import {
  applyOverride,
  deriveEquipment,
  htmlToText,
  inferPattern,
  inferTracking,
  LICENCE_ALLOWLIST,
  type CatalogueExercise,
  type EquipmentId,
  type Licence,
  type MediaItem,
  type MuscleId,
  type Overrides,
  type Quarantined,
} from "./catalogue";

/* The parts of wger's /api/v2/exerciseinfo/ response that we read (checked against the live API, 16 Oct 2026). */
export type WgerMuscle = { id: number; name: string; name_en: string };
export type WgerImage = {
  id: number;
  uuid: string;
  image: string;
  is_main: boolean;
  is_ai_generated?: boolean;
  license: number;
  license_author?: string;
  license_object_url?: string;
  license_derivative_source_url?: string;
  thumbnails?: { small?: string; medium?: string };
};
export type WgerTranslation = {
  language: number;
  name: string;
  description: string;
  aliases: { alias: string }[];
  notes: { comment: string }[];
  license: number;
  license_author?: string;
};
export type WgerExercise = {
  id: number;
  uuid: string;
  last_update_global: string;
  category: { id: number; name: string };
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: { id: number; name: string }[];
  license: { id: number; short_name: string; url: string } | null;
  license_author: string | null;
  images: WgerImage[];
  translations: WgerTranslation[];
};

const LICENCES_BY_ID: Record<number, Licence> = {
  1: {
    id: "CC-BY-SA 3",
    short: "CC BY-SA 3.0",
    url: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  2: {
    id: "CC-BY-SA 4",
    short: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  3: { id: "CC0", short: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  4: { id: "CC-BY 4", short: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  5: { id: "ODbL", short: "ODbL 1.0", url: "https://opendatacommons.org/licenses/odbl/1-0/" },
};

const MUSCLE_MAP: Record<number, MuscleId> = {
  1: "biceps",
  2: "shoulders",
  3: "serratus",
  4: "chest",
  5: "triceps",
  6: "abs",
  7: "calves",
  8: "glutes",
  9: "traps",
  10: "quads",
  11: "hamstrings",
  12: "lats",
  13: "biceps",
  14: "obliques",
  15: "calves",
};

const EQUIPMENT_MAP: Record<string, EquipmentId> = {
  "none (bodyweight exercise)": "bodyweight",
  Dumbbell: "dumbbell",
  "Cable machine": "cable",
  Barbell: "barbell",
  Bench: "bench",
  "Pull-up bar": "pullup_bar",
  "Resistance band": "band",
  "Incline bench": "incline_bench",
  "SZ-Bar": "ez_bar",
  Kettlebell: "kettlebell",
  "Gym mat": "mat",
  "Swiss Ball": "swiss_ball",
};

const ENGLISH = 2;
const unique = <T>(a: T[]) => [...new Set(a)];

export type Normalised =
  { ok: true; exercise: CatalogueExercise } | { ok: false; quarantined: Quarantined };

function mediaOf(e: WgerExercise, flags: string[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const im of e.images) {
    if (im.is_ai_generated) {
      if (!flags.includes("ai_images_excluded")) flags.push("ai_images_excluded");
      continue;
    }
    const lic = LICENCES_BY_ID[im.license];
    if (!lic || !LICENCE_ALLOWLIST.has(lic.id)) {
      flags.push("image_licence_not_allowed");
      continue;
    }
    if (!im.license_author?.trim()) {
      if (!flags.includes("image_author_missing")) flags.push("image_author_missing");
      continue;
    }
    out.push({
      id: `wger-img:${im.uuid}`,
      kind: "image",
      url: im.image,
      thumb: im.thumbnails?.medium ?? im.thumbnails?.small,
      isMain: im.is_main,
      licence: lic,
      author: im.license_author.trim(),
      sourceUrl: im.license_derivative_source_url || undefined,
    });
  }
  return out.sort((a, b) => Number(b.isMain) - Number(a.isMain)).slice(0, 3);
}

/** Adapter: one wger exercise → canonical record, or a quarantine entry with reasons. Pure and deterministic. */
export function normaliseWger(e: WgerExercise, overrides: Overrides = {}): Normalised {
  const t = e.translations.find((x) => x.language === ENGLISH);
  const id = `wger:${e.uuid}`;
  const name = t?.name?.trim() ?? "";
  const reasons: string[] = [];
  if (!t || name.length < 3 || name.length > 80) reasons.push("no_usable_english_name");

  const licId = t?.license ?? 0;
  const lic = LICENCES_BY_ID[licId];
  if (!lic || !LICENCE_ALLOWLIST.has(lic.id)) reasons.push("licence_not_allowed");

  const text = t ? htmlToText(t.description ?? "") : "";
  if (/https?:\/\/|www\./i.test(text)) reasons.push("instructions_contain_link");
  if (text.length < 40) reasons.push("instructions_missing");

  if (reasons.length || !t || !lic)
    return { ok: false, quarantined: { id, name: name || `#${e.id}`, reasons } };

  const flags: string[] = [];
  const primary = unique(e.muscles.map((m) => MUSCLE_MAP[m.id]).filter(Boolean) as MuscleId[]);
  const secondary = unique(
    e.muscles_secondary.map((m) => MUSCLE_MAP[m.id]).filter(Boolean) as MuscleId[],
  ).filter((m) => !primary.includes(m));
  const given = unique(
    e.equipment.map((q) => EQUIPMENT_MAP[q.name]).filter(Boolean) as EquipmentId[],
  );
  const { equipment, derived } = deriveEquipment(name, given.length ? given : []);
  const pattern = inferPattern(name, e.category.name);
  const tracking = inferTracking(name, e.category.name, equipment);
  const author = (t.license_author || e.license_author || "").trim();
  if (!author) flags.push("author_missing");
  const media = mediaOf(e, flags);
  if (!primary.length) flags.push("no_primary_muscle");
  if (pattern === "other") flags.push("pattern_unknown");
  if (text.length < 100) flags.push("instructions_short");
  if (derived.length) flags.push("equipment_derived");

  const strict =
    !flags.includes("no_primary_muscle") &&
    !flags.includes("pattern_unknown") &&
    !flags.includes("instructions_short");
  const sourceUrl = `https://wger.de/en/exercise/${e.id}/view/`;
  const exercise: CatalogueExercise = {
    id,
    source: {
      provider: "wger",
      externalId: e.id,
      uuid: e.uuid,
      url: sourceUrl,
      sourceUpdatedAt: e.last_update_global,
    },
    name,
    aliases: unique(t.aliases.map((a) => a.alias.trim()).filter(Boolean)),
    category: e.category.name,
    primaryMuscles: primary,
    secondaryMuscles: secondary,
    equipment: equipment.length ? equipment : ["bodyweight"],
    equipmentDerived: derived,
    pattern,
    tracking,
    instructions: text,
    cues: t.notes.map((n) => n.comment.trim()).filter(Boolean),
    licence: lic,
    author: author || "wger contributors",
    attribution: `"${name}"${author ? ` by ${author}` : ""} from wger (${sourceUrl}), ${lic.short} (${lic.url}). Adapted: formatting simplified.`,
    media,
    tier: strict ? "generator" : "library",
    flags,
  };
  const applied = applyOverride(exercise, overrides[id]);
  if (!applied) return { ok: false, quarantined: { id, name, reasons: ["hidden_by_override"] } };
  return { ok: true, exercise: applied };
}
