import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Dumbbell,
  Flame,
  Sunrise,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { workouts } from "@/lib/sunrise-data";

export const Route = createFileRoute("/")({
  component: Index,
});

const NAV_CARDS = [
  { to: "/workouts", icon: Dumbbell, label: "Workouts", desc: "This week's rotation" },
  { to: "/schedule", icon: CalendarClock, label: "Schedule", desc: "Fajr to lights-out" },
  { to: "/nutrition", icon: UtensilsCrossed, label: "Nutrition", desc: "Meals & supplements" },
  { to: "/progress", icon: TrendingUp, label: "Progress", desc: "Streak & habits" },
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
  const current = workouts.find((w) => w.id === tracker.activeTab) ?? workouts[0];

  return (
    <AppShell>
      <section className="bg-gradient-dusk px-5 pb-7 pt-6 text-white">
        <p className="text-sm text-blue-200">{greeting?.text ?? "Welcome"}</p>
        <p className="mt-0.5 text-xs text-blue-300">{greeting?.date ?? " "}</p>

        <div className="mt-5 flex items-center gap-2 text-xs text-blue-200">
          <Sunrise className="h-3.5 w-3.5" />
          Fajr 3:14am
          <span className="text-blue-400">·</span>
          <Dumbbell className="h-3.5 w-3.5" />
          GymGroup 6am
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

      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <Flame className="h-4 w-4 text-primary" />
          <span className="font-semibold">{tracker.weekCount}/4</span>
          <span className="text-muted-foreground">sessions this week</span>
        </div>
        <Link to="/progress" className="text-xs font-medium text-primary">
          View streak
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5">
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
      </div>
    </AppShell>
  );
}
