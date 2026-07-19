import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Flame, Scale, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { PageHeader } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

const PRINCIPLES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: CheckCircle2,
    title: "Track workouts, not just meals",
    body: "Even a basic log — 'Workout A, week 1, chest press 3×10 @ 20kg' — shows progress, which is what keeps you going when motivation dips.",
  },
  {
    icon: Flame,
    title: "Non-negotiable minimum",
    body: "If you're exhausted, still show up and do the treadmill or Stairmaster for 20 min. Something beats nothing.",
  },
  {
    icon: Sparkles,
    title: "The first 2 weeks are the hardest",
    body: "After that, 5am stops feeling brutal — your body adjusts its rhythm around Fajr and the gym.",
  },
  {
    icon: Scale,
    title: "Weigh in weekly, not daily",
    body: "Same day, same time — e.g. Sunday morning. Daily is too noisy to be useful.",
  },
  {
    icon: Camera,
    title: "Progress photo, same weekly slot",
    body: "Pair it with your weigh-in so you have a visual record alongside the number.",
  },
];

function ProgressPage() {
  const tracker = useTrackerState();

  return (
    <AppShell>
      <PageHeader title="Progress" note="Consistency beats intensity." />

      <div className="grid grid-cols-2 gap-3 px-5">
        <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
          <div className="font-display text-2xl font-bold text-primary">
            {tracker.totalSessions}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Total sessions
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
          <div className="font-display text-2xl font-bold text-primary">{tracker.weekCount}/4</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            This week
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-between gap-1.5 px-5">
        {tracker.last7Days.map((d) => (
          <div
            key={d.offset}
            className={`flex-1 rounded-xl border py-2.5 text-center ${
              d.done
                ? "border-primary bg-primary text-primary-foreground"
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

      <div className="mt-5 space-y-2.5 px-5">
        {PRINCIPLES.map((p) => (
          <div
            key={p.title}
            className="flex gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <p.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{p.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{p.body}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          if (confirm("Reset all tracked data? This can't be undone.")) tracker.reset();
        }}
        className="mt-6 w-full text-center text-xs text-muted-foreground underline underline-offset-2"
      >
        Reset all tracked data
      </button>
    </AppShell>
  );
}
