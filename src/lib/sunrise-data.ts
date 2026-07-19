import workoutA from "@/assets/workout-a.jpg";
import workoutB from "@/assets/workout-b.jpg";
import workoutC from "@/assets/workout-c.jpg";
import workoutD from "@/assets/workout-d.jpg";

import chestPress from "@/assets/exercises/chest-press.jpg";
import inclinePress from "@/assets/exercises/incline-press.jpg";
import cableFly from "@/assets/exercises/cable-fly.jpg";
import tricepPushdown from "@/assets/exercises/tricep-pushdown.jpg";
import overheadTricep from "@/assets/exercises/overhead-tricep.jpg";
import plank from "@/assets/exercises/plank.jpg";
import latPulldown from "@/assets/exercises/lat-pulldown.jpg";
import cableRow from "@/assets/exercises/cable-row.jpg";
import assistedPullup from "@/assets/exercises/assisted-pullup.jpg";
import bicepCurl from "@/assets/exercises/bicep-curl.jpg";
import hammerCurl from "@/assets/exercises/hammer-curl.jpg";
import legRaise from "@/assets/exercises/leg-raise.jpg";
import shoulderPress from "@/assets/exercises/shoulder-press.jpg";
import lateralRaise from "@/assets/exercises/lateral-raise.jpg";
import facePull from "@/assets/exercises/face-pull.jpg";
import ezCurl from "@/assets/exercises/ez-curl.jpg";
import tricepDip from "@/assets/exercises/tricep-dip.jpg";
import cableCrunch from "@/assets/exercises/cable-crunch.jpg";

// training.fit hosts short exercise-guide articles — used as the "picture
// reference" link on every exercise and workout, alongside a video demo.
export const trainingFitUrl = (query: string) =>
  `https://training.fit/?s=${encodeURIComponent(query)}&int=1`;

export type Exercise = {
  id: string;
  name: string;
  scheme: string;
  cue: string;
  image: string;
  youtube: string;
  weighted: boolean;
  startWeight?: number;
};

export type Workout = {
  id: string;
  letter: string;
  title: string;
  focus: string;
  image: string;
  week: string;
  cardioMachine: string;
  cardio: string;
  exercises: Exercise[];
};

export const workouts: Workout[] = [
  {
    id: "a",
    letter: "A",
    title: "Chest & Triceps",
    focus: "Push day. Slow eccentrics, full stretch at the bottom.",
    image: workoutA,
    week: "Week 1",
    cardioMachine: "Treadmill",
    cardio: "20 min, incline walk or light jog",
    exercises: [
      {
        id: "a1",
        name: "Chest Press Machine",
        scheme: "3 × 10",
        cue: "Handles at nipple line. Pause a beat at the bottom.",
        image: chestPress,
        youtube: "xUm0BiZCWlQ",
        weighted: true,
        startWeight: 15,
      },
      {
        id: "a2",
        name: "Incline DB / Machine Press",
        scheme: "3 × 10",
        cue: "Bench at ~30°. Elbows tucked ~45°, not flared.",
        image: inclinePress,
        youtube: "8iPEnn-ltC8",
        weighted: true,
        startWeight: 10,
      },
      {
        id: "a3",
        name: "Cable Chest Fly",
        scheme: "3 × 12",
        cue: "Slight elbow bend, hug a tree. Squeeze in the middle.",
        image: cableFly,
        youtube: "Iwe6AmxVf7o",
        weighted: true,
        startWeight: 7,
      },
      {
        id: "a4",
        name: "Tricep Pushdown (Cable)",
        scheme: "3 × 12",
        cue: "Elbows pinned to your ribs. Only the forearms move.",
        image: tricepPushdown,
        youtube: "2-LAMcpzODU",
        weighted: true,
        startWeight: 12,
      },
      {
        id: "a5",
        name: "Overhead Tricep Extension",
        scheme: "3 × 12",
        cue: "Full stretch overhead. Keep elbows narrow.",
        image: overheadTricep,
        youtube: "_gsUck-7M74",
        weighted: true,
        startWeight: 8,
      },
      {
        id: "a6",
        name: "Plank",
        scheme: "3 × 30–45s",
        cue: "Glutes tight, ribs down, don't let hips sag.",
        image: plank,
        youtube: "ASdvN_XEl_c",
        weighted: false,
      },
    ],
  },
  {
    id: "b",
    letter: "B",
    title: "Back & Biceps",
    focus: "Pull day. Lead every rep with the elbow, not the hand.",
    image: workoutB,
    week: "Week 2",
    cardioMachine: "Stairmaster",
    cardio: "20 min, steady climb",
    exercises: [
      {
        id: "b1",
        name: "Lat Pulldown",
        scheme: "3 × 10",
        cue: "Bar to upper chest. Chest up, drive elbows down.",
        image: latPulldown,
        youtube: "CAwf7n6Luuc",
        weighted: true,
        startWeight: 20,
      },
      {
        id: "b2",
        name: "Seated Cable Row",
        scheme: "3 × 10",
        cue: "Shoulders back and down. No jerking with the lower back.",
        image: cableRow,
        youtube: "GZbfZ033f74",
        weighted: true,
        startWeight: 20,
      },
      {
        id: "b3",
        name: "Assisted Pull-Up Machine",
        scheme: "3 × 8",
        cue: "Use the least assistance you can control. (Weight = assistance, so lower is harder.)",
        image: assistedPullup,
        youtube: "wFj808u2HWQ",
        weighted: true,
        startWeight: 35,
      },
      {
        id: "b4",
        name: "Bicep Curl (Machine or DB)",
        scheme: "3 × 12",
        cue: "Elbows still. Full range top to bottom.",
        image: bicepCurl,
        youtube: "ykJmrZ5v0Oo",
        weighted: true,
        startWeight: 8,
      },
      {
        id: "b5",
        name: "Hammer Curl",
        scheme: "3 × 12",
        cue: "Neutral grip. Targets brachialis for thicker arms.",
        image: hammerCurl,
        youtube: "zC3nLlEvin4",
        weighted: true,
        startWeight: 5,
      },
      {
        id: "b6",
        name: "Hanging / Lying Leg Raise",
        scheme: "3 × 12",
        cue: "Slow down on the way back — that's the core work.",
        image: legRaise,
        youtube: "Pr1ieGZ5atk",
        weighted: false,
      },
    ],
  },
  {
    id: "c",
    letter: "C",
    title: "Shoulders & Arms",
    focus: "Delts and arms. Light, strict, high volume.",
    image: workoutC,
    week: "Week 3",
    cardioMachine: "Treadmill",
    cardio: "20 min, incline walk or light jog",
    exercises: [
      {
        id: "c1",
        name: "Shoulder Press Machine",
        scheme: "3 × 10",
        cue: "Don't lock out hard. Keep tension on the delts.",
        image: shoulderPress,
        youtube: "Wqq43dKW1TU",
        weighted: true,
        startWeight: 10,
      },
      {
        id: "c2",
        name: "Lateral Raise",
        scheme: "3 × 12",
        cue: "Lead with elbows, pinkies slightly up. Light weight.",
        image: lateralRaise,
        youtube: "3VcKaXpzqRo",
        weighted: true,
        startWeight: 4,
      },
      {
        id: "c3",
        name: "Face Pulls (Cable)",
        scheme: "3 × 15",
        cue: "Rope to eyes. External rotation at the end.",
        image: facePull,
        youtube: "rep-qVOkqgk",
        weighted: true,
        startWeight: 9,
      },
      {
        id: "c4",
        name: "EZ-Bar / Cable Bicep Curl",
        scheme: "3 × 12",
        cue: "No swinging. If it swings, drop the weight.",
        image: ezCurl,
        youtube: "NyBOJvKn6PU",
        weighted: true,
        startWeight: 10,
      },
      {
        id: "c5",
        name: "Tricep Dip / Rope Pushdown",
        scheme: "3 × 12",
        cue: "Fully lock out at the bottom to hit the long head.",
        image: tricepDip,
        youtube: "6kALZikXxLc",
        weighted: true,
        startWeight: 10,
      },
      {
        id: "c6",
        name: "Cable Crunch",
        scheme: "3 × 15",
        cue: "Round the spine, don't hip-hinge. Elbows to thighs.",
        image: cableCrunch,
        youtube: "9wtVpX5yTsA",
        weighted: false,
      },
    ],
  },
  {
    id: "d",
    letter: "D",
    title: "Arm Specialization + Upper Pump",
    focus: "Arm-focused finisher week. Chase the pump.",
    image: workoutD,
    week: "Week 4",
    cardioMachine: "Stairmaster",
    cardio: "20 min, steady climb",
    exercises: [
      {
        id: "d1",
        name: "Bicep Curl (Machine)",
        scheme: "4 × 12",
        cue: "Stop 1 rep short of failure on each set.",
        image: bicepCurl,
        youtube: "ykJmrZ5v0Oo",
        weighted: true,
        startWeight: 8,
      },
      {
        id: "d2",
        name: "Tricep Pushdown",
        scheme: "4 × 12",
        cue: "Squeeze hard at the bottom for 1 second.",
        image: tricepPushdown,
        youtube: "2-LAMcpzODU",
        weighted: true,
        startWeight: 12,
      },
      {
        id: "d3",
        name: "Chest Press",
        scheme: "2 × 12",
        cue: "Backoff sets — smooth, not heavy.",
        image: chestPress,
        youtube: "xUm0BiZCWlQ",
        weighted: true,
        startWeight: 15,
      },
      {
        id: "d4",
        name: "Lat Pulldown",
        scheme: "2 × 12",
        cue: "Feel the lats, not the biceps.",
        image: latPulldown,
        youtube: "CAwf7n6Luuc",
        weighted: true,
        startWeight: 20,
      },
      {
        id: "d5",
        name: "Lateral Raise",
        scheme: "2 × 15",
        cue: "Burnout — go light, don't cheat.",
        image: lateralRaise,
        youtube: "3VcKaXpzqRo",
        weighted: true,
        startWeight: 4,
      },
      {
        id: "d6",
        name: "Plank / Cable Crunch",
        scheme: "3 rounds",
        cue: "Alternate. 45s plank, 15 crunches.",
        image: plank,
        youtube: "ASdvN_XEl_c",
        weighted: false,
      },
    ],
  },
];

export const MACROS = [
  { key: "kcal", val: "2,760", label: "kcal" },
  { key: "carbs", val: "345g", label: "carbs" },
  { key: "fat", val: "92g", label: "fat" },
  { key: "protein", val: "138g", label: "protein" },
];

export type ShoppingItem = { id: string; item: string; where: string; notes: string };

export const SHOPPING: ShoppingItem[] = [
  {
    id: "chicken",
    item: "Chicken breast/thigh, mince, lamb",
    where: "Halal butcher, or Iceland frozen halal range",
    notes: "Iceland stocks an HFA-certified halal range nationwide — reliable for batch buying.",
  },
  {
    id: "tuna",
    item: "Tinned tuna",
    where: "Lidl (Nixe, ~69p/145g tin)",
    notes: "Fish is halal by default — no certification needed.",
  },
  { id: "eggs", item: "Eggs", where: "Lidl (Milbona)", notes: "Fine as-is." },
  {
    id: "yoghurt",
    item: "Plain Greek yoghurt, cottage cheese",
    where: "Lidl (Milbona, plain/natural only)",
    notes:
      'Stick to plain/natural — flavoured versions can contain gelatin or E120. Check for a "suitable for vegetarians" mark.',
  },
  {
    id: "shakes",
    item: "Protein shakes (Milbona/Clear Whey)",
    where: "Lidl",
    notes: "Milk-based whey is generally fine — scan for animal-derived flavouring agents.",
  },
  { id: "staples", item: "Oats, rice, bread, veg", where: "Lidl", notes: "No issue." },
];

// `image` is a /public path, e.g. /meals/breakfast.jpg — see AGENTS notes for
// exact filenames. Missing files fail gracefully (MealThumb falls back to an icon).
export type Meal = { id: string; name: string; kcal: string; items: string[]; image: string };

export const MEALS: Meal[] = [
  {
    id: "breakfast",
    name: "Breakfast",
    kcal: "~650 kcal",
    items: [
      "60g oats + 150g plain Milbona Greek yoghurt + 1 banana",
      "3 eggs, scrambled, on 2 slices toast",
    ],
    image: "/meals/breakfast.jpg",
  },
  {
    id: "lunch",
    name: "Lunch (batch-cooked)",
    kcal: "~700 kcal",
    items: [
      "200g halal chicken breast (cooked)",
      "250g white rice or potatoes (cooked)",
      "Mixed veg / sauce of choice",
    ],
    image: "/meals/lunch.jpg",
  },
  {
    id: "post-gym",
    name: "Post-gym",
    kcal: "~300 kcal",
    items: ["1 scoop Clear Whey shake, or a Lidl Milbona protein shake"],
    image: "/meals/post-gym.jpg",
  },
  {
    id: "dinner",
    name: "Dinner",
    kcal: "~700 kcal",
    items: ["200g halal chicken thigh, lamb, or mince", "200g rice or potatoes", "Vegetables"],
    image: "/meals/dinner.jpg",
  },
  {
    id: "evening-top-up",
    name: "Evening top-up",
    kcal: "~400 kcal",
    items: [
      "Plain Milbona cottage cheese (150g) + a Nixe tuna tin",
      "or Greek yoghurt + honey + oats",
    ],
    image: "/meals/evening-top-up.jpg",
  },
];

export const SUPPLEMENTS = [
  {
    id: "vitd",
    name: "Vitamin D",
    time: "With breakfast",
    why: "Fat-soluble, absorbs better with food.",
  },
  {
    id: "multi",
    name: "Vitamin A–Z",
    time: "With breakfast",
    why: "Same reason — easier to remember paired with Vit D.",
  },
  {
    id: "fish",
    name: "Fish Oil",
    time: "With breakfast or dinner",
    why: "Fat-soluble — take with a meal containing some fat.",
  },
  {
    id: "creatine",
    name: "Creatine 5g",
    time: "Post-gym, with water",
    why: "Works on consistency, not timing — pick a time you'll never skip.",
  },
  {
    id: "whey",
    name: "Clear Whey",
    time: "Post-workout / snack",
    why: "Protein top-up toward the 138g daily target.",
  },
];
