import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");

describe("global accessibility CSS", () => {
  it("neutralises motion for people who request reduced motion", () => {
    const reduced = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/,
    )?.[1];

    expect(reduced).toBeDefined();
    expect(reduced).toContain("*,");
    expect(reduced).toContain("*::before,");
    expect(reduced).toContain("*::after");
    expect(reduced).toMatch(/animation-duration:\s*0\.00?1ms\s*!important/);
    expect(reduced).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(reduced).toMatch(/transition-duration:\s*0\.00?1ms\s*!important/);
    expect(reduced).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });
});
