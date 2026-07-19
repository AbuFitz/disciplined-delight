import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Flame, Scale, Sparkles, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { PageHeader } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { useScheduleState } from "@/hooks/use-schedule-state";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
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

function SettingsPage() {
  const tracker = useTrackerState();
  const schedule = useScheduleState();

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        note="Habits worth remembering, and a clean slate if you need one."
      />

      <div className="space-y-2.5 px-5">
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

      <div className="mt-7 px-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data
        </h2>
        <div className="mt-3 space-y-2.5">
          <button
            onClick={() => {
              if (
                confirm("Reset all workout, cardio and supplement tracking? This can't be undone.")
              )
                tracker.reset();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-soft"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Reset tracked data</div>
              <div className="text-xs text-muted-foreground">
                Clears workout, cardio and supplement history
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              if (confirm("Reset the Schedule page back to the default timeline?"))
                schedule.resetToDefault();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-soft"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Reset schedule</div>
              <div className="text-xs text-muted-foreground">
                Restores the default Fajr-to-lights-out timeline
              </div>
            </div>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
