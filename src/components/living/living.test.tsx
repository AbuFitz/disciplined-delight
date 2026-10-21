import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Canvas,
  DataRow,
  Dayline,
  EmptyCanvas,
  GLYPH_LABEL,
  GLYPH_NAMES,
  Glyph,
  MediaTile,
  MetricStrip,
  Stage,
} from "./index";

const nodes = [
  { id: "a", label: "Readiness", value: "Self-report", state: "done" as const },
  { id: "b", label: "Now", value: "Start", state: "current" as const },
  { id: "c", label: "Recovery", state: "unknown" as const },
];

describe("Living Instrument primitives", () => {
  it("has twelve authored glyphs, each with a visible label, decorative beside text", () => {
    expect(GLYPH_NAMES).toHaveLength(12);
    for (const n of GLYPH_NAMES) {
      expect(GLYPH_LABEL[n].length).toBeGreaterThan(2);
      expect(renderToStaticMarkup(<Glyph name={n} />)).toContain('aria-hidden="true"');
      expect(renderToStaticMarkup(<Glyph name={n} label />)).toContain(
        `aria-label="${GLYPH_LABEL[n]}"`,
      );
    }
  });

  it("Dayline is a tab list with a roving tabindex and spoken state", () => {
    const html = renderToStaticMarkup(
      <Dayline nodes={nodes} selectedId="b" onSelect={() => undefined} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toMatch(/id="dl-b"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(html).toMatch(/id="dl-a"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
    expect(html).toContain(", now");
    expect(html).toContain(", not recorded");
  });

  it("MetricStrip shows unknown as a dash, never zero, and keeps change as text", () => {
    const html = renderToStaticMarkup(
      <MetricStrip
        metrics={[
          { label: "Sleep", value: 0, state: "unknown" },
          { label: "Bench", value: "62.5", unit: "kg", delta: "+2.5 vs last" },
        ]}
      />,
    );
    expect(html).toContain("—");
    expect(html).not.toContain(">0<");
    expect(html).toContain("+2.5 vs last");
  });

  it("EmptyCanvas announces errors assertively and loading as busy", () => {
    expect(renderToStaticMarkup(<EmptyCanvas kind="error" title="x" />)).toContain('role="alert"');
    const loading = renderToStaticMarkup(<EmptyCanvas kind="loading" title="x" />);
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-busy="true"');
  });

  it("MediaTile falls back to a poster with a text cue when there is no media, and marks loading", () => {
    const none = renderToStaticMarkup(<MediaTile name="Row" cue="Back · cable" />);
    expect(none).toContain("lv-poster");
    expect(none).toContain("Back · cable");
    expect(renderToStaticMarkup(<MediaTile name="Row" loading />)).toContain('aria-busy="true"');
  });

  it("Stage and Canvas render one heading each; DataRow is read-only without a target", () => {
    const html = renderToStaticMarkup(
      <Canvas title="Today">
        <Stage title="Back & biceps" />
        <DataRow label="Plain" value="12" />
      </Canvas>,
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.match(/<h2/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
  });
});

describe("Living Instrument styles follow the contract", () => {
  const css = readFileSync("src/components/living/living.css", "utf8");
  it("uses the radius scale only (6/12/20 via tokens) and no ambient animation", () => {
    expect(css).not.toMatch(/animation\s*:/);
    for (const m of css.matchAll(/border-radius:\s*([^;]+);/g)) {
      expect([
        "var(--r-control)",
        "var(--r-media)",
        "var(--r-stage)",
        "0",
        "50%",
        "4px",
        "calc(var(--r-control) - 2px)",
      ]).toContain(m[1]!.trim());
    }
  });
  it("only the dock uses backdrop blur (glass belongs to Utility)", () => {
    const blurs = [...css.matchAll(/([^{}]+)\{[^}]*backdrop-filter:\s*blur/g)].map((m) =>
      m[1]!.trim(),
    );
    expect(blurs.every((s) => s.includes(".lv-dock"))).toBe(true);
  });
});
