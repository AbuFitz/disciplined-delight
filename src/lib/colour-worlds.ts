import type { AccentWorld } from "./theme";

export const WORLDS: { id: AccentWorld; name: string; note: string; swatch: [string, string] }[] = [
  { id: "cobalt", name: "Cobalt", note: "Clear and cool", swatch: ["#78a9ff", "#1558b0"] },
  { id: "citrus", name: "Citrus", note: "Golden and steady", swatch: ["#f2c66d", "#7b5200"] },
  { id: "coral", name: "Coral", note: "Warm and driven", swatch: ["#ff9a83", "#a93824"] },
  { id: "violet", name: "Violet", note: "Calm and focused", swatch: ["#b9a1ff", "#6841a7"] },
  { id: "rose", name: "Rose", note: "Soft and personal", swatch: ["#f2a0bd", "#9b315a"] },
  { id: "ice", name: "Ice", note: "Crisp and light", swatch: ["#8fd3ea", "#0a6a85"] },
  { id: "slate", name: "Slate", note: "Quiet monochrome", swatch: ["#c5ced4", "#394b55"] },
];
