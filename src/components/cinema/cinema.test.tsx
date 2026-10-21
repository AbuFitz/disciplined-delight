import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COPY, DURATION, INITIAL, NODES, PATH_D, SCENES, SCHEDULE, reduce, stateAt } from "./model";
import { Cinema } from "./cinema";

const noop = () => undefined;
const html = (
  t: number,
  extra: Partial<{ reduced: boolean; mode: "dark" | "light"; low: boolean }> = {},
) =>
  renderToStaticMarkup(
    <Cinema
      s={stateAt(t)}
      act={noop}
      reduced={extra.reduced ?? false}
      mode={extra.mode ?? "dark"}
      low={extra.low ?? false}
      time="dawn"
      world="cobalt"
    />,
  );

describe("cinema model", () => {
  it("is a timed, ordered schedule that visits every scene and ends in the recovery story", () => {
    const times = SCHEDULE.map((s) => s.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(Math.max(...times)).toBeLessThanOrEqual(DURATION);
    const seen = new Set(SCHEDULE.map((s) => stateAt(s.at).scene));
    for (const sc of SCENES) expect(seen.has(sc.id), sc.id).toBe(true);
    expect(stateAt(DURATION).scene).toBe("story");
  });

  it("seeking is a pure fold of the schedule", () => {
    let played = INITIAL;
    for (const step of SCHEDULE) played = reduce(played, step.action);
    expect(stateAt(DURATION)).toEqual(played);
  });

  it("never rewrites the session without a preview and a confirm, and undo restores it", () => {
    expect(stateAt(13_500).assist).toBe("preview");
    expect(stateAt(13_500).applied).toBe(false);
    expect(stateAt(15_700)).toMatchObject({ assist: "applied", applied: true, undoOpen: true });
    const undone = reduce(stateAt(15_700), { type: "undo" });
    expect(undone.applied).toBe(false);
    const cancelled = reduce(stateAt(13_500), { type: "cancel" });
    expect(cancelled.applied).toBe(false);
    expect(cancelled.assist).toBe("closed");
  });

  it("emits haptic events only for choices, confirmations and set milestones", () => {
    const kinds = new Set(
      SCHEDULE.map((s) => reduce(INITIAL, s.action).event?.kind).filter(Boolean),
    );
    expect(kinds).toEqual(new Set(["selection", "acknowledge", "set_logged", "rest_finished"]));
  });

  it("keeps the Dayline path and node coordinates in one 100 x 34 space", () => {
    expect(PATH_D.startsWith("M5 28")).toBe(true);
    for (const [x, y] of NODES) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(34);
    }
  });
});

describe("cinema scene", () => {
  it("shows the shared copy at each moment", () => {
    const unescape = (h: string) => h.replaceAll("&amp;", "&");
    expect(html(3000)).toContain(COPY.question);
    expect(unescape(html(7000))).toContain(COPY.planTitle);
    const gym = html(12_000);
    expect(gym).toContain(COPY.gym.exercise);
    expect(gym).toContain(COPY.assistant.command.slice(0, 5));
    const preview = html(14_000);
    for (const r of COPY.assistant.rows) expect(preview).toContain(r.from);
    expect(html(DURATION)).toContain(COPY.story.recovery);
  });

  it("hides inactive layers from assistive tech and keeps one labelled assistant entry", () => {
    const out = html(3000);
    expect(out).toMatch(/cn-gym" data-active="false"[^>]*inert/);
    expect(out).toContain(`aria-label="${COPY.assistant.name}: ${COPY.assistant.invoke}"`);
    expect(out).toContain('role="slider"');
    expect(html(14_000)).toContain('role="dialog"');
  });

  it("carries reduced-motion, low-power, theme, time and world flags for CSS", () => {
    const out = html(3000, { reduced: true, low: true, mode: "light" });
    expect(out).toContain('data-reduced="true"');
    expect(out).toContain('data-low="true"');
    expect(out).toContain('data-mode="light"');
    expect(out).toContain('data-time="dawn"');
    expect(out).toContain('data-world="cobalt"');
  });
});
