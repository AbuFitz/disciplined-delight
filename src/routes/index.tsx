import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

type Exercise = {
  name: string;
  scheme: string;
  cue: string;
  image: string;
  youtube: string; // canonical demo video ID
};

type Workout = {
  id: string;
  letter: string;
  title: string;
  focus: string;
  image: string;
  week: string;
  exercises: Exercise[];
  cardio: string;
};

// YouTube IDs — high-quality form demos from established fitness channels
const workouts: Workout[] = [
  {
    id: "a",
    letter: "A",
    title: "Chest & Triceps",
    focus: "Push day. Slow eccentrics, full stretch at the bottom.",
    image: workoutA,
    week: "Week 1",
    cardio: "Treadmill — 20 min, incline walk or light jog",
    exercises: [
      { name: "Chest Press Machine", scheme: "3 × 10", cue: "Handles at nipple line. Pause a beat at the bottom.", image: chestPress, youtube: "xUm0BiZCWlQ" },
      { name: "Incline DB / Machine Press", scheme: "3 × 10", cue: "Bench at ~30°. Elbows tucked ~45°, not flared.", image: inclinePress, youtube: "8iPEnn-ltC8" },
      { name: "Cable Chest Fly", scheme: "3 × 12", cue: "Slight elbow bend, hug a tree. Squeeze in the middle.", image: cableFly, youtube: "Iwe6AmxVf7o" },
      { name: "Tricep Pushdown (Cable)", scheme: "3 × 12", cue: "Elbows pinned to your ribs. Only the forearms move.", image: tricepPushdown, youtube: "2-LAMcpzODU" },
      { name: "Overhead Tricep Extension", scheme: "3 × 12", cue: "Full stretch overhead. Keep elbows narrow.", image: overheadTricep, youtube: "_gsUck-7M74" },
      { name: "Plank", scheme: "3 × 30–45s", cue: "Glutes tight, ribs down, don't let hips sag.", image: plank, youtube: "ASdvN_XEl_c" },
    ],
  },
  {
    id: "b",
    letter: "B",
    title: "Back & Biceps",
    focus: "Pull day. Lead every rep with the elbow, not the hand.",
    image: workoutB,
    week: "Week 2",
    cardio: "Stairmaster — 20 min",
    exercises: [
      { name: "Lat Pulldown", scheme: "3 × 10", cue: "Bar to upper chest. Chest up, drive elbows down.", image: latPulldown, youtube: "CAwf7n6Luuc" },
      { name: "Seated Cable Row", scheme: "3 × 10", cue: "Shoulders back and down. No jerking with the lower back.", image: cableRow, youtube: "GZbfZ033f74" },
      { name: "Assisted Pull-Up Machine", scheme: "3 × 8", cue: "Use the least assistance you can control.", image: assistedPullup, youtube: "wFj808u2HWQ" },
      { name: "Bicep Curl (Machine or DB)", scheme: "3 × 12", cue: "Elbows still. Full range top to bottom.", image: bicepCurl, youtube: "ykJmrZ5v0Oo" },
      { name: "Hammer Curl", scheme: "3 × 12", cue: "Neutral grip. Targets brachialis for thicker arms.", image: hammerCurl, youtube: "zC3nLlEvin4" },
      { name: "Hanging / Lying Leg Raise", scheme: "3 × 12", cue: "Slow down on the way back — that's the core work.", image: legRaise, youtube: "Pr1ieGZ5atk" },
    ],
  },
  {
    id: "c",
    letter: "C",
    title: "Shoulders & Arms",
    focus: "Delts and arms. Light, strict, high volume.",
    image: workoutC,
    week: "Week 3",
    cardio: "Treadmill — 20 min",
    exercises: [
      { name: "Shoulder Press Machine", scheme: "3 × 10", cue: "Don't lock out hard. Keep tension on the delts.", image: shoulderPress, youtube: "Wqq43dKW1TU" },
      { name: "Lateral Raise", scheme: "3 × 12", cue: "Lead with elbows, pinkies slightly up. Light weight.", image: lateralRaise, youtube: "3VcKaXpzqRo" },
      { name: "Face Pulls (Cable)", scheme: "3 × 15", cue: "Rope to eyes. External rotation at the end.", image: facePull, youtube: "rep-qVOkqgk" },
      { name: "EZ-Bar / Cable Bicep Curl", scheme: "3 × 12", cue: "No swinging. If it swings, drop the weight.", image: ezCurl, youtube: "NyBOJvKn6PU" },
      { name: "Tricep Dip / Rope Pushdown", scheme: "3 × 12", cue: "Fully lock out at the bottom to hit the long head.", image: tricepDip, youtube: "6kALZikXxLc" },
      { name: "Cable Crunch", scheme: "3 × 15", cue: "Round the spine, don't hip-hinge. Elbows to thighs.", image: cableCrunch, youtube: "9wtVpX5yTsA" },
    ],
  },
  {
    id: "d",
    letter: "D",
    title: "Arm Specialization + Upper Pump",
    focus: "Arm-focused finisher week. Chase the pump.",
    image: workoutD,
    week: "Week 4",
    cardio: "Stairmaster — 20 min",
    exercises: [
      { name: "Bicep Curl (Machine)", scheme: "4 × 12", cue: "Stop 1 rep short of failure on each set.", image: bicepCurl, youtube: "ykJmrZ5v0Oo" },
      { name: "Tricep Pushdown", scheme: "4 × 12", cue: "Squeeze hard at the bottom for 1 second.", image: tricepPushdown, youtube: "2-LAMcpzODU" },
      { name: "Chest Press", scheme: "2 × 12", cue: "Backoff sets — smooth, not heavy.", image: chestPress, youtube: "xUm0BiZCWlQ" },
      { name: "Lat Pulldown", scheme: "2 × 12", cue: "Feel the lats, not the biceps.", image: latPulldown, youtube: "CAwf7n6Luuc" },
      { name: "Lateral Raise", scheme: "2 × 15", cue: "Burnout — go light, don't cheat.", image: lateralRaise, youtube: "3VcKaXpzqRo" },
      { name: "Plank / Cable Crunch", scheme: "3 rounds", cue: "Alternate. 45s plank, 15 crunches.", image: plank, youtube: "ASdvN_XEl_c" },
    ],
  },
];

function Index() {
  const [active, setActive] = useState("a");
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const current = workouts.find((w) => w.id === active)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            <span className="font-semibold tracking-widest text-sm">IRON · FAJR</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#workouts" className="hover:text-foreground transition">Workouts</a>
            <a href="#skeleton" className="hover:text-foreground transition">Daily Skeleton</a>
            <a href="#nutrition" className="hover:text-foreground transition">Nutrition</a>
            <a href="#supplements" className="hover:text-foreground transition">Supplements</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroGym}
          alt=""
          width={1600}
          height={900}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-40">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-6">One workout a week · No leg day</p>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight max-w-3xl leading-[1.05]">
            Learn the machines.<br />
            <span className="text-primary">Then add weight.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            A 4-week upper body rotation. Run the same session for a week until every machine is muscle memory — then cycle back and progress.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm">
            <Stat label="Sessions / week" value="4" />
            <Stat label="Bodyweight" value="64 kg" />
            <Stat label="Target kcal" value="2,760" />
            <Stat label="Protein" value="138 g" />
          </div>
        </div>
      </section>

      {/* WORKOUTS */}
      <section id="workouts" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader eyebrow="The Rotation" title="Four Workouts" note="Run each for a full week. From week 5, repeat with +1 rep or +2.5kg. Tap any exercise for a form video." />

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {workouts.map((w) => (
            <button
              key={w.id}
              onClick={() => setActive(w.id)}
              className={`group text-left rounded-lg border p-4 transition-all ${
                active === w.id
                  ? "border-primary bg-card shadow-[var(--shadow-ember)]"
                  : "border-border bg-card/40 hover:border-muted-foreground/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${active === w.id ? "text-primary" : "text-muted-foreground"}`}>{w.letter}</span>
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground">{w.week}</span>
              </div>
              <div className="text-sm font-medium">{w.title}</div>
            </button>
          ))}
        </div>

        {/* header for active workout */}
        <div className="mt-10 rounded-xl overflow-hidden border border-border bg-card">
          <div className="relative aspect-[21/9] bg-black">
            <img
              key={current.id}
              src={current.image}
              alt=""
              width={1200}
              height={800}
              loading="lazy"
              className="w-full h-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 md:p-10">
              <div>
                <div className="text-primary text-xs tracking-[0.3em] uppercase">Workout {current.letter} · {current.week}</div>
                <h3 className="text-3xl md:text-5xl font-bold mt-2">{current.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md">{current.focus}</p>
              </div>
            </div>
          </div>
        </div>

        {/* exercise cards with diagrams */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {current.exercises.map((ex, i) => (
            <ExerciseCard
              key={`${current.id}-${i}`}
              index={i + 1}
              exercise={ex}
              onWatch={() => setOpenVideo(ex.youtube)}
            />
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-5">
          <div className="text-xs tracking-widest uppercase text-primary mb-1">Cardio Finisher</div>
          <div className="text-sm">{current.cardio}</div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card/40 p-5 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Progression:</span> next time you run Workout {current.letter}, add one rep to your top set or +2.5 kg. That's the whole system.
        </div>
      </section>

      {/* placeholder sections */}
      <Placeholder id="skeleton" eyebrow="Section 1" title="The Daily Skeleton" body="Weekday timeline from 9pm wind-down through Fajr, gym, work and prep." />
      <Placeholder id="nutrition" eyebrow="Section 3" title="Nutrition — 2,760 / 345c / 92f / 138p" body="Halal-friendly Lidl + Iceland shopping map and daily meal template." />
      <Placeholder id="supplements" eyebrow="Section 4" title="Supplement Schedule" body="Vit D, multivit, fish oil, creatine, whey — timing and the pillbox rule." />
      <Placeholder id="stick" eyebrow="Section 5" title="Making It Stick" body="Weekly weigh-in, progress photos, non-negotiable minimum." />

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        Iron Fajr · Show up. Add a rep. Repeat.
      </footer>

      {/* Video Modal */}
      {openVideo && <VideoModal youtubeId={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}

function ExerciseCard({ index, exercise, onWatch }: { index: number; exercise: Exercise; onWatch: () => void }) {
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/60 transition-colors">
      <button onClick={onWatch} className="relative w-full aspect-square bg-black overflow-hidden block">
        <img
          src={exercise.image}
          alt={`${exercise.name} diagram`}
          width={800}
          height={800}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* play badge */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-[var(--shadow-ember)]">
            <PlayIcon />
          </div>
        </div>
        <div className="absolute top-3 left-3 w-8 h-8 rounded-md bg-black/70 backdrop-blur flex items-center justify-center font-mono text-xs text-primary border border-primary/30">
          {String(index).padStart(2, "0")}
        </div>
      </button>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h4 className="font-semibold leading-tight">{exercise.name}</h4>
          <span className="text-sm font-mono text-primary shrink-0">{exercise.scheme}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{exercise.cue}</p>

        <button
          onClick={onWatch}
          className="mt-4 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-primary hover:text-primary/80 transition-colors"
        >
          <PlayIcon small /> WATCH FORM DEMO
        </button>
      </div>
    </div>
  );
}

function VideoModal({ youtubeId, onClose }: { youtubeId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-muted-foreground hover:text-foreground text-sm tracking-widest"
          aria-label="Close video"
        >
          CLOSE ✕
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title="Exercise form demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg border border-border shadow-[var(--shadow-ember)]"
        />
      </div>
    </div>
  );
}

function PlayIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 22;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={small ? "text-primary" : "text-primary-foreground"}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/50 backdrop-blur px-4 py-3">
      <div className="text-[10px] tracking-widest uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div>
      <div className="text-primary text-xs tracking-[0.3em] uppercase">{eyebrow}</div>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      {note && <p className="mt-3 text-muted-foreground max-w-2xl">{note}</p>}
    </div>
  );
}

function Placeholder({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: string; body: string }) {
  return (
    <section id={id} className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-primary text-xs tracking-[0.3em] uppercase">{eyebrow}</div>
        <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-3 text-muted-foreground max-w-2xl">{body}</p>
        <div className="mt-6 h-24 rounded-lg border border-dashed border-border bg-card/30 flex items-center justify-center text-xs tracking-widest uppercase text-muted-foreground">
          Reserved space — build here
        </div>
      </div>
    </section>
  );
}
