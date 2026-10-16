import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
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
  Eyebrow,
  PageHeader,
  Panel,
  Row,
  Segmented,
  Select,
  Skeleton,
} from "@/components/nl/ui";
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

export const Route = createFileRoute("/progress")({ component: ProgressPage });

type Range = "4" | "12" | "all";
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

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

  if (!w.ready || !sess.ready || !profile) return <Skeleton className="h-72" />;

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

  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="What the records show"
        sub="Only real observations appear here. Gaps stay gaps."
        actions={
          <Segmented
            label="Date range"
            value={range}
            onChange={setRange}
            options={[
              { value: "4", label: "4 weeks" },
              { value: "12", label: "12 weeks" },
              { value: "all", label: "All" },
            ]}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <MilestoneLedger milestones={milestones} />

        <Panel className="lg:col-span-2" aria-label="Bodyweight">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>Bodyweight</Eyebrow>
              <p className="mt-1 text-sm text-muted-foreground tnum">
                {weights.length} weigh-ins in range
                {profile.goal.targetWeightKg ? ` · goal ${profile.goal.targetWeightKg} kg` : ""}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={() => setWOpen(true)}
            >
              Log weight
            </Button>
          </div>
          {weights.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No weigh-ins in this range"
                body="Log your weight when you can. There's no need to do it daily."
              />
            </div>
          ) : (
            <>
              <div
                className="mt-4 h-56"
                role="img"
                aria-label={`Weight chart of ${weights.length} weigh-ins from ${weights[0]!.date} to ${weights[weights.length - 1]!.date}, between ${Math.min(...weights.map((x) => x.kg))} and ${Math.max(...weights.map((x) => x.kg))} kilograms`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="date" {...axis} tickLine={false} minTickGap={24} />
                    <YAxis
                      domain={[(m: number) => Math.floor(m - 1), (m: number) => Math.ceil(m + 1)]}
                      allowDecimals={false}
                      {...axis}
                      tickLine={false}
                      axisLine={false}
                      unit=" kg"
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        color: "var(--foreground)",
                      }}
                      formatter={(v: number) => [`${v} kg`]}
                    />
                    {profile.goal.targetWeightKg && (
                      <ReferenceLine
                        y={profile.goal.targetWeightKg}
                        stroke="var(--warm)"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke="var(--spring)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      name="Weigh-in"
                    />
                    {trend && (
                      <Line
                        type="linear"
                        dataKey="trend"
                        stroke="var(--chart-3)"
                        strokeWidth={1.5}
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
                <summary className="min-h-11 cursor-pointer py-2 text-sm">Weigh-ins list</summary>
                <ul>
                  {[...weights].reverse().map((x) => (
                    <Row as="li" key={x.id} className="justify-between">
                      <div>
                        <p className="tnum font-medium">{x.kg.toFixed(1)} kg</p>
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
                        <Trash2 className="size-4" />
                      </button>
                    </Row>
                  ))}
                </ul>
              </details>
            </>
          )}
        </Panel>

        <Panel aria-label="Training">
          <Eyebrow>Training frequency</Eyebrow>
          <p className="mt-1 text-sm text-muted-foreground tnum">
            This week: {wk.completed} of {wk.planned} planned sessions
            {wk.partial ? `, ${wk.partial} partial` : ""}.
          </p>
          <div
            className="mt-3 h-44"
            role="img"
            aria-label={`Sessions per week over the last ${weekBars.length} weeks`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekBars} margin={{ left: -24, right: 4 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="week" {...axis} tickLine={false} />
                <YAxis allowDecimals={false} {...axis} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                  }}
                />
                {planned > 0 && (
                  <ReferenceLine
                    y={planned}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="3 3"
                  />
                )}
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="var(--spring)"
                  name="Completed"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="partial"
                  stackId="a"
                  fill="var(--warm)"
                  name="Partial"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            Dashed line = planned sessions per week. Cardio isn't counted as a lifting session.
          </p>
        </Panel>

        <Panel aria-label="Exercise performance">
          <Eyebrow>Exercise performance</Eyebrow>
          {exerciseNames.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No recorded sets yet"
                body="Per-set weight and reps start with your first session in this app. Original-app weights are listed below."
              />
            </div>
          ) : (
            <>
              <div className="mt-2">
                <Select
                  aria-label="Exercise"
                  value={exName2}
                  onChange={(e) => setExName(e.target.value)}
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
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="date" {...axis} tickLine={false} />
                      <YAxis
                        {...axis}
                        tickLine={false}
                        axisLine={false}
                        unit=" kg"
                        width={52}
                        domain={[(m: number) => Math.floor(m - 2), (m: number) => Math.ceil(m + 2)]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--line)",
                          borderRadius: 12,
                        }}
                      />
                      <Line
                        dataKey="top"
                        name="Top weight (kg)"
                        stroke="var(--spring)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
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
          <Eyebrow>Food logging</Eyebrow>
          {logs.items.length === 0 ? (
            <p className="mt-2 font-display text-2xl font-semibold">No food logged yet</p>
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold tnum">
              {food.logged}
              <span className="text-lg text-muted-foreground">
                {" "}
                of {food.days} days have food logged
              </span>
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Days with food logged">
            {food.all.slice(-42).map((d) => (
              <li
                key={d}
                title={`${d}: ${food.by.has(d) ? "logged" : "nothing logged"}`}
                className={`size-4 rounded ${food.by.has(d) ? "bg-spring" : "border border-line"}`}
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
          <Eyebrow>Maintenance estimate</Eyebrow>
          {tdee.ok ? (
            <>
              <p className="mt-2 font-display text-3xl font-semibold tnum">
                about {tdee.maintenanceKcal.toLocaleString("en-GB")} kcal
              </p>
              <p className="text-sm text-muted-foreground tnum">
                Likely between {tdee.rangeKcal[0].toLocaleString("en-GB")} and{" "}
                {tdee.rangeKcal[1].toLocaleString("en-GB")}. Based on {tdee.loggedDays} fully-logged
                days over {tdee.windowDays} days; weight trend{" "}
                {tdee.weightSlopeKgPerWeek >= 0 ? "+" : ""}
                {tdee.weightSlopeKgPerWeek} kg/week.
              </p>
              <p className="mt-2 text-sm">
                This is information only. Your target changes only if you change it in Settings.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl font-semibold">Not enough data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tdee.reason} An estimate also needs weigh-ins across at least two weeks.
              </p>
            </>
          )}
        </Panel>

        <Panel tone="green" className="lg:col-span-2" aria-label="Weekly review">
          <Eyebrow className="!text-foreground/70">This week so far</Eyebrow>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            <li>
              Training:{" "}
              <strong className="tnum">
                {wk.completed}/{wk.planned}
              </strong>{" "}
              planned sessions completed{wk.partial ? `, ${wk.partial} partial` : ""}.
            </li>
            <li>
              Food: logged on <strong className="tnum">{foodWeek}</strong> of{" "}
              {Math.min(7, wkDates.filter((d) => d <= today).length)} days so far.
            </li>
            <li>
              Spending: <strong className="tnum">{formatGBP(spent)}</strong>
              {profile.budgetPencePerWeek != null
                ? ` of ${formatGBP(profile.budgetPencePerWeek)} budget (recorded purchases)`
                : " recorded. Set a weekly budget in Settings to compare."}
            </li>
            <li>
              Weigh-ins this week:{" "}
              <strong className="tnum">
                {w.items.filter((x) => wkDates.includes(x.date)).length}
              </strong>
              .
            </li>
          </ul>
          <p className="mt-3 text-sm text-foreground/80">
            {wk.planned - wk.completed - wk.partial > 0
              ? `${wk.planned - wk.completed - wk.partial} planned session${wk.planned - wk.completed - wk.partial > 1 ? "s" : ""} still open. Keep, move or skip them from Train.`
              : "All planned sessions are accounted for."}
            {foodWeek === 0 ? " No food logged yet this week." : ""}
          </p>
        </Panel>

        <Panel className="lg:col-span-2" aria-label="Original app history">
          <Eyebrow>From your original app</Eyebrow>
          {legacy.items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No records were found from the original app on this browser.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {legacy.items.length} days kept exactly as recorded: one weight and a done flag per
                exercise. They were not turned into sets or reps, so they don't affect volume or
                personal bests. Dates came from the original app's own date logic.
              </p>
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer py-2 text-sm">Show days</summary>
                <ul>
                  {[...legacy.items]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((d) => (
                      <Row as="li" key={d.date} className="items-start">
                        <div>
                          <p className="font-medium">{formatDateLong(d.date)}</p>
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
                        </div>
                      </Row>
                    ))}
                </ul>
              </details>
            </>
          )}
        </Panel>
      </div>
      <WeighInSheet
        open={wOpen}
        onOpenChange={setWOpen}
        date={today}
        initial={weights[weights.length - 1]?.kg}
      />
    </>
  );
}
