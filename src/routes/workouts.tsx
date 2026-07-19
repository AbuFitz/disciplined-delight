import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  Play,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader, Sheet } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { useWorkoutMode } from "@/hooks/use-workout-mode";
import {
  diagramSearchUrl,
  RESOURCES,
  workouts,
  youtubeSearchUrl,
  type Exercise,
} from "@/lib/sunrise-data";

export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const [openAlt, setOpenAlt] = useState<Exercise | null>(null);
  const tracker = useTrackerState();
  const { mode } = useWorkoutMode();
  const activeWorkout = tracker.activeTab;
  const currentIndex = workouts.findIndex((w) => w.id === activeWorkout);
  const current = workouts[currentIndex === -1 ? 0 : currentIndex]!;

  const tabLabel = (index: number, week: string) => (mode === "day" ? `Day ${index + 1}` : week);

  const onToggleCardio = () => {
    const wasDone = tracker.todayLog.cardioDone;
    tracker.toggleCardio();
    if (!wasDone && mode === "day") {
      const next = workouts[(currentIndex + 1) % workouts.length]!;
      tracker.setActiveTab(next.id);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Workouts"
        note={
          mode === "day"
            ? "Cycle A → B → C → D each session. Finishing cardio moves you to the next one."
            : "Run each for a full week. From week 5, repeat with +1 rep or a little more weight. No leg day."
        }
      />

      <div className="grid grid-cols-4 gap-2 px-5">
        {workouts.map((w, i) => (
          <button
            key={w.id}
            onClick={() => tracker.setActiveTab(w.id)}
            className={`rounded-xl border p-2.5 text-center transition-colors ${
              activeWorkout === w.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-foreground"
            }`}
          >
            <div className="font-display text-lg font-bold">{w.letter}</div>
            <div
              className={`mt-0.5 text-[9px] uppercase tracking-wider ${activeWorkout === w.id ? "text-blue-200" : "text-muted-foreground"}`}
            >
              {tabLabel(i, w.week)}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border shadow-soft mx-5">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-blue-200">
              Workout {current.letter} ·{" "}
              {tabLabel(currentIndex === -1 ? 0 : currentIndex, current.week)}
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-white">{current.title}</h3>
            <p className="mt-1 text-xs text-slate-200">{current.focus}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 px-5">
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
            onOpenAlt={() => setOpenAlt(ex)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft mx-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{current.cardioMachine}</div>
            <div className="text-xs text-muted-foreground">{current.cardio}, after weights</div>
          </div>
        </div>
        <button
          onClick={onToggleCardio}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            tracker.todayLog.cardioDone
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-foreground"
          }`}
        >
          {tracker.todayLog.cardioDone ? "Done ✓" : "Mark done"}
        </button>
      </div>

      <div className="mx-5 mt-4">
        <Callout icon={TrendingUp}>
          {mode === "day" ? (
            <>
              Next time you're back on Workout {current.letter}, add one rep to your top set or a
              little more weight. That's the whole system.
            </>
          ) : (
            <>
              Next time you run Workout {current.letter}, add one rep to your top set or a little
              more weight. That's the whole system.
            </>
          )}
        </Callout>
      </div>

      <div className="mx-5 mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          More resources
        </div>
        <div className="grid grid-cols-2 gap-2">
          {RESOURCES.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-2.5 text-xs font-semibold text-foreground shadow-soft"
            >
              {r.name}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>

      <Sheet open={!!openAlt} onClose={() => setOpenAlt(null)}>
        {openAlt?.alt && (
          <div className="px-5 pb-2 pt-2">
            <div className="text-xs font-medium text-muted-foreground">Alt for {openAlt.name}</div>
            <h3 className="mt-1 font-display text-xl font-bold text-foreground">{openAlt.alt}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Same muscle group, different equipment — swap in if the primary machine or cable
              station isn't free.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={youtubeSearchUrl(openAlt.alt)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <Play className="h-3.5 w-3.5" />
                Watch
              </a>
              <a
                href={diagramSearchUrl(openAlt.alt)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Diagram
              </a>
            </div>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function ExerciseCard({
  index,
  exercise,
  done,
  weight,
  onToggle,
  onWeightChange,
  onOpenAlt,
}: {
  index: number;
  exercise: Exercise;
  done: boolean;
  weight: string;
  onToggle: () => void;
  onWeightChange: (w: string) => void;
  onOpenAlt: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-soft transition-colors ${done ? "border-primary/40 bg-accent/40" : "border-border bg-white"}`}
    >
      <div className="flex gap-3 p-3">
        <a
          href={youtubeSearchUrl(exercise.name)}
          target="_blank"
          rel="noopener noreferrer"
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
        </a>

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
              href={diagramSearchUrl(exercise.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/70"
            >
              <ImageIcon className="h-3 w-3" />
              Diagram
            </a>
          </div>
        </div>
      </div>

      {exercise.alt && (
        <button
          onClick={onOpenAlt}
          className="flex w-full items-center justify-between border-t border-border bg-secondary px-3 py-2 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <span>
            Alt: <span className="text-foreground">{exercise.alt}</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>
      )}
    </div>
  );
}
