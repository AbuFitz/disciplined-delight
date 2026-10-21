import { describe, expect, it } from "vitest";
import type { MediaItem } from "./catalogue";
import { coverFrame, describeMedia, frameRole, montageAlt, workoutMontage } from "./exercise-media";

const lic = { id: "x", short: "RepDB Free Tier 1.0", url: "https://example.test" };
const img = (id: string, url = `/${id}.webp`): MediaItem => ({
  id,
  kind: "image",
  url,
  isMain: false,
  licence: lic,
  author: "RepDB",
});

describe("media truthfulness", () => {
  it("calls two RepDB stills illustrated steps and never motion", () => {
    const d = describeMedia([img("repdb-img:squat:peak"), img("repdb-img:squat:start")]);
    expect(d.mode).toBe("steps");
    expect(d.badge).toBe("2 illustrated steps");
    expect(d.note).toMatch(/not an animation/i);
    expect(d.frames.map((f) => f.role)).toEqual(["start", "peak"]);
    expect(d.motion).toBeUndefined();
  });
  it("one still is an illustration, none is honest about it", () => {
    expect(describeMedia([img("wger:1")]).mode).toBe("still");
    const none = describeMedia([]);
    expect(none.mode).toBe("none");
    expect(none.badge).toBe("No demo yet");
    expect(describeMedia(undefined).mode).toBe("none");
  });
  it("only animation or video items count as motion", () => {
    const anim: MediaItem = { ...img("m"), kind: "animation", poster: "/p.webp" };
    const d = describeMedia([img("repdb-img:a:start"), anim]);
    expect(d.mode).toBe("motion");
    expect(d.badge).toBe("Motion");
    expect(d.motion?.id).toBe("m");
    expect(frameRole(anim)).toBe("motion");
  });
  it("drops duplicate urls", () => {
    expect(describeMedia([img("a:start", "/s.webp"), img("a:peak", "/s.webp")]).mode).toBe("still");
  });
  it("covers a card with the peak position", () => {
    const d = describeMedia([img("repdb-img:s:start"), img("repdb-img:s:peak")]);
    expect(coverFrame(d)?.id).toBe("repdb-img:s:peak");
  });
});

describe("workout montage", () => {
  const ex = (name: string, media: MediaItem[]) => ({ name, media });
  it("takes up to four movements with media and counts the missing ones", () => {
    const m = workoutMontage([
      ex("A", [img("repdb-img:a:start"), img("repdb-img:a:peak")]),
      ex("B", []),
      ex("C", [img("c:1")]),
      ex("D", [img("d:1")]),
      ex("E", [img("e:1")]),
      ex("F", [img("f:1")]),
    ]);
    expect(m.tiles.map((t) => t.name)).toEqual(["A", "C", "D", "E"]);
    expect(m.missing).toBe(1);
    expect(m.badge).toBe("Illustrated steps");
    expect(montageAlt(m)).toBe("Illustrations of A, C, D, E");
  });
  it("is honest when nothing has media", () => {
    const m = workoutMontage([ex("A", [])]);
    expect(m.badge).toBe("No demo yet");
    expect(montageAlt(m)).toBe("No demonstration available");
  });
  it("derives the badge from files that actually loaded", () => {
    const a = [img("repdb-img:a:start"), img("repdb-img:a:peak")];
    const b = [img("repdb-img:b:start"), img("repdb-img:b:peak")];
    const all = workoutMontage([ex("A", a), ex("B", b)]);
    expect(all.badge).toBe("Illustrated steps");
    const failedAll = new Set([...a, ...b].map((i) => i.url));
    const none = workoutMontage([ex("A", a), ex("B", b)], 4, failedAll);
    expect(none.badge).toBe("No demo yet");
    expect(none.tiles).toEqual([]);
    expect(none.steps).toBe(0);
    // One frame of two lost: no longer "steps", honestly an illustration.
    const part = workoutMontage([ex("A", a)], 4, new Set([a[1]!.url]));
    expect(part.badge).toBe("Illustrations");
  });
});
