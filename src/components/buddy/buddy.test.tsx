import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuddyCharacter } from "./BuddyCharacter";
import { BuddySetup } from "./BuddySetup";
import { BUDDY_STATES, POSES } from "@/domain/buddy/state";
import { PLUSH_PACK, PROVISIONAL_PACK, registerArtPack } from "@/domain/buddy/art";
import { VARIANTS, VARIANT_IDS } from "@/domain/buddy/variants";
import { DEFAULT_COMPANION } from "@/domain/companion";
import { readFileSync } from "node:fs";

const html = (props: Partial<Parameters<typeof BuddyCharacter>[0]> = {}) =>
  renderToStaticMarkup(<BuddyCharacter variant="tavi" state="idle" {...props} />);

describe("Companion renderer", () => {
  it("renders four variants with distinct silhouettes on the same face", () => {
    const out = VARIANT_IDS.map((variant) => html({ variant }));
    expect(new Set(out).size).toBe(4);
    for (const id of VARIANT_IDS) {
      const o = html({ variant: id });
      expect(o).toContain(`data-variant="${id}"`);
      expect(o).toContain(`data-silhouette="${VARIANTS[id].silhouette}"`);
      expect(o).toContain("bd-window");
    }
    expect(new Set(VARIANT_IDS.map((id) => VARIANTS[id].silhouette)).size).toBe(4);
  });
  it("exposes the rig parts any replacement art must provide", () => {
    const o = html();
    for (const part of ["root", "body", "face", "eyes", "mouth", "acc", "shadow"])
      expect(o).toContain(`data-part="${part}"`);
  });
  it("is labelled as an unfinished first authored set, and the neutral pack stays available", () => {
    expect(html()).toContain('data-provisional="true"');
    expect(html()).toContain('data-art="plush-v1"');
    registerArtPack(PROVISIONAL_PACK);
    try {
      expect(html()).toContain('data-art="provisional-v0"');
    } finally {
      registerArtPack(PLUSH_PACK);
    }
  });
  it("draws limbs as separately animated parts in the plush set", () => {
    const o = html();
    expect(o).toContain('data-part="armL"');
    expect(o).toContain('data-part="armR"');
  });
  it("uses none of the rejected names", () => {
    for (const id of VARIANT_IDS) expect(VARIANTS[id].label).not.toMatch(/bell|cairn|plate|buddy/i);
    expect(html()).not.toMatch(/bell|cairn|plate/i);
  });
  it("exposes every state as visible, testable attributes", () => {
    for (const state of BUDDY_STATES) {
      const out = html({ state });
      const pose = POSES[state];
      expect(out).toContain(`data-state="${state}"`);
      expect(out).toContain(`data-eyes="${pose.eyes}"`);
      expect(out).toContain(`data-mouth="${pose.mouth}"`);
      expect(out).toContain(`data-accessory="${pose.accessory}"`);
    }
  });
  it("labels itself for assistive tech, or hides when a control already names it", () => {
    expect(html({ name: "Pip", state: "rest" })).toContain('aria-label="Pip, sleeping"');
    const decorative = html({ decorative: true });
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).not.toContain("aria-label");
  });
  it("passes the motion level and palette through for CSS", () => {
    expect(html({ motion: "off" })).toContain('data-motion="off"');
    expect(html({ motion: "full", palette: "coral" })).toContain('data-palette="coral"');
    expect(html()).toContain('data-palette="world"');
  });
  it("can be re-skinned by registering another art pack without touching behaviour", () => {
    const custom = {
      ...PLUSH_PACK,
      id: "test-pack",
      provisional: false,
    };
    registerArtPack(custom);
    try {
      expect(html()).toContain('data-art="test-pack"');
      expect(html()).toContain('data-provisional="false"');
    } finally {
      registerArtPack(PLUSH_PACK);
    }
  });
});

describe("Buddy styles", () => {
  const css = readFileSync(new URL("./buddy.css", import.meta.url), "utf8");
  it("keeps motion out of CSS: clips are authored in code and only run when motion is on", () => {
    const character = readFileSync(new URL("./buddy-character.css", import.meta.url), "utf8");
    expect(character).not.toMatch(/@keyframes|animation:/);
  });
  it("never positions Buddy over content: no fixed or absolute placement for its shell parts", () => {
    for (const cls of ["buddy-sheet", "buddy-panel", "buddy-column"]) {
      const rule = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
      expect(rule, cls).not.toMatch(/position:\s*(fixed|absolute)/);
    }
    expect(css).not.toMatch(/\.buddy-dock|\.buddy-bubble|--dock-lift/);
  });
  it("reserves the bottom stack out of the scrolling area on small screens", () => {
    const global = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
    expect(global).toMatch(
      /html\[data-shell="bars"\] body\s*\{[^}]*inset:\s*0 0 var\(--reserve-bottom/,
    );
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
      "Tavi",
      "Ollo",
      "Zuri",
      "Eira",
      "Haptic feedback",
      "Provisional shapes",
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
