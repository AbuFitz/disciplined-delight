import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuddyCharacter } from "./BuddyCharacter";
import { BuddySetup } from "./BuddySetup";
import { BUDDY_STATES, POSES } from "@/domain/buddy/state";
import { DEFAULT_COMPANION } from "@/domain/companion";
import { readFileSync } from "node:fs";

const html = (props: Partial<Parameters<typeof BuddyCharacter>[0]> = {}) =>
  renderToStaticMarkup(<BuddyCharacter form="bell" state="idle" {...props} />);

describe("Buddy character", () => {
  it("renders all three authored forms as distinct SVG bodies", () => {
    const bodies = (["bell", "cairn", "plate"] as const).map((form) => html({ form }));
    expect(new Set(bodies).size).toBe(3);
    expect(bodies[0]).toContain("bd-handle");
    expect(bodies[1]).toContain("bd-cap");
    expect(bodies[2]).toContain("bd-hole");
  });
  it("exposes every state as visible, testable attributes", () => {
    for (const state of BUDDY_STATES) {
      const out = html({ state });
      const pose = POSES[state];
      expect(out).toContain(`data-state="${state}"`);
      expect(out).toContain(`data-eyes="${pose.eyes}"`);
      expect(out).toContain(`data-mouth="${pose.mouth}"`);
      expect(out).toContain(`data-arms="${pose.arms}"`);
      expect(out).toContain(`data-accessory="${pose.accessory}"`);
    }
  });
  it("labels itself for assistive tech, or hides when a control already names it", () => {
    expect(html({ name: "Pip", state: "rest" })).toContain('aria-label="Pip, resting"');
    const decorative = html({ decorative: true });
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).not.toContain("aria-label");
  });
  it("passes the motion level and palette through for CSS", () => {
    expect(html({ motion: "off" })).toContain('data-motion="off"');
    expect(html({ motion: "full", palette: "coral" })).toContain('data-palette="coral"');
    expect(html()).toContain('data-palette="world"');
  });
});

describe("Buddy styles", () => {
  const css = readFileSync(new URL("./buddy.css", import.meta.url), "utf8");
  it("only animates when reduced motion is not requested and motion is not off", () => {
    const start = css.indexOf("@media (prefers-reduced-motion: no-preference)");
    const body = css.slice(start, css.indexOf("@keyframes bd-bob"));
    const rules = [...body.matchAll(/([^{}]+)\{([^{}]*animation:[^{}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(20);
    for (const [, selector] of rules)
      expect(selector).toMatch(/data-motion="full"|not\(\[data-motion="off"\]\)/);
  });
  it("pauses animation when off-screen", () => {
    expect(css).toContain('[data-live="false"]');
  });
  it("keeps the dock clear via a measured lift variable", () => {
    expect(css).toMatch(/bottom: calc\(var\(--dock-base\) \+ var\(--dock-lift\)\)/);
  });
});

describe("Buddy setup", () => {
  const out = renderToStaticMarkup(
    <BuddySetup value={{ ...DEFAULT_COMPANION }} onChange={() => {}} />,
  );
  it("offers every customisation the brief asks for", () => {
    for (const text of [
      "Show Buddy",
      "Who joins you",
      "Bell",
      "Cairn",
      "Plate",
      "Name",
      "Match my colour world",
      "Expression",
      "Personality",
      "Coaching tone",
      "Intensity",
      "How often I speak up",
      "Movement",
      "Celebrations",
      "Sound",
      "Where Buddy lives",
      "reduced-motion",
    ])
      expect(out).toContain(text);
  });
  it("lets the person opt out without hiding the way back", () => {
    const off = renderToStaticMarkup(
      <BuddySetup value={{ ...DEFAULT_COMPANION, enabled: false }} onChange={() => {}} />,
    );
    expect(off).toContain("switch it on later in Settings");
    expect(off).not.toContain("Who joins you");
  });
  it("defaults to silent and never assumes a belief", () => {
    expect(DEFAULT_COMPANION.sound).toBe("off");
    expect(out).not.toMatch(/pray|faith|islam|god/i);
  });
});
