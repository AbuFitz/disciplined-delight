import type { AccentWorld } from "./theme";

export const WORLDS: { id: AccentWorld; name: string; note: string; swatch: [string, string] }[] = [
  { id: "cobalt", name: "Cobalt", note: "Clear and cool", swatch: ["#78a9ff", "#1558b0"] },
  { id: "mint", name: "Mint signal", note: "Fresh and bright", swatch: ["#4fd9a0", "#0c6a49"] },
  { id: "violet", name: "Violet", note: "Calm and focused", swatch: ["#b9a1ff", "#6841a7"] },
  { id: "coral", name: "Ember coral", note: "Warm and driven", swatch: ["#ff9a83", "#a93824"] },
  { id: "amber", name: "Amber", note: "Golden and steady", swatch: ["#f2c66d", "#7b5200"] },
  { id: "rose", name: "Rose", note: "Soft and personal", swatch: ["#f2a0bd", "#9b315a"] },
  { id: "slate", name: "Slate", note: "Quiet monochrome", swatch: ["#c5ced4", "#394b55"] },
];
