/**
 * Art packs describe a companion's body so the renderer and animation never depend on specific art.
 * A pack is geometry only: body path, trim region, face window and forehead ticks per silhouette.
 * The renderer exposes the rig parts (root, body, face, eyes, mouth, acc, shadow) that clips animate.
 *
 * `provisional-v0` is deliberately neutral. It is NOT the production character. The approved
 * four-variant exploration is reference only (docs/design-reference/); when final art is supplied,
 * register a new pack (or replace this data) and nothing in behaviour, clips or haptics changes.
 */
import type { Silhouette } from "./variants";

export type FaceWindow = { x: number; y: number; w: number; h: number; r: number };
export type BodyArt = {
  /** SVG path for the body silhouette in a 120 x 124 box with its base near y = 114. */
  body: string;
  /** Accent trim band along the base, clipped to the body. */
  trim: { y: number; h: number };
  face: FaceWindow;
  /** Three short forehead ticks, as small accent strokes. */
  ticks: { x: number; y: number; r: number }[];
};
export type BuddyArtPack = {
  id: string;
  /** Provisional packs are labelled as such wherever they are shown. */
  provisional: boolean;
  bodies: Record<Silhouette, BodyArt>;
};

const ticks = (cx: number, y: number) => [
  { x: cx - 7, y: y + 2, r: -18 },
  { x: cx, y, r: 0 },
  { x: cx + 7, y: y + 2, r: 18 },
];

export const PROVISIONAL_PACK: BuddyArtPack = {
  id: "provisional-v0",
  provisional: true,
  bodies: {
    squircle: {
      body: "M54 56 H66 Q88 56 88 78 V92 Q88 114 66 114 H54 Q32 114 32 92 V78 Q32 56 54 56Z",
      trim: { y: 100, h: 14 },
      face: { x: 38, y: 72, w: 44, h: 24, r: 12 },
      ticks: ticks(60, 63),
    },
    pebble: {
      body: "M47 68 H73 Q96 68 96 91 Q96 114 73 114 H47 Q24 114 24 91 Q24 68 47 68Z",
      trim: { y: 100, h: 14 },
      face: { x: 32, y: 78, w: 56, h: 22, r: 11 },
      ticks: ticks(60, 74),
    },
    capsule: {
      body: "M60 44 Q84 44 84 68 V90 Q84 114 60 114 Q36 114 36 90 V68 Q36 44 60 44Z",
      trim: { y: 100, h: 14 },
      face: { x: 42, y: 66, w: 36, h: 24, r: 12 },
      ticks: ticks(60, 54),
    },
    lozenge: {
      body: "M60 48 Q90 58 92 86 Q90 110 60 114 Q30 110 28 86 Q30 58 60 48Z",
      trim: { y: 100, h: 14 },
      face: { x: 38, y: 74, w: 44, h: 24, r: 12 },
      ticks: ticks(60, 63),
    },
  },
};

let active: BuddyArtPack = PROVISIONAL_PACK;
/** Swap in approved production art. */
export const registerArtPack = (pack: BuddyArtPack) => {
  active = pack;
};
export const getArtPack = () => active;
