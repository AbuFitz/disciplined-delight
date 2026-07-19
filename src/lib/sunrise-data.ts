import workoutA from "@/assets/workout-a.jpg";
import workoutB from "@/assets/workout-b.jpg";
import workoutC from "@/assets/workout-c.jpg";
import workoutD from "@/assets/workout-d.jpg";

import chestPress from "@/assets/exercises/chest-press-photo.png";
import inclinePress from "@/assets/exercises/incline-press-photo.png";
import cableFly from "@/assets/exercises/cable-fly-photo.png";
import machineFly from "@/assets/exercises/machine-fly-photo.png";
import tricepPushdown from "@/assets/exercises/tricep-pushdown-photo.png";
import overheadTricep from "@/assets/exercises/overhead-tricep-photo.png";
import plank from "@/assets/exercises/plank.jpg";
import latPulldown from "@/assets/exercises/lat-pulldown-photo.png";
import cableRow from "@/assets/exercises/cable-row-photo.png";
import seatedMachineRow from "@/assets/exercises/seated-machine-row-photo.png";
import assistedPullup from "@/assets/exercises/assisted-pullup-photo.png";
import bicepCurl from "@/assets/exercises/bicep-curl-photo.png";
import hammerCurl from "@/assets/exercises/hammer-curl-photo.png";
import legRaise from "@/assets/exercises/leg-raise.jpg";
import shoulderPress from "@/assets/exercises/shoulder-press.jpg";
import lateralRaise from "@/assets/exercises/lateral-raise.jpg";
import facePull from "@/assets/exercises/face-pull.jpg";
import ezCurl from "@/assets/exercises/ez-curl.jpg";
import tricepDip from "@/assets/exercises/tricep-dip.jpg";
import cableCrunch from "@/assets/exercises/cable-crunch.jpg";

// Search links instead of fixed video IDs / deep pages — a specific video can
// go private or a specific page can 404, a search never breaks.
export const youtubeSearchUrl = (query: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} shorts`)}`;

export const diagramSearchUrl = (query: string) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${query} diagram`)}`;

// General exercise-directory sites — link the homepage/search, not a specific
// exercise page, since those deep links break as sites reorganize.
export const RESOURCES = [
  { name: "MuscleWiki", url: "https://musclewiki.com/" },
  { name: "ExRx.net", url: "https://exrx.net/Lists/Directory" },
];

export type Exercise = {
  id: string;
  name: string;
  scheme: string;
  cue: string;
  image: string;
  weighted: boolean;
  startWeight?: number;
  /** Machine/cable/DB-only substitute — same muscle group, different equipment. */
  alt?: string;
  /** Reference photo for the alt exercise, when we have one. */
  altImage?: string;
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
        weighted: true,
        startWeight: 15,
      },
      {
        id: "a2",
        name: "Incline DB / Machine Press",
        scheme: "3 × 10",
        cue: "Bench at ~30°. Elbows tucked ~45°, not flared.",
        image: inclinePress,
        weighted: true,
        startWeight: 10,
      },
      {
        id: "a3",
        name: "Cable Chest Fly",
        scheme: "3 × 12",
        cue: "Slight elbow bend, hug a tree. Squeeze in the middle.",
        image: cableFly,
        weighted: true,
        startWeight: 7,
        alt: "Machine Pec Deck Fly",
        altImage: machineFly,
      },
      {
        id: "a4",
        name: "Tricep Pushdown (Cable)",
        scheme: "3 × 12",
        cue: "Elbows pinned to your ribs. Only the forearms move.",
        image: tricepPushdown,
        weighted: true,
        startWeight: 12,
        alt: "Cable Overhead Tricep Extension",
      },
      {
        id: "a5",
        name: "Overhead Tricep Extension",
        scheme: "3 × 12",
        cue: "Full stretch overhead. Keep elbows narrow.",
        image: overheadTricep,
        weighted: true,
        startWeight: 8,
        alt: "Cable Overhead Tricep Extension",
      },
      {
        id: "a6",
        name: "Plank",
        scheme: "3 × 30–45s",
        cue: "Glutes tight, ribs down, don't let hips sag.",
        image: plank,
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
        weighted: true,
        startWeight: 20,
        alt: "Assisted Pull-Up Machine (more load)",
      },
      {
        id: "b2",
        name: "Seated Cable Row",
        scheme: "3 × 10",
        cue: "Shoulders back and down. No jerking with the lower back.",
        image: cableRow,
        weighted: true,
        startWeight: 20,
        alt: "Seated Machine Row",
        altImage: seatedMachineRow,
      },
      {
        id: "b3",
        name: "Assisted Pull-Up Machine",
        scheme: "3 × 8",
        cue: "Use the least assistance you can control. (Weight = assistance, so lower is harder.)",
        image: assistedPullup,
        weighted: true,
        startWeight: 35,
        alt: "Heavier Lat Pulldown",
      },
      {
        id: "b4",
        name: "Bicep Curl (Machine or DB)",
        scheme: "3 × 12",
        cue: "Elbows still. Full range top to bottom.",
        image: bicepCurl,
        weighted: true,
        startWeight: 8,
        alt: "Cable Bicep Curl",
      },
      {
        id: "b5",
        name: "Hammer Curl",
        scheme: "3 × 12",
        cue: "Neutral grip. Targets brachialis for thicker arms.",
        image: hammerCurl,
        weighted: true,
        startWeight: 5,
        alt: "Dumbbell Hammer Curl",
      },
      {
        id: "b6",
        name: "Hanging / Lying Leg Raise",
        scheme: "3 × 12",
        cue: "Slow down on the way back — that's the core work.",
        image: legRaise,
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
        weighted: true,
        startWeight: 10,
        alt: "Dumbbell Shoulder Press",
      },
      {
        id: "c2",
        name: "Lateral Raise",
        scheme: "3 × 12",
        cue: "Lead with elbows, pinkies slightly up. Light weight.",
        image: lateralRaise,
        weighted: true,
        startWeight: 4,
        alt: "Dumbbell Lateral Raise",
      },
      {
        id: "c3",
        name: "Face Pulls (Cable)",
        scheme: "3 × 15",
        cue: "Rope to eyes. External rotation at the end.",
        image: facePull,
        weighted: true,
        startWeight: 9,
      },
      {
        id: "c4",
        name: "EZ-Bar / Cable Bicep Curl",
        scheme: "3 × 12",
        cue: "No swinging. If it swings, drop the weight.",
        image: ezCurl,
        weighted: true,
        startWeight: 10,
        alt: "Dumbbell Curl",
      },
      {
        id: "c5",
        name: "Tricep Dip / Rope Pushdown",
        scheme: "3 × 12",
        cue: "Fully lock out at the bottom to hit the long head.",
        image: tricepDip,
        weighted: true,
        startWeight: 10,
        alt: "Seated Dumbbell Overhead Tricep Extension",
        altImage: overheadTricep,
      },
      {
        id: "c6",
        name: "Cable Crunch",
        scheme: "3 × 15",
        cue: "Round the spine, don't hip-hinge. Elbows to thighs.",
        image: cableCrunch,
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
        weighted: true,
        startWeight: 8,
        alt: "Cable Bicep Curl",
      },
      {
        id: "d2",
        name: "Tricep Pushdown",
        scheme: "4 × 12",
        cue: "Squeeze hard at the bottom for 1 second.",
        image: tricepPushdown,
        weighted: true,
        startWeight: 12,
        alt: "Cable Overhead Tricep Extension",
      },
      {
        id: "d3",
        name: "Chest Press",
        scheme: "2 × 12",
        cue: "Backoff sets — smooth, not heavy.",
        image: chestPress,
        weighted: true,
        startWeight: 15,
      },
      {
        id: "d4",
        name: "Lat Pulldown",
        scheme: "2 × 12",
        cue: "Feel the lats, not the biceps.",
        image: latPulldown,
        weighted: true,
        startWeight: 20,
        alt: "Assisted Pull-Up Machine (more load)",
      },
      {
        id: "d5",
        name: "Lateral Raise",
        scheme: "2 × 15",
        cue: "Burnout — go light, don't cheat.",
        image: lateralRaise,
        weighted: true,
        startWeight: 4,
        alt: "Dumbbell Lateral Raise",
      },
      {
        id: "d6",
        name: "Plank / Cable Crunch",
        scheme: "3 rounds",
        cue: "Alternate. 45s plank, 15 crunches.",
        image: plank,
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
export type MealTag = "breakfast" | "lunch" | "post-gym" | "dinner" | "evening";

export type Meal = {
  id: string;
  name: string;
  tag: MealTag;
  kcal: string;
  items: string[];
  image: string;
};

export const MEALS: Meal[] = [
  {
    id: "breakfast",
    name: "Breakfast",
    tag: "breakfast",
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
    tag: "lunch",
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
    tag: "post-gym",
    kcal: "~300 kcal",
    items: ["1 scoop Clear Whey shake, or a Lidl Milbona protein shake"],
    image: "/meals/post-gym.jpg",
  },
  {
    id: "dinner",
    name: "Dinner",
    tag: "dinner",
    kcal: "~700 kcal",
    items: ["200g halal chicken thigh, lamb, or mince", "200g rice or potatoes", "Vegetables"],
    image: "/meals/dinner.jpg",
  },
  {
    id: "evening-top-up",
    name: "Evening top-up",
    tag: "evening",
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
    short: "Vit D",
    time: "With breakfast",
    why: "Fat-soluble, absorbs better with food.",
  },
  {
    id: "multi",
    name: "Vitamin A–Z",
    short: "Vit A–Z",
    time: "With breakfast",
    why: "Same reason — easier to remember paired with Vit D.",
  },
  {
    id: "fish",
    name: "Fish Oil",
    short: "Fish Oil",
    time: "With breakfast or dinner",
    why: "Fat-soluble — take with a meal containing some fat.",
  },
  {
    id: "creatine",
    name: "Creatine 5g",
    short: "Creatine",
    time: "Post-gym, with water",
    why: "Works on consistency, not timing — pick a time you'll never skip.",
  },
  {
    id: "whey",
    name: "Clear Whey",
    short: "Whey",
    time: "Post-workout / snack",
    why: "Protein top-up toward the 138g daily target.",
  },
];
