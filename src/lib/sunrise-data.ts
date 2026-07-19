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
import latPulldown from "@/assets/exercises/lat-pulldown-photo.png";
import neckLatPulldown from "@/assets/exercises/neck-lat-pulldown-photo.png";
import cableRow from "@/assets/exercises/cable-row-photo.png";
import seatedMachineRow from "@/assets/exercises/seated-machine-row-photo.png";
import bicepCurl from "@/assets/exercises/bicep-curl-photo.png";
import hammerCurl from "@/assets/exercises/hammer-curl-photo.png";
import shoulderPress from "@/assets/exercises/shoulder-press.jpg";
import lateralRaise from "@/assets/exercises/lateral-raise.jpg";
import facePull from "@/assets/exercises/face-pull.jpg";

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
  /** Machine/cable-only substitute — same muscle group, different equipment. */
  alt?: string;
  /** Reference photo for the alt exercise, when we have one. */
  altImage?: string;
  /** Shown only in the expanded card view. */
  muscle?: string;
  equipment?: string;
  description?: string;
  rest?: string;
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
    focus: "Push day. Machines and cables only. Slow eccentrics, full stretch at the bottom.",
    image: workoutA,
    week: "Week 1",
    cardioMachine: "Treadmill",
    cardio: "20 min, incline walk or light jog",
    exercises: [
      {
        id: "a1",
        name: "Flat Chest Press Machine",
        scheme: "3 × 8–12",
        cue: "Handles at nipple line. Pause a beat at the bottom.",
        image: chestPress,
        weighted: true,
        startWeight: 10,
        alt: "Cable Chest Press",
        muscle: "Chest — mid/lower",
        equipment: "Chest press machine",
        description:
          "The base movement for a bigger chest — builds overall thickness. Press until your arms are just short of locked out, then control the way back down.",
        rest: "Rest 90–120s",
      },
      {
        id: "a2",
        name: "Incline Chest Press Machine",
        scheme: "3 × 8–12",
        cue: "Machine angle ~30°. Elbows tucked ~45°, not flared.",
        image: inclinePress,
        weighted: true,
        startWeight: 5,
        alt: "Smith Machine Incline Press",
        muscle: "Chest — upper",
        equipment: "Incline press machine or Smith machine",
        description:
          "Targets the upper chest specifically — the part that makes your chest look wider and fuller from the front.",
        rest: "Rest 90–120s",
      },
      {
        id: "a3",
        name: "Cable Chest Fly",
        scheme: "3 × 12–15",
        cue: "Slight elbow bend, hug a tree. Squeeze in the middle.",
        image: cableFly,
        weighted: true,
        startWeight: 3,
        alt: "Machine Pec Deck Fly",
        altImage: machineFly,
        muscle: "Chest — inner/mid",
        equipment: "Cable crossover station",
        description:
          "Stretches and squeezes the chest through a wide arc — builds inner-chest definition a pressing machine alone can't reach.",
        rest: "Rest 60–90s",
      },
      {
        id: "a4",
        name: "Rope Tricep Pushdown",
        scheme: "3 × 10–15",
        cue: "Elbows pinned to your ribs. Only the forearms move.",
        image: tricepPushdown,
        weighted: true,
        startWeight: 8,
        alt: "Straight-Bar Pushdown",
        muscle: "Triceps — lateral head",
        equipment: "Cable stack + rope or straight bar",
        description:
          "The bread-and-butter tricep builder. Keep your elbows pinned so the triceps do all the work, not your shoulders.",
        rest: "Rest 60–90s",
      },
      {
        id: "a5",
        name: "Overhead Rope Tricep Extension",
        scheme: "3 × 10–15",
        cue: "Full stretch overhead. Keep elbows narrow, don't flare.",
        image: overheadTricep,
        weighted: true,
        startWeight: 5,
        alt: "Single-Arm Cable Extension",
        muscle: "Triceps — long head",
        equipment: "Cable stack + rope, overhead pulley",
        description:
          "Targets the triceps' long head, which adds the most visible size to your arms when seen from behind — the head most curls and pushdowns miss.",
        rest: "Rest 60–90s",
      },
    ],
  },
  {
    id: "b",
    letter: "B",
    title: "Back & Biceps",
    focus: "Pull day. Machines and cables only. Lead every rep with the elbow, not the hand.",
    image: workoutB,
    week: "Week 2",
    cardioMachine: "Stairmaster",
    cardio: "20 min, steady climb",
    exercises: [
      {
        id: "b1",
        name: "Lat Pulldown",
        scheme: "3 × 8–12",
        cue: "Bar to upper chest. Chest up, drive elbows down.",
        image: latPulldown,
        weighted: true,
        startWeight: 15,
        alt: "Close-Grip / V-Bar Pulldown",
        muscle: "Back — lats, width",
        equipment: "Lat pulldown machine",
        description:
          "Builds back width — the main driver of that wider V-taper look. Feel it in the lats, not the forearms.",
        rest: "Rest 90–120s",
      },
      {
        id: "b2",
        name: "Seated Cable Row",
        scheme: "3 × 8–12",
        cue: "Shoulders back and down. No jerking with the lower back.",
        image: cableRow,
        weighted: true,
        startWeight: 15,
        alt: "Seated Machine Row",
        altImage: seatedMachineRow,
        muscle: "Back — mid, thickness",
        equipment: "Seated cable row station",
        description:
          "Builds back thickness by pulling through the mid-back. Keep the torso still — no rocking.",
        rest: "Rest 90–120s",
      },
      {
        id: "b3",
        name: "Straight-Arm Rope Pulldown",
        scheme: "2 × 12–15",
        cue: "Hinge slightly, keep arms straight — pull with the lats, not the arms.",
        image: neckLatPulldown,
        weighted: true,
        startWeight: 5,
        alt: "Straight-Bar Pulldown",
        muscle: "Lats",
        equipment: "Cable stack + rope, high pulley",
        description:
          "A pullover-pattern lat isolation move — locks the lats in without letting the biceps take over like they do on a pulldown.",
        rest: "Rest 60–90s",
      },
      {
        id: "b4",
        name: "Cable Bicep Curl",
        scheme: "3 × 10–15",
        cue: "Elbows still. Full range top to bottom.",
        image: bicepCurl,
        weighted: true,
        startWeight: 5,
        alt: "Cable Preacher Curl",
        muscle: "Biceps",
        equipment: "Low pulley + straight bar or handle",
        description:
          "Constant cable tension through the whole rep, unlike a free-weight curl where tension drops off at the top.",
        rest: "Rest 60–90s",
      },
      {
        id: "b5",
        name: "Rope Hammer Curl",
        scheme: "3 × 10–15",
        cue: "Neutral grip. Targets brachialis for thicker arms.",
        image: hammerCurl,
        weighted: true,
        startWeight: 5,
        alt: "Rope Preacher Curl",
        muscle: "Biceps + forearms — brachialis",
        equipment: "Cable stack + rope, low pulley",
        description:
          "The neutral grip shifts work onto the brachialis, which pushes the bicep up and makes the arm look thicker from the side.",
        rest: "Rest 60–90s",
      },
    ],
  },
  {
    id: "c",
    letter: "C",
    title: "Shoulders & Arms",
    focus: "Delts and arms. Machines and cables only. Light, strict, high volume.",
    image: workoutC,
    week: "Week 3",
    cardioMachine: "Treadmill",
    cardio: "20 min, incline walk or light jog",
    exercises: [
      {
        id: "c1",
        name: "Shoulder Press Machine",
        scheme: "3 × 8–12",
        cue: "Don't lock out hard. Keep tension on the delts.",
        image: shoulderPress,
        weighted: true,
        startWeight: 5,
        alt: "Smith Machine Shoulder Press",
        muscle: "Shoulders — front/side delts",
        equipment: "Shoulder press machine or Smith machine",
        description:
          "Builds overall shoulder size and width — a bigger chest looks even bigger sitting on top of developed shoulders.",
        rest: "Rest 90–120s",
      },
      {
        id: "c2",
        name: "Single-Arm Cable Lateral Raise",
        scheme: "3 × 12–15 each arm",
        cue: "Lead with the elbow, pinky slightly up. One arm at a time, light weight.",
        image: lateralRaise,
        weighted: true,
        startWeight: 2,
        alt: "Cross-Body Cable Lateral Raise",
        muscle: "Shoulders — side delts",
        equipment: "Low pulley, single handle",
        description:
          "The side delt is what actually adds width to your frame. Cable keeps tension on through the whole rep, unlike a dumbbell.",
        rest: "Rest 60–90s",
      },
      {
        id: "c3",
        name: "Cable Face Pulls",
        scheme: "3 × 12–15",
        cue: "Rope to eyes. External rotation at the end.",
        image: facePull,
        weighted: true,
        startWeight: 5,
        alt: "Cable Reverse Fly",
        muscle: "Rear delts + upper back",
        equipment: "Rope attachment, face-height pulley",
        description:
          "Balances out all the pressing — keeps your shoulders healthy and stops your posture caving forward.",
        rest: "Rest 60–90s",
      },
      {
        id: "c4",
        name: "Cable Preacher Curl",
        scheme: "3 × 10–15",
        cue: "Elbow locked to the pad. No swinging — that's the whole point of the preacher curl.",
        image: bicepCurl,
        weighted: true,
        startWeight: 5,
        alt: "Straight-Bar Cable Curl",
        muscle: "Biceps — peak",
        equipment: "Preacher pad + low pulley",
        description:
          "Locks the elbow in place so the bicep does all the work — no swinging, no momentum.",
        rest: "Rest 60–90s",
      },
      {
        id: "c5",
        name: "Overhead Rope Tricep Extension",
        scheme: "3 × 10–15",
        cue: "Full stretch overhead. Keep elbows narrow, don't flare.",
        image: overheadTricep,
        weighted: true,
        startWeight: 5,
        alt: "Machine Tricep Extension",
        muscle: "Triceps — long head",
        equipment: "Cable stack + rope, overhead pulley",
        description:
          "Targets the triceps' long head, which adds the most visible size to your arms when seen from behind.",
        rest: "Rest 60–90s",
      },
    ],
  },
  {
    id: "d",
    letter: "D",
    title: "Arm Specialisation + Upper Maintenance",
    focus: "Arm-focused finisher. Machines and cables only. Chase the pump.",
    image: workoutD,
    week: "Week 4",
    cardioMachine: "Stairmaster",
    cardio: "20 min, steady climb",
    exercises: [
      {
        id: "d1",
        name: "Bicep Curl Machine or Cable Preacher Curl",
        scheme: "3 × 10–15",
        cue: "Stop 1 rep short of failure on each set.",
        image: bicepCurl,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps",
        equipment: "Curl machine or cable preacher station",
        description:
          "Finisher volume for the arms — go close to failure here since it's the last biceps exposure of the week.",
        rest: "Rest 60–90s",
      },
      {
        id: "d2",
        name: "Rope Hammer Curl",
        scheme: "3 × 10–15",
        cue: "Neutral grip. Targets brachialis for thicker arms.",
        image: hammerCurl,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps + forearms — brachialis",
        equipment: "Cable stack + rope, low pulley",
        description:
          "The neutral grip shifts work onto the brachialis, making the arm look thicker from the side.",
        rest: "Rest 60–90s",
      },
      {
        id: "d3",
        name: "Rope Tricep Pushdown",
        scheme: "3 × 10–15",
        cue: "Squeeze hard at the bottom for 1 second.",
        image: tricepPushdown,
        weighted: true,
        startWeight: 8,
        alt: "Straight-Bar Pushdown",
        muscle: "Triceps — lateral head",
        equipment: "Cable stack + rope or straight bar",
        description:
          "The bread-and-butter tricep builder. Keep elbows pinned so the triceps do all the work.",
        rest: "Rest 60–90s",
      },
      {
        id: "d4",
        name: "Single-Arm Cable Tricep Extension",
        scheme: "2 × 12–15 each arm",
        cue: "One arm at a time — don't let the stronger arm do more work.",
        image: overheadTricep,
        weighted: true,
        startWeight: 3,
        muscle: "Triceps — long head",
        equipment: "Low pulley, single handle, behind head",
        description:
          "Unilateral finisher — lets you push each arm to its own limit instead of the stronger arm carrying the set.",
        rest: "Rest 60–90s",
      },
      {
        id: "d5",
        name: "Chest Press Machine",
        scheme: "2 × 10–12",
        cue: "Backoff sets — smooth, not heavy.",
        image: chestPress,
        weighted: true,
        startWeight: 10,
        alt: "Cable Chest Press",
        muscle: "Chest — mid/lower",
        equipment: "Chest press machine",
        description: "Backoff volume for the chest — smooth reps, not a new max.",
        rest: "Rest 90–120s",
      },
      {
        id: "d6",
        name: "Lat Pulldown",
        scheme: "2 × 10–12",
        cue: "Feel the lats, not the biceps.",
        image: latPulldown,
        weighted: true,
        startWeight: 15,
        alt: "Close-Grip / V-Bar Pulldown",
        muscle: "Back — lats, width",
        equipment: "Lat pulldown machine",
        description: "Backoff volume for the back — keep it smooth and controlled.",
        rest: "Rest 90–120s",
      },
      {
        id: "d7",
        name: "Cable Lateral Raise",
        scheme: "2 × 12–15",
        cue: "Light weight, lead with the elbows — this is backoff volume for the delts.",
        image: lateralRaise,
        weighted: true,
        startWeight: 2,
        muscle: "Shoulders — side delts",
        equipment: "Low pulley cable station",
        description:
          "Extra delt volume to close out the arm day — keep it light and strict, no swinging.",
        rest: "Rest 60–90s",
      },
    ],
  },
];

/**
 * Weekday split for once you're in Day-rotation mode. Purely informational —
 * the app still advances A→B→C→D on cardio-complete rather than reading the
 * calendar, but this is the schedule the rotation is designed to line up with.
 */
export const WEEKLY_SPLIT = [
  { day: "Mon", letter: "A" },
  { day: "Tue", letter: "B" },
  { day: "Wed", letter: null },
  { day: "Thu", letter: "C" },
  { day: "Fri", letter: null },
  { day: "Sat", letter: "D" },
  { day: "Sun", letter: null },
] as const;

export const MACROS = [
  { key: "kcal", val: "2,760", label: "kcal" },
  { key: "carbs", val: "345g", label: "carbs" },
  { key: "fat", val: "92g", label: "fat" },
  { key: "protein", val: "138g", label: "protein" },
];

// A day that lands in these ranges still counts as a win — no need to hit
// the exact target above to the gram.
export const MACRO_RANGE =
  "Success zone: 2,650–2,850 kcal · 130–145g protein · 330–360g carbs · 85–100g fat.";

export type ShoppingItem = { id: string; item: string; where: string; notes: string };

export const SHOPPING: ShoppingItem[] = [
  {
    id: "chicken",
    item: "Halal chicken breast",
    where: "ASDA — Shazans (HFA-approved), 1–1.5kg/week",
    notes:
      "100% chicken, ~21.8g protein per 100g raw. Availability and pack size vary — check the label.",
  },
  {
    id: "rice",
    item: "Basmati rice",
    where: "ASDA — one large bag/week",
    notes: "Cook 300g portions at a time as part of the chicken-and-rice batch.",
  },
  {
    id: "eggs",
    item: "Eggs",
    where: "ASDA or Lidl — 12–15/week",
    notes: "Boiled eggs for lunch, scrambled for breakfast if you skip the shake.",
  },
  {
    id: "milk",
    item: "Whole milk",
    where: "ASDA or Lidl — 4–6 pints/week",
    notes: "Base of the breakfast shake — don't swap for skimmed, you need the calories.",
  },
  {
    id: "bagels",
    item: "Plain bagels",
    where: "ASDA — 2 packs/week",
    notes: "ASDA currently lists plain bagels five to a pack.",
  },
  {
    id: "peanut-butter",
    item: "Smooth peanut butter",
    where: "ASDA or Lidl — one jar/week",
    notes: "Smooth blends into the shake cleanly; also goes on the evening bagel.",
  },
  {
    id: "oats",
    item: "Oats",
    where: "ASDA or Lidl — one large bag/week",
    notes: "Instant oats blend smoother into the breakfast shake than jumbo.",
  },
  {
    id: "honey",
    item: "Honey",
    where: "ASDA or Lidl — one bottle/week",
    notes: "Easy extra carbs/calories in the shake, the evening bagel, or on yoghurt.",
  },
  {
    id: "bananas",
    item: "Bananas",
    where: "ASDA or Lidl — 7–10/week",
    notes: "One a day, mainly in the breakfast shake.",
  },
  {
    id: "oj",
    item: "Orange juice",
    where: "ASDA or Lidl — 1–2 cartons/week",
    notes: "Pairs with the evening bagel for the last easy calories of the day.",
  },
  {
    id: "veg",
    item: "Sweetcorn / mixed vegetables",
    where: "ASDA or Lidl — frozen bag or tins",
    notes: "Goes with the chicken and rice.",
  },
  {
    id: "oil",
    item: "Olive oil",
    where: "ASDA or Lidl — one bottle/week",
    notes:
      "20g adds ~180 kcal to the chicken and rice without any extra chewing — weigh it, don't eyeball it.",
  },
  {
    id: "tuna-sandwich",
    item: "Tuna sandwich",
    where: "Tesco — bought on workdays",
    notes:
      "Tesco changes recipes and portion sizes — scan the exact label in MyFitnessPal each time you buy.",
  },
  {
    id: "arla",
    item: "Arla Protein shake (chocolate)",
    where: "ASDA — 3–5/week for convenient days",
    notes:
      "~225 kcal, 26.3g protein, 23g carbs, 2.9g fat. ASDA lists it as halal; Arla publishes the nutrition panel.",
  },
  {
    id: "clear-whey",
    item: "Applied Nutrition Clear Whey (halal-certified)",
    where: "ASDA — one tub, top up as needed",
    notes:
      "~90 kcal, 21g protein per serving. Low-calorie — use to fill a protein gap, not as a meal replacement.",
  },
  {
    id: "skyr",
    item: "Milbona Skyr (high-protein yoghurt)",
    where: "Lidl — top-up",
    notes:
      "Up to ~49g protein per pot. Backup meal with granola, honey and banana when you don't want a bagel.",
  },
];

// `image` is a /public path, e.g. /meals/breakfast.jpg. Missing files fail
// gracefully — ThumbImage falls back to an icon tile.
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
    name: "Bulking Breakfast Shake",
    tag: "breakfast",
    kcal: "~650–700 kcal",
    items: [
      "300ml whole milk",
      "50g oats (blend first, or use instant)",
      "1 banana",
      "20g smooth peanut butter",
      "20g honey",
      "Optional: 1 scoop halal-certified whey, less peanut butter to compensate",
    ],
    image: "/meals/breakfast.jpg",
  },
  {
    id: "lunch",
    name: "Tuna Sandwich, Eggs & Arla Shake",
    tag: "lunch",
    kcal: "~700–800 kcal",
    items: [
      "Tesco tuna sandwich (scan the exact label — recipes change)",
      "2 boiled eggs, brought from home",
      "Arla Protein chocolate shake (225 kcal, 26.3g protein)",
      "Cheaper-day swap: tuna sandwich + 2 eggs + banana or bagel + water",
    ],
    image: "/meals/lunch.jpg",
  },
  {
    id: "post-gym",
    name: "Post-gym Shake",
    tag: "post-gym",
    kcal: "~90–225 kcal",
    items: [
      "Applied Nutrition Clear Whey (halal-certified, ~90 kcal, 21g protein) with water, or",
      "An extra Arla Protein bottle if you're short on the day's protein",
    ],
    image: "/meals/post-gym.jpg",
  },
  {
    id: "dinner",
    name: "Halal Chicken & Rice",
    tag: "dinner",
    kcal: "~750–850 kcal",
    items: [
      "~150g raw halal chicken breast, cooked",
      "300g cooked basmati rice",
      "100g sweetcorn or mixed vegetables",
      "15–20g olive oil, weighed — not eyeballed",
      "Batch-cook 3–4 portions at once (air-fry/grill the chicken, rice-cook the rice, divide into containers)",
    ],
    image: "/meals/dinner.jpg",
  },
  {
    id: "evening-top-up",
    name: "Evening Top-up",
    tag: "evening",
    kcal: "~450–550 kcal",
    items: [
      "1 plain bagel",
      "20g smooth peanut butter",
      "10–20g honey",
      "250ml orange juice",
      "Backup swap: 250–300g Milbona Skyr + granola + honey + banana",
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
