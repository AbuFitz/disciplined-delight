import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Play,
  Plus,
  Utensils,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  CheckButton,
  EmptyState,
  Eyebrow,
  Meter,
  NumberField,
  Panel,
  Row,
  Sheet,
  Switch,
  Field,
  TextInput,
  Segmented,
} from "./ui";
import { MealLogSheet, useFoodData } from "./MealLog";
import { PrayerList } from "./prayer";
import { useActiveSession } from "./Shell";
import {
  DEFAULT_WIDGETS,
  resetLayout,
  saveLayout,
  saveWeighIn,
  startSession,
  WIDGET_LABEL,
  resolveLayout,
} from "@/data/actions";
import { useCollection } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import {
  eatenTotals,
  plannedTemplateFor,
  plannedTotals,
  sessionForDate,
  weekTraining,
} from "@/data/selectors";
import {
  COL,
  type ChecklistItem,
  type ChecklistLog,
  type Profile,
  type Purchase,
  type RoutineBlock,
  type RoutineException,
  type Session,
  type TodayLayout,
  type WeighIn,
  type WidgetId,
  type WorkoutTemplate,
} from "@/data/types";
import {
  formatClock,
  formatDateLong,
  localMinutes,
  to12h,
  weekDates,
  weekdayIndex,
  type ISODate,
} from "@/domain/dates";
import { formatGBP } from "@/domain/money";
import {
  currentPrayer,
  formatCountdown,
  nextPrayer,
  PRAYER_LABEL,
  PRAYERS,
  prayerInstant,
} from "@/domain/prayer";
import { put } from "@/data/db";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Ctx = { profile: Profile; today: ISODate; now: number };

/* ------------------------------ Next action ------------------------------ */
export function NextActionWidget({ profile, today, now }: Ctx) {
  const nav = useNavigate();
  const templates = useCollection<WorkoutTemplate>(COL.templates).items;
  const sessions = useCollection<Session>(COL.sessions).items;
  const active = useActiveSession();
  const prayer = usePrayer(now);
  const food = useFoodData(today);
  const planned = plannedTemplateFor(templates, today);
  const doneToday = planned
    ? sessionForDate(sessions, today, planned.id).some((s) => s.status === "completed")
    : false;
  const [logOpen, setLogOpen] = useState(false);
  const next = prayer.configured ? nextPrayer(now, prayer.lookup, prayer.tz) : null;

  let primary: ReactNode, headline: string, sub: string;
  if (active) {
    headline = `Continue workout ${active.templateLetter ?? ""}`.trim();
    sub = active.templateName;
    primary = (
      <Button variant="primary" size="lg" onClick={() => nav({ to: "/train/session" })}>
        <Play className="size-4 fill-current" />
        Continue session
      </Button>
    );
  } else if (planned && !doneToday) {
    headline = `Workout ${planned.letter}: ${planned.title}`;
    sub = `${planned.exercises.length} exercises planned for today${planned.time ? ` at ${to12h(planned.time)}` : ""}.`;
    primary = (
      <Button
        variant="primary"
        size="lg"
        onClick={async () => {
          await startSession(planned, today);
          nav({ to: "/train/session" });
        }}
      >
        <Play className="size-4 fill-current" />
        Start session
      </Button>
    );
  } else if (next?.status === "ok") {
    headline = doneToday ? "Session done. Next, prayer." : "Rest day. Next prayer.";
    sub = `${PRAYER_LABEL[next.prayer]} starts at ${formatClock(next.at, prayer.tz)}, in ${formatCountdown(next.at - now)}.`;
    primary = (
      <Button variant="primary" size="lg" onClick={() => nav({ to: "/salah" })}>
        Open Salah
      </Button>
    );
  } else {
    headline = doneToday ? "Session done" : "Rest day";
    sub = "Nothing scheduled right now. Log a meal or plan the week.";
    primary = (
      <Button variant="primary" size="lg" onClick={() => setLogOpen(true)}>
        <Utensils className="size-4" />
        Log a meal
      </Button>
    );
  }

  return (
    <Panel tone="green" className="md:p-8">
      <Eyebrow>Next up</Eyebrow>
      <h2 className="display-title mt-3 text-[clamp(2.5rem,12vw,5rem)]">{headline}</h2>
      <p className="mt-4 max-w-xl text-lg">{sub}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {primary}
        {(active || (planned && !doneToday) || next?.status === "ok") && (
          <Button variant="secondary" onClick={() => setLogOpen(true)}>
            <Utensils className="size-4" />
            Log a meal
          </Button>
        )}
        <Link
          to="/plan"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input px-5 text-[0.95rem] font-medium hover:bg-surface-2/40"
        >
          <CalendarDays className="size-4" />
          Plan the week
        </Link>
      </div>
      <MealLogSheet open={logOpen} onOpenChange={setLogOpen} date={today} />
      <span className="hidden">{food.logs.length}</span>
    </Panel>
  );
}

/* ------------------------------ Prayer ------------------------------ */
export function PrayerWidget({ today, now }: Ctx) {
  const prayer = usePrayer(now);
  const [open, setOpen] = useState(false);
  const todayDay = prayer.lookup(today);
  const next = prayer.configured ? nextPrayer(now, prayer.lookup, prayer.tz) : null;
  const cur = prayer.configured ? currentPrayer(now, prayer.lookup, prayer.tz) : null;
  const curLogged = cur ? prayer.logs.some((l) => l.id === `${today}:${cur}`) : true;

  return (
    <Panel tone="dusk" aria-label="Next prayer">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow className="!text-foreground/70">Next prayer</Eyebrow>
        {prayer.settings && (
          <Chip>
            {prayer.settings.mode === "manual" ? "Manual times" : `${prayer.settings.locality}`}
          </Chip>
        )}
      </div>
      {!prayer.configured ? (
        <div className="mt-3">
          <p className="font-display text-xl font-semibold">Choose how to get prayer times</p>
          <p className="mt-1 text-sm text-foreground/70">
            Pick a locality and method, or enter your mosque's timetable.
          </p>
          <Link
            to="/salah"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground"
          >
            Set up Salah
          </Link>
        </div>
      ) : next?.status === "ok" ? (
        <div className="mt-2">
          <p className="display-title text-[clamp(2.75rem,14vw,5rem)]">
            {PRAYER_LABEL[next.prayer]}
          </p>
          <p className="mt-1 text-lg">
            <span className="tnum font-semibold">{formatClock(next.at, prayer.tz)}</span>
            <span className="text-foreground/70">
              {" "}
              · in {formatCountdown(next.at - now)}
              {next.isTomorrow ? " (tomorrow)" : ""}
            </span>
          </p>
          {cur && !curLogged && todayDay && (
            <p className="mt-3 text-sm text-foreground/75">
              {PRAYER_LABEL[cur]} started at {todayDay.start[cur]}. Not logged yet.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-display text-xl font-semibold">Times aren't available</p>
          <p className="mt-1 text-sm text-foreground/70">
            {next?.reason} {prayer.error ?? ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" busy={prayer.refreshing} onClick={prayer.refresh}>
              Try again
            </Button>
            <Link
              to="/salah"
              className="inline-flex min-h-10 items-center rounded-full border border-input px-4 text-sm font-medium"
            >
              Enter times
            </Link>
          </div>
        </div>
      )}
      {todayDay && (
        <Button className="mt-4" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Today's five prayers
          <ChevronRight className="size-4" />
        </Button>
      )}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Today's prayers"
        description={`${formatDateLong(today)} · ${todayDay?.origin === "manual" ? "your timetable" : (prayer.settings?.locality ?? "")}`}
      >
        {todayDay && (
          <PrayerList
            day={todayDay}
            date={today}
            logs={prayer.logs}
            tz={prayer.tz}
            now={now}
            showIqamah
          />
        )}
        <p className="mt-3 pb-2 text-xs text-muted-foreground">
          Unlogged prayers stay neutral. Nothing is graded.
        </p>
      </Sheet>
    </Panel>
  );
}

/* ------------------------------ Food ------------------------------ */
export function FoodWidget({ profile, today }: Ctx) {
  const food = useFoodData(today);
  const [open, setOpen] = useState(false);
  const t = profile.targets;
  const eaten = eatenTotals(food.logs);
  const planned = plannedTotals(food.plan, food.recipeMap, food.ingMap);
  const logged = food.logs.length > 0;

  return (
    <Panel tone="warm" aria-label="Food">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow className="!text-foreground/70">Food</Eyebrow>
        {t.status === "provisional" && <Chip tone="warn">Target not confirmed</Chip>}
      </div>
      {!food.ready ? (
        <div className="mt-3 h-20 animate-pulse rounded-2xl bg-foreground/10" />
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            {logged ? (
              <span className="stat">{Math.round(eaten.kcal).toLocaleString("en-GB")}</span>
            ) : (
              <span className="display-title text-[clamp(2.25rem,11vw,3.5rem)]">Not logged</span>
            )}
            {logged && (
              <span className="text-foreground/75">
                {t.kcal ? `of ${t.kcal.toLocaleString("en-GB")} kcal` : "kcal eaten"}
              </span>
            )}
          </div>
          {logged ? (
            <>
              <Meter className="mt-3" label="Calories eaten" value={eaten.kcal} max={t.kcal} />
              <p className="mt-2 text-sm text-foreground/80 tnum">
                {Math.round(eaten.protein)}
                {t.protein ? ` / ${t.protein}` : ""} g protein · {food.logs.length}{" "}
                {food.logs.length === 1 ? "meal" : "meals"} logged
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-foreground/75">
              Nothing logged yet. That means unknown, not zero.
            </p>
          )}
          {planned.entries > 0 && (
            <p className="mt-2 text-sm text-foreground/70 tnum">
              Planned for today: {Math.round(planned.macros.kcal)} kcal ·{" "}
              {Math.round(planned.macros.protein)} g protein
              {planned.unknown ? ` (+${planned.unknown} without data)` : ""}
            </p>
          )}
        </>
      )}
      <Button className="mt-4" variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Log a meal
      </Button>
      <MealLogSheet open={open} onOpenChange={setOpen} date={today} />
    </Panel>
  );
}

/* ------------------------------ Training ------------------------------ */
export function TrainingWidget({ today }: Ctx) {
  const nav = useNavigate();
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const active = useActiveSession();
  const planned = plannedTemplateFor(templates.items, today);
  const week = weekTraining(templates.items, sessions.items, today);
  const doneToday = planned
    ? sessionForDate(sessions.items, today, planned.id).find((s) => s.status === "completed")
    : undefined;

  return (
    <Panel aria-label="Training">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>Training</Eyebrow>
        <Link
          to="/train"
          className="eyebrow inline-flex min-h-11 items-center underline-offset-4 hover:underline"
        >
          All sessions
        </Link>
      </div>
      {!templates.ready ? (
        <div className="mt-3 h-16 animate-pulse rounded-2xl bg-surface-2" />
      ) : (
        <>
          <p className="display-title mt-3 text-[clamp(2rem,10vw,3.5rem)]">
            {active
              ? `Workout ${active.templateLetter ?? ""} in progress`.replace("  ", " ")
              : planned
                ? `Workout ${planned.letter}: ${planned.title}`
                : "Rest day"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {planned
              ? `${planned.exercises.length} exercises`
              : "No session planned. A rest day counts as a plan."}
          </p>
          <div
            className="mt-4 flex items-center gap-1.5"
            aria-label={`${week.completed} of ${week.planned} sessions completed this week`}
          >
            {Array.from({ length: Math.max(week.planned, week.completed) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "grid size-7 place-items-center rounded-full border text-xs",
                  i < week.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {i < week.completed ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
            ))}
            <span className="ml-2 text-sm text-muted-foreground tnum">
              {week.completed}/{week.planned} this week
              {week.partial ? ` · ${week.partial} partial` : ""}
            </span>
          </div>
          <div className="mt-4">
            {active ? (
              <Button variant="primary" onClick={() => nav({ to: "/train/session" })}>
                <Play className="size-4 fill-current" />
                Continue
              </Button>
            ) : planned && !doneToday ? (
              <Button
                variant="primary"
                onClick={async () => {
                  await startSession(planned, today);
                  nav({ to: "/train/session" });
                }}
              >
                <Dumbbell className="size-4" />
                Start session
              </Button>
            ) : doneToday ? (
              <Chip tone="ok" icon={<Check className="size-3.5" />}>
                Completed today
              </Chip>
            ) : null}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------ Weight ------------------------------ */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(" ");
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 100 32"
      className="h-10 w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--spring)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WeightWidget({ today }: Ctx) {
  const w = useCollection<WeighIn>(COL.weighIns);
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...w.items].sort((a, b) => a.date.localeCompare(b.date)),
    [w.items],
  );
  const last = sorted[sorted.length - 1];
  const recent = sorted.slice(-14);
  return (
    <Panel aria-label="Weight">
      <Eyebrow>Weight</Eyebrow>
      {last ? (
        <>
          <p className="stat-sm mt-3">
            {last.kg.toFixed(1)}
            <span className="ml-1 text-lg text-muted-foreground">kg</span>
          </p>
          <p className="text-sm text-muted-foreground">Last recorded {formatDateLong(last.date)}</p>
          <div className="mt-3">
            <Sparkline
              values={recent.map((r) => r.kg)}
              label={`Weight over your last ${recent.length} weigh-ins`}
            />
          </div>
          {recent.length < 3 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Trend appears with a few more weigh-ins.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No weigh-ins yet.</p>
      )}
      <Button className="mt-4" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Log weight
      </Button>
      <WeighInSheet open={open} onOpenChange={setOpen} date={today} initial={last?.kg} />
    </Panel>
  );
}

export function WeighInSheet({
  open,
  onOpenChange,
  date,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: ISODate;
  initial?: number;
}) {
  const [kg, setKg] = useState<number | undefined>(initial);
  const [d, setD] = useState(date);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log weight"
      description="Weigh at a consistent time if you can. Single readings are noisy."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={kg == null || kg < 20 || kg > 300}
          onClick={async () => {
            await saveWeighIn(d, kg!);
            onOpenChange(false);
            toast.success(`Saved ${kg!.toFixed(1)} kg`);
          }}
        >
          Save weight
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Weight" hint="Between 20 and 300 kg.">
          <NumberField
            label="Weight"
            value={kg}
            onChange={setKg}
            unit="kg"
            step={0.1}
            decimals={1}
            placeholder={initial ? String(initial) : "65.0"}
          />
        </Field>
        <Field label="Date" htmlFor="wi-date">
          <TextInput
            id="wi-date"
            type="date"
            value={d}
            max={date}
            onChange={(e) => setD(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}

/* ------------------------------ Budget ------------------------------ */
export function BudgetWidget({ profile, today }: Ctx) {
  const purchases = useCollection<Purchase>(COL.purchases).items;
  const wk = weekDates(today);
  const spent = purchases
    .filter((p) => p.date >= wk[0]! && p.date <= wk[6]!)
    .reduce((s, p) => s + p.totalPence, 0);
  const budget = profile.budgetPencePerWeek!;
  return (
    <Panel aria-label="Food budget">
      <div className="flex items-start justify-between">
        <Eyebrow>Food budget</Eyebrow>
        <Link to="/food" className="eyebrow inline-flex min-h-11 items-center hover:underline">
          Shopping
        </Link>
      </div>
      <p className="stat-sm mt-3">
        {formatGBP(spent)}
        <span className="ml-2 text-base font-normal text-muted-foreground">
          of {formatGBP(budget)}
        </span>
      </p>
      <Meter className="mt-3" label="Spent this week" value={spent} max={budget} />
      <p className="mt-2 text-sm text-muted-foreground tnum">
        {spent <= budget
          ? `${formatGBP(budget - spent)} left this week`
          : `${formatGBP(spent - budget)} over this week`}{" "}
        · recorded purchases only
      </p>
    </Panel>
  );
}

/* ------------------------------ Timeline ------------------------------ */
export function TimelineWidget({ today, now }: Ctx) {
  const blocks = useCollection<RoutineBlock>(COL.routine).items;
  const ex = useCollection<RoutineException>(COL.routineExceptions).items;
  const templates = useCollection<WorkoutTemplate>(COL.templates).items;
  const prayer = usePrayer(now);
  const planned = plannedTemplateFor(templates, today);
  const nowMin = localMinutes(now, prayer.tz);
  const wd = weekdayIndex(today);

  const rows = useMemo(() => {
    type Item = {
      key: string;
      time: string;
      end?: string;
      label: string;
      kind: "prayer" | "gym" | "block";
      detail?: string;
    };
    const out: Item[] = [];
    for (const b of blocks) {
      if (b.archivedAt || !b.weekdays.includes(wd) || b.relativeTo) continue;
      const e = ex.find((x) => x.blockId === b.id && x.date === today);
      if (e?.kind === "skip") continue;
      out.push({
        key: b.id,
        time: e?.start ?? b.start,
        end: e?.end ?? b.end,
        label: b.label,
        kind: "block",
        detail: b.detail,
      });
    }
    const day = prayer.lookup(today);
    if (day)
      for (const p of PRAYERS)
        out.push({ key: `p-${p}`, time: day.start[p], label: PRAYER_LABEL[p], kind: "prayer" });
    return out.sort((a, b) => a.time.localeCompare(b.time));
  }, [blocks, ex, prayer.lookup, today, wd, templates, planned]);

  const hasGymBlock = rows.some((r) => /gym/i.test(r.label));
  return (
    <Panel aria-label="Today's timeline">
      <Eyebrow>Today's timeline</Eyebrow>
      {rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nothing scheduled"
            body="Add routine blocks in the week planner."
            action={
              <Link
                to="/plan"
                className="inline-flex min-h-11 items-center rounded-full border border-input px-5 text-sm font-medium"
              >
                Open planner
              </Link>
            }
          />
        </div>
      ) : (
        <ol className="mt-2">
          {rows.map((r) => {
            const [h = 0, m = 0] = r.time.split(":").map(Number);
            const past = h * 60 + m < nowMin;
            return (
              <Row as="li" key={r.key} className={cn("min-h-12 py-2", past && "opacity-55")}>
                <span className="w-20 shrink-0 text-sm tnum text-muted-foreground">
                  {to12h(r.time)}
                  {r.end ? `–${to12h(r.end)}` : ""}
                </span>
                <span className={cn("font-medium", r.kind === "prayer" && "text-foreground")}>
                  {r.label}
                </span>
                {r.kind === "prayer" && <Chip>Prayer</Chip>}
              </Row>
            );
          })}
        </ol>
      )}
      {planned && !hasGymBlock && (
        <p className="mt-2 text-sm text-muted-foreground">
          Workout {planned.letter} planned today{planned.time ? ` at ${to12h(planned.time)}` : ""}.
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------ Checklist ------------------------------ */
export function ChecklistWidget({ today }: Ctx) {
  const items = useCollection<ChecklistItem>(COL.checklist);
  const logs = useCollection<ChecklistLog>(COL.checklistLogs);
  const active = items.items.filter((i) => !i.archivedAt).sort((a, b) => a.order - b.order);
  const done = new Set(logs.items.filter((l) => l.date === today && l.done).map((l) => l.itemId));
  return (
    <Panel aria-label="Reminders">
      <div className="flex items-start justify-between">
        <Eyebrow>Reminders</Eyebrow>
        {active.length > 0 && (
          <span className="eyebrow tnum">
            {done.size}/{active.length}
          </span>
        )}
      </div>
      {active.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No reminders yet. Add supplements, water or food prep in Settings.
        </p>
      ) : (
        <ul className="mt-2">
          {active.map((i) => (
            <Row as="li" key={i.id} className="min-h-12 py-1.5">
              <CheckButton
                label={i.label}
                checked={done.has(i.id)}
                onChange={(v) =>
                  put(COL.checklistLogs, `${today}:${i.id}`, {
                    id: `${today}:${i.id}`,
                    date: today,
                    itemId: i.id,
                    done: v,
                  } satisfies ChecklistLog)
                }
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{i.label}</p>
                {i.detail && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {i.fromLegacy ? "From your original app. " : ""}
                    {i.detail}
                  </p>
                )}
              </div>
            </Row>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------ Edit Today ------------------------------ */
export function EditTodaySheet({
  open,
  onOpenChange,
  widgets,
  hidden,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  widgets: TodayLayout["widgets"];
  hidden: Partial<Record<WidgetId, string>>;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= widgets.length) return;
    const next = [...widgets];
    [next[i], next[j]] = [next[j]!, next[i]!];
    void saveLayout(next);
  };
  const patch = (id: WidgetId, p: Partial<TodayLayout["widgets"][number]>) =>
    void saveLayout(widgets.map((w) => (w.id === id ? { ...w, ...p } : w)));
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Today"
      description="Show, hide, reorder and resize widgets. Changes save as you go."
      footer={
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await resetLayout();
            toast("Default layout restored");
          }}
        >
          Restore default layout
        </Button>
      }
    >
      <ul className="pb-2">
        {widgets.map((w, i) => (
          <li key={w.id} className="border-t border-line py-3 first:border-t-0">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Switch
                  label={WIDGET_LABEL[w.id]}
                  checked={w.visible}
                  onChange={(v) => patch(w.id, { visible: v })}
                  hint={hidden[w.id]}
                />
              </div>
              <div className="flex shrink-0">
                <button
                  aria-label={`Move ${WIDGET_LABEL[w.id]} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  aria-label={`Move ${WIDGET_LABEL[w.id]} down`}
                  disabled={i === widgets.length - 1}
                  onClick={() => move(i, 1)}
                  className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
                >
                  <ArrowDown className="size-4" />
                </button>
              </div>
            </div>
            {w.id !== "next-action" && (
              <div className="mt-1">
                <Segmented
                  label={`${WIDGET_LABEL[w.id]} size`}
                  value={w.size}
                  onChange={(size) => patch(w.id, { size })}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "expanded", label: "Wide" },
                  ]}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export { DEFAULT_WIDGETS, resolveLayout };
