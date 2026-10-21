import type { CatalogueExercise, EquipmentId, MuscleId, Pattern } from "./catalogue";
import {
  accessTagsOf,
  difficultyOf,
  mediaStateOf,
  modalityOf,
  type AccessTag,
  type Difficulty,
  type MediaState,
  type Modality,
} from "./catalogue-facets";

export type CatalogueFilter = {
  q?: string;
  muscle?: MuscleId;
  equipment?: EquipmentId;
  pattern?: Pattern;
  /** Only exercises doable with exactly this kit (bodyweight/mat always allowed). */
  haveEquipment?: EquipmentId[];
  withImages?: boolean;
  favouritesOnly?: string[];
  modality?: Modality;
  difficulty?: Difficulty;
  /** Every listed access tag must apply (estimated; see catalogue-facets). */
  access?: AccessTag[];
  media?: MediaState;
  provider?: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Name matches rank above alias matches above muscle/equipment words. Stable order, no randomness. */
export function searchCatalogue(all: CatalogueExercise[], f: CatalogueFilter): CatalogueExercise[] {
  const terms = norm(f.q ?? "")
    .split(" ")
    .filter(Boolean);
  const have = f.haveEquipment
    ? new Set<EquipmentId>([...f.haveEquipment, "bodyweight", "mat"])
    : null;
  const scored: { e: CatalogueExercise; s: number }[] = [];
  for (const e of all) {
    if (f.muscle && !e.primaryMuscles.includes(f.muscle) && !e.secondaryMuscles.includes(f.muscle))
      continue;
    if (
      f.equipment &&
      !(
        e.equipment.includes(f.equipment) ||
        (f.equipment === "bodyweight" && e.equipment.length === 0)
      )
    )
      continue;
    if (f.pattern && e.pattern !== f.pattern) continue;
    if (have && !e.equipment.every((q) => have.has(q))) continue;
    if (f.withImages && !e.media.length) continue;
    if (f.favouritesOnly && !f.favouritesOnly.includes(e.id)) continue;
    if (f.modality && modalityOf(e) !== f.modality) continue;
    if (f.difficulty && difficultyOf(e).level !== f.difficulty) continue;
    if (f.access?.length) {
      const tags = accessTagsOf(e);
      if (!f.access.every((a) => tags.includes(a))) continue;
    }
    if (f.media && mediaStateOf(e).state !== f.media) continue;
    if (f.provider && e.source.provider !== f.provider) continue;
    let s = 0;
    if (terms.length) {
      const name = norm(e.name);
      const aliases = e.aliases.map(norm);
      const other = norm(
        [...e.primaryMuscles, ...e.equipment, e.pattern.replace(/_/g, " ")].join(" "),
      );
      for (const t of terms) {
        if (name.startsWith(t)) s += 6;
        else if (name.split(" ").some((w) => w.startsWith(t))) s += 4;
        else if (name.includes(t)) s += 2;
        else if (aliases.some((a) => a.includes(t))) s += 2;
        else if (other.includes(t)) s += 1;
        else {
          s = -1;
          break;
        }
      }
      if (s < 0) continue;
    }
    if (e.tier === "generator") s += 2.5;
    if (e.pattern === "mobility" || e.pattern === "other") s -= 1.5;
    scored.push({ e, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name) || a.e.id.localeCompare(b.e.id))
    .map((x) => x.e);
}
