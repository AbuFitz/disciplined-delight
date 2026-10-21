/** The authored VAYVOR glyph family. 24px grid, 1.75 stroke, round caps. */
export const GLYPH_NAMES = [
  "dayline",
  "train",
  "fuel",
  "recover",
  "body",
  "mind",
  "meaning",
  "circle",
  "buddy",
  "readiness",
  "adaptation",
  "gym",
] as const;
export type GlyphName = (typeof GLYPH_NAMES)[number];

/** Visible labels. Unfamiliar symbols are never shown without one. */
export const GLYPH_LABEL: Record<GlyphName, string> = {
  dayline: "Dayline",
  train: "Train",
  fuel: "Fuel",
  recover: "Recover",
  body: "Body",
  mind: "Mind",
  meaning: "Meaning",
  circle: "Circle",
  buddy: "Buddy",
  readiness: "Readiness",
  adaptation: "Adaptation",
  gym: "Gym Mode",
};
