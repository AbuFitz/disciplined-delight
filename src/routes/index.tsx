import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  AlarmClock,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronRight,
  Droplet,
  Dumbbell,
  ExternalLink,
  Flame,
  Info,
  Moon,
  Pill,
  Play,
  Scale,
  ShoppingBasket,
  Sparkles,
  Sunrise,
  TrendingUp,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useTrackerState } from "@/hooks/use-tracker-state";

import heroGym from "@/assets/hero-gym.jpg";
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

export const Route = createFileRoute("/")({
  component: Index,
});

// training.fit hosts short exercise-guide articles — used as the "picture
// reference" link on every exercise and workout, alongside a video demo.
const trainingFitUrl = (query: string) =>
  `https://training.fit/?s=${encodeURIComponent(query)}&int=1`;

type Exercise = {
  id: string;
  name: string;
  scheme: string;
  cue: string;
  image: string;
  youtube: string;
  weighted: boolean;
  startWeight?: number;
};

type Workout = {
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

const workouts: Workout[] = [
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

const MACROS = [
  { key: "kcal", val: "2,760", label: "kcal" },
  { key: "carbs", val: "345g", label: "carbs" },
  { key: "fat", val: "92g", label: "fat" },
  { key: "protein", val: "138g", label: "protein" },
];

const SKELETON = [
  {
    time: "9:00–9:30pm",
    label: "Phone charges outside the bedroom",
    detail: "Magnesium supplement. Wind down.",
    icon: Moon,
  },
  { time: "~9:30pm", label: "Sleep", detail: undefined, icon: Moon },
  {
    time: "3:14am",
    label: "Fajr",
    detail: "Pray, then straight back to bed — don't touch your phone.",
    icon: Sunrise,
    highlight: true,
  },
  {
    time: "5:00am",
    label: "Alarm",
    detail:
      "Phone across the room, not on the bed. Get up, get dressed. No phone until you're back from the gym.",
    icon: AlarmClock,
  },
  {
    time: "5:15–5:45am",
    label: "Light stretch, water, out the door",
    detail: undefined,
    icon: Droplet,
  },
  {
    time: "6:00–7:00am",
    label: "Gym session",
    detail: "GymGroup — today's rotation below.",
    icon: Dumbbell,
    highlight: true,
  },
  {
    time: "7:00–7:30am",
    label: "Shower, breakfast, morning supplements",
    detail: undefined,
    icon: UtensilsCrossed,
  },
  { time: "9:30am–6:00pm", label: "Work", detail: undefined, icon: Briefcase },
  { time: "6:30–7:00pm", label: "Dinner", detail: undefined, icon: UtensilsCrossed },
  {
    time: "7:00–9:00pm",
    label: "Life admin, food prep for tomorrow",
    detail: undefined,
    icon: Sparkles,
  },
];

const SHOPPING = [
  {
    item: "Chicken breast/thigh, mince, lamb",
    where: "Halal butcher, or Iceland frozen halal range",
    notes: "Iceland stocks an HFA-certified halal range nationwide — reliable for batch buying.",
  },
  {
    item: "Tinned tuna",
    where: "Lidl (Nixe, ~69p/145g tin)",
    notes: "Fish is halal by default — no certification needed.",
  },
  { item: "Eggs", where: "Lidl (Milbona)", notes: "Fine as-is." },
  {
    item: "Plain Greek yoghurt, cottage cheese",
    where: "Lidl (Milbona, plain/natural only)",
    notes:
      'Stick to plain/natural — flavoured versions can contain gelatin or E120. Check for a "suitable for vegetarians" mark.',
  },
  {
    item: "Protein shakes (Milbona/Clear Whey)",
    where: "Lidl",
    notes: "Milk-based whey is generally fine — scan for animal-derived flavouring agents.",
  },
  { item: "Oats, rice, bread, veg", where: "Lidl", notes: "No issue." },
];

const MEALS = [
  {
    name: "Breakfast",
    kcal: "~650 kcal",
    items: [
      "60g oats + 150g plain Milbona Greek yoghurt + 1 banana",
      "3 eggs, scrambled, on 2 slices toast",
    ],
  },
  {
    name: "Lunch (batch-cooked)",
    kcal: "~700 kcal",
    items: [
      "200g halal chicken breast (cooked)",
      "250g white rice or potatoes (cooked)",
      "Mixed veg / sauce of choice",
    ],
  },
  {
    name: "Post-gym",
    kcal: "~300 kcal",
    items: ["1 scoop Clear Whey shake, or a Lidl Milbona protein shake"],
  },
  {
    name: "Dinner",
    kcal: "~700 kcal",
    items: ["200g halal chicken thigh, lamb, or mince", "200g rice or potatoes", "Vegetables"],
  },
  {
    name: "Evening top-up",
    kcal: "~400 kcal",
    items: [
      "Plain Milbona cottage cheese (150g) + a Nixe tuna tin",
      "or Greek yoghurt + honey + oats",
    ],
  },
];

const SUPPLEMENTS = [
  {
    id: "vitd",
    name: "Vitamin D",
    time: "With breakfast",
    why: "Fat-soluble, absorbs better with food.",
    icon: Sunrise,
  },
  {
    id: "multi",
    name: "Vitamin A–Z",
    time: "With breakfast",
    why: "Same reason — easier to remember paired with Vit D.",
    icon: Sparkles,
  },
  {
    id: "fish",
    name: "Fish Oil",
    time: "With breakfast or dinner",
    why: "Fat-soluble — take with a meal containing some fat.",
    icon: Droplet,
  },
  {
    id: "creatine",
    name: "Creatine 5g",
    time: "Post-gym, with water",
    why: "Works on consistency, not timing — pick a time you'll never skip.",
    icon: Pill,
  },
  {
    id: "whey",
    name: "Clear Whey",
    time: "Post-workout / snack",
    why: "Protein top-up toward the 138g daily target.",
    icon: Flame,
  },
];

const NAV_LINKS = [
  { href: "#workouts", label: "Workouts" },
  { href: "#skeleton", label: "Schedule" },
  { href: "#nutrition", label: "Nutrition" },
  { href: "#supplements", label: "Supplements" },
  { href: "#stick", label: "Stick" },
];

function Index() {
  const [activeWorkout, setActiveWorkout] = useState("a");
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const tracker = useTrackerState();
  const current = workouts.find((w) => w.id === activeWorkout)!;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white shadow-soft">
        {/* NAV */}
        <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-dusk shadow-blue">
                <Sunrise className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-sm font-semibold tracking-wide">
                SUNRISE <span className="text-primary">STRENGTH</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              <Flame className="h-3.5 w-3.5 text-primary" />
              {tracker.weekCount}/4
            </div>
          </div>
          <nav className="flex gap-4 overflow-x-auto px-5 pb-3 text-xs font-medium text-muted-foreground [scrollbar-width:none]">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="shrink-0 whitespace-nowrap transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </header>

        {/* HERO */}
        <section className="relative overflow-hidden">
          <img
            src={heroGym}
            alt=""
            width={800}
            height={500}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-dusk" style={{ opacity: 0.96 }} />
          <div className="relative px-5 pb-8 pt-8 text-white">
            <p className="text-[11px] uppercase tracking-[0.25em] text-blue-300">
              Your Gym &amp; Lifestyle System
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight">
              Learn the machines.
              <br />
              Then add weight.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
              GymGroup, 6am sessions, Fajr at 3:14am. One workout a week until it's muscle memory —
              then cycle back and progress.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <HeroStat label="Gym" value="GymGroup · 6am" />
              <HeroStat label="Fajr" value="3:14am" />
              <HeroStat label="Bodyweight" value="64kg" />
              <HeroStat label="Work" value="9:30–6pm" />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {MACROS.map((m) => (
                <div
                  key={m.key}
                  className="rounded-xl border border-white/15 bg-white/10 px-2 py-2.5 text-center backdrop-blur"
                >
                  <div className="font-display text-sm font-bold text-white">{m.val}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider text-blue-200">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WORKOUTS */}
        <section id="workouts" className="px-5 py-8">
          <SectionHeader
            eyebrow="One Workout A Week"
            title="The Rotation"
            note="Run each for a full week. From week 5, repeat with +1 rep or a little more weight. No leg day."
          />

          <div className="mt-5 grid grid-cols-4 gap-2">
            {workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWorkout(w.id)}
                className={`rounded-xl border p-2.5 text-center transition-all ${
                  activeWorkout === w.id
                    ? "border-transparent bg-gradient-dusk text-white shadow-blue"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                <div className="font-display text-lg font-bold">{w.letter}</div>
                <div
                  className={`mt-0.5 text-[9px] uppercase tracking-wider ${activeWorkout === w.id ? "text-blue-200" : "text-muted-foreground"}`}
                >
                  {w.week}
                </div>
              </button>
            ))}
          </div>

          {/* active workout banner */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border shadow-soft">
            <div className="relative aspect-[16/10]">
              <img
                key={current.id}
                src={current.image}
                alt=""
                width={800}
                height={500}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-blue-300">
                  Workout {current.letter} · {current.week}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-white">{current.title}</h3>
                <p className="mt-1 text-xs text-slate-200">{current.focus}</p>
              </div>
            </div>
            <a
              href={trainingFitUrl(current.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-t border-border bg-secondary px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                Picture reference on training.fit
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>

          {/* exercises */}
          <div className="mt-4 space-y-3">
            {current.exercises.map((ex, i) => (
              <ExerciseCard
                key={ex.id}
                index={i + 1}
                exercise={ex}
                done={!!tracker.todayLog.exercises[ex.id]?.done}
                weight={
                  tracker.todayLog.exercises[ex.id]?.weight ??
                  (ex.startWeight !== undefined ? String(ex.startWeight) : "")
                }
                onToggle={() => tracker.toggleExercise(ex.id)}
                onWeightChange={(w) => tracker.setExerciseWeight(ex.id, w)}
                onWatch={() => setOpenVideo(ex.youtube)}
              />
            ))}
          </div>

          {/* cardio */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-dusk-soft text-white">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{current.cardioMachine}</div>
                <div className="text-xs text-muted-foreground">{current.cardio}, after weights</div>
              </div>
            </div>
            <button
              onClick={tracker.toggleCardio}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                tracker.todayLog.cardioDone
                  ? "bg-gradient-dusk text-white shadow-blue"
                  : "border border-border bg-secondary text-foreground"
              }`}
            >
              {tracker.todayLog.cardioDone ? "Done ✓" : "Mark done"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-accent p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              Progression
            </div>
            <p className="mt-1.5 text-sm text-foreground">
              Next time you run Workout {current.letter}, add one rep to your top set or a little
              more weight. That's the whole system.
            </p>
          </div>
        </section>

        {/* DAILY SKELETON */}
        <section id="skeleton" className="border-t border-border bg-slate-50 px-5 py-8">
          <SectionHeader
            eyebrow="Section 1"
            title="The Daily Skeleton"
            note="Weekday timeline — Fajr wake-up, gym, work, wind-down."
          />

          <div className="mt-5 space-y-0">
            {SKELETON.map((s, i) => (
              <TimelineRow key={s.time + i} {...s} isLast={i === SKELETON.length - 1} />
            ))}
          </div>

          <Callout icon={Info} tone="primary" className="mt-5">
            <span className="font-semibold text-foreground">~7.5 hrs sleep,</span> even with the
            Fajr wake-up — because you go straight back down after prayer instead of scrolling.
          </Callout>

          <Callout icon={Moon} tone="dark" className="mt-3">
            <span className="font-semibold text-white">
              The phone rule matters more than the gym plan.
            </span>{" "}
            Charging it outside the room removes the decision entirely — you can't doomscroll
            something you can't reach.
          </Callout>
        </section>

        {/* NUTRITION */}
        <section id="nutrition" className="border-t border-border px-5 py-8">
          <SectionHeader
            eyebrow="Section 2"
            title="Nutrition"
            note="2,760 kcal · 345g carbs · 92g fat · 138g protein — halal, no protein bars."
          />

          <Callout icon={Info} tone="warn" className="mt-5">
            <span className="font-semibold text-foreground">Correction:</span> Lidl UK does not sell
            halal-certified meat. Fish is halal by default, so Lidl's fish counter and tinned fish
            are fine — but chicken, beef, lamb and mince need to come from a halal butcher or
            Iceland's frozen halal range.
          </Callout>

          <h3 className="mt-6 flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground">
            <ShoppingBasket className="h-4 w-4 text-primary" />
            Where to get what
          </h3>
          <div className="mt-3 space-y-2.5">
            {SHOPPING.map((s) => (
              <div
                key={s.item}
                className="rounded-2xl border border-border bg-white p-4 shadow-soft"
              >
                <div className="text-sm font-semibold">{s.item}</div>
                <div className="mt-1 text-xs font-medium text-primary">{s.where}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {s.notes}
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-7 flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            Daily meal template
          </h3>
          <div className="mt-3 space-y-2.5">
            {MEALS.map((m) => (
              <div
                key={m.name}
                className="overflow-hidden rounded-2xl border border-border shadow-soft"
              >
                <div className="flex items-center justify-between bg-gradient-dusk-soft px-4 py-2.5">
                  <span className="text-sm font-semibold text-white">{m.name}</span>
                  <span className="text-xs font-medium text-blue-200">{m.kcal}</span>
                </div>
                <ul className="space-y-1.5 bg-white p-4">
                  {m.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Callout icon={Sparkles} tone="primary" className="mt-4">
            Fine-tune exact portions in MyFitnessPal over the first week to land the targets above.
          </Callout>

          <Callout icon={Flame} tone="dark" className="mt-3">
            <span className="font-semibold text-white">Meal prep tip:</span> batch-cook halal
            chicken twice a week (Sun + Wed), 1–1.5kg at a time, seasoned simply and roasted 25 min
            at 200°C. Portion into containers immediately — the home food has to already be ready,
            or willpower loses every time.
          </Callout>
        </section>

        {/* SUPPLEMENTS */}
        <section id="supplements" className="border-t border-border bg-slate-50 px-5 py-8">
          <SectionHeader
            eyebrow="Section 3"
            title="Supplement Schedule"
            note="Tap to check off as you take them today."
          />

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {SUPPLEMENTS.map((s) => {
              const done = !!tracker.todayLog.supplements[s.id];
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => tracker.toggleSupplement(s.id)}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    done
                      ? "border-transparent bg-gradient-dusk text-white shadow-blue"
                      : "border-border bg-white shadow-soft"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${done ? "text-blue-200" : "text-primary"}`} />
                    {done && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <div className="mt-2 text-sm font-semibold">{s.name}</div>
                  <div
                    className={`mt-0.5 text-[11px] ${done ? "text-blue-200" : "text-muted-foreground"}`}
                  >
                    {s.time}
                  </div>
                </button>
              );
            })}
          </div>

          <Callout icon={Pill} tone="primary" className="mt-4">
            <span className="font-semibold text-foreground">Key fix:</span> keep all four morning
            supplements in a single pot or pillbox next to the kettle. If they're not visible, you
            won't take them.
          </Callout>
        </section>

        {/* MAKING IT STICK */}
        <section id="stick" className="border-t border-border px-5 py-8">
          <SectionHeader
            eyebrow="Section 4"
            title="Making It Stick"
            note="Consistency beats intensity."
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
              <div className="font-display text-2xl font-bold text-primary">
                {tracker.totalSessions}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Total sessions
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
              <div className="font-display text-2xl font-bold text-primary">
                {tracker.weekCount}/4
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                This week
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-between gap-1.5">
            {tracker.last7Days.map((d) => (
              <div
                key={d.offset}
                className={`flex-1 rounded-xl border py-2.5 text-center ${
                  d.done
                    ? "border-transparent bg-gradient-dusk text-white"
                    : "border-border bg-white"
                } ${d.isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                <div
                  className={`text-[9px] uppercase ${d.done ? "text-blue-200" : "text-muted-foreground"}`}
                >
                  {d.letter}
                </div>
                <div className="mt-1 text-xs">{d.done ? "✓" : "·"}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            <StickItem
              icon={CheckCircle2}
              title="Track workouts, not just meals"
              body="Even a basic log — 'Workout A, week 1, chest press 3×10 @ 20kg' — shows progress, which is what keeps you going when motivation dips."
            />
            <StickItem
              icon={Flame}
              title="Non-negotiable minimum"
              body="If you're exhausted, still show up and do the treadmill or Stairmaster for 20 min. Something beats nothing."
            />
            <StickItem
              icon={Sparkles}
              title="The first 2 weeks are the hardest"
              body="After that, 5am stops feeling brutal — your body adjusts its rhythm around Fajr and the gym."
            />
            <StickItem
              icon={Scale}
              title="Weigh in weekly, not daily"
              body="Same day, same time — e.g. Sunday morning. Daily is too noisy to be useful."
            />
            <StickItem
              icon={Camera}
              title="Progress photo, same weekly slot"
              body="Pair it with your weigh-in so you have a visual record alongside the number."
            />
          </div>

          <button
            onClick={() => {
              if (confirm("Reset all tracked data? This can't be undone.")) tracker.reset();
            }}
            className="mt-6 w-full text-center text-xs text-muted-foreground underline underline-offset-2"
          >
            Reset all tracked data
          </button>
        </section>

        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          Sunrise Strength · Show up. Add a rep. Repeat.
        </footer>
      </div>

      {openVideo && <VideoModal youtubeId={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}

function ExerciseCard({
  index,
  exercise,
  done,
  weight,
  onToggle,
  onWeightChange,
  onWatch,
}: {
  index: number;
  exercise: Exercise;
  done: boolean;
  weight: string;
  onToggle: () => void;
  onWeightChange: (w: string) => void;
  onWatch: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-soft transition-colors ${done ? "border-primary/40 bg-accent/40" : "border-border bg-white"}`}
    >
      <div className="flex gap-3 p-3">
        <button
          onClick={onWatch}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900"
        >
          <img
            src={exercise.image}
            alt={`${exercise.name} form`}
            width={200}
            height={200}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
              <Play className="ml-0.5 h-3 w-3 text-primary" fill="currentColor" />
            </div>
          </div>
          <div className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white">
            {String(index).padStart(2, "0")}
          </div>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-tight">{exercise.name}</h4>
            <button
              onClick={onToggle}
              aria-label={done ? "Mark not done" : "Mark done"}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white"
              }`}
            >
              {done && <CheckCircle2 className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-0.5 text-xs font-mono font-medium text-primary">{exercise.scheme}</div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{exercise.cue}</p>

          <div className="mt-2 flex items-center gap-2">
            {exercise.weighted && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => onWeightChange(e.target.value)}
                  className="w-14 rounded-md border border-border bg-secondary px-2 py-1 text-center text-xs font-medium focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">kg</span>
              </div>
            )}
            <a
              href={trainingFitUrl(exercise.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/70"
            >
              <ExternalLink className="h-3 w-3" />
              Reference
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ youtubeId, onClose }: { youtubeId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 flex items-center gap-1 text-xs font-medium tracking-wide text-white/80 hover:text-white"
        >
          CLOSE <X className="h-3.5 w-3.5" />
        </button>
        <div className="aspect-video overflow-hidden rounded-xl shadow-blue">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title="Exercise form demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur">
      <div className="text-[9px] uppercase tracking-wider text-blue-200">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {note && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

function TimelineRow({
  time,
  label,
  detail,
  icon: Icon,
  highlight,
  isLast,
}: {
  time: string;
  label: string;
  detail?: string;
  icon: typeof Moon;
  highlight?: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            highlight
              ? "bg-gradient-dusk text-white shadow-blue"
              : "border border-border bg-white text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
        <div className="text-[11px] font-mono font-semibold text-primary">{time}</div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {detail && (
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</div>
        )}
      </div>
    </div>
  );
}

function Callout({
  icon: Icon,
  tone,
  className,
  children,
}: {
  icon: typeof Info;
  tone: "primary" | "warn" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const styles = {
    primary: "border-primary/20 bg-accent text-foreground",
    warn: "border-amber-300 bg-amber-50 text-foreground",
    dark: "border-transparent bg-gradient-dusk text-slate-200",
  } as const;
  return (
    <div
      className={`flex gap-2.5 rounded-2xl border p-4 text-xs leading-relaxed ${styles[tone]} ${className ?? ""}`}
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "dark" ? "text-blue-300" : "text-primary"}`}
      />
      <div>{children}</div>
    </div>
  );
}

function StickItem({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CheckCircle2;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}
