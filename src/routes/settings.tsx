import { createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  Briefcase,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  Sunrise,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { PageHeader, SectionLabel } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { useScheduleState, type ScheduleStep } from "@/hooks/use-schedule-state";

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
        note="Change what's changed — Fajr time, gym time, work hours."
      />

      <div className="px-5">
        <SectionLabel>Key times</SectionLabel>
        <div className="mt-3 space-y-2.5">
          <TimeRow
            icon={Sunrise}
            label="Fajr"
            step={schedule.findByKey("fajr")}
            onSave={(p) => schedule.updateStepByKey("fajr", p)}
          />
          <TimeRow
            icon={AlarmClock}
            label="Wake / alarm"
            step={schedule.findByKey("wake")}
            onSave={(p) => schedule.updateStepByKey("wake", p)}
          />
          <TimeRow
            icon={Dumbbell}
            label="Gym session"
            step={schedule.findByKey("gym")}
            onSave={(p) => schedule.updateStepByKey("gym", p)}
            showEnd
          />
          <TimeRow
            icon={Briefcase}
            label="Work"
            step={schedule.findByKey("work")}
            onSave={(p) => schedule.updateStepByKey("work", p)}
            showEnd
          />
          <TimeRow
            icon={UtensilsCrossed}
            label="Dinner"
            step={schedule.findByKey("dinner")}
            onSave={(p) => schedule.updateStepByKey("dinner", p)}
          />
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Need to edit a full step, add one, or remove one? Head to Schedule and tap it.
        </p>
      </div>

      <div className="mt-7 space-y-2.5 px-5">
        <SectionLabel>Habits worth remembering</SectionLabel>
        <div className="mt-3 space-y-2.5">
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
      </div>

      <div className="mt-7 px-5 pb-2">
        <SectionLabel>Data</SectionLabel>
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

function TimeRow({
  icon: Icon,
  label,
  step,
  onSave,
  showEnd,
}: {
  icon: LucideIcon;
  label: string;
  step: ScheduleStep | undefined;
  onSave: (patch: Partial<ScheduleStep>) => void;
  showEnd?: boolean;
}) {
  if (!step) return null;
  return (
    <div className="rounded-2xl border border-border bg-white p-3.5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">{label}</div>
      </div>
      <div className={`mt-2.5 flex items-center gap-1.5 ${showEnd ? "" : "justify-end"}`}>
        <input
          type="time"
          value={step.startTime}
          onChange={(e) => onSave({ startTime: e.target.value })}
          className={`rounded-lg border border-border bg-secondary px-2 py-1.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none ${showEnd ? "flex-1" : ""}`}
        />
        {showEnd && step.endTime !== undefined && (
          <>
            <span className="shrink-0 text-xs text-muted-foreground">–</span>
            <input
              type="time"
              value={step.endTime}
              onChange={(e) => onSave({ endTime: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
            />
          </>
        )}
      </div>
    </div>
  );
}
