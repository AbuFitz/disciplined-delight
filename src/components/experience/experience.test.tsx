import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COPY, DURATION, SCHEDULE, SCENES, reduce, stateAt, INITIAL } from "./model";
import { ProtoA } from "./proto-a";
import { ProtoB } from "./proto-b";
import { ProtoC } from "./proto-c";

const protos = { A: ProtoA, B: ProtoB, C: ProtoC };
const noop = () => undefined;
const html = (
  P: typeof ProtoA,
  t: number,
  extra: Partial<{ reduced: boolean; mode: "dark" | "light"; low: boolean }> = {},
) =>
  renderToStaticMarkup(
    <P
      s={stateAt(t)}
      act={noop}
      reduced={extra.reduced ?? false}
      mode={extra.mode ?? "dark"}
      low={extra.low ?? false}
    />,
  );

describe("experience model", () => {
  it("runs a 10 to 15 second schedule in time order and visits every scene", () => {
    const times = SCHEDULE.map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(DURATION).toBeGreaterThanOrEqual(10_000);
    expect(DURATION).toBeLessThanOrEqual(15_500);
    expect(Math.max(...times)).toBeLessThanOrEqual(DURATION);
    const seen = new Set(SCHEDULE.map((s) => stateAt(s.at).scene));
    for (const sc of SCENES) expect(seen.has(sc.id), sc.id).toBe(true);
  });

  it("is a pure fold: seeking gives the same state as playing through", () => {
    let played = INITIAL;
    for (const step of SCHEDULE) played = reduce(played, step.action);
    expect(stateAt(DURATION)).toEqual(played);
    expect(stateAt(0).scene).toBe("arrive");
    expect(stateAt(7000).preview).toBe(true);
    expect(stateAt(8000)).toMatchObject({ applied: true, undoOpen: true, scene: "now" });
    expect(stateAt(13000)).toMatchObject({ scene: "rest", setDone: true });
    expect(stateAt(DURATION).restDone).toBe(true);
  });

  it("never applies a consequential change without a confirm, and undo restores it", () => {
    let s = INITIAL;
    s = reduce(s, { type: "preview", open: true });
    expect(s.applied).toBe(false);
    s = reduce(s, { type: "confirm" });
    expect(s.applied).toBe(true);
    s = reduce(s, { type: "undo" });
    expect(s.applied).toBe(false);
    // a cancelled preview changes nothing
    const cancelled = reduce(reduce(INITIAL, { type: "preview", open: true }), {
      type: "preview",
      open: false,
    });
    expect(cancelled.applied).toBe(false);
  });

  it("emits haptic-worthy events only for choices, confirmations and set milestones", () => {
    const kinds = SCHEDULE.map((s) => reduce(INITIAL, s.action).event?.kind).filter(Boolean);
    expect(new Set(kinds)).toEqual(
      new Set(["selection", "acknowledge", "set_logged", "rest_finished"]),
    );
  });
});

describe("the three prototypes show identical content", () => {
  const moments: [number, string[]][] = [
    [800, [COPY.date, "Good morning,", "Sam."]],
    [3000, [COPY.question, ...COPY.ready.map((r) => r.label)]],
    [
      7000,
      [
        COPY.planTitle,
        COPY.command,
        COPY.preview.title,
        ...COPY.preview.lines,
        COPY.preview.confirm,
        COPY.preview.cancel,
      ],
    ],
    [9000, [COPY.applied, COPY.undo, COPY.begin]],
    [12000, [COPY.gym.exercise, COPY.gym.cue, COPY.gym.done, COPY.gym.load]],
    [13500, [COPY.rest.label, COPY.rest.next]],
  ];
  for (const [name, P] of Object.entries(protos))
    for (const [t, strings] of moments)
      it(`${name} at ${t}ms contains the shared copy`, () => {
        const out = html(P, t)
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'");
        for (const s of strings) expect(out, s).toContain(s);
      });
});

describe("accessibility and fallbacks", () => {
  for (const [name, P] of Object.entries(protos)) {
    it(`${name}: inactive panes are inert and hidden from assistive tech; one live pane at a time`, () => {
      const out = html(P, 3000);
      const panes =
        out.match(/<section class="x[abc]-pane[^"]*" data-active="(true|false)"[^>]*>/g) ?? [];
      expect(panes.length).toBe(5);
      expect(panes.filter((p) => p.includes('data-active="true"'))).toHaveLength(1);
      for (const p of panes.filter((p) => p.includes('data-active="false"'))) {
        expect(p).toContain("inert");
        expect(p).toContain('aria-hidden="true"');
      }
    });
    it(`${name}: exposes a labelled Buddy control and a confirm path with undo`, () => {
      const out = html(P, 7000);
      expect(out).toContain("Ask Buddy: Short on time?");
      expect(out).toContain('role="dialog"');
      expect(html(P, 9000)).toContain('role="status"');
    });
    it(`${name}: carries reduced-motion and low-power flags for CSS`, () => {
      expect(html(P, 3000, { reduced: true })).toContain('data-reduced="true"');
      expect(html(P, 3000, { low: true })).toContain('data-low="true"');
      expect(html(P, 3000, { mode: "light" })).toContain('data-mode="light"');
    });
  }
});
