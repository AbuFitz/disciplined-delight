import type { MediaItem } from "./catalogue";

/**
 * What a set of media items truthfully is. RepDB Free assets are static WebP illustrations (a start and a peak
 * frame); they are never called animated. Only items whose `kind` is "animation" or "video" count as motion.
 */
export type MediaMode = "motion" | "steps" | "still" | "none";

export type MediaFrame = {
  item: MediaItem;
  role: "start" | "peak" | "reference" | "motion";
  label: string;
};

export type MediaDescription = {
  mode: MediaMode;
  frames: MediaFrame[];
  /** Genuine motion item, when one exists. */
  motion?: MediaItem;
  /** Short badge text. Never claims more than the assets are. */
  badge: string;
  /** One honest sentence for screen readers and tooltips. */
  note: string;
  credit?: { author: string; licence: string; licenceUrl: string; sourceUrl?: string };
};

const ROLE_ORDER = { motion: 0, start: 1, peak: 2, reference: 3 } as const;

export function frameRole(item: MediaItem): MediaFrame["role"] {
  if (item.kind !== "image") return "motion";
  const tail = item.id.split(":").pop() ?? "";
  if (tail === "start") return "start";
  if (tail === "peak") return "peak";
  return "reference";
}

const LABEL: Record<MediaFrame["role"], string> = {
  motion: "Motion",
  start: "Start position",
  peak: "Peak position",
  reference: "Reference",
};

export function describeMedia(items: readonly MediaItem[] | undefined | null): MediaDescription {
  const seen = new Set<string>();
  const unique = (items ?? []).filter((m) => {
    if (!m?.url || seen.has(m.url)) return false;
    seen.add(m.url);
    return true;
  });
  if (unique.length === 0)
    return {
      mode: "none",
      frames: [],
      badge: "No demo yet",
      note: "No demonstration is available for this exercise yet.",
    };
  const motion = unique.find((m) => m.kind !== "image");
  const frames = unique
    .map((item): MediaFrame => ({ item, role: frameRole(item), label: LABEL[frameRole(item)] }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const stills = frames.filter((f) => f.role !== "motion");
  const first = unique[0]!;
  const credit = {
    author: first.author,
    licence: first.licence.short,
    licenceUrl: first.licence.url,
    sourceUrl: first.sourceUrl,
  };
  if (motion)
    return {
      mode: "motion",
      frames,
      motion,
      badge: "Motion",
      note: "A short looping demonstration. Pause it any time.",
      credit,
    };
  if (stills.length >= 2)
    return {
      mode: "steps",
      frames: stills,
      badge: `${stills.length} illustrated steps`,
      note: "Still illustrations of the start and peak positions. Not an animation.",
      credit,
    };
  return {
    mode: "still",
    frames: stills,
    badge: "Illustration",
    note: "A still illustration.",
    credit,
  };
}

/** The frame a card or thumbnail should use: the peak position reads best, falling back to the first frame. */
export function coverFrame(d: MediaDescription): MediaItem | undefined {
  return (
    d.frames.find((f) => f.role === "peak") ??
    d.frames.find((f) => f.role !== "motion") ??
    d.frames[0]
  )?.item;
}

export type Montage = {
  tiles: { item: MediaItem; name: string }[];
  badge: string;
  steps: number;
  motion: number;
  missing: number;
};

/** Up to four distinct movements for a workout card; reports honestly what kind of media it is made of. */
export function workoutMontage(
  exercises: readonly { name: string; media: readonly MediaItem[] | undefined }[],
  max = 4,
): Montage {
  const tiles: Montage["tiles"] = [];
  let steps = 0;
  let motion = 0;
  let missing = 0;
  for (const ex of exercises) {
    const d = describeMedia(ex.media);
    if (d.mode === "none") {
      missing++;
      continue;
    }
    if (d.mode === "steps") steps++;
    if (d.mode === "motion") motion++;
    const item = coverFrame(d);
    if (item && tiles.length < max) tiles.push({ item, name: ex.name });
  }
  const badge =
    motion > 0
      ? "Motion + stills"
      : steps > 0
        ? "Illustrated steps"
        : tiles.length
          ? "Illustrations"
          : "No demos yet";
  return { tiles, badge, steps, motion, missing };
}

/** Alt text that names the movements instead of repeating "image". */
export function montageAlt(m: Montage): string {
  return m.tiles.length
    ? `Illustrations of ${m.tiles.map((t) => t.name).join(", ")}`
    : "No demonstration available";
}

/** First few sentences of upstream instructions as separate steps, capped so it stays glanceable. */
export function instructionSteps(text: string | undefined, max = 5): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, max);
}
