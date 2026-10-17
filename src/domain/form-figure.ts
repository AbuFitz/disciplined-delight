/**
 * Original VAYVOR form diagrams: a side-view line figure posed with forward kinematics for the arms and two-bone IK for
 * the legs. They are generic for a movement pattern (not a copy of any provider's illustration), drawn in code, and are
 * labelled "illustrated steps": no animation is claimed. Cues are neutral technique reminders, not clinical advice.
 */
export type Pt = [number, number];
export type Prop = "dumbbell" | "barbell" | "bar-overhead" | "none";
export type Pose = {
  /** Hip position in a 100×100 box (y grows downward; the floor is y = 90). */
  hip: Pt;
  /** Torso lean from vertical: 0 = upright, 90 = horizontal facing right, negative = leaning/lying back. */
  t: number;
  /** Ankle targets. The second is the trailing foot (lunge). */
  feet: [Pt] | [Pt, Pt];
  /** Upper-arm and forearm direction: 0 = down, 90 = forward, 180 = up. */
  u: number;
  f: number;
  prop?: Prop;
  bench?: boolean;
};
export type SolvedPose = {
  head: Pt;
  shoulder: Pt;
  hip: Pt;
  elbow: Pt;
  hand: Pt;
  legs: { knee: Pt; ankle: Pt; toe: Pt }[];
  prop: Prop;
  bench: boolean;
};

export const SEG = { torso: 26, thigh: 24, shin: 23, upper: 15, fore: 14 } as const;
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number): Pt => [Math.sin(rad(d)), Math.cos(rad(d))];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** Two-bone IK with the knee bending toward the facing side (+x). Straightens when the target is out of reach. */
export function solveLeg(hip: Pt, ankle: Pt): { knee: Pt; ankle: Pt } {
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const d = Math.hypot(dx, dy);
  const max = SEG.thigh + SEG.shin - 0.01;
  if (d >= max) {
    const k = SEG.thigh / (SEG.thigh + SEG.shin);
    return {
      knee: [hip[0] + dx * k, hip[1] + dy * k],
      ankle: [hip[0] + (dx / d) * max, hip[1] + (dy / d) * max],
    };
  }
  const a = (SEG.thigh ** 2 - SEG.shin ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, SEG.thigh ** 2 - a ** 2));
  const mx = hip[0] + (dx * a) / d;
  const my = hip[1] + (dy * a) / d;
  const c1: Pt = [mx + (h * dy) / d, my - (h * dx) / d];
  const c2: Pt = [mx - (h * dy) / d, my + (h * dx) / d];
  return { knee: c1[0] >= c2[0] ? c1 : c2, ankle };
}

export function solvePose(p: Pose): SolvedPose {
  const torso = dir(180 - p.t);
  const shoulder = add(p.hip, torso, SEG.torso);
  const elbow = add(shoulder, dir(p.u), SEG.upper);
  const hand = add(elbow, dir(p.f), SEG.fore);
  const head = add(shoulder, dir(180 - p.t * 0.85), 9.5);
  const legs = p.feet.map((ankle) => {
    const l = solveLeg(p.hip, ankle);
    return { ...l, toe: [l.ankle[0] + 7, Math.min(92, l.ankle[1] + 2)] as Pt };
  });
  return {
    head,
    shoulder,
    hip: p.hip,
    elbow,
    hand,
    legs,
    prop: p.prop ?? "none",
    bench: !!p.bench,
  };
}

export type FormFrame = { label: string; cue: string; pose: Pose };
export type FormGuide = {
  id: string;
  title: string;
  frames: FormFrame[];
  keep: string;
  ease: string;
};

const stand = (extra: Partial<Pose> = {}): Pose => ({
  hip: [50, 44],
  t: 0,
  feet: [[50, 90]],
  u: 0,
  f: 0,
  ...extra,
});

export const FORM_GUIDES: Record<string, FormGuide> = {
  squat: {
    id: "squat",
    title: "Squat pattern",
    keep: "Feet flat, knees tracking over your toes, chest proud.",
    ease: "Shorten the depth or hold a support. Stop if something pinches.",
    frames: [
      {
        label: "Set up",
        cue: "Stand tall, feet about shoulder width, weight through the whole foot.",
        pose: stand({ u: 20, f: 130, prop: "dumbbell" }),
      },
      {
        label: "Lower",
        cue: "Sit down and slightly back, keeping your chest up.",
        pose: { hip: [40, 67], t: 36, feet: [[52, 90]], u: 20, f: 130, prop: "dumbbell" },
      },
      {
        label: "Stand",
        cue: "Press the floor away and finish tall.",
        pose: { hip: [46, 53], t: 20, feet: [[52, 90]], u: 20, f: 130, prop: "dumbbell" },
      },
    ],
  },
  hinge: {
    id: "hinge",
    title: "Hip hinge",
    keep: "A long, neutral spine; the bend comes from the hips.",
    ease: "Use lighter weight or a shorter range. Stop if your back complains.",
    frames: [
      {
        label: "Set up",
        cue: "Stand tall with soft knees and the weight close to your legs.",
        pose: stand({ prop: "barbell" }),
      },
      {
        label: "Hinge",
        cue: "Push your hips back as if closing a drawer behind you.",
        pose: { hip: [38, 46], t: 42, feet: [[50, 90]], u: 0, f: 0, prop: "barbell" },
      },
      {
        label: "Reach",
        cue: "Stop where your back stays flat, then drive the hips forward to stand.",
        pose: { hip: [31, 48], t: 72, feet: [[50, 90]], u: 0, f: 0, prop: "barbell" },
      },
    ],
  },
  lunge: {
    id: "lunge",
    title: "Lunge pattern",
    keep: "Stay tall; front foot flat, back heel light.",
    ease: "Shorten the step or hold a support. Stop if a joint objects.",
    frames: [
      {
        label: "Set up",
        cue: "Step into a split stance, hips square, chest up.",
        pose: {
          hip: [48, 44],
          t: 0,
          feet: [
            [64, 90],
            [32, 90],
          ],
          u: 0,
          f: 0,
        },
      },
      {
        label: "Lower",
        cue: "Drop straight down between your feet.",
        pose: {
          hip: [48, 63],
          t: 4,
          feet: [
            [67, 90],
            [28, 90],
          ],
          u: 0,
          f: 0,
        },
      },
      {
        label: "Drive",
        cue: "Push through the front foot to rise.",
        pose: {
          hip: [48, 52],
          t: 2,
          feet: [
            [66, 90],
            [30, 90],
          ],
          u: 0,
          f: 0,
        },
      },
    ],
  },
  push_horizontal: {
    id: "push_horizontal",
    title: "Horizontal push",
    keep: "A straight line from head to heels; elbows about 45° from your ribs.",
    ease: "Raise the hands on a bench or the wall. Stop if your shoulders pinch.",
    frames: [
      {
        label: "Set up",
        cue: "Hands under shoulders, body in one line, ribs down.",
        pose: { hip: [50, 65], t: 80, feet: [[8, 90]], u: 0, f: 0 },
      },
      {
        label: "Lower",
        cue: "Bend the elbows and lower as one piece.",
        pose: { hip: [50, 74], t: 82, feet: [[6, 90]], u: -35, f: 40 },
      },
      {
        label: "Press",
        cue: "Push the floor away and return to the line.",
        pose: { hip: [50, 66], t: 80, feet: [[8, 90]], u: -12, f: 14 },
      },
    ],
  },
  push_vertical: {
    id: "push_vertical",
    title: "Overhead press",
    keep: "Ribs down, glutes tight, forearms vertical.",
    ease: "Press from a seat or use lighter weights. Stop if your shoulders pinch.",
    frames: [
      {
        label: "Rack",
        cue: "Weights at shoulder height, elbows slightly forward.",
        pose: stand({ u: 18, f: 172, prop: "dumbbell" }),
      },
      {
        label: "Press",
        cue: "Drive up without leaning back.",
        pose: stand({ u: 140, f: 168, prop: "dumbbell" }),
      },
      {
        label: "Lockout",
        cue: "Finish with the weights over your shoulders and ears relaxed.",
        pose: stand({ u: 175, f: 178, prop: "dumbbell" }),
      },
    ],
  },
  pull_horizontal: {
    id: "pull_horizontal",
    title: "Row",
    keep: "Flat back; lead with the elbows, not the hands.",
    ease: "Support your chest on a bench or lighten the load.",
    frames: [
      {
        label: "Hang",
        cue: "Hinge until your torso is near 45°, arms long.",
        pose: { hip: [36, 47], t: 58, feet: [[50, 90]], u: 0, f: 0, prop: "dumbbell" },
      },
      {
        label: "Row",
        cue: "Pull the elbow toward your hip.",
        pose: { hip: [36, 47], t: 58, feet: [[50, 90]], u: -40, f: 8, prop: "dumbbell" },
      },
      {
        label: "Squeeze",
        cue: "Pause briefly, then lower under control.",
        pose: { hip: [36, 47], t: 58, feet: [[50, 90]], u: -75, f: -25, prop: "dumbbell" },
      },
    ],
  },
  pull_vertical: {
    id: "pull_vertical",
    title: "Vertical pull",
    keep: "Chest tall; pull the elbows down toward your ribs.",
    ease: "Use assistance or a lighter stack. Stop if your shoulders pinch.",
    frames: [
      {
        label: "Reach",
        cue: "Arms long, shoulders relaxed, grip just outside shoulder width.",
        pose: { hip: [44, 72], t: -6, feet: [[66, 90]], u: 172, f: 178, prop: "bar-overhead" },
      },
      {
        label: "Pull",
        cue: "Draw the elbows down and back.",
        pose: { hip: [44, 72], t: -8, feet: [[66, 90]], u: 120, f: 168, prop: "bar-overhead" },
      },
      {
        label: "Control",
        cue: "Bring the bar to the upper chest, then return slowly.",
        pose: { hip: [44, 72], t: -10, feet: [[66, 90]], u: 25, f: 140, prop: "bar-overhead" },
      },
    ],
  },
  arms_biceps: {
    id: "arms_biceps",
    title: "Curl",
    keep: "Elbows pinned to your sides; no swinging.",
    ease: "Use a lighter weight and a smaller range.",
    frames: [
      {
        label: "Hang",
        cue: "Stand tall, arms long, palms forward.",
        pose: stand({ prop: "dumbbell" }),
      },
      {
        label: "Curl",
        cue: "Bend at the elbow only.",
        pose: stand({ u: 4, f: 100, prop: "dumbbell" }),
      },
      {
        label: "Squeeze",
        cue: "Pause at the top, then lower for a slow count.",
        pose: stand({ u: 6, f: 150, prop: "dumbbell" }),
      },
    ],
  },
  arms_triceps: {
    id: "arms_triceps",
    title: "Triceps extension",
    keep: "Upper arm still, elbow close to your side.",
    ease: "Lighten the load or shorten the range.",
    frames: [
      {
        label: "Start",
        cue: "Elbow bent, hands near your chest.",
        pose: stand({ t: 8, u: 5, f: 150 }),
      },
      {
        label: "Press",
        cue: "Straighten the elbow without moving the shoulder.",
        pose: stand({ t: 8, u: 4, f: 95 }),
      },
      {
        label: "Finish",
        cue: "Lock out gently, then return slowly.",
        pose: stand({ t: 8, u: 2, f: 12 }),
      },
    ],
  },
  core: {
    id: "core",
    title: "Plank hold",
    keep: "Ribs down, glutes squeezed, long neck.",
    ease: "Drop to your knees or raise your hands. Stop if your lower back aches.",
    frames: [
      {
        label: "Set up",
        cue: "Forearms under shoulders, body in one line.",
        pose: { hip: [50, 78], t: 82, feet: [[4, 90]], u: 0, f: 90 },
      },
      {
        label: "Brace",
        cue: "Squeeze your glutes and breathe behind the brace.",
        pose: { hip: [50, 77], t: 82, feet: [[4, 90]], u: 0, f: 90 },
      },
      {
        label: "Hold",
        cue: "Keep the line; stop when form fades.",
        pose: { hip: [50, 78], t: 82, feet: [[4, 90]], u: 0, f: 90 },
      },
    ],
  },
  calf: {
    id: "calf",
    title: "Calf raise",
    keep: "Rise straight up; slow on the way down.",
    ease: "Hold a support. Skip the full range if your Achilles is sore.",
    frames: [
      { label: "Set up", cue: "Stand tall on the balls of your feet.", pose: stand() },
      {
        label: "Rise",
        cue: "Press up as high as you can.",
        pose: { hip: [50, 38], t: 0, feet: [[50, 84]], u: 0, f: 0 },
      },
      {
        label: "Lower",
        cue: "Lower for three counts.",
        pose: { hip: [50, 42], t: 0, feet: [[50, 88]], u: 0, f: 0 },
      },
    ],
  },
  glute: {
    id: "glute",
    title: "Glute bridge",
    keep: "Ribs down; drive through your heels.",
    ease: "Shorten the lift. Stop if your lower back pinches.",
    frames: [
      {
        label: "Set up",
        cue: "Lie back, knees bent, feet flat.",
        pose: { hip: [40, 84], t: -88, feet: [[56, 90]], u: 95, f: 95 },
      },
      {
        label: "Lift",
        cue: "Press through your heels and lift the hips.",
        pose: { hip: [42, 66], t: -147, feet: [[56, 90]], u: 95, f: 95 },
      },
      {
        label: "Hold",
        cue: "Squeeze at the top, then lower slowly.",
        pose: { hip: [42, 62], t: -150, feet: [[56, 90]], u: 95, f: 95 },
      },
    ],
  },
};

const ALIAS: Record<string, string> = {
  squat: "squat",
  lunge: "lunge",
  hinge: "hinge",
  glute: "glute",
  push_horizontal: "push_horizontal",
  chest_isolation: "push_horizontal",
  push_vertical: "push_vertical",
  shoulder_isolation: "push_vertical",
  pull_horizontal: "pull_horizontal",
  back_isolation: "pull_horizontal",
  pull_vertical: "pull_vertical",
  arms_biceps: "arms_biceps",
  arms_triceps: "arms_triceps",
  core: "core",
  calf: "calf",
};

/** The generic guide for a catalogue movement pattern, if one exists. */
export function guideFor(pattern: string | undefined): FormGuide | undefined {
  return pattern ? FORM_GUIDES[ALIAS[pattern] ?? ""] : undefined;
}
