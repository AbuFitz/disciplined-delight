/**
 * Authored animation clips. Pure data: each clip is a set of tracks (WAAPI keyframes on a named
 * rig part) with timing shaped by the variant's motion profile. Every action clip is built from
 * anticipation, action, overshoot and settle, so movement has weight rather than just bobbing.
 * The renderer only has to expose the rig parts (root, body, face, eyes, mouth, acc, shadow).
 */
import type { MotionProfile } from "./variants";
import type { BuddyState } from "./state";

export type Part =
  "root" | "back" | "body" | "armL" | "armR" | "face" | "eyes" | "mouth" | "acc" | "shadow";
export type Track = {
  part: Part;
  keyframes: Keyframe[];
  duration: number;
  easing?: string;
  iterations?: number;
  delay?: number;
};
export type Clip = {
  state: BuddyState | "idle-variation";
  /** Looping clips keep playing until the state changes. Others hold their last frame. */
  loop: boolean;
  tracks: Track[];
  /** Total time of one pass, for tests and scheduling. */
  length: number;
};

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EASE = "cubic-bezier(0.45, 0, 0.25, 1)";
const SOFT = "ease-in-out";

type T = { x?: number; y?: number; sx?: number; sy?: number; r?: number; o?: number };
/** Transforms always include an origin-safe scale so squash keeps the base planted. */
const tf = ({ x = 0, y = 0, sx = 1, sy = 1, r = 0, o }: T, offset?: number): Keyframe => ({
  transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx}, ${sy})`,
  ...(o === undefined ? {} : { opacity: o }),
  ...(offset === undefined ? {} : { offset }),
});

const track = (
  part: Part,
  keyframes: Keyframe[],
  duration: number,
  p: MotionProfile,
  extra: Partial<Track> = {},
): Track => ({ part, keyframes, duration: Math.round(duration * p.tempo), ...extra });

const sum = (tracks: Track[]) =>
  Math.max(...tracks.map((t) => (t.duration + (t.delay ?? 0)) * (t.iterations ?? 1)));
const clip = (state: Clip["state"], loop: boolean, tracks: Track[]): Clip => ({
  state,
  loop,
  tracks,
  length: sum(tracks),
});

/** Squash amount scaled by the variant, kept subtle so the face never distorts badly. */
const sq = (p: MotionProfile, a: number) => a * p.squash;

export function clipFor(state: BuddyState, p: MotionProfile): Clip {
  const base = bodyClip(state, p);
  const extra = [...armTracks(state, p), ...followTracks(state, p)];
  return extra.length
    ? { ...base, tracks: [...base.tracks, ...extra], length: sum([...base.tracks, ...extra]) }
    : base;
}

/**
 * Secondary motion: ears, knob, sprout and tail lag behind the body and swing past (follow-through),
 * and the face slides a little across the body so a limbless blob still feels alive and looks where it is
 * going. Missing parts are skipped by the renderer.
 */
const swing = (amp: number, n: number, damp = 0.62): Keyframe[] => {
  const out: Keyframe[] = [rot(0, 0)];
  let a = amp;
  for (let i = 1; i <= n; i++) {
    out.push(rot(i % 2 ? a : -a, i / (n + 1)));
    a *= damp;
  }
  out.push(rot(0, 1));
  return out;
};
const slide = (x: number, y: number, offset?: number): Keyframe => tf({ x, y }, offset);

function followTracks(state: BuddyState, p: MotionProfile): Track[] {
  const o = p.overshoot;
  const B = (kf: Keyframe[], d: number, extra: Partial<Track> = {}) =>
    track("back", kf, d, p, { easing: SOFT, ...extra });
  const F = (kf: Keyframe[], d: number, extra: Partial<Track> = {}) =>
    track("face", kf, d, p, { easing: SOFT, ...extra });
  switch (state) {
    case "enter":
      return [
        B(swing(9 * o, 4), 1300, { delay: 250 }),
        F([slide(0, 3, 0), slide(0, -1, 0.5), slide(0, 0, 1)], 900),
      ];
    case "idle":
      return [
        B([rot(-2.5, 0), rot(2.5, 0.5), rot(-2.5, 1)], 3600, { iterations: Infinity }),
        F([slide(-0.8, 0, 0), slide(0.8, -0.4, 0.5), slide(-0.8, 0, 1)], 5200, {
          iterations: Infinity,
        }),
      ];
    case "breathe":
      return [B([rot(-1.5, 0), rot(1.5, 0.5), rot(-1.5, 1)], 5200, { iterations: Infinity })];
    case "listen":
      return [
        F([slide(0, 0, 0), slide(-3, -0.5, 0.45), slide(-2.4, -0.5, 1)], 700, { easing: SPRING }),
        B(swing(5, 2), 800),
      ];
    case "think":
      return [
        F([slide(-1.5, -1.2, 0), slide(2.5, -2, 0.5), slide(-1.5, -1.2, 1)], 2600, {
          iterations: Infinity,
        }),
        B([rot(-3, 0), rot(3, 0.5), rot(-3, 1)], 2200, { iterations: Infinity }),
      ];
    case "explain":
      return [B([rot(-4, 0), rot(4, 0.5), rot(-4, 1)], 1300, { iterations: Infinity })];
    case "point":
      return [
        F([slide(0, 0, 0), slide(3.4, 0, 0.5), slide(3, 0, 1)], 1000, { easing: SPRING }),
        B(swing(9 * o, 3), 1000),
      ];
    case "encourage":
      return [
        B(swing(12 * o, 5), 1100, { delay: 120 }),
        F([slide(0, 0, 0), slide(0, -2.4, 0.38), slide(0, 1, 0.55), slide(0, 0, 1)], 1100),
      ];
    case "celebrate":
      return [
        B(swing(16 * o, 7, 0.7), 1500, { delay: 100 }),
        F(
          [
            slide(0, 0, 0),
            slide(0, -2.8, 0.26),
            slide(0, 1.6, 0.42),
            slide(0, -2, 0.58),
            slide(0, 1, 0.72),
            slide(0, 0, 1),
          ],
          1500,
        ),
      ];
    case "recover":
      return [F([slide(0, 2.4, 0), slide(0, 2.4, 0.2), slide(0, 0, 1)], 1500, { easing: EASE })];
    case "rest":
      return [
        F([slide(0, 2.2, 0), slide(0, 1.4, 0.5), slide(0, 2.2, 1)], 5600, { iterations: Infinity }),
      ];
    case "error":
      return [B(swing(6, 3), 700), F([slide(-1.5, 1, 0), slide(0, 1.6, 1)], 700)];
    case "poke":
      return [
        B(swing(18 * o, 5, 0.66), 900, { delay: 60 }),
        F(
          [
            slide(0, 0, 0),
            slide(0, 2, 0.14),
            slide(0, -2.8, 0.4),
            slide(0, 1.2, 0.62),
            slide(0, 0, 1),
          ],
          900,
        ),
      ];
    default:
      return [];
  }
}

/** Arm rotation in degrees. Left arm swings outward with positive angles, right with negative. */
const rot = (r: number, o?: number): Keyframe => ({
  transform: `rotate(${r}deg)`,
  ...(o === undefined ? {} : { offset: o }),
});

function armTracks(state: BuddyState, p: MotionProfile): Track[] {
  const a = p.anticipation;
  const o = p.overshoot;
  const L = (kf: Keyframe[], d: number, extra: Partial<Track> = {}) =>
    track("armL", kf, d, p, { easing: SPRING, ...extra });
  const R = (kf: Keyframe[], d: number, extra: Partial<Track> = {}) =>
    track("armR", kf, d, p, { easing: SPRING, ...extra });
  switch (state) {
    case "enter":
      return [
        R(
          [
            rot(0, 0),
            rot(-20 * a, 0.2),
            rot(-150, 0.4),
            rot(-130, 0.55),
            rot(-160, 0.7),
            rot(-132, 0.85),
            rot(-150, 1),
          ],
          1100,
        ),
        L([rot(0, 0), rot(10, 0.5), rot(0, 1)], 1100),
      ];
    case "idle":
      return [
        L([rot(3, 0), rot(9, 0.5), rot(3, 1)], 3400, { iterations: Infinity, easing: SOFT }),
        R([rot(-3, 0), rot(-9, 0.5), rot(-3, 1)], 3400, {
          iterations: Infinity,
          easing: SOFT,
          delay: 300,
        }),
      ];
    case "breathe":
      return [
        L([rot(6, 0), rot(14, 0.5), rot(6, 1)], 5200, { iterations: Infinity, easing: SOFT }),
        R([rot(-6, 0), rot(-14, 0.5), rot(-6, 1)], 5200, { iterations: Infinity, easing: SOFT }),
      ];
    case "listen":
      return [R([rot(-5, 0), rot(-60, 0.4), rot(-52, 1)], 600), L([rot(4, 0), rot(10, 1)], 600)];
    case "think":
      return [
        R([rot(-5, 0), rot(105, 0.45), rot(100, 0.6), rot(108, 0.8), rot(100, 1)], 1800, {
          iterations: Infinity,
          easing: SOFT,
        }),
      ];
    case "explain":
      return [
        L([rot(6, 0), rot(38, 0.4), rot(24, 0.7), rot(38, 1)], 1300, {
          iterations: Infinity,
          easing: SOFT,
        }),
        R([rot(-6, 0), rot(-38, 0.4), rot(-24, 0.7), rot(-38, 1)], 1300, {
          iterations: Infinity,
          easing: SOFT,
        }),
      ];
    case "point":
      return [
        R([rot(-4, 0), rot(10 * a, 0.2), rot(-104 * 1, 0.5), rot(-98, 0.75), rot(-104, 1)], 1000),
      ];
    case "encourage":
      return [
        R(
          [
            rot(-4, 0),
            rot(14 * a, 0.15),
            rot(-146 * Math.min(o, 1.1), 0.4),
            rot(-126, 0.55),
            rot(-146, 0.75),
            rot(-120, 1),
          ],
          1100,
        ),
        L([rot(4, 0), rot(16, 0.5), rot(4, 1)], 1100),
      ];
    case "celebrate":
      return [
        L(
          [
            rot(4, 0),
            rot(-10 * a, 0.1),
            rot(156, 0.26),
            rot(128, 0.42),
            rot(158, 0.58),
            rot(132, 0.72),
            rot(150, 0.86),
            rot(150, 1),
          ],
          1500,
        ),
        R(
          [
            rot(-4, 0),
            rot(10 * a, 0.1),
            rot(-156, 0.26),
            rot(-128, 0.42),
            rot(-158, 0.58),
            rot(-132, 0.72),
            rot(-150, 0.86),
            rot(-150, 1),
          ],
          1500,
        ),
      ];
    case "recover":
      return [
        L([rot(4, 0), rot(4, 0.3), rot(38, 1)], 1500, { easing: EASE }),
        R([rot(-4, 0), rot(-4, 0.3), rot(-38, 1)], 1500, { easing: EASE }),
      ];
    case "rest":
      return [
        L([rot(10, 0), rot(14, 0.5), rot(10, 1)], 5600, { iterations: Infinity, easing: SOFT }),
        R([rot(-10, 0), rot(-14, 0.5), rot(-10, 1)], 5600, { iterations: Infinity, easing: SOFT }),
      ];
    case "error":
      return [
        L([rot(5, 0), rot(52, 0.3), rot(46, 1)], 700),
        R([rot(-5, 0), rot(-52, 0.3), rot(-46, 1)], 700),
      ];
    case "poke":
      return [
        L([rot(4, 0), rot(60, 0.3), rot(20, 0.6), rot(46, 0.8), rot(8, 1)], 900),
        R([rot(-4, 0), rot(-60, 0.3), rot(-20, 0.6), rot(-46, 0.8), rot(-8, 1)], 900),
      ];
    case "exit":
      return [R([rot(-4, 0), rot(-150, 0.3), rot(-120, 0.5), rot(-155, 0.7), rot(-150, 1)], 520)];
    default:
      return [];
  }
}

function bodyClip(state: BuddyState, p: MotionProfile): Clip {
  const a = p.anticipation;
  const o = p.overshoot;
  switch (state) {
    case "enter":
      // Anticipation squat, stretch up past full size, settle.
      return clip("enter", false, [
        track(
          "body",
          [
            tf({ y: 14, sx: 0.55, sy: 0.55, o: 0 }, 0),
            tf({ y: 4, sx: 1 + sq(p, 0.1), sy: 1 - sq(p, 0.14) * a, o: 1 }, 0.35),
            tf({ y: -6 * o, sx: 1 - sq(p, 0.08), sy: 1 + sq(p, 0.12) * o }, 0.62),
            tf({ y: 0, sx: 1 + sq(p, 0.03), sy: 1 - sq(p, 0.03) }, 0.82),
            tf({}, 1),
          ],
          900,
          p,
          { easing: EASE },
        ),
        track("shadow", [tf({ sx: 0.3, o: 0 }, 0), tf({ sx: 1, o: 1 }, 0.5), tf({}, 1)], 900, p),
      ]);
    case "idle":
      return clip("idle", true, [
        track(
          "body",
          [tf({}, 0), tf({ sy: 1 + sq(p, 0.022), sx: 1 - sq(p, 0.012), y: -0.5 }, 0.5), tf({}, 1)],
          3400,
          p,
          { iterations: Infinity, easing: SOFT },
        ),
        track("eyes", blink(), 4800, p, { iterations: Infinity }),
        track("shadow", [tf({}, 0), tf({ sx: 0.97 }, 0.5), tf({}, 1)], 3400, p, {
          iterations: Infinity,
          easing: SOFT,
        }),
      ]);
    case "breathe":
      return clip("breathe", true, [
        track(
          "body",
          [tf({}, 0), tf({ sy: 1 + sq(p, 0.06), sx: 1 - sq(p, 0.035), y: -1 }, 0.5), tf({}, 1)],
          5200,
          p,
          { iterations: Infinity, easing: SOFT },
        ),
        track(
          "acc",
          [
            tf({ sx: 0.8, sy: 0.8, o: 0.15 }, 0),
            tf({ sx: 1.04, sy: 1.04, o: 0.6 }, 0.5),
            tf({ sx: 0.8, sy: 0.8, o: 0.15 }, 1),
          ],
          5200,
          p,
          { iterations: Infinity, easing: SOFT },
        ),
      ]);
    case "listen":
      // Lean in with a small anticipation back, hold, eyes widen via pose.
      return clip("listen", false, [
        track(
          "root",
          [
            tf({}, 0),
            tf({ x: 1.5, r: 2 * a }, 0.3),
            tf({ x: -2, r: -6 * o }, 0.7),
            tf({ x: -1.5, r: -5 }, 1),
          ],
          700,
          p,
          { easing: SPRING, delay: 0 },
        ),
        track(
          "acc",
          [tf({ x: 2, o: 0.3 }, 0), tf({ x: -1, o: 1 }, 0.5), tf({ x: 2, o: 0.3 }, 1)],
          1300,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
      ]);
    case "think":
      return clip("think", true, [
        track("root", [tf({ r: -3 }, 0), tf({ r: 3 }, 0.5), tf({ r: -3 }, 1)], 2200, p, {
          iterations: Infinity,
          easing: SOFT,
        }),
        track(
          "eyes",
          [tf({ x: -1.5, y: -1.5 }, 0), tf({ x: 1.5, y: -2 }, 0.5), tf({ x: -1.5, y: -1.5 }, 1)],
          2600,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
        track(
          "acc",
          [tf({ y: 0, o: 0.25 }, 0), tf({ y: -3, o: 1 }, 0.5), tf({ y: 0, o: 0.25 }, 1)],
          1200,
          p,
          { iterations: Infinity, easing: SOFT },
        ),
      ]);
    case "explain":
      return clip("explain", true, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: -2.5, sy: 1 + sq(p, 0.02) }, 0.45),
            tf({ y: 0.5, sy: 1 - sq(p, 0.02) }, 0.8),
            tf({}, 1),
          ],
          1300,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
        track("mouth", [tf({ sy: 1 }, 0), tf({ sy: 0.45 }, 0.5), tf({ sy: 1 }, 1)], 520, p, {
          iterations: Infinity,
          easing: SOFT,
        }),
      ]);
    case "point":
      // Rock back (anticipation), lunge toward the direction, hold, return.
      return clip("point", false, [
        track(
          "root",
          [
            tf({}, 0),
            tf({ x: -2.5 * a, r: -5 * a, sy: 1 + sq(p, 0.04) }, 0.22),
            tf({ x: 4 * o, r: 8 * o, sx: 1 + sq(p, 0.06), sy: 1 - sq(p, 0.04) }, 0.5),
            tf({ x: 3, r: 6 }, 0.8),
            tf({ x: 3, r: 6 }, 1),
          ],
          1000,
          p,
          { easing: SPRING },
        ),
        track(
          "acc",
          [
            tf({ x: -4, o: 0 }, 0),
            tf({ x: 0, o: 1 }, 0.4),
            tf({ x: 3, o: 1 }, 0.7),
            tf({ x: 0, o: 1 }, 1),
          ],
          1200,
          p,
          {
            iterations: 3,
            easing: SOFT,
          },
        ),
      ]);
    case "encourage":
      return clip("encourage", false, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: 2, sx: 1 + sq(p, 0.08) * a, sy: 1 - sq(p, 0.1) * a }, 0.15),
            tf({ y: -9 * o, sx: 1 - sq(p, 0.05), sy: 1 + sq(p, 0.1) }, 0.38),
            tf({ y: 0, sx: 1 + sq(p, 0.07), sy: 1 - sq(p, 0.08) }, 0.55),
            tf({ y: -4 * o, sy: 1 + sq(p, 0.04) }, 0.75),
            tf({}, 1),
          ],
          1100,
          p,
          { easing: EASE },
        ),
        track(
          "shadow",
          [
            tf({}, 0),
            tf({ sx: 0.7, o: 0.6 }, 0.38),
            tf({}, 0.55),
            tf({ sx: 0.85 }, 0.75),
            tf({}, 1),
          ],
          1100,
          p,
        ),
      ]);
    case "celebrate":
      // Crouch, launch with stretch, land with squash; three bounces with fading height.
      return clip("celebrate", false, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: 4, sx: 1 + sq(p, 0.16) * a, sy: 1 - sq(p, 0.2) * a }, 0.1),
            tf({ y: -16 * o, sx: 1 - sq(p, 0.1), sy: 1 + sq(p, 0.18) }, 0.26),
            tf({ y: 0, sx: 1 + sq(p, 0.14), sy: 1 - sq(p, 0.16) }, 0.42),
            tf({ y: -10 * o, sx: 1 - sq(p, 0.06), sy: 1 + sq(p, 0.1) }, 0.58),
            tf({ y: 0, sx: 1 + sq(p, 0.08), sy: 1 - sq(p, 0.09) }, 0.72),
            tf({ y: -4 * o, sy: 1 + sq(p, 0.04) }, 0.86),
            tf({}, 1),
          ],
          1500,
          p,
          { easing: EASE },
        ),
        track(
          "root",
          [
            tf({ r: 0 }, 0),
            tf({ r: -6 * o }, 0.3),
            tf({ r: 5 * o }, 0.55),
            tf({ r: -3 }, 0.8),
            tf({}, 1),
          ],
          1500,
          p,
          {
            easing: SOFT,
          },
        ),
        track(
          "shadow",
          [
            tf({}, 0),
            tf({ sx: 0.6, o: 0.5 }, 0.26),
            tf({ sx: 1.08 }, 0.42),
            tf({ sx: 0.75 }, 0.58),
            tf({}, 1),
          ],
          1500,
          p,
        ),
        track("acc", [tf({ sy: 0.01, o: 0 }, 0), tf({ sy: 1, o: 1 }, 0.35), tf({}, 1)], 1500, p, {
          easing: SPRING,
        }),
      ]);
    case "recover":
      // Slow rise from a low, tired squat to upright; warmth, no hurry.
      return clip("recover", false, [
        track(
          "body",
          [
            tf({ y: 5, sx: 1 + sq(p, 0.05), sy: 1 - sq(p, 0.08) }, 0),
            tf({ y: 5, sx: 1 + sq(p, 0.05), sy: 1 - sq(p, 0.08) }, 0.2),
            tf({ y: -2 * o, sy: 1 + sq(p, 0.03) }, 0.7),
            tf({}, 1),
          ],
          1500,
          p,
          { easing: EASE },
        ),
        track("acc", [tf({ y: 10, o: 0 }, 0), tf({ y: 0, o: 1 }, 1)], 1500, p, { easing: EASE }),
      ]);
    case "rest":
      return clip("rest", true, [
        track(
          "body",
          [
            tf({ y: 2, sy: 0.96, sx: 1.02 }, 0),
            tf({ y: 1, sy: 0.985, sx: 1.01 }, 0.5),
            tf({ y: 2, sy: 0.96, sx: 1.02 }, 1),
          ],
          5600,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
        track(
          "acc",
          [
            tf({ x: 0, y: 6, o: 0 }, 0),
            tf({ x: 2, y: -2, o: 1 }, 0.5),
            tf({ x: 4, y: -10, o: 0 }, 1),
          ],
          3400,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
      ]);
    case "error":
      // Quick recoil away, a short tremor, settle leaning, help mark pulses.
      return clip("error", false, [
        track(
          "root",
          [
            tf({}, 0),
            tf({ x: -3, r: -4 }, 0.12),
            tf({ x: 2.5, r: 3 }, 0.28),
            tf({ x: -2, r: -2.5 }, 0.44),
            tf({ x: 1, r: 1.5 }, 0.6),
            tf({ x: 0, r: -2 }, 1),
          ],
          700,
          p,
          { easing: EASE },
        ),
        track(
          "acc",
          [tf({ sx: 1, sy: 1 }, 0), tf({ sx: 1.18, sy: 1.18 }, 0.5), tf({ sx: 1, sy: 1 }, 1)],
          1400,
          p,
          {
            iterations: Infinity,
            easing: SOFT,
          },
        ),
      ]);
    case "offline":
      return clip("offline", true, [
        track("body", [tf({}, 0), tf({ sy: 1.01, y: -0.5 }, 0.5), tf({}, 1)], 6000, p, {
          iterations: Infinity,
          easing: SOFT,
        }),
        track("acc", [tf({ o: 0.7 }, 0), tf({ o: 1 }, 0.5), tf({ o: 0.7 }, 1)], 3000, p, {
          iterations: Infinity,
          easing: SOFT,
        }),
      ]);
    case "poke":
      // Squish down (anticipation), pop up with a stretch, wobble, settle.
      return clip("poke", false, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: 3, sx: 1 + sq(p, 0.14) * a, sy: 1 - sq(p, 0.18) * a }, 0.14),
            tf({ y: -10 * o, sx: 1 - sq(p, 0.09), sy: 1 + sq(p, 0.16) }, 0.4),
            tf({ y: 0, sx: 1 + sq(p, 0.12), sy: 1 - sq(p, 0.14) }, 0.58),
            tf({ y: -3, sx: 1 - sq(p, 0.05), sy: 1 + sq(p, 0.07) }, 0.74),
            tf({ y: 0, sx: 1 + sq(p, 0.04), sy: 1 - sq(p, 0.05) }, 0.88),
            tf({}, 1),
          ],
          900,
          p,
          { easing: EASE },
        ),
        track(
          "root",
          [
            tf({ r: 0 }, 0),
            tf({ r: -5 * o }, 0.35),
            tf({ r: 4 * o }, 0.6),
            tf({ r: -2 }, 0.82),
            tf({}, 1),
          ],
          900,
          p,
          { easing: SOFT },
        ),
        track(
          "shadow",
          [tf({}, 0), tf({ sx: 0.72, o: 0.7 }, 0.4), tf({ sx: 1.05 }, 0.62), tf({}, 1)],
          900,
          p,
        ),
        track(
          "acc",
          [
            tf({ sx: 0.2, sy: 0.2, o: 0 }, 0),
            tf({ sx: 1.15, sy: 1.15, o: 1 }, 0.4),
            tf({ sx: 1, sy: 1, o: 1 }, 0.7),
            tf({ sx: 0.8, sy: 0.8, o: 0 }, 1),
          ],
          1100,
          p,
          { easing: SPRING },
        ),
      ]);
    case "exit":
      // Small anticipation lift, then shrink away.
      return clip("exit", false, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: -3 * a, sx: 1 - sq(p, 0.04), sy: 1 + sq(p, 0.08) }, 0.3),
            tf({ y: 10, sx: 0.5, sy: 0.5, o: 0 }, 1),
          ],
          520,
          p,
          { easing: EASE },
        ),
        track("shadow", [tf({}, 0), tf({ sx: 0.2, o: 0 }, 1)], 520, p),
      ]);
  }
}

function blink(): Keyframe[] {
  return [
    tf({ sy: 1 }, 0),
    tf({ sy: 1 }, 0.9),
    tf({ sy: 0.1 }, 0.94),
    tf({ sy: 1 }, 0.98),
    tf({ sy: 1 }, 1),
  ];
}

/** One idle micro-move. Chosen from the variant's favourites; short, never loops. */
export function idleVariation(p: MotionProfile, pick: number): Clip {
  const move = p.idleMoves[Math.floor(pick * p.idleMoves.length) % p.idleMoves.length]!;
  const t = (part: Part, kf: Keyframe[], d: number) => track(part, kf, d, p, { easing: SOFT });
  switch (move) {
    case "look":
      return clip("idle-variation", false, [
        t(
          "eyes",
          [
            tf({}, 0),
            tf({ x: 2.4, y: -0.5 }, 0.3),
            tf({ x: 2.4, y: -0.5 }, 0.6),
            tf({ x: -2.2 }, 0.8),
            tf({}, 1),
          ],
          1800,
        ),
        t("root", [tf({}, 0), tf({ r: 2 }, 0.3), tf({ r: -2 }, 0.8), tf({}, 1)], 1800),
      ]);
    case "tilt":
      return clip("idle-variation", false, [
        t(
          "root",
          [
            tf({}, 0),
            tf({ r: -5 * p.overshoot }, 0.4),
            tf({ r: -5 * p.overshoot }, 0.7),
            tf({}, 1),
          ],
          1500,
        ),
      ]);
    case "hop":
      return clip("idle-variation", false, [
        track(
          "body",
          [
            tf({}, 0),
            tf({ y: 1, sx: 1 + sq(p, 0.06), sy: 1 - sq(p, 0.08) }, 0.2),
            tf({ y: -6 * p.overshoot, sy: 1 + sq(p, 0.08) }, 0.45),
            tf({ y: 0, sx: 1 + sq(p, 0.05), sy: 1 - sq(p, 0.06) }, 0.7),
            tf({}, 1),
          ],
          800,
          p,
          { easing: EASE },
        ),
      ]);
    case "stretch":
      return clip("idle-variation", false, [
        t(
          "body",
          [tf({}, 0), tf({ sy: 1 + sq(p, 0.08), sx: 1 - sq(p, 0.04), y: -2 }, 0.5), tf({}, 1)],
          2400,
        ),
      ]);
    case "puff":
      return clip("idle-variation", false, [
        t(
          "body",
          [
            tf({}, 0),
            tf({ sx: 1 + sq(p, 0.07), sy: 1 + sq(p, 0.05) }, 0.35),
            tf({ sx: 1 + sq(p, 0.07), sy: 1 + sq(p, 0.05) }, 0.6),
            tf({}, 1),
          ],
          1400,
        ),
      ]);
    case "sway":
      return clip("idle-variation", false, [
        t("root", [tf({}, 0), tf({ x: 2, r: 2 }, 0.3), tf({ x: -2, r: -2 }, 0.7), tf({}, 1)], 2600),
      ]);
    case "shimmy":
      return clip("idle-variation", false, [
        t(
          "root",
          [
            tf({}, 0),
            tf({ x: 2, r: 4 }, 0.15),
            tf({ x: -2, r: -4 }, 0.3),
            tf({ x: 2, r: 4 }, 0.45),
            tf({ x: -1.5, r: -3 }, 0.6),
            tf({}, 0.8),
            tf({}, 1),
          ],
          1100,
        ),
        t(
          "body",
          [
            tf({}, 0),
            tf({ sx: 1 + sq(p, 0.05), sy: 1 - sq(p, 0.04) }, 0.15),
            tf({ sx: 1 - sq(p, 0.04), sy: 1 + sq(p, 0.05) }, 0.3),
            tf({ sx: 1 + sq(p, 0.04), sy: 1 - sq(p, 0.03) }, 0.45),
            tf({}, 0.7),
            tf({}, 1),
          ],
          1100,
        ),
        t("back", swing(12, 5), 1200),
      ]);
    case "wobble":
      return clip("idle-variation", false, [
        t(
          "body",
          [
            tf({}, 0),
            tf({ sx: 1 + sq(p, 0.08), sy: 1 - sq(p, 0.09) }, 0.2),
            tf({ sx: 1 - sq(p, 0.05), sy: 1 + sq(p, 0.06) }, 0.4),
            tf({ sx: 1 + sq(p, 0.03), sy: 1 - sq(p, 0.03) }, 0.6),
            tf({}, 1),
          ],
          1500,
        ),
        t("back", swing(8, 3), 1500),
      ]);
    case "peek":
      return clip("idle-variation", false, [
        t(
          "face",
          [
            slide(0, 0, 0),
            slide(-4, 0.5, 0.25),
            slide(-4, 0.5, 0.5),
            slide(4, 0.5, 0.7),
            slide(4, 0.5, 0.85),
            slide(0, 0, 1),
          ],
          2600,
        ),
        t("eyes", [tf({}, 0), tf({ x: -1.8 }, 0.25), tf({ x: 1.8 }, 0.7), tf({}, 1)], 2600),
      ]);
    case "blink":
      return clip("idle-variation", false, [
        t(
          "eyes",
          [
            tf({ sy: 1 }, 0),
            tf({ sy: 0.1 }, 0.3),
            tf({ sy: 1 }, 0.55),
            tf({ sy: 0.1 }, 0.7),
            tf({ sy: 1 }, 1),
          ],
          700,
        ),
      ]);
  }
}

/** Static key poses for reduced motion: the same states, no movement. */
export const KEY_POSES: Record<
  BuddyState,
  { root: string; body: string; armL?: string; armR?: string }
> = {
  enter: { root: "none", body: "none", armR: "rotate(-150deg)" },
  idle: { root: "none", body: "none" },
  breathe: { root: "none", body: "none" },
  listen: { root: "rotate(-5deg)", body: "none", armR: "rotate(-52deg)" },
  think: { root: "rotate(3deg)", body: "none", armR: "rotate(100deg)" },
  explain: { root: "none", body: "none", armL: "rotate(34deg)", armR: "rotate(-34deg)" },
  point: { root: "rotate(6deg) translate(3px, 0)", body: "none", armR: "rotate(-104deg)" },
  encourage: { root: "none", body: "translate(0, -3px)", armR: "rotate(-140deg)" },
  celebrate: {
    root: "none",
    body: "translate(0, -5px) scale(1.04, 1.04)",
    armL: "rotate(150deg)",
    armR: "rotate(-150deg)",
  },
  recover: { root: "none", body: "none", armL: "rotate(38deg)", armR: "rotate(-38deg)" },
  rest: { root: "none", body: "translate(0, 2px) scale(1.02, 0.96)" },
  error: { root: "rotate(-2deg)", body: "none", armL: "rotate(46deg)", armR: "rotate(-46deg)" },
  offline: { root: "none", body: "none" },
  exit: { root: "rotate(-4deg)", body: "scale(0.9, 0.9)", armR: "rotate(-150deg)" },
  poke: {
    root: "none",
    body: "translate(0, -4px) scale(0.98, 1.04)",
    armL: "rotate(50deg)",
    armR: "rotate(-50deg)",
  },
};
