import { createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  LogOut,
  Repeat,
  Scale,
  Sparkles,
  Sunrise,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { PageHeader, SectionLabel } from "@/components/sunrise/ui";
import { useAuth } from "@/hooks/use-auth";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { useScheduleState, type ScheduleStep } from "@/hooks/use-schedule-state";
import { useWorkoutMode, type WorkoutMode } from "@/hooks/use-workout-mode";
import { isSupabaseConfigured } from "@/lib/supabase";
import { WEEKLY_SPLIT } from "@/lib/sunrise-data";

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

const WORKOUT_MODES: Array<{
  mode: WorkoutMode;
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    mode: "week",
    icon: Calendar,
    title: "Week-by-week",
    body: "Run one workout for a full week while you learn the machines. Tabs show Week 1–4.",
  },
  {
    mode: "day",
    icon: Repeat,
    title: "Day rotation",
    body: "Cycle A → B → C → D each session. Marking cardio done moves you to the next one automatically. Switch here once you know the machines and want a session-by-session rotation instead.",
  },
];

function SettingsPage() {
  const tracker = useTrackerState();
  const schedule = useScheduleState();
  const { mode, setMode } = useWorkoutMode();
  const auth = useAuth();

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        note="Change what's changed — Fajr time, gym time, work hours."
      />

      <div className="px-5">
        <SectionLabel>Workout setup</SectionLabel>
        <div className="mt-3 space-y-2.5">
          {WORKOUT_MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => setMode(m.mode)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                mode === m.mode
                  ? "border-primary bg-accent/50"
                  : "border-border bg-white shadow-soft"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <m.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{m.title}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.body}</div>
              </div>
              {mode === m.mode && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Suggested split once you're settled:{" "}
          {WEEKLY_SPLIT.filter((d) => d.letter)
            .map((d) => `${d.day} ${d.letter}`)
            .join(" · ")}{" "}
          — rest the other days.
        </p>
      </div>

      <div className="mt-7 px-5">
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

      {isSupabaseConfigured && auth.user && (
        <div className="mt-7 px-5">
          <SectionLabel>Account</SectionLabel>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {auth.user.email}
              </div>
              <div className="text-xs text-muted-foreground">Signed in</div>
            </div>
            <button
              onClick={() => auth.signOut()}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}

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
