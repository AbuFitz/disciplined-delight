/**
 * The companion family. Every variant shares one expressive face, the same states and the same
 * capabilities; they differ in silhouette, motion personality and default emotional energy.
 * Variants are not gendered or stereotyped personas, and any variant can be recoloured and renamed.
 *
 * Names are working names. Web searches on 2026-10-17 were inconclusive for Nomi, Kiro and Luma
 * (existing AI products are known under those names) and confirmed Velo collisions, so none of
 * them are used. A trademark and app-store check is still needed before launch; the names live
 * here only, so changing them touches no behaviour.
 */
export type VariantId = "tavi" | "ollo" | "zuri" | "eira";
export type Silhouette = "squircle" | "pebble" | "capsule" | "lozenge";
export type Energy = "quick" | "calm" | "bold" | "reflective";

/** Multipliers that give each variant its own timing. 1 is the neutral clip. */
export type MotionProfile = {
  /** Duration multiplier. Below 1 is snappier. */
  tempo: number;
  /** Squash and stretch amount. */
  squash: number;
  /** Size of the anticipation move before an action. */
  anticipation: number;
  /** How far an action overshoots before settling. */
  overshoot: number;
  /** Range in ms between idle variations. */
  idleEvery: [number, number];
  /** Idle micro-moves this variant favours, in order of preference. */
  idleMoves: IdleMove[];
};
export type IdleMove =
  | "look"
  | "tilt"
  | "hop"
  | "stretch"
  | "puff"
  | "sway"
  | "blink"
  | "shimmy"
  | "wobble"
  | "peek";

export type BuddyVariant = {
  id: VariantId;
  label: string;
  tagline: string;
  energy: Energy;
  silhouette: Silhouette;
  defaultName: string;
  defaultExpression: "calm" | "bright" | "focused";
  profile: MotionProfile;
};

export const VARIANTS: Record<VariantId, BuddyVariant> = {
  tavi: {
    id: "tavi",
    label: "Tavi",
    tagline: "Quick and curious. Always glancing at what's next.",
    energy: "quick",
    silhouette: "squircle",
    defaultName: "Tavi",
    defaultExpression: "bright",
    profile: {
      tempo: 0.82,
      squash: 1.1,
      anticipation: 0.9,
      overshoot: 1.2,
      idleEvery: [2600, 5200],
      idleMoves: ["shimmy", "look", "hop", "blink", "peek", "tilt"],
    },
  },
  ollo: {
    id: "ollo",
    label: "Ollo",
    tagline: "Cosy and calm. Slow breaths, soft landings.",
    energy: "calm",
    silhouette: "pebble",
    defaultName: "Ollo",
    defaultExpression: "calm",
    profile: {
      tempo: 1.25,
      squash: 0.8,
      anticipation: 0.6,
      overshoot: 0.7,
      idleEvery: [5200, 9000],
      idleMoves: ["wobble", "stretch", "blink", "sway", "peek"],
    },
  },
  zuri: {
    id: "zuri",
    label: "Zuri",
    tagline: "Bold and celebratory. Big wins get big moves.",
    energy: "bold",
    silhouette: "capsule",
    defaultName: "Zuri",
    defaultExpression: "bright",
    profile: {
      tempo: 0.95,
      squash: 1.35,
      anticipation: 1.3,
      overshoot: 1.5,
      idleEvery: [3600, 6400],
      idleMoves: ["shimmy", "puff", "hop", "wobble", "blink"],
    },
  },
  eira: {
    id: "eira",
    label: "Eira",
    tagline: "Elegant and reflective. Poised, unhurried, precise.",
    energy: "reflective",
    silhouette: "lozenge",
    defaultName: "Eira",
    defaultExpression: "focused",
    profile: {
      tempo: 1.15,
      squash: 0.55,
      anticipation: 0.5,
      overshoot: 0.5,
      idleEvery: [4800, 8400],
      idleMoves: ["peek", "sway", "wobble", "blink", "stretch"],
    },
  },
};

export const VARIANT_IDS = Object.keys(VARIANTS) as VariantId[];
export const DEFAULT_VARIANT: VariantId = "tavi";

/** Early builds stored Bell/Cairn/Plate (and before that orb/totem/spark). Map, never lose a choice. */
const LEGACY: Record<string, VariantId> = {
  bell: "tavi",
  orb: "tavi",
  cairn: "ollo",
  totem: "ollo",
  plate: "zuri",
  spark: "zuri",
};
export const normaliseVariant = (value: unknown): VariantId => {
  const v = String(value ?? "");
  return (VARIANT_IDS as string[]).includes(v) ? (v as VariantId) : (LEGACY[v] ?? DEFAULT_VARIANT);
};
