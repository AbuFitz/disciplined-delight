import type { CatalogueExercise } from "./catalogue";
import { describeMedia, type MediaMode } from "./exercise-media";
import { guideFor } from "./form-figure";

/**
 * Library facets. Where the catalogue carries a reviewed value it is used; otherwise a conservative rule estimates it
 * and the source is reported as "estimated" so the interface never presents a guess as a fact.
 */
export type Modality = "strength" | "bodyweight" | "core" | "mobility" | "cardio" | "power";
export const MODALITIES: Modality[] = [
  "strength",
  "bodyweight",
  "core",
  "mobility",
  "cardio",
  "power",
];
export const MODALITY_LABEL: Record<Modality, string> = {
  strength: "Strength",
  bodyweight: "Bodyweight",
  core: "Core",
  mobility: "Mobility and stretching",
  cardio: "Cardio",
  power: "Power and Olympic",
};

export function modalityOf(e: CatalogueExercise): Modality {
  const cat = e.category.toLowerCase();
  if (cat === "olympic" || /\b(snatch|clean and|power clean|jerk|kettlebell swing)\b/i.test(e.name))
    return "power";
  if (e.pattern === "mobility" || cat === "stretching") return "mobility";
  if (e.pattern === "cardio" || cat === "cardio" || e.tracking === "distance_time") return "cardio";
  if (e.pattern === "core") return "core";
  const kit = e.equipment.filter((q) => q !== "bodyweight" && q !== "mat");
  if (kit.length === 0 && e.tracking === "bodyweight_reps") return "bodyweight";
  return "strength";
}

export type Difficulty = "beginner" | "experienced" | "advanced" | "unrated";
export const DIFFICULTIES: Difficulty[] = ["beginner", "experienced", "advanced", "unrated"];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner-friendly",
  experienced: "Some experience",
  advanced: "Advanced",
  unrated: "Not rated",
};
const ADVANCED =
  /\b(pistol|one[- ]arm (push|pull|chin)|muscle[- ]?up|handstand|planche|front lever|back lever|dragon|archer|human flag|snatch|clean and jerk|power clean|iron cross|l-sit to|ring (dip|muscle)|weighted (dip|pull|chin))\b/i;
export function difficultyOf(e: CatalogueExercise): { level: Difficulty; reviewed: boolean } {
  if (e.level === "new") return { level: "beginner", reviewed: true };
  if (e.level === "some") return { level: "experienced", reviewed: true };
  if (e.category.toLowerCase() === "olympic" || ADVANCED.test(e.name))
    return { level: "advanced", reviewed: false };
  return { level: "unrated", reviewed: false };
}

export type AccessTag =
  "no_equipment" | "seated_supported" | "no_floor_work" | "low_impact" | "single_joint";
export const ACCESS_TAGS: AccessTag[] = [
  "no_equipment",
  "seated_supported",
  "no_floor_work",
  "low_impact",
  "single_joint",
];
export const ACCESS_LABEL: Record<AccessTag, string> = {
  no_equipment: "No equipment",
  seated_supported: "Seated or supported",
  no_floor_work: "No floor work",
  low_impact: "Low impact",
  single_joint: "Single joint",
};
const FLOOR =
  /\b(lying|supine|prone|plank|crawl|push[- ]?up|bridge|crunch|sit[- ]?up|leg raise|dead bug|bird dog|clamshell|hollow|bear|burpee|get[- ]?up)\b/i;
const IMPACT =
  /\b(jump|hop|bound|burpee|plyo|sprint|skip|clap|explosive|box|thruster|slam|swing|snatch|jerk|clean|high knees?)\b/i;
const SEATED =
  /\b(seated|sitting|machine|supported|chest[- ]supported|incline bench|bench press)\b/i;
const ISOLATION = new Set([
  "arms_biceps",
  "arms_triceps",
  "shoulder_isolation",
  "chest_isolation",
  "back_isolation",
  "leg_isolation",
  "calf",
]);

/** Estimated from equipment, pattern and name. Check anything that matters to you against your own needs. */
export function accessTagsOf(e: CatalogueExercise): AccessTag[] {
  const out: AccessTag[] = [];
  const kit = e.equipment.filter((q) => q !== "bodyweight" && q !== "mat");
  if (kit.length === 0) out.push("no_equipment");
  if (SEATED.test(e.name) || e.equipment.includes("machine")) out.push("seated_supported");
  if (!FLOOR.test(e.name) && !e.equipment.includes("mat")) out.push("no_floor_work");
  if (!IMPACT.test(e.name) && e.pattern !== "cardio" && modalityOf(e) !== "power")
    out.push("low_impact");
  if (ISOLATION.has(e.pattern)) out.push("single_joint");
  return out;
}

/** The deterministic media state of an exercise: every library item resolves to exactly one of these. */
export type MediaState = MediaMode | "authored_fallback";
export function mediaStateOf(e: Pick<CatalogueExercise, "media" | "pattern">): {
  state: MediaState;
  formGuide: boolean;
} {
  const d = describeMedia(e.media);
  const formGuide = !!guideFor(e.pattern);
  return { state: d.mode === "none" ? "authored_fallback" : d.mode, formGuide };
}
