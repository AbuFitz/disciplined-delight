/**
 * Canonical exercise catalogue model. Provider-neutral: adapters (see catalogue-wger.ts) map a provider's
 * records into this shape, keeping source IDs, licences, authors and media provenance on every record.
 * User-created exercises and local edits are stored separately and never overwrite upstream fields.
 */
export type TrackingType =
  | "weight_reps"
  | "bodyweight_reps"
  | "assisted_reps"
  | "time"
  | "distance_time";

export const PATTERNS = [
  "squat",
  "hinge",
  "lunge",
  "push_horizontal",
  "push_vertical",
  "pull_horizontal",
  "pull_vertical",
  "core",
  "calf",
  "arms_biceps",
  "arms_triceps",
  "shoulder_isolation",
  "chest_isolation",
  "back_isolation",
  "leg_isolation",
  "glute",
  "cardio",
  "mobility",
  "other",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export const MUSCLES = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "obliques",
  "lats",
  "traps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "serratus",
] as const;
export type MuscleId = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "kettlebell",
  "bench",
  "incline_bench",
  "band",
  "pullup_bar",
  "ez_bar",
  "mat",
  "swiss_ball",
  "smith",
] as const;
export type EquipmentId = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  bodyweight: "Bodyweight",
  dumbbell: "Dumbbells",
  barbell: "Barbell",
  cable: "Cables",
  machine: "Machines",
  kettlebell: "Kettlebell",
  bench: "Bench",
  incline_bench: "Incline bench",
  band: "Bands",
  pullup_bar: "Pull-up bar",
  ez_bar: "EZ bar",
  mat: "Mat",
  swiss_ball: "Swiss ball",
  smith: "Smith machine",
};
export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  obliques: "Obliques",
  lats: "Lats",
  traps: "Traps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  serratus: "Serratus",
};
export const PATTERN_LABEL: Record<Pattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  push_horizontal: "Push (horizontal)",
  push_vertical: "Push (overhead)",
  pull_horizontal: "Pull (row)",
  pull_vertical: "Pull (vertical)",
  core: "Core",
  calf: "Calves",
  arms_biceps: "Biceps",
  arms_triceps: "Triceps",
  shoulder_isolation: "Shoulder isolation",
  chest_isolation: "Chest isolation",
  back_isolation: "Back isolation",
  leg_isolation: "Leg isolation",
  glute: "Glutes",
  cardio: "Cardio",
  mobility: "Mobility",
  other: "Other",
};

export type Licence = { id: string; short: string; url: string };
export type MediaItem = {
  id: string;
  /** Images are stills; animations are image-based loops (for example WebP); videos are playable clips. */
  kind: "image" | "animation" | "video";
  url: string;
  thumb?: string;
  /** Required for motion media so reduced-motion and paused states never show a blank frame. */
  poster?: string;
  mimeType?: string;
  isMain: boolean;
  licence: Licence;
  author: string;
  sourceUrl?: string;
};

export type CatalogueExercise = {
  /** Stable across re-imports: `${provider}:${uuid}`. */
  id: string;
  source: {
    provider: string;
    externalId: number | string;
    uuid: string;
    url: string;
    sourceUpdatedAt: string;
  };
  name: string;
  aliases: string[];
  category: string;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment: EquipmentId[];
  /** Equipment ids that were inferred by rules rather than supplied by the provider. */
  equipmentDerived: EquipmentId[];
  pattern: Pattern;
  tracking: TrackingType;
  instructions: string;
  cues: string[];
  licence: Licence;
  author: string;
  attribution: string;
  media: MediaItem[];
  /** "generator" = passes every quality gate and may be used by the plan builder; "library" = browsable only. */
  tier: "generator" | "library";
  /** Set only on curated exercises: the lowest experience the generator may use it for. */
  level?: "new" | "some";
  flags: string[];
};

export type Quarantined = { id: string; name: string; reasons: string[] };

export type CatalogueSnapshot = {
  schema: 1;
  snapshot: string;
  provider: { name: string; url: string; fetchedAt: string };
  /** Present on merged snapshots. `provider` remains for backwards compatibility. */
  providers?: { name: string; url: string; fetchedAt: string }[];
  counts: { published: number; generator: number; quarantined: number };
  exercises: CatalogueExercise[];
};

export type Override = Partial<{
  hide: boolean;
  name: string;
  aliases: string[];
  pattern: Pattern;
  tracking: TrackingType;
  /** Replaces the equipment list outright (use when upstream data is wrong, not merely incomplete). */
  equipment: EquipmentId[];
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  /** Marks the exercise as hand-reviewed for automatic programmes and sets the lowest experience it suits. */
  curated: "new" | "some";
  equipmentAdd: EquipmentId[];
  equipmentRemove: EquipmentId[];
  /** Removes provider media that failed human semantic review or duplicates another frame. */
  mediaRemove: string[];
  note: string;
}>;
export type Overrides = Record<string, Override>;

/* ------------------------------ Rules ------------------------------ */

/** Ordered: specific before general. First match wins. Reviewed by a human via `overrides.json` where wrong. */
const PATTERN_RULES: [RegExp, Pattern][] = [
  [/leg raises?|knee raise|sit[- ]?ups?|hanging leg|v-up/, "core"],
  [
    /squat thrust|burpee|thruster|snatch|jerk|power clean|hang clean|wall ball|jumping jack/,
    "other",
  ],
  [/leg curl|hamstring curl|leg extension|adduct|abduct|sissy/, "leg_isolation"],
  [/\bcalf|calves|heel raise/, "calf"],
  [
    /stretch|circles|rotation|slides|chin tuck|prayer|child'?s pose|dislocates|retraction|head tilts|head turns|thoracic|ywt|mobility|rest \(/,
    "mobility",
  ],
  [/leg press|hack squat|overhead squat/, "squat"],
  [/wrist|forearm|reverse curl wrist|grip|hanging|deadhang/, "other"],
  [
    /reverse fly|reverse flye|rear delt|rear lateral|lateral raise|side lateral|front raise|upright row|shrug|bent-?over lateral|high pull/,
    "shoulder_isolation",
  ],
  [/face ?pull|long-?pulley|low row/, "pull_horizontal"],
  [/straight[- ]arm|pullover/, "back_isolation"],
  [/fly|flye|butterfly|pec deck|crossover|cross-over/, "chest_isolation"],
  [/tricep|pushdown|push down|skull|kickback|french press/, "arms_triceps"],
  [/curl/, "arms_biceps"],
  [/pull[- ]?up|chin[- ]?up|pulldown|pull down|lat pull|pullups/, "pull_vertical"],
  [/\brow\b|rowing|\brows\b|t-bar|inverted row/, "pull_horizontal"],
  [
    /overhead press|shoulder press|military|arnold|push press|handstand|pike push|behind the neck|overhead extension(?! )|shoulder press/,
    "push_vertical",
  ],
  [
    /bench|chest press|push[- ]?up|press[- ]?up|\bdips?\b|floor press|incline press|decline press|\bpress\b/,
    "push_horizontal",
  ],
  [
    /deadlift|romanian|good morning|hip thrust|glute bridge|bridge|back extension|hyperextension|kettlebell swing|\bswing|pull[- ]?through|hip extension/,
    "hinge",
  ],
  [/lunge|split squat|step[- ]?up|bulgarian|walking/, "lunge"],
  [/squat|leg press|hack/, "squat"],
  [/glute|donkey|fire hydrant|clam/, "glute"],
  [
    /crunch|plank|sit[- ]?up|leg raise|knee raise|\babs?\b|woodchop|twist|rollout|ab wheel|v-up|flutter|bicycle|russian|side bend|mountain climber|hollow/,
    "core",
  ],
];

export function inferPattern(name: string, category: string): Pattern {
  const n = name.toLowerCase();
  if (category === "Cardio") return "cardio";
  for (const [re, p] of PATTERN_RULES) if (re.test(n)) return p;
  if (category === "Abs") return "core";
  if (category === "Calves") return "calf";
  return "other";
}

export function inferTracking(
  name: string,
  category: string,
  equipment: EquipmentId[],
): TrackingType {
  const n = name.toLowerCase();
  if (/assisted/.test(n)) return "assisted_reps";
  if (
    category === "Cardio" ||
    /\b(run|jog|sprint|cycle|cycling|bike|treadmill|swim|walk(ing)?|elliptical|stair|skipping|rope jump|jump rope)\b/.test(
      n,
    )
  ) {
    return /\b(run|jog|sprint|cycle|cycling|bike|treadmill|swim|walk(ing)?|elliptical|row(ing)? machine)\b/.test(
      n,
    )
      ? "distance_time"
      : "time";
  }
  if (
    /\b(plank|hold|hang|wall sit|isometric|stretch|bridge hold|dead hang|l-sit|hollow hold)\b/.test(
      n,
    )
  )
    return "time";
  const loaded = equipment.some((e) =>
    ["dumbbell", "barbell", "cable", "machine", "kettlebell", "ez_bar", "smith", "band"].includes(
      e,
    ),
  );
  if (!loaded && equipment.includes("bodyweight")) return "bodyweight_reps";
  if (!loaded && equipment.length === 0) return "bodyweight_reps";
  return "weight_reps";
}

const MACHINE_RE =
  /\bmachine\b|leg press|pec deck|butterfly|leverage|hack(enschmi[dt]t)?|smith|selectori[sz]ed|plate[- ]loaded/;
const SMITH_RE = /smith/;

/** Machine and Smith metadata isn't in wger's equipment list, so it's derived from the name (and flagged as derived). */
export function deriveEquipment(
  name: string,
  given: EquipmentId[],
): { equipment: EquipmentId[]; derived: EquipmentId[] } {
  const n = name.toLowerCase();
  const eq = new Set(given);
  const derived: EquipmentId[] = [];
  if (MACHINE_RE.test(n) && !eq.has("machine")) {
    eq.add("machine");
    derived.push("machine");
  }
  if (SMITH_RE.test(n) && !eq.has("smith")) {
    eq.add("smith");
    derived.push("smith");
  }
  return { equipment: [...eq], derived };
}

export const LICENCE_ALLOWLIST = new Set(["CC0", "CC-BY-SA 3", "CC-BY-SA 4", "CC-BY 4"]);

/** HTML → readable plain text (lists become bullets, paragraphs become lines). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function applyOverride(
  e: CatalogueExercise,
  o: Override | undefined,
): CatalogueExercise | null {
  if (!o) return e.tier === "generator" ? { ...e, tier: "library" } : e; // not hand-reviewed: browsable only
  if (o.hide) return null;
  const equipment = new Set(o.equipment ?? e.equipment);
  o.equipmentAdd?.forEach((x) => equipment.add(x));
  o.equipmentRemove?.forEach((x) => equipment.delete(x));
  const replaced = !!(o.equipment || o.equipmentAdd || o.equipmentRemove);
  return {
    ...e,
    name: o.name ?? e.name,
    aliases: o.aliases ?? e.aliases,
    pattern: o.pattern ?? e.pattern,
    tracking: o.tracking ?? e.tracking,
    primaryMuscles: o.primaryMuscles ?? e.primaryMuscles,
    secondaryMuscles: o.secondaryMuscles ?? e.secondaryMuscles,
    equipment: [...equipment],
    equipmentDerived: replaced ? [] : e.equipmentDerived,
    media: o.mediaRemove?.length
      ? e.media.filter((item) => !o.mediaRemove!.includes(item.id))
      : e.media,
    tier: o.curated && e.tier === "generator" ? "generator" : "library",
    level: o.curated && e.tier === "generator" ? o.curated : undefined,
    flags: [...e.flags, "overridden", ...(o.mediaRemove?.length ? ["media_curated"] : [])],
  };
}
