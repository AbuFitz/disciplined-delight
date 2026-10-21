import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENT_WORLDS } from "./theme";
import { contrastRatio } from "./colour-contrast";

const css = readFileSync("src/styles.css", "utf8");
const block = (selector: string) => {
  const i = css.indexOf(selector + " {");
  if (i < 0) return "";
  return css.slice(i, css.indexOf("}", i));
};
const token = (b: string, name: string) =>
  b.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`))?.[1];

const FOUNDATIONS = {
  dark: ['[data-theme="dark"]', '[data-theme="dark"][data-foundation="graphite"]'],
  light: ['[data-theme="light"]', '[data-theme="light"][data-foundation="fog"]'],
} as const;

describe("colour worlds and foundations keep contrast", () => {
  for (const mode of ["dark", "light"] as const) {
    const base = block(`[data-theme="${mode}"]`) || block(':root,\n[data-theme="dark"]');
    const bg = token(base, "background")!;
    for (const world of ACCENT_WORLDS) {
      it(`${world} on ${mode}: label on accent >= 4.5:1, accent on page >= 3:1`, () => {
        const b = block(`[data-theme="${mode}"][data-accent="${world}"]`);
        // Cobalt is also the default: it falls back to the base block's primary tokens.
        const primary = token(b, "primary") ?? token(base, "primary")!;
        const fg = token(b, "primary-foreground") ?? token(base, "primary-foreground")!;
        expect(contrastRatio(primary, fg), "label on accent").toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(primary, bg), "accent on page").toBeGreaterThanOrEqual(3);
      });
    }
  }
  it("every foundation has readable body text and muted text", () => {
    for (const mode of ["dark", "light"] as const) {
      const base = block(`[data-theme="${mode}"]`) || block(':root,\n[data-theme="dark"]');
      for (const sel of FOUNDATIONS[mode]) {
        const b = block(sel) || base;
        const bg = token(b, "background") ?? token(base, "background")!;
        const surface = token(b, "surface") ?? token(base, "surface")!;
        const fg = token(b, "foreground") ?? token(base, "foreground")!;
        const muted = token(b, "muted-foreground") ?? token(base, "muted-foreground")!;
        expect(contrastRatio(fg, bg), `${sel} text`).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(muted, bg), `${sel} muted on page`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(muted, surface), `${sel} muted on surface`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });
  it("semantic colours do not change with the world", () => {
    for (const world of ACCENT_WORLDS) {
      const b = block(`[data-theme="dark"][data-accent="${world}"]`);
      expect(b).not.toMatch(/--(destructive|warn):/);
    }
  });
});
