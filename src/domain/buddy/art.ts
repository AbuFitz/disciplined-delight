/**
 * Art packs describe a companion's body so the renderer and animation never depend on specific art.
 * A pack is geometry only. Layers are drawn back to front; the renderer exposes the rig parts
 * (root, body, armL, armR, face, eyes, mouth, acc, shadow) that authored clips animate, so final
 * art can replace a pack without touching behaviour, state, clips or haptics.
 *
 * `plush-v1` is an original authored vector set drawn from the approved direction (compact
 * head-heavy plush forms, dark face window, one accent colour). It is not traced from the
 * reference raster and is not claimed as final production art. `provisional-v0` stays as the
 * neutral fallback.
 */
import type { Silhouette } from "./variants";

/** cream = body, accent = the user's colour, shade/light = soft volume, deep = inner details */
export type Fill = "cream" | "accent" | "shade" | "light" | "deep";
export type Layer = { d: string; fill: Fill; edge?: boolean; opacity?: number; clip?: string };
export type Limb = { layers: Layer[]; pivot: [number, number] };
export type FaceWindow = { x: number; y: number; w: number; h: number; r: number };
export type BodyArt = {
  back: Layer[];
  body: Layer[];
  front?: Layer[];
  limbs?: { l: Limb; r: Limb };
  face: FaceWindow;
  /** Short accent strokes above the face window. */
  ticks: { x: number; y: number; r: number }[];
};
export type BuddyArtPack = {
  id: string;
  /** Provisional packs are labelled as such wherever they are shown. */
  provisional: boolean;
  bodies: Record<Silhouette, BodyArt>;
};

/* ------------------------------ path helpers ------------------------------ */
const f = (n: number) => Math.round(n * 100) / 100;
/** Ellipse as a path. */
export const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;
/** Rounded rectangle as a path. */
export const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
/** A vertical capsule hanging from (cx, top). */
export const cap = (cx: number, top: number, w: number, len: number) => {
  const r = w / 2;
  return `M${f(cx - r)} ${f(top + r)} a${f(r)} ${f(r)} 0 0 1 ${f(w)} 0 V${f(top + len - r)} a${f(r)} ${f(r)} 0 0 1 ${f(-w)} 0Z`;
};
/** Mirror a path's x coordinates around x = 60 (absolute commands only; used for symmetric pairs). */
const mirror = (d: string) =>
  d.replace(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi, (_, cmd: string, rest: string) => {
    const nums = rest.trim().length
      ? rest
          .trim()
          .split(/[\s,]+/)
          .map(Number)
      : [];
    const up = cmd.toUpperCase();
    if (up === "H") return cmd + nums.map((n) => f(120 - n)).join(" ");
    if (up === "V" || up === "Z") return cmd + rest;
    if (up === "A") {
      const out: number[] = [];
      for (let i = 0; i < nums.length; i += 7) {
        const [rx, ry, rot, la, sw, x, y] = nums.slice(i, i + 7) as [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ];
        out.push(rx, ry, rot, la, sw ? 0 : 1, 120 - x, y);
      }
      return cmd + out.join(" ");
    }
    const out: number[] = [];
    for (let i = 0; i < nums.length; i += 2) out.push(f(120 - nums[i]!), nums[i + 1]!);
    return cmd + out.join(" ");
  });

const ticks = (cx: number, y: number) => [
  { x: cx - 7, y: y + 2, r: -18 },
  { x: cx, y, r: 0 },
  { x: cx + 7, y: y + 2, r: 18 },
];
const hand = (cx: number, cy: number): Layer => ({ d: ell(cx, cy, 6, 6), fill: "accent" });
const arm = (cx: number, top: number, len: number, mirrored: boolean): Limb => {
  const x = mirrored ? 120 - cx : cx;
  return {
    pivot: [x, top + 3],
    layers: [{ d: cap(x, top, 11.5, len), fill: "cream", edge: true }, hand(x, top + len - 1)],
  };
};

/* ------------------------------ neutral fallback ------------------------------ */
const plainBody = (body: string, face: FaceWindow, tickY: number): BodyArt => ({
  back: [],
  body: [
    { d: body, fill: "cream", edge: true },
    { d: rr(0, 100, 120, 14, 0), fill: "accent", clip: body },
  ],
  face,
  ticks: ticks(60, tickY),
});
export const PROVISIONAL_PACK: BuddyArtPack = {
  id: "provisional-v0",
  provisional: true,
  bodies: {
    squircle: plainBody(rr(32, 56, 56, 58, 22), { x: 38, y: 72, w: 44, h: 24, r: 12 }, 63),
    pebble: plainBody(rr(24, 68, 72, 46, 23), { x: 32, y: 78, w: 56, h: 22, r: 11 }, 74),
    capsule: plainBody(rr(36, 44, 48, 70, 24), { x: 42, y: 66, w: 36, h: 24, r: 12 }, 54),
    lozenge: plainBody(
      "M60 48 Q90 58 92 86 Q90 110 60 114 Q30 110 28 86 Q30 58 60 48Z",
      { x: 38, y: 74, w: 44, h: 24, r: 12 },
      63,
    ),
  },
};

/* ------------------------------ plush-v1 ------------------------------ */
const shade = (d: string, opacity = 0.16): Layer => ({ d, fill: "shade", opacity });
const glint = (d: string): Layer => ({ d, fill: "light", opacity: 0.7 });
const FEET: Layer[] = [
  { d: ell(46, 113, 10.5, 5.5), fill: "accent" },
  { d: ell(74, 113, 10.5, 5.5), fill: "accent" },
];

const squircle: BodyArt = {
  // Quick and curious: swept hood with a crescent fin and a fan tail.
  back: [
    { d: "M36 46 C18 40 14 20 34 8 C28 20 32 32 48 40Z", fill: "accent" },
    { d: "M50 98 C32 96 20 104 18 114 C30 116 44 112 56 106Z", fill: "accent" },
  ],
  body: [
    { d: rr(42, 80, 36, 33, 15), fill: "cream", edge: true },
    ...FEET,
    shade("M42 100 Q60 108 78 100 V105 Q78 113 62 113 H58 Q42 113 42 105Z"),
    {
      d: "M20 58 C20 32 40 16 62 16 C86 16 100 34 100 58 C100 78 84 90 60 90 C36 90 20 78 20 58Z",
      fill: "cream",
      edge: true,
    },
    shade("M30 76 C42 90 74 92 92 76 C94 84 80 92 60 92 C40 92 28 86 30 76Z", 0.18),
    glint("M30 40 C36 28 48 22 60 22 C54 24 44 30 40 40Z"),
  ],
  limbs: { l: arm(38, 86, 17, false), r: arm(38, 86, 17, true) },
  face: { x: 30, y: 40, w: 60, h: 32, r: 16 },
  ticks: ticks(60, 31),
};

const pebble: BodyArt = {
  // Cosy and calm: round head, soft floppy ears, a belly patch.
  back: [
    { d: "M28 48 C10 42 4 64 16 80 C24 84 30 72 32 58Z", fill: "accent" },
    { d: mirror("M28 48 C10 42 4 64 16 80 C24 84 30 72 32 58Z"), fill: "accent" },
  ],
  body: [
    { d: rr(38, 80, 44, 34, 17), fill: "cream", edge: true },
    { d: ell(60, 100, 14, 10), fill: "accent" },
    ...FEET.map((l, i) => ({ ...l, d: ell(i ? 76 : 44, 113, 11.5, 5.5) })),
    {
      d: "M16 58 C16 34 36 18 60 18 C84 18 104 34 104 58 C104 78 86 90 60 90 C34 90 16 78 16 58Z",
      fill: "cream",
      edge: true,
    },
    shade("M26 76 C40 92 80 92 94 76 C98 84 82 94 60 94 C38 94 22 86 26 76Z", 0.18),
    glint("M28 40 C34 28 46 22 58 22 C50 26 42 32 38 42Z"),
  ],
  limbs: { l: arm(36, 87, 16, false), r: arm(36, 87, 16, true) },
  face: { x: 28, y: 42, w: 64, h: 32, r: 16 },
  ticks: ticks(60, 33),
};

const capsule: BodyArt = {
  // Bold and celebratory: pointed ears, a tail, a belly patch, ready to cheer.
  back: [{ d: "M78 104 C102 108 112 92 104 78 C102 90 94 98 80 98Z", fill: "accent" }],
  body: [
    { d: rr(42, 80, 36, 34, 15), fill: "cream", edge: true },
    { d: ell(60, 100, 12, 10), fill: "accent" },
    ...FEET,
    { d: "M26 46 C23 30 25 16 30 6 C40 11 50 19 54 28Z", fill: "cream", edge: true },
    { d: mirror("M26 46 C23 30 25 16 30 6 C40 11 50 19 54 28Z"), fill: "cream", edge: true },
    { d: "M31 32 C30 24 31 18 33 13 C38 17 43 22 46 27Z", fill: "accent" },
    { d: mirror("M31 32 C30 24 31 18 33 13 C38 17 43 22 46 27Z"), fill: "accent" },
    {
      d: "M20 62 C20 38 38 22 60 22 C82 22 100 38 100 62 C100 80 84 90 60 90 C36 90 20 80 20 62Z",
      fill: "cream",
      edge: true,
    },
    shade("M30 78 C42 92 78 92 90 78 C92 86 80 94 60 94 C40 94 28 88 30 78Z", 0.18),
    glint("M30 44 C36 32 48 26 60 26 C52 30 44 36 40 46Z"),
  ],
  limbs: { l: arm(40, 86, 17, false), r: arm(40, 86, 17, true) },
  face: { x: 30, y: 42, w: 60, h: 34, r: 17 },
  ticks: ticks(60, 33),
};

const lozenge: BodyArt = {
  // Elegant and reflective: slender body, a sweeping ribbon tail, a small crest.
  back: [
    {
      d: "M74 104 C106 104 114 76 100 58 C96 52 98 44 106 44 C102 50 104 56 108 62 C122 84 104 114 78 114Z",
      fill: "accent",
    },
    { d: "M34 92 C18 90 8 100 10 110 C22 110 32 106 40 102Z", fill: "accent" },
  ],
  body: [
    { d: rr(46, 80, 28, 34, 13), fill: "cream", edge: true },
    { d: ell(50, 113, 9, 5), fill: "accent" },
    { d: ell(70, 113, 9, 5), fill: "accent" },
    { d: "M50 24 C48 10 56 4 62 12 C68 4 76 10 70 24Z", fill: "accent" },
    {
      d: "M26 58 C26 36 42 22 60 22 C78 22 94 36 94 58 C94 76 80 88 60 88 C40 88 26 76 26 58Z",
      fill: "cream",
      edge: true,
    },
    shade("M34 74 C44 88 76 88 86 74 C88 82 76 90 60 90 C44 90 32 84 34 74Z", 0.18),
    glint("M34 42 C38 32 48 26 58 26 C52 30 44 36 42 44Z"),
  ],
  limbs: { l: arm(42, 86, 16, false), r: arm(42, 86, 16, true) },
  face: { x: 34, y: 42, w: 52, h: 30, r: 15 },
  ticks: ticks(60, 33),
};

export const PLUSH_PACK: BuddyArtPack = {
  id: "plush-v1",
  // An original first authored set, labelled as such until final art is approved.
  provisional: true,
  bodies: { squircle, pebble, capsule, lozenge },
};

let active: BuddyArtPack = PLUSH_PACK;
/** Swap in approved production art. */
export const registerArtPack = (pack: BuddyArtPack) => {
  active = pack;
};
export const getArtPack = () => active;
