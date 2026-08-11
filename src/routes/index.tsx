import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Pill,
  Sunrise,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { SectionLabel } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { formatStepTime, useScheduleState, type ScheduleStep } from "@/hooks/use-schedule-state";
import { MACROS, SUPPLEMENTS, workouts } from "@/lib/sunrise-data";

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

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function formatCountdown(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `in ${m}m`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}

function useUpNext(steps: ScheduleStep[]) {
  const [info, setInfo] = useState<{ step: ScheduleStep; when: string } | null>(null);

  useEffect(() => {
    if (steps.length === 0) return;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const inProgress = steps.find((s) => {
      if (s.endTime === undefined) return false;
      const start = toMinutes(s.startTime);
      let end = toMinutes(s.endTime);
      if (end < start) end += 24 * 60;
      return nowMinutes >= start && nowMinutes < end;
    });
    if (inProgress) {
      setInfo({ step: inProgress, when: "Now" });
      return;
    }

    const upcoming = steps
      .map((s) => ({ s, start: toMinutes(s.startTime) }))
      .filter((x) => x.start > nowMinutes)
      .sort((a, b) => a.start - b.start)[0];
    if (upcoming) {
      setInfo({ step: upcoming.s, when: formatCountdown(upcoming.start - nowMinutes) });
      return;
    }

    const first = steps[0]!;
    const mins = 24 * 60 - nowMinutes + toMinutes(first.startTime);
    setInfo({ step: first, when: `${formatCountdown(mins)} · tomorrow` });
  }, [steps]);

  return info;
}

function Index() {
  const greeting = useGreeting();
  const tracker = useTrackerState();
  const schedule = useScheduleState();
  const current = workouts.find((w) => w.id === tracker.activeTab) ?? workouts[0];
  const fajr = schedule.findByKey("fajr");
  const gym = schedule.findByKey("gym");
  const upNext = useUpNext(schedule.steps);
  const suppsDone = SUPPLEMENTS.filter((s) => tracker.todayLog.supplements[s.id]).length;

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-primary">
            NL
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            New Life
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{greeting?.text ?? "Welcome"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{greeting?.date ?? " "}</p>

        <section className="bg-gradient-hero mt-4 rounded-3xl p-5 text-white shadow-elevated">
          <div className="flex items-center gap-2 text-xs text-blue-100">
            <Sunrise className="h-3.5 w-3.5" />
            {fajr ? `Fajr ${formatStepTime(fajr)}` : "Fajr"}
            <span className="text-blue-300">·</span>
            <Dumbbell className="h-3.5 w-3.5" />
            {gym ? `GymGroup ${formatStepTime(gym)}` : "GymGroup"}
          </div>

          <Link to="/workouts" className="mt-4 flex items-center justify-between">
            <div>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100">
                Continue
              </span>
              <div className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
                Workout {current.letter} — {current.title}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-white" />
          </Link>
        </section>
      </div>

      {upNext && (
        <div className="px-5 pt-5">
          <Link
            to="/schedule"
            className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft transition-colors hover:border-primary/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {upNext.when === "Now" ? "Happening now" : `Up next · ${upNext.when}`}
              </div>
              <div className="truncate text-sm font-semibold text-foreground">
                {upNext.step.label}
              </div>
            </div>
            <div className="shrink-0 font-mono text-xs font-semibold text-primary">
              {formatStepTime(upNext.step)}
            </div>
          </Link>
        </div>
      )}

      {/* Progress — kept right here on Home so it's the first thing you see */}
      <div className="px-5 pt-5">
        <SectionLabel>This week</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
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
              className={`flex-1 rounded-2xl border py-2.5 text-center transition-colors ${
                d.done ? "border-vital bg-vital text-vital-foreground" : "border-border bg-white"
              } ${d.isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              <div
                className={`text-[9px] uppercase ${d.done ? "text-vital-foreground/70" : "text-muted-foreground"}`}
              >
                {d.letter}
              </div>
              <div className="mt-1 text-xs">{d.done ? "✓" : "·"}</div>
            </div>
          ))}
        </div>

        {tracker.weekCount === 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-vital" />
            Log a workout or cardio session to start your streak.
          </div>
        )}
      </div>

      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <SectionLabel>Today's targets</SectionLabel>
          <Link to="/nutrition" className="text-xs font-medium text-primary">
            Nutrition
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {MACROS.map((m) => (
            <div
              key={m.key}
              className="rounded-2xl border border-slate-100 bg-white px-2 py-2.5 text-center shadow-soft"
            >
              <div className="font-display text-sm font-bold text-foreground">{m.val}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <SectionLabel>Supplements today</SectionLabel>
          <span className="text-xs font-medium text-primary">
            {suppsDone}/{SUPPLEMENTS.length}
          </span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {SUPPLEMENTS.map((s) => {
            const done = !!tracker.todayLog.supplements[s.id];
            return (
              <button
                key={s.id}
                onClick={() => tracker.toggleSupplement(s.id)}
                aria-label={s.name}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-200 bg-white shadow-soft"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Pill className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-xs font-semibold">{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 px-5 pb-2 pt-3">
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
