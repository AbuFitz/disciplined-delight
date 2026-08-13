import workoutA from "@/assets/workout-a.jpg";
import workoutB from "@/assets/workout-b.jpg";
import workoutC from "@/assets/workout-c.jpg";
import workoutD from "@/assets/workout-d.jpg";

import chestPress from "@/assets/exercises/chest-press-photo.png";
import inclinePress from "@/assets/exercises/incline-press-photo.png";
import cableFly from "@/assets/exercises/cable-fly-photo.png";
import machineFly from "@/assets/exercises/machine-fly-photo.png";
import tricepPushdown from "@/assets/exercises/tricep-pushdown-photo.png";
import overheadRopeTricepExtension from "@/assets/exercises/overhead-rope-tricep-extension-photo.png";
import singleArmCableTricepExtension from "@/assets/exercises/single-arm-cable-tricep-extension-photo.png";
import latPulldown from "@/assets/exercises/lat-pulldown-photo.png";
import straightArmRopePulldown from "@/assets/exercises/straight-arm-rope-pulldown-photo.png";
import cableRow from "@/assets/exercises/cable-row-photo.png";
import seatedMachineRow from "@/assets/exercises/seated-machine-row-photo.png";
import standingCableBicepCurl from "@/assets/exercises/standing-cable-bicep-curl-photo.png";
import bicepCurlMachine from "@/assets/exercises/bicep-curl-machine-photo.png";
import hammerCurl from "@/assets/exercises/hammer-curl-photo.png";
import shoulderPressMachine from "@/assets/exercises/shoulder-press-machine-photo.png";
import cableLateralRaise from "@/assets/exercises/cable-lateral-raise-photo.png";
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
  cardioMachine: string;
  cardio: string;
  exercises: Exercise[];
};

// One recurring training week — A, B, C and D are four sessions run every
// week (Mon/Tue/Thu/Sat, see WEEKLY_SPLIT below), not four separate weeks.
export const workouts: Workout[] = [
  {
    id: "a",
    letter: "A",
    title: "Chest & Triceps",
    focus: "Push day. Machines and cables only. Slow eccentrics, full stretch at the bottom.",
    image: workoutA,
    cardioMachine: "Treadmill",
    cardio: "20 min, easy/moderate incline walk",
    exercises: [
      {
        id: "a1",
        name: "Flat Chest Press Machine",
        scheme: "3 × 8–12",
        cue: "Handles around nipple level. Keep shoulder blades stable and control the eccentric.",
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
        cue: "~30° incline. Keep elbows roughly 45° from the torso.",
        image: inclinePress,
        weighted: true,
        startWeight: 5,
        muscle: "Chest — upper",
        equipment: "Incline press machine",
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
        cue: "Keep elbows fixed against the torso and fully extend the triceps.",
        image: tricepPushdown,
        weighted: true,
        startWeight: 8,
        muscle: "Triceps — lateral head",
        equipment: "Cable stack + rope",
        description:
          "The bread-and-butter tricep builder. Keep your elbows pinned so the triceps do all the work, not your shoulders.",
        rest: "Rest 60–90s",
      },
      {
        id: "a5",
        name: "Overhead Rope Tricep Extension",
        scheme: "3 × 10–15",
        cue: "Emphasise the stretched position of the long head of the triceps.",
        image: overheadRopeTricepExtension,
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
    cardioMachine: "Treadmill",
    cardio: "20 min, easy/moderate incline walk",
    exercises: [
      {
        id: "b1",
        name: "Lat Pulldown",
        scheme: "3 × 8–12",
        cue: "Bar to upper chest. Chest up, drive elbows down.",
        image: latPulldown,
        weighted: true,
        startWeight: 15,
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
        name: "Straight-Arm Cable/Rope Pulldown",
        scheme: "2 × 12–15",
        cue: "Hinge slightly, keep arms straight — pull with the lats, not the arms.",
        image: straightArmRopePulldown,
        weighted: true,
        startWeight: 5,
        muscle: "Lats",
        equipment: "Cable stack + rope, high pulley",
        description:
          "A pullover-pattern lat isolation move — locks the lats in without letting the biceps take over like they do on a pulldown.",
        rest: "Rest 60–90s",
      },
      {
        id: "b4",
        name: "Machine Preacher Curl",
        scheme: "3 × 8–12",
        cue: "Upper arm pinned to the pad the whole set — no swinging.",
        image: bicepCurlMachine,
        weighted: true,
        startWeight: 5,
        alt: "Standing Cable Bicep Curl",
        altImage: standingCableBicepCurl,
        muscle: "Biceps",
        equipment: "Preacher curl machine",
        description:
          "The primary strict biceps movement — the supported upper arm makes it much easier to maintain clean technique and progressively overload the biceps without swinging the weight up.",
        rest: "Rest 60–90s",
      },
      {
        id: "b5",
        name: "Rope Hammer Curl",
        scheme: "3 × 10–15",
        cue: "Neutral grip, elbows still.",
        image: hammerCurl,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps + forearms — brachialis/brachioradialis",
        equipment: "Cable stack + rope, low pulley",
        description:
          "Targets the brachialis and brachioradialis, which contribute to overall arm thickness alongside the biceps themselves.",
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
    cardioMachine: "Treadmill",
    cardio: "20 min, easy/moderate incline walk",
    exercises: [
      {
        id: "c1",
        name: "Shoulder Press Machine",
        scheme: "3 × 8–12",
        cue: "Don't lock out hard. Keep tension on the delts.",
        image: shoulderPressMachine,
        weighted: true,
        startWeight: 5,
        muscle: "Shoulders — front/side delts",
        equipment: "Shoulder press machine",
        description:
          "Builds overall shoulder size and width — a bigger chest looks even bigger sitting on top of developed shoulders.",
        rest: "Rest 90–120s",
      },
      {
        id: "c2",
        name: "Cable Lateral Raise",
        scheme: "3 × 12–15 per arm",
        cue: "Keep these strict and relatively light — lead with the elbow, pinky slightly up.",
        image: cableLateralRaise,
        weighted: true,
        startWeight: 2,
        muscle: "Shoulders — side delts",
        equipment: "Low pulley, single handle",
        description:
          "The side delt is what actually adds width to your frame. Cable keeps tension on through the whole rep, unlike a dumbbell.",
        rest: "Rest 60–90s",
      },
      {
        id: "c3",
        name: "Reverse Pec Deck",
        scheme: "3 × 12–20",
        cue: "Sit facing into the pad, sweep the arms back and squeeze the rear delts together.",
        image: "/exercises/reverse-pec-deck.jpg",
        weighted: true,
        startWeight: 10,
        alt: "Cable Face Pull",
        altImage: facePull,
        muscle: "Rear delts",
        equipment: "Reverse pec deck / rear-delt fly machine",
        description:
          "The primary rear-delt movement — targets the rear delts more directly than face pulls, and balances out all the pressing work in the programme.",
        rest: "Rest 60–90s",
      },
      {
        id: "c4",
        name: "Standing Cable Bicep Curl",
        scheme: "3 × 10–15",
        cue: "Elbows still, stand tall. Full range top to bottom, no swinging.",
        image: standingCableBicepCurl,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps",
        equipment: "Low pulley + straight bar or handle",
        description:
          "Constant cable tension through the whole rep, unlike a free-weight curl where tension drops off at the top.",
        rest: "Rest 60–90s",
      },
      {
        id: "c5",
        name: "Overhead Rope Tricep Extension",
        scheme: "3 × 10–15",
        cue: "Full stretch overhead. Keep elbows narrow, don't flare.",
        image: overheadRopeTricepExtension,
        weighted: true,
        startWeight: 5,
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
    focus: "Dedicated arm-focused session, plus light back/chest/shoulder maintenance.",
    image: workoutD,
    cardioMachine: "Treadmill",
    cardio: "20 min, easy/moderate incline walk",
    exercises: [
      {
        id: "d1",
        name: "Bicep Curl Machine / Standing Cable Curl",
        scheme: "3 × 10–15",
        cue: "Full range, controlled tempo — whichever's free.",
        image: bicepCurlMachine,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps",
        equipment: "Curl machine or low-pulley cable station",
        description: "Finisher volume for the arms — the last biceps exposure of the week.",
        rest: "Rest 60–90s",
      },
      {
        id: "d2",
        name: "Rope Hammer Curl",
        scheme: "3 × 10–15",
        cue: "Neutral grip, elbows still.",
        image: hammerCurl,
        weighted: true,
        startWeight: 5,
        muscle: "Biceps + forearms — brachialis/brachioradialis",
        equipment: "Cable stack + rope, low pulley",
        description: "Targets the brachialis and brachioradialis for overall arm thickness.",
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
        muscle: "Triceps — lateral head",
        equipment: "Cable stack + rope",
        description:
          "The bread-and-butter tricep builder. Keep elbows pinned so the triceps do all the work.",
        rest: "Rest 60–90s",
      },
      {
        id: "d4",
        name: "Single-Arm Cable Tricep Extension",
        scheme: "2 × 12–15 per arm",
        cue: "One arm at a time — don't let the stronger arm do more work.",
        image: singleArmCableTricepExtension,
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
        cue: "Controlled maintenance sets, not maximal pressing.",
        image: chestPress,
        weighted: true,
        startWeight: 10,
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
        muscle: "Back — lats, width",
        equipment: "Lat pulldown machine",
        description: "Backoff volume for the back — keep it smooth and controlled.",
        rest: "Rest 90–120s",
      },
      {
        id: "d7",
        name: "Cable Lateral Raise",
        scheme: "2 × 12–15 per arm",
        cue: "Light weight, lead with the elbows.",
        image: cableLateralRaise,
        weighted: true,
        startWeight: 2,
        muscle: "Shoulders — side delts",
        equipment: "Low pulley cable station",
        description: "Extra delt volume to close out the arm day — keep it light and strict.",
        rest: "Rest 60–90s",
      },
    ],
  },
];

/** Fixed weekly schedule — A/B/C/D are four sessions run every week, not four separate weeks. */
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
    where: "ASDA — Shazans (HFA-approved), 1.2–1.8kg raw/week",
    notes:
      "~136 kcal & 30.5g protein per 100g cooked. Covers Day A's 90g and Day B's 150g portions.",
  },
  {
    id: "rice",
    item: "White basmati rice",
    where: "ASDA or Lidl — one 2kg bag/week",
    notes: "Weigh it cooked, not dry — the macros above are all cooked weights.",
  },
  {
    id: "eggs",
    item: "Eggs",
    where: "ASDA or Lidl — 15/week",
    notes: "Boil a batch, keep refrigerated, grab 2 each morning.",
  },
  {
    id: "milk",
    item: "Whole milk",
    where: "ASDA or Lidl — 4–5 litres/week",
    notes: "Base of both shake versions — don't swap for skimmed, you need the calories.",
  },
  {
    id: "bagels",
    item: "Full-sized plain bagels",
    where: "ASDA bakery (~225 kcal each) — 2 packs/week",
    notes:
      "Use the full-sized bagel, not the thin ~130 kcal ones — those don't hit the day's numbers. Scan whichever you actually buy.",
  },
  {
    id: "oats",
    item: "Oats",
    where: "ASDA or Lidl — 1kg bag/week",
    notes: "Used in both days' shakes.",
  },
  {
    id: "peanut-butter",
    item: "Smooth peanut butter",
    where: "ASDA or Lidl — one jar/week",
    notes: "Goes in the Day A shake and on the Day B breakfast bagel.",
  },
  {
    id: "honey",
    item: "Honey",
    where: "ASDA or Lidl — one bottle/week",
    notes: "Sweetens both shake versions.",
  },
  {
    id: "bananas",
    item: "Bananas",
    where: "ASDA or Lidl — 7–10/week",
    notes: "One a day, in whichever slot has a shake or breakfast that day.",
  },
  {
    id: "nuts",
    item: "Mixed nuts or peanuts",
    where: "ASDA or Lidl — 300–500g/week",
    notes: "Pairs with the orange juice in the evening slot on both days.",
  },
  {
    id: "oil",
    item: "Olive oil",
    where: "ASDA or Lidl — one bottle/week",
    notes: "20g per chicken-and-rice meal — weigh it, don't eyeball it.",
  },
  {
    id: "oj",
    item: "Orange juice",
    where: "ASDA or Lidl — 2 litres/week",
    notes: "Goes with the evening food on both days.",
  },
  {
    id: "veg",
    item: "Sweetcorn / mixed vegetables",
    where: "ASDA or Lidl — frozen bag",
    notes: "Goes with the chicken and rice.",
  },
  {
    id: "tuna-sandwich",
    item: "Tesco Tuna & Sweetcorn Sandwich",
    where: "Tesco — bought fresh on relevant days",
    notes:
      "~310 kcal, 44.5g carbs, 6.1g fat, 17.7g protein on the current label — Tesco changes recipes, so scan it each time.",
  },
  {
    id: "arla",
    item: "Arla Protein Chocolate 482ml",
    where: "ASDA — only for Day A / easy-lunch days",
    notes:
      "225 kcal, 26.3g protein, 23g carbs, 2.9g fat. Don't add one automatically on Day B — you don't need it that day.",
  },
  {
    id: "skyr",
    item: "Milbona high-protein yoghurt / Skyr",
    where: "Lidl — occasional substitute",
    notes:
      "Swap in for a shake if you fancy something different — check the label against the slot you're replacing.",
  },
];

// `image` is a /public path, e.g. /meals/shake.jpg. Missing files fail
// gracefully — ThumbImage falls back to an icon tile.
export type DayMealSlot = "breakfast" | "lunch" | "dinner" | "evening";

export type DayMeal = {
  id: string;
  slot: DayMealSlot;
  name: string;
  kcal: number;
  carbs: number;
  fat: number;
  protein: number;
  items: string[];
  image: string;
};

export type DayTotals = { kcal: number; carbs: number; fat: number; protein: number };

export type DayPlan = {
  id: "a" | "b";
  label: string;
  subtitle: string;
  meals: DayMeal[];
  totals: DayTotals;
};

// Two complete, pre-costed days — not meals to mix and match. Each hits the
// daily target on its own; swap the whole day, not individual meals within it.
export const DAY_PLANS: DayPlan[] = [
  {
    id: "a",
    label: "Day A",
    subtitle: "Shake breakfast + easy Tesco lunch",
    totals: { kcal: 2758, carbs: 345, fat: 91, protein: 138 },
    meals: [
      {
        id: "a-breakfast",
        slot: "breakfast",
        name: "Bulking Breakfast Shake",
        kcal: 768,
        carbs: 106,
        fat: 28,
        protein: 26,
        items: [
          "300ml whole milk",
          "70g oats",
          "1 medium banana",
          "23g smooth peanut butter",
          "25g honey",
          "Water or ice to thin it out — blend oats first so it's drinkable, not concrete",
        ],
        image: "/meals/shake.jpg",
      },
      {
        id: "a-lunch",
        slot: "lunch",
        name: "Easy Tesco Lunch",
        kcal: 691,
        carbs: 69,
        fat: 20,
        protein: 57,
        items: [
          "1 Tesco Tuna & Sweetcorn Sandwich (310 kcal, 44.5g carbs, 6.1g fat, 17.7g protein)",
          "2 boiled eggs",
          "1 Arla Protein Chocolate 482ml (225 kcal, 26.3g protein, 23g carbs, 2.9g fat)",
        ],
        image: "/meals/tuna-lunch.jpg",
      },
      {
        id: "a-dinner",
        slot: "dinner",
        name: "Chicken & White Rice",
        kcal: 736,
        carbs: 94,
        fat: 23,
        protein: 38,
        items: [
          "90g cooked halal chicken breast",
          "295g cooked white rice",
          "100g mixed vegetables or sweetcorn",
          "20g olive oil, measured — mix into the rice or use in cooking",
          "Seasoning or sauce",
        ],
        image: "/meals/chicken-rice.jpg",
      },
      {
        id: "a-evening",
        slot: "evening",
        name: "Evening Bagel & Nuts",
        kcal: 563,
        carbs: 77,
        fat: 21,
        protein: 17,
        items: [
          "1 full-sized plain bagel (~225 kcal)",
          "38g mixed nuts or peanuts",
          "250ml orange juice",
        ],
        image: "/meals/bagel-nuts-oj.png",
      },
    ],
  },
  {
    id: "b",
    label: "Day B",
    subtitle: "Egg breakfast + prepared chicken lunch",
    totals: { kcal: 2766, carbs: 344, fat: 93, protein: 138 },
    meals: [
      {
        id: "b-breakfast",
        slot: "breakfast",
        name: "Eggs, Bagel & Milk",
        kcal: 737,
        carbs: 88,
        fat: 28,
        protein: 35,
        items: [
          "2 boiled eggs",
          "1 full-sized plain bagel",
          "10g peanut butter, spread on the bagel",
          "300ml whole milk",
          "1 medium banana",
        ],
        image: "/meals/eggs-bagel-milk.png",
      },
      {
        id: "b-lunch",
        slot: "lunch",
        name: "Prepared Chicken & Rice",
        kcal: 883,
        carbs: 108,
        fat: 24,
        protein: 58,
        items: [
          "150g cooked halal chicken breast",
          "345g cooked white rice",
          "100g mixed vegetables or sweetcorn",
          "20g olive oil, measured",
          "Sauce or seasoning",
          "Split across two containers if it's a lot to eat in one sitting",
        ],
        image: "/meals/chicken-rice.jpg",
      },
      {
        id: "b-dinner",
        slot: "dinner",
        name: "Simple Tuna Sandwich",
        kcal: 310,
        carbs: 45,
        fat: 6,
        protein: 18,
        items: [
          "1 Tesco Tuna & Sweetcorn Sandwich",
          "No Arla shake needed today — chicken, eggs, milk and tuna already cover the protein target",
        ],
        image: "/meals/tuna-sandwich.png",
      },
      {
        id: "b-evening",
        slot: "evening",
        name: "Evening Shake & Nuts",
        kcal: 836,
        carbs: 104,
        fat: 35,
        protein: 28,
        items: [
          "300ml whole milk",
          "70g oats",
          "18g honey",
          "Water or ice to thin it out",
          "36g mixed nuts or peanuts, alongside",
          "260ml orange juice, alongside",
        ],
        image: "/meals/shake.jpg",
      },
    ],
  },
];

export const DAY_PLAN_RULE =
  "Use Day A when having the Tesco sandwich, eggs and Arla lunch. Use Day B when taking the large chicken-and-rice lunch. Don't add an Arla shake automatically every day — it's there to fill a protein gap, not because every gym day needs a bottled shake.";

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
