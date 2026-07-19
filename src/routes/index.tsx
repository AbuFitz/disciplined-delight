import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import heroGym from "@/assets/hero-gym.jpg";
import workoutA from "@/assets/workout-a.jpg";
import workoutB from "@/assets/workout-b.jpg";
import workoutC from "@/assets/workout-c.jpg";
import workoutD from "@/assets/workout-d.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

type Exercise = { name: string; scheme: string; cue: string };
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

const workouts: Workout[] = [
  {
    id: "a",
    letter: "A",
    title: "Chest & Triceps",
    focus: "Push day. Slow eccentrics, full stretch at the bottom.",
    image: workoutA,
    week: "Week 1",
    exercises: [
      { name: "Chest Press Machine", scheme: "3 × 10", cue: "Handles at nipple line. Pause a beat at the bottom." },
      { name: "Incline DB / Machine Press", scheme: "3 × 10", cue: "Bench at ~30°. Elbows tucked ~45°, not flared." },
      { name: "Cable Chest Fly", scheme: "3 × 12", cue: "Slight elbow bend, hug a tree. Squeeze in the middle." },
      { name: "Tricep Pushdown (Cable)", scheme: "3 × 12", cue: "Elbows pinned to your ribs. Only the forearms move." },
      { name: "Overhead Tricep Extension", scheme: "3 × 12", cue: "Full stretch overhead. Keep elbows narrow." },
      { name: "Plank", scheme: "3 × 30–45s", cue: "Glutes tight, ribs down, don't let hips sag." },
    ],
    cardio: "Treadmill — 20 min, incline walk or light jog",
  },
  {
    id: "b",
    letter: "B",
    title: "Back & Biceps",
    focus: "Pull day. Lead every rep with the elbow, not the hand.",
    image: workoutB,
    week: "Week 2",
    exercises: [
      { name: "Lat Pulldown", scheme: "3 × 10", cue: "Bar to upper chest. Chest up, drive elbows down." },
      { name: "Seated Cable Row", scheme: "3 × 10", cue: "Shoulders back and down. No jerking with the lower back." },
      { name: "Assisted Pull-Up Machine", scheme: "3 × 8", cue: "Use the least assistance you can control." },
      { name: "Bicep Curl (Machine or DB)", scheme: "3 × 12", cue: "Elbows still. Full range top to bottom." },
      { name: "Hammer Curl", scheme: "3 × 12", cue: "Neutral grip. Targets brachialis for thicker arms." },
      { name: "Hanging / Lying Leg Raise", scheme: "3 × 12", cue: "Slow down on the way back — that's the core work." },
    ],
    cardio: "Stairmaster — 20 min",
  },
  {
    id: "c",
    letter: "C",
    title: "Shoulders & Arms",
    focus: "Delts and arms. Light, strict, high volume.",
    image: workoutC,
    week: "Week 3",
    exercises: [
      { name: "Shoulder Press Machine", scheme: "3 × 10", cue: "Don't lock out hard. Keep tension on the delts." },
      { name: "Lateral Raise", scheme: "3 × 12", cue: "Lead with elbows, pinkies slightly up. Light weight." },
      { name: "Face Pulls (Cable)", scheme: "3 × 15", cue: "Rope to eyes. External rotation at the end." },
      { name: "EZ-Bar / Cable Bicep Curl", scheme: "3 × 12", cue: "No swinging. If it swings, drop the weight." },
      { name: "Tricep Dip Machine / Rope Pushdown", scheme: "3 × 12", cue: "Fully lock out at the bottom to hit the long head." },
      { name: "Cable Crunch", scheme: "3 × 15", cue: "Round the spine, don't hip-hinge. Elbows to thighs." },
    ],
    cardio: "Treadmill — 20 min",
  },
  {
    id: "d",
    letter: "D",
    title: "Arm Specialization + Upper Pump",
    focus: "Arm-focused finisher week. Chase the pump.",
    image: workoutD,
    week: "Week 4",
    exercises: [
      { name: "Bicep Curl (Machine)", scheme: "4 × 12", cue: "Stop 1 rep short of failure on each set." },
      { name: "Tricep Pushdown", scheme: "4 × 12", cue: "Squeeze hard at the bottom for 1 second." },
      { name: "Chest Press", scheme: "2 × 12", cue: "Backoff sets — smooth, not heavy." },
      { name: "Lat Pulldown", scheme: "2 × 12", cue: "Feel the lats, not the biceps." },
      { name: "Lateral Raise", scheme: "2 × 15", cue: "Burnout — go light, don't cheat." },
      { name: "Plank / Cable Crunch", scheme: "3 rounds", cue: "Alternate. 45s plank, 15 crunches." },
    ],
    cardio: "Stairmaster — 20 min",
  },
];

function Index() {
  const [active, setActive] = useState("a");
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
        <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-40">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-6">One workout a week · No leg day</p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-3xl leading-[1.05]">
            Learn the machines.<br />
            <span className="text-primary">Then add weight.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            A 4-week upper body rotation. Run the same session for a week until every machine is muscle memory — then cycle back and progress.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <Stat label="Sessions / week" value="4" />
            <Stat label="Bodyweight" value="64 kg" />
            <Stat label="Target kcal" value="2,760" />
            <Stat label="Protein" value="138 g" />
          </div>
        </div>
      </section>

      {/* WORKOUTS */}
      <section id="workouts" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader eyebrow="The Rotation" title="Four Workouts" note="Run each for a full week. From week 5, repeat with +1 rep or +2.5kg." />

        {/* tabs */}
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

        {/* active workout */}
        <div className="mt-10 grid md:grid-cols-[1fr_1.4fr] gap-8 items-start">
          <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-[3/4] md:sticky md:top-24">
            <img
              key={current.id}
              src={current.image}
              alt={`${current.title} — targeted muscles`}
              width={1200}
              height={800}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/70 to-transparent">
              <div className="text-primary text-xs tracking-[0.25em] uppercase">Workout {current.letter}</div>
              <h3 className="text-2xl font-bold mt-1">{current.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{current.focus}</p>
            </div>
          </div>

          <div>
            <ol className="space-y-3">
              {current.exercises.map((ex, i) => (
                <li
                  key={ex.name}
                  className="group rounded-lg border border-border bg-card p-5 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-9 h-9 rounded-md bg-secondary flex items-center justify-center font-mono text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="font-semibold">{ex.name}</h4>
                        <span className="text-sm font-mono text-primary">{ex.scheme}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{ex.cue}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-5">
              <div className="text-xs tracking-widest uppercase text-primary mb-1">Cardio Finisher</div>
              <div className="text-sm">{current.cardio}</div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-card/40 p-5 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">Progression:</span> next time you run Workout {current.letter}, add one rep to your top set or +2.5 kg. That's the whole system.
            </div>
          </div>
        </div>
      </section>

      {/* PLACEHOLDER STUBS for other sections */}
      <Placeholder
        id="skeleton"
        eyebrow="Section 1"
        title="The Daily Skeleton"
        body="Weekday timeline from 9pm wind-down through Fajr, gym, work and prep. To be built."
      />
      <Placeholder
        id="nutrition"
        eyebrow="Section 3"
        title="Nutrition — 2,760 / 345c / 92f / 138p"
        body="Halal-friendly Lidl + Iceland shopping map and daily meal template. To be built."
      />
      <Placeholder
        id="supplements"
        eyebrow="Section 4"
        title="Supplement Schedule"
        body="Vit D, multivit, fish oil, creatine, whey — timing and the pillbox rule. To be built."
      />
      <Placeholder
        id="stick"
        eyebrow="Section 5"
        title="Making It Stick"
        body="Weekly weigh-in, progress photos, non-negotiable minimum. To be built."
      />

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        Iron Fajr · Show up. Add a rep. Repeat.
      </footer>
    </div>
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
