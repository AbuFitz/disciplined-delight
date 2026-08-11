import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { Flame, Pill, Scale, Sparkles, Trophy } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader, SectionLabel } from "@/components/sunrise/ui";
import { useTrackerState, type DayLog } from "@/hooks/use-tracker-state";
import { SUPPLEMENTS, workouts } from "@/lib/sunrise-data";
import { calculateAdaptiveTDEE, type TDEELog } from "@/lib/algorithms";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

const EXERCISE_INDEX = new Map(workouts.flatMap((w) => w.exercises.map((e) => [e.id, e])));

const dateAt = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const shortLabel = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2);
};

const relativeDate = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

type PR = { exerciseId: string; weight: number; date: string };

function computePRs(logs: Record<string, DayLog>): PR[] {
  const best: Record<string, PR> = {};
  for (const [date, day] of Object.entries(logs)) {
    for (const [exerciseId, entry] of Object.entries(day.exercises)) {
      if (!entry.done || !entry.weight) continue;
      const weight = parseFloat(entry.weight);
      if (!Number.isFinite(weight)) continue;
      if (!best[exerciseId] || weight > best[exerciseId]!.weight) {
        best[exerciseId] = { exerciseId, weight, date };
      }
    }
  }
  return Object.values(best).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function ProgressPage() {
  const tracker = useTrackerState();

  const prs = useMemo(() => computePRs(tracker.logs), [tracker.logs]);

  const weightSeries = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const offset = i - 13;
        const day = tracker.logs[dateAt(offset)];
        return { label: shortLabel(offset), weight: day?.bodyWeightKg };
      }).filter((d) => d.weight !== undefined) as { label: string; weight: number }[],
    [tracker.logs],
  );

  const tdee = useMemo(() => {
    const entries = Object.entries(tracker.logs)
      .filter(([, day]) => day.bodyWeightKg !== undefined && day.caloriesLogged !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(
        ([date, day]): TDEELog => ({
          date,
          weightKg: day.bodyWeightKg!,
          caloriesLogged: day.caloriesLogged!,
        }),
      );
    return { estimate: calculateAdaptiveTDEE(entries), sampleSize: entries.length };
  }, [tracker.logs]);

  const activity = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const offset = i - 13;
        const day = tracker.logs[dateAt(offset)];
        const exercisesDone = day ? Object.values(day.exercises).filter((e) => e.done).length : 0;
        return { label: shortLabel(offset), exercises: exercisesDone };
      }),
    [tracker.logs],
  );

  const adherence = useMemo(() => {
    let checked = 0;
    for (let o = -6; o <= 0; o++) {
      const day = tracker.logs[dateAt(o)];
      if (!day) continue;
      checked += Object.values(day.supplements).filter(Boolean).length;
    }
    const possible = 7 * SUPPLEMENTS.length;
    return possible === 0 ? 0 : Math.round((checked / possible) * 100);
  }, [tracker.logs]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Ultimate tracking"
        title="Progress"
        note="Every rep, weight and streak you've logged — pulled straight from your history, nothing made up."
      />

      <div className="px-5">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-vital/40 bg-vital/10 p-3.5 text-center">
            <div className="font-display text-2xl font-bold text-vital-foreground">
              {tracker.currentStreak}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wider text-vital-foreground/70">
              Day streak
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3.5 text-center shadow-soft">
            <div className="font-display text-2xl font-bold text-primary">
              {tracker.totalSessions}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              Sessions
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3.5 text-center shadow-soft">
            <div className="font-display text-2xl font-bold text-primary">{prs.length}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              PRs logged
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-primary" />
          <SectionLabel>Daily check-in</SectionLabel>
        </div>
        <div className="mt-3 flex gap-2.5">
          <label className="flex-1 rounded-2xl border border-border bg-white p-3.5 shadow-soft">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Body weight (kg)
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="—"
              defaultValue={tracker.todayLog.bodyWeightKg ?? ""}
              onBlur={(e) =>
                tracker.setBodyWeight(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              className="mt-1 w-full bg-transparent font-display text-lg font-bold text-foreground focus:outline-none"
            />
          </label>
          <label className="flex-1 rounded-2xl border border-border bg-white p-3.5 shadow-soft">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Calories logged
            </span>
            <input
              type="number"
              inputMode="numeric"
              step="10"
              placeholder="—"
              defaultValue={tracker.todayLog.caloriesLogged ?? ""}
              onBlur={(e) =>
                tracker.setCaloriesLogged(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="mt-1 w-full bg-transparent font-display text-lg font-bold text-foreground focus:outline-none"
            />
          </label>
        </div>

        {weightSeries.length >= 2 && (
          <div className="mt-3 rounded-2xl border border-border bg-white p-3 pt-4 shadow-soft">
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={weightSeries} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-border bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Adaptive TDEE estimate</span>
            <span className="font-display text-lg font-bold text-primary">
              {tdee.estimate.toLocaleString()} kcal
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {tdee.sampleSize >= 14
              ? `Based on your last ${tdee.sampleSize} days of logged weight + calories.`
              : `Showing the 2,760 kcal baseline — log weight and calories for ${14 - tdee.sampleSize} more day${14 - tdee.sampleSize === 1 ? "" : "s"} to get a real estimate from your own data.`}
          </p>
        </div>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <SectionLabel>Activity — last 14 days</SectionLabel>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-white p-3 pt-4 shadow-soft">
          {activity.every((d) => d.exercises === 0) ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              Log an exercise to start seeing your activity here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={activity} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <Bar dataKey="exercises" fill="#2054d6" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Exercises marked done per day — a proxy for how much work you put in.
        </p>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-primary" />
          <SectionLabel>Personal records</SectionLabel>
        </div>
        {prs.length === 0 ? (
          <div className="mt-3">
            <Callout icon={Trophy}>
              Log a weight and mark an exercise done on Workouts — your first PR shows up here
              automatically.
            </Callout>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
            {prs.map((pr) => {
              const exercise = EXERCISE_INDEX.get(pr.exerciseId);
              return (
                <div key={pr.exerciseId} className="flex items-center gap-3 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {exercise?.name ?? pr.exerciseId}
                    </div>
                    <div className="text-xs text-muted-foreground">{relativeDate(pr.date)}</div>
                  </div>
                  <div className="shrink-0 font-mono text-sm font-bold text-primary">
                    {pr.weight}kg
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 px-5 pb-2">
        <div className="flex items-center gap-1.5">
          <Pill className="h-4 w-4 text-primary" />
          <SectionLabel>Supplement adherence — last 7 days</SectionLabel>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-bold text-foreground">{adherence}%</span>
            <span className="text-xs text-muted-foreground">of daily supplements taken</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-vital transition-all"
              style={{ width: `${adherence}%` }}
            />
          </div>
        </div>
        {adherence < 60 && (
          <div className="mt-3">
            <Callout icon={Flame}>
              Keep the pot next to the kettle — adherence tends to drop first when the bottles are
              out of sight.
            </Callout>
          </div>
        )}
      </div>
    </AppShell>
  );
}
