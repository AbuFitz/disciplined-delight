import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Dumbbell, Flame, Sunrise, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { formatStepTime, useScheduleState } from "@/hooks/use-schedule-state";
import { workouts } from "@/lib/sunrise-data";

export const Route = createFileRoute("/")({
  component: Index,
});

const NAV_CARDS = [
  { to: "/workouts", icon: Dumbbell, label: "Workouts", desc: "This week's rotation" },
  { to: "/schedule", icon: CalendarClock, label: "Schedule", desc: "Fajr to lights-out" },
] as const;

function useGreeting() {
  const [greeting, setGreeting] = useState<{ text: string; date: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const text = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const date = now.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    setGreeting({ text, date });
  }, []);
  return greeting;
}

function Index() {
  const greeting = useGreeting();
  const tracker = useTrackerState();
  const schedule = useScheduleState();
  const current = workouts.find((w) => w.id === tracker.activeTab) ?? workouts[0];
  const fajr = schedule.findByKey("fajr");
  const gym = schedule.findByKey("gym");

  return (
    <AppShell>
      <section className="bg-gradient-dusk px-5 pb-7 pt-6 text-white">
        <p className="text-sm text-blue-200">{greeting?.text ?? "Welcome"}</p>
        <p className="mt-0.5 text-xs text-blue-300">{greeting?.date ?? " "}</p>

        <div className="mt-5 flex items-center gap-2 text-xs text-blue-200">
          <Sunrise className="h-3.5 w-3.5" />
          {fajr ? `Fajr ${formatStepTime(fajr)}` : "Fajr"}
          <span className="text-blue-400">·</span>
          <Dumbbell className="h-3.5 w-3.5" />
          {gym ? `GymGroup ${formatStepTime(gym)}` : "GymGroup"}
        </div>

        <Link
          to="/workouts"
          className="mt-4 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15"
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-blue-200">Continue</div>
            <div className="mt-0.5 font-display text-lg font-bold">
              Workout {current.letter} — {current.title}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-white" />
        </Link>
      </section>

      {/* Progress — kept right here on Home so it's the first thing you see */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
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

        {tracker.weekCount === 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary" />
            Log a workout or cardio session to start your streak.
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 px-5 pb-2">
        {NAV_CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-2xl border border-border bg-white p-4 shadow-soft transition-colors hover:border-primary/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
              <c.icon className="h-4.5 w-4.5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">{c.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{c.desc}</div>
          </Link>
        ))}
        <Link
          to="/nutrition"
          className="col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft transition-colors hover:border-primary/40"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <UtensilsCrossed className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Nutrition</div>
            <div className="text-xs text-muted-foreground">Meals & supplements</div>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
