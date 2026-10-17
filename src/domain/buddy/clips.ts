/**
 * Authored animation clips. Pure data: each clip is a set of tracks (WAAPI keyframes on a named
 * rig part) with timing shaped by the variant's motion profile. Every action clip is built from
 * anticipation, action, overshoot and settle, so movement has weight rather than just bobbing.
 * The renderer only has to expose the rig parts (root, body, face, eyes, mouth, acc, shadow).
 */
import type { MotionProfile } from "./variants";
import type { BuddyState } from "./state";

export type Part = "root" | "body" | "face" | "eyes" | "mouth" | "acc" | "shadow";
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
export const KEY_POSES: Record<BuddyState, { root: string; body: string }> = {
  enter: { root: "none", body: "none" },
  idle: { root: "none", body: "none" },
  breathe: { root: "none", body: "none" },
  listen: { root: "rotate(-5deg)", body: "none" },
  think: { root: "rotate(3deg)", body: "none" },
  explain: { root: "none", body: "none" },
  point: { root: "rotate(6deg) translate(3px, 0)", body: "none" },
  encourage: { root: "none", body: "translate(0, -3px)" },
  celebrate: { root: "none", body: "translate(0, -5px) scale(1.04, 1.04)" },
  recover: { root: "none", body: "none" },
  rest: { root: "none", body: "translate(0, 2px) scale(1.02, 0.96)" },
  error: { root: "rotate(-2deg)", body: "none" },
  offline: { root: "none", body: "none" },
  exit: { root: "rotate(-4deg)", body: "scale(0.9, 0.9)" },
};
