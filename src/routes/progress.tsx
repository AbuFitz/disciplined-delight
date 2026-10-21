import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { WeighInSheet } from "@/components/nl/today";
import { MilestoneLedger } from "@/components/nl/milestones";
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Section,
  Select,
  Skeleton,
} from "@/components/nl/ui";
import { PillTabs } from "@/components/nl/week-nav";
import { deleteWeighIn } from "@/data/actions";
import { useCollection, useProfile, useToday } from "@/data/hooks";
import { weekTraining } from "@/data/selectors";
import {
  COL,
  type FoodDay,
  type LegacyDayLog,
  type MindEntry,
  type Purchase,
  type Session,
  type WeighIn,
  type WorkoutTemplate,
} from "@/data/types";
import { addDays, formatDateLong, startOfWeek, weekDates, type ISODate } from "@/domain/dates";
import { formatGBP } from "@/domain/money";
import { progressMilestones } from "@/domain/milestones";
import type { MealLog } from "@/domain/nutrition";
import { estimateMaintenance, type TdeeDay } from "@/domain/tdee";
import { linearTrend } from "@/domain/trend";
import { readinessAssociation } from "@/domain/adaptation";
import { VIcon } from "@/components/nl/icon";

export const Route = createFileRoute("/progress")({ component: ProgressPage });

type Range = "4" | "12" | "all";
const axis = { stroke: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--popover)",
  border: "none",
  borderRadius: 16,
  color: "var(--foreground)",
  boxShadow: "0 8px 30px rgb(0 0 0 / 0.35)",
};

/** Card heading: bold and short, with an optional one-line caption underneath. */
function CardTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-muted-foreground tnum">{sub}</p>}
    </div>
  );
}

function Stat({ value, label, hint }: { value: React.ReactNode; label: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-3xl bg-surface/80 p-4">
      <p className="num text-3xl font-semibold tnum">{value}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProgressPage() {
  const today = useToday();
  const { profile } = useProfile();
  const [range, setRange] = useState<Range>("12");
  const [wOpen, setWOpen] = useState(false);
  const [exName, setExName] = useState("");
  const w = useCollection<WeighIn>(COL.weighIns);
  const sess = useCollection<Session>(COL.sessions);
  const tpl = useCollection<WorkoutTemplate>(COL.templates);
  const logs = useCollection<MealLog>(COL.mealLogs);
  const fd = useCollection<FoodDay>(COL.foodDays);
  const legacy = useCollection<LegacyDayLog>(COL.legacyDays);
  const purchases = useCollection<Purchase>(COL.purchases);
  const mind = useCollection<MindEntry>(COL.mind);

  const start: ISODate | null =
    range === "all" ? null : addDays(startOfWeek(today), -(Number(range) - 1) * 7);

  const weights = useMemo(
    () =>
      w.items.filter((x) => !start || x.date >= start).sort((a, b) => a.date.localeCompare(b.date)),
    [w.items, start],
  );
  const trend = linearTrend(weights.map((x) => ({ date: x.date, value: x.kg })));

  const done = sess.items.filter((s) => s.status === "completed" || s.status === "ended-early");
  const weekBars = useMemo(() => {
    const n = range === "all" ? 12 : Number(range);
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(startOfWeek(today), -(n - 1 - i) * 7);
      const wk = weekDates(d);
      const inWk = done.filter((s) => wk.includes(s.date));
      return {
        week: d.slice(5),
        completed: inWk.filter((s) => s.status === "completed").length,
        partial: inWk.filter((s) => s.status === "ended-early").length,
      };
    });
  }, [done, range, today]);
  const planned = tpl.items.filter((t) => !t.archivedAt && t.weekday != null).length;
  const currentWeekDates = weekDates(today);
  const weeklyMuscles = useMemo(() => {
    const counts = new Map<string, { sets: number; fatigue: number }>();
    done
      .filter((session) => currentWeekDates.includes(session.date))
      .flatMap((session) => session.exercises)
      .forEach((exercise) => {
        const muscles = (exercise.muscle ?? "Other")
          .split(/[,/&]/)
          .map((value) => value.trim())
          .filter(Boolean);
        const work = exercise.sets.filter(
          (set) => set.kind !== "warmup" && set.completed && !set.skipped,
        );
        for (const muscle of muscles) {
          const old = counts.get(muscle) ?? { sets: 0, fatigue: 0 };
          counts.set(muscle, {
            sets: old.sets + work.length,
            fatigue:
              old.fatigue +
              work.reduce(
                (sum, set) =>
                  sum + (set.kind === "failure" || set.rir === 0 || set.rpe === 10 ? 1.3 : 1),
                0,
              ),
          });
        }
      });
    return [...counts].sort((a, b) => b[1].sets - a[1].sets);
  }, [done, currentWeekDates]);
  const readinessLink = useMemo(() => readinessAssociation(done), [done]);

  const exerciseNames = useMemo(
    () =>
      [
        ...new Set(
          done.flatMap((s) =>
            s.exercises
              .filter((e) => e.sets.some((x) => x.completed && x.kind === "working"))
              .map((e) => e.name),
          ),
        ),
      ].sort(),
    [done],
  );
  const exName2 = exName || exerciseNames[0] || "";
  const exSeries = useMemo(
    () =>
      done
        .filter((s) => !start || s.date >= start)
        .sort((a, b) => a.startedAt - b.startedAt)
        .flatMap((s) => {
          const e = s.exercises.find((x) => x.name === exName2);
          if (!e) return [];
          const ws = e.sets.filter(
            (x) => x.kind === "working" && x.completed && x.weightKg != null,
          );
          if (!ws.length) return [];
          return [
            {
              date: s.date,
              top: Math.max(...ws.map((x) => x.weightKg!)),
              volume: Math.round(ws.reduce((a, x) => a + x.weightKg! * (x.reps ?? 0), 0)),
            },
          ];
        }),
    [done, exName2, start],
  );

  // Nutrition coverage: days with at least one log vs days in window.
  const food = useMemo(() => {
    const firstLog = logs.items.map((l) => l.date).sort()[0];
    // Count only from the first day anything was logged, so pre-use days aren't shown as gaps.
    const first = firstLog ? (start && start > firstLog ? start : firstLog) : today;
    const days: ISODate[] = [];
    for (let d = first; d <= today; d = addDays(d, 1)) days.push(d);
    const by = new Map<ISODate, number>();
    logs.items.forEach((l) => by.set(l.date, (by.get(l.date) ?? 0) + l.macros.kcal));
    const loggedDays = days.filter((d) => by.has(d));
    const complete = days.filter((d) => fd.items.some((f) => f.date === d && f.complete));
    const avg = complete.length
      ? Math.round(complete.reduce((s, d) => s + (by.get(d) ?? 0), 0) / complete.length)
      : null;
    return {
      days: days.length,
      logged: loggedDays.length,
      complete: complete.length,
      avg,
      by,
      all: days,
    };
  }, [logs.items, fd.items, start, today]);

  const tdee = useMemo(() => {
    const dates = new Set<ISODate>([
      ...w.items.map((x) => x.date),
      ...logs.items.map((l) => l.date),
    ]);
    const by = new Map<ISODate, number>();
    logs.items.forEach((l) => by.set(l.date, (by.get(l.date) ?? 0) + l.macros.kcal));
    const rows: TdeeDay[] = [...dates].map((d) => ({
      date: d,
      kcal: by.get(d),
      kcalComplete: fd.items.some((f) => f.date === d && f.complete),
      weightKg: w.items.find((x) => x.date === d)?.kg,
    }));
    return estimateMaintenance(rows);
  }, [w.items, logs.items, fd.items]);

  const wk = weekTraining(tpl.items, sess.items, today);
  const wkDates = weekDates(today);
  const spent = purchases.items
    .filter((p) => wkDates.includes(p.date))
    .reduce((s, p) => s + p.totalPence, 0);
  const foodWeek = wkDates.filter((d) => food.by.has(d)).length;
  const milestones = useMemo(
    () =>
      progressMilestones({
        sessions: sess.items,
        foodDays: fd.items,
        weighIns: w.items,
        mind: mind.items,
      }),
    [sess.items, fd.items, w.items, mind.items],
  );

  if (!w.ready || !sess.ready || !profile) return <Skeleton className="h-72 rounded-3xl" />;

  const chartData = weights.map((x) => ({
    date: x.date.slice(5),
    kg: x.kg,
    trend: trend
      ? Math.round(
          (trend.intercept +
            (trend.slopePerWeek / 7) *
              Math.round((new Date(x.date).getTime() - new Date(trend.x0).getTime()) / 86400000)) *
            10,
        ) / 10
      : undefined,
  }));

  const openSessions = wk.planned - wk.completed - wk.partial;
  const weighInsThisWeek = w.items.filter((x) => wkDates.includes(x.date)).length;
  const daysSoFar = Math.min(7, wkDates.filter((d) => d <= today).length);
  const latestWeight = weights[weights.length - 1];

  return (
    <>
      <PageHeader title="Progress" />
      <PillTabs
        className="mb-5"
        label="Date range"
        value={range}
        onChange={setRange}
        options={[
          { value: "4", label: "4 weeks" },
          { value: "12", label: "12 weeks" },
          { value: "all", label: "All" },
        ]}
      />

      <section aria-label="Weekly review" className="mb-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            value={
              <>
                {wk.completed}
                <span className="text-lg text-muted-foreground">/{wk.planned}</span>
              </>
            }
            label="Sessions"
            hint={wk.partial ? `${wk.partial} partial` : "this week"}
          />
          <Stat
            value={
              <>
                {foodWeek}
                <span className="text-lg text-muted-foreground">/{daysSoFar}</span>
              </>
            }
            label="Days with food"
            hint="logged so far"
          />
          <Stat
            value={formatGBP(spent)}
            label="Spent"
            hint={
              profile.budgetPencePerWeek != null
                ? `of ${formatGBP(profile.budgetPencePerWeek)} budget`
                : "recorded purchases"
            }
          />
          <Stat value={weighInsThisWeek} label="Weigh-ins" hint="this week" />
        </div>
        <p className="mt-3 px-1 text-sm text-muted-foreground">
          {openSessions > 0
            ? `${openSessions} planned session${openSessions > 1 ? "s" : ""} still open. Keep, move or skip them from Train.`
            : "All planned sessions are accounted for."}
          {foodWeek === 0 ? " No food logged yet this week." : ""}
          {profile.budgetPencePerWeek == null
            ? " Set a weekly budget in Settings to compare spend."
            : ""}
        </p>
      </section>

      <Section title="Muscle load this week">
        {weeklyMuscles.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {weeklyMuscles.map(([muscle, load]) => (
              <div key={muscle} className="min-w-0 rounded-3xl bg-surface/80 p-4">
                <p className="truncate text-sm font-medium text-muted-foreground">{muscle}</p>
                <p className="num mt-1 text-2xl font-semibold tnum">{load.sets} sets</p>
                <p className="text-xs text-muted-foreground tnum">
                  Fatigue est. {load.fatigue.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No sessions this week"
            body="Complete a session to see this week's estimated load."
          />
        )}
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Estimated from completed non-warm-up sets and each workout's editable muscle label, with
          failure sets weighted modestly. Not a physiological measurement.{" "}
          {readinessLink
            ? `${readinessLink.statement} Based on ${readinessLink.observations} self-reports.`
            : "Readiness associations appear after at least 6 usable self-reported check-ins, including both higher and lower readiness days."}
        </p>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="lg:col-span-2" aria-label="Bodyweight">
          <div className="flex items-start justify-between gap-3">
            <CardTitle
              sub={
                <>
                  {weights.length} weigh-in{weights.length === 1 ? "" : "s"} in range
                  {profile.goal.targetWeightKg ? ` · goal ${profile.goal.targetWeightKg} kg` : ""}
                </>
              }
            >
              Bodyweight
            </CardTitle>
            <Button variant="primary" size="sm" className="shrink-0" onClick={() => setWOpen(true)}>
              Log weight
            </Button>
          </div>
          {weights.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No weigh-ins in this range"
                body="Log your weight when you can. No need to do it daily."
                action={
                  <Button variant="primary" onClick={() => setWOpen(true)}>
                    Log weight
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {latestWeight && (
                <p className="num mt-3 text-5xl font-semibold tnum">
                  {latestWeight.kg.toFixed(1)}
                  <span className="ml-1 text-lg font-normal text-muted-foreground">kg</span>
                </p>
              )}
              <div
                className="mt-3 h-56"
                role="img"
                aria-label={`Weight chart of ${weights.length} weigh-ins from ${weights[0]!.date} to ${weights[weights.length - 1]!.date}, between ${Math.min(...weights.map((x) => x.kg))} and ${Math.max(...weights.map((x) => x.kg))} kilograms`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--line)" strokeOpacity={0.6} vertical={false} />
                    <XAxis
                      dataKey="date"
                      {...axis}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[(m: number) => Math.floor(m - 1), (m: number) => Math.ceil(m + 1)]}
                      allowDecimals={false}
                      {...axis}
                      tickLine={false}
                      axisLine={false}
                      unit=" kg"
                      width={56}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg`]} />
                    {profile.goal.targetWeightKg && (
                      <ReferenceLine
                        y={profile.goal.targetWeightKg}
                        stroke="var(--warm)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke="var(--spring)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--spring)", strokeWidth: 0 }}
                      connectNulls={false}
                      name="Weigh-in"
                    />
                    {trend && (
                      <Line
                        type="linear"
                        dataKey="trend"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        name="Trend"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-sm text-muted-foreground tnum">
                {trend
                  ? `Trend about ${trend.slopePerWeek >= 0 ? "+" : ""}${trend.slopePerWeek.toFixed(2)} kg per week, fitted to ${trend.n} weigh-ins over ${trend.spanDays} days. Day-to-day changes are normal.`
                  : "A trend line appears once there are at least 6 weigh-ins spread over 2 weeks."}
              </p>
              <details className="mt-2">
                <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-surface-2/70 px-4 text-sm font-semibold">
                  Weigh-ins list
                </summary>
                <ul className="mt-2">
                  {[...weights].reverse().map((x) => (
                    <li
                      key={x.id}
                      className="flex min-h-14 items-center justify-between gap-3 border-t border-line/70 py-2 first:border-t-0"
                    >
                      <div>
                        <p className="tnum font-semibold">{x.kg.toFixed(1)} kg</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateLong(x.date)}
                          {x.source === "legacy" ? " · from original app" : ""}
                        </p>
                      </div>
                      <button
                        aria-label={`Delete weigh-in ${x.date}`}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
                        onClick={async () => {
                          await deleteWeighIn(x.id);
                          toast("Weigh-in removed");
                        }}
                      >
                        <VIcon name="delete" size={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </Panel>

        <Panel aria-label="Training">
          <CardTitle
            sub={
              <>
                This week: {wk.completed} of {wk.planned} planned sessions
                {wk.partial ? `, ${wk.partial} partial` : ""}
              </>
            }
          >
            Training frequency
          </CardTitle>
          <div
            className="mt-4 h-44"
            role="img"
            aria-label={`Sessions per week over the last ${weekBars.length} weeks`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekBars} margin={{ left: -24, right: 4 }}>
                <CartesianGrid stroke="var(--line)" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="week" {...axis} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} {...axis} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--foreground)", fillOpacity: 0.06 }}
                />
                {planned > 0 && (
                  <ReferenceLine
                    y={planned}
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="var(--spring)"
                  name="Completed"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="partial"
                  stackId="a"
                  fill="var(--warm)"
                  name="Partial"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dashed line = planned sessions per week. Cardio isn't counted as a lifting session.
          </p>
        </Panel>

        <Panel aria-label="Exercise performance">
          <CardTitle>Exercise performance</CardTitle>
          {exerciseNames.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No recorded sets yet"
                body="Per-set weight and reps start with your first session here. Original-app weights are listed below."
              />
            </div>
          ) : (
            <>
              <div className="mt-3">
                <Select
                  aria-label="Exercise"
                  value={exName2}
                  onChange={(e) => setExName(e.target.value)}
                  className="rounded-full border-transparent bg-surface-2/70 px-5 font-medium"
                >
                  {exerciseNames.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </Select>
              </div>
              {exSeries.length < 2 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Needs at least two sessions with this exercise in range to compare.
                </p>
              ) : (
                <div
                  className="mt-3 h-44"
                  role="img"
                  aria-label={`Top working weight for ${exName2} by session`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={exSeries.map((x) => ({ ...x, date: x.date.slice(5) }))}
                      margin={{ left: -18, right: 8 }}
                    >
                      <CartesianGrid stroke="var(--line)" strokeOpacity={0.6} vertical={false} />
                      <XAxis dataKey="date" {...axis} tickLine={false} axisLine={false} />
                      <YAxis
                        {...axis}
                        tickLine={false}
                        axisLine={false}
                        unit=" kg"
                        width={52}
                        domain={[(m: number) => Math.floor(m - 2), (m: number) => Math.ceil(m + 2)]}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        dataKey="top"
                        name="Top weight (kg)"
                        stroke="var(--spring)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "var(--spring)", strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {exSeries.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground tnum">
                  Latest: {exSeries[exSeries.length - 1]!.top} kg top set ·{" "}
                  {exSeries[exSeries.length - 1]!.volume.toLocaleString("en-GB")} kg logged volume.
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel aria-label="Nutrition coverage">
          <CardTitle>Food logging</CardTitle>
          {logs.items.length === 0 ? (
            <p className="mt-3 text-2xl font-semibold">No food logged yet</p>
          ) : (
            <p className="num mt-3 text-4xl font-semibold tnum">
              {food.logged}
              <span className="font-display text-base font-normal tracking-normal text-muted-foreground">
                {" "}
                of {food.days} days logged
              </span>
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Days with food logged">
            {food.all.slice(-42).map((d) => (
              <li
                key={d}
                title={`${d}: ${food.by.has(d) ? "logged" : "nothing logged"}`}
                className={`size-4 rounded-md ${food.by.has(d) ? "bg-spring" : "bg-foreground/15"}`}
              >
                <span className="sr-only">
                  {d}: {food.by.has(d) ? "logged" : "nothing logged"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground tnum">
            {food.avg != null
              ? `Average on ${food.complete} fully-logged days: ${food.avg.toLocaleString("en-GB")} kcal.`
              : "No days are marked fully logged yet, so there's no average. Days without logs are unknown, not zero."}
          </p>
        </Panel>

        <Panel aria-label="Maintenance estimate">
          <CardTitle>Maintenance estimate</CardTitle>
          {tdee.ok ? (
            <>
              <p className="num mt-3 text-4xl font-semibold tnum">
                ~{tdee.maintenanceKcal.toLocaleString("en-GB")}
                <span className="font-display text-base font-normal tracking-normal text-muted-foreground">
                  {" "}
                  kcal
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground tnum">
                Likely between {tdee.rangeKcal[0].toLocaleString("en-GB")} and{" "}
                {tdee.rangeKcal[1].toLocaleString("en-GB")}. Based on {tdee.loggedDays} fully-logged
                days over {tdee.windowDays} days; weight trend{" "}
                {tdee.weightSlopeKgPerWeek >= 0 ? "+" : ""}
                {tdee.weightSlopeKgPerWeek} kg/week.
              </p>
              <p className="mt-2 text-sm">
                Information only. Your target changes only if you change it in Settings.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-semibold">Not enough data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tdee.reason} An estimate also needs weigh-ins across at least two weeks.
              </p>
            </>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <MilestoneLedger milestones={milestones} />
      </div>

      <Section title="From your original app" className="mt-6">
        {legacy.items.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No records were found from the original app on this browser.
          </p>
        ) : (
          <Panel aria-label="Original app history" className="p-5">
            <p className="text-sm text-muted-foreground">
              {legacy.items.length} days kept exactly as recorded: one weight and a done flag per
              exercise. They weren't turned into sets or reps, so they don't affect volume or
              personal bests.
            </p>
            <details className="mt-3">
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-surface-2/70 px-4 text-sm font-semibold">
                Show days
              </summary>
              <ul className="mt-2">
                {[...legacy.items]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((d) => (
                    <li key={d.date} className="border-t border-line/70 py-3 first:border-t-0">
                      <p className="font-semibold">{formatDateLong(d.date)}</p>
                      <p className="text-sm text-muted-foreground tnum">
                        {Object.entries(d.exercises)
                          .filter(([, e]) => e.done || e.weight)
                          .map(
                            ([k, e]) =>
                              `${k.toUpperCase()}${e.weight ? ` ${e.weight} kg` : ""}${e.done ? " ✓" : ""}`,
                          )
                          .join(" · ") || "No exercises"}
                        {d.cardioDone ? " · cardio" : ""}
                        {d.bodyWeightKg ? ` · ${d.bodyWeightKg} kg` : ""}
                      </p>
                    </li>
                  ))}
              </ul>
            </details>
          </Panel>
        )}
      </Section>
      <WeighInSheet
        open={wOpen}
        onOpenChange={setWOpen}
        date={today}
        initial={weights[weights.length - 1]?.kg}
      />
    </>
  );
}
