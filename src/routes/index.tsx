import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";
import { Button } from "@/components/nl/ui";
import { buttonClasses } from "@/components/nl/button-classes";
import {
  Canvas,
  Dayline,
  EmptyCanvas,
  MetricStrip,
  Section,
  Stage,
  type DaylineNode,
  type Metric,
} from "@/components/living";
import { useFoodData } from "@/data/food-hooks";
import { VIcon } from "@/components/nl/icon";
import {
  BudgetWidget,
  ChecklistWidget,
  EditTodaySheet,
  FoodWidget,
  PrayerWidget,
  TrainingWidget,
  WeightWidget,
} from "@/components/nl/today";
import { AgendaNextWidget, AgendaTimelineWidget } from "@/components/nl/agenda";
import { useAgenda } from "@/data/agenda";
import { useSalahEnabled } from "@/data/agenda";
import { usePrayer } from "@/data/prayer-hooks";
import { resolveLayout } from "@/data/actions";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { eatenTotals, plannedTemplateFor, weekTraining } from "@/data/selectors";
import {
  COL,
  type PrayerSettings,
  type Session,
  type TodayLayout,
  type WeighIn,
  type WidgetId,
  type WorkoutTemplate,
} from "@/data/types";
import { formatDateLong, localMinutes } from "@/domain/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: TodayPage });

const greeting = (h: number) =>
  h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

/** Up to two chosen signals above the fold: the first two visible widgets that have a compact figure. */
function useSignals(
  ids: WidgetId[],
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>,
  today: string,
): Metric[] {
  const food = useFoodData(today);
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const weights = useCollection<WeighIn>(COL.weighIns);
  const week = weekTraining(templates.items, sessions.items, today);
  const out: Metric[] = [];
  for (const id of ids) {
    if (out.length === 2) break;
    if (id === "training")
      out.push({
        label: "Sessions this week",
        value: `${week.completed}/${week.planned}`,
        state: templates.ready ? "known" : "unknown",
        delta: week.partial ? `${week.partial} partial` : undefined,
      });
    else if (id === "food") {
      const logged = food.logs.length > 0;
      const eaten = eatenTotals(food.logs);
      out.push({
        label: "Eaten today",
        value: Math.round(eaten.kcal).toLocaleString("en-GB"),
        unit: "kcal",
        state: logged ? "known" : "unknown",
        delta: logged
          ? profile.targets.kcal
            ? `of ${profile.targets.kcal.toLocaleString("en-GB")}`
            : undefined
          : "not logged",
      });
    } else if (id === "weight" && weights.items.length) {
      const last = [...weights.items].sort((x, y) => y.date.localeCompare(x.date))[0]!;
      out.push({
        label: "Weight",
        value: last.kg.toFixed(1),
        unit: "kg",
        delta: formatDateLong(last.date),
      });
    }
  }
  return out;
}

function TodayPage() {
  const now = useNow(30_000);
  const { profile, ready } = useProfile();
  const layout = useCollection<TodayLayout>(COL.layout);
  const weights = useCollection<WeighIn>(COL.weighIns);
  const prayerCfg = useCollection<PrayerSettings>(COL.prayerSettings);
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const ag = useAgenda();
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState("now");
  const salah = useSalahEnabled();
  const { tz, today } = usePrayer(now);
  const widgets = useMemo(() => resolveLayout(layout.items[0]), [layout.items]);
  const visible = widgets.filter((w) => w.visible);
  const signals = useSignals(
    visible.map((w) => w.id).filter((id) => id !== "next-action"),
    profile ?? ({ targets: {} } as never),
    today,
  );

  if (!ready || !profile)
    return (
      <div className="lv-canvas">
        <EmptyCanvas kind="loading" title="Loading today" />
      </div>
    );

  const planned = plannedTemplateFor(templates.items, today);
  const hasBudget = profile.budgetPencePerWeek != null;
  const hasWeight = weights.items.length > 0;
  const modules = profile.modules;
  const enabled = (id: "training" | "nutrition" | "mind" | "routines" | "spirituality") =>
    !modules || modules.includes(id);
  const hiddenReasons: Partial<Record<WidgetId, string>> = {
    ...(salah.enabled ? {} : { prayer: "Salah is off. Turn it on in Soul." }),
    ...(hasWeight ? {} : { weight: "Appears once you log a weigh-in." }),
    ...(hasBudget ? {} : { budget: "Appears once you set a weekly budget in Food." }),
    ...(enabled("nutrition")
      ? {}
      : {
          food: "Nutrition is hidden in your areas.",
          budget: "Nutrition is hidden in your areas.",
        }),
    ...(enabled("training")
      ? {}
      : {
          training: "Training is hidden in your areas.",
          weight: "Training is hidden in your areas.",
        }),
  };
  const ctx = { profile, today, now };
  // Secondary signals live below the fold. Figures already shown above are not repeated as cards.
  const render: Record<WidgetId, () => ReactElement | null> = {
    "next-action": () => null,
    prayer: () => (salah.enabled ? <PrayerWidget {...ctx} /> : null),
    food: () => (enabled("nutrition") ? <FoodWidget {...ctx} /> : null),
    training: () => (enabled("training") ? <TrainingWidget {...ctx} /> : null),
    weight: () => (enabled("training") && hasWeight ? <WeightWidget {...ctx} /> : null),
    budget: () => (enabled("nutrition") && hasBudget ? <BudgetWidget {...ctx} /> : null),
    timeline: () => null,
    checklist: () => <ChecklistWidget {...ctx} />,
  };
  const others = visible.filter((w) => !["next-action", "timeline"].includes(w.id));
  const showTimeline = visible.some((w) => w.id === "timeline") && enabled("routines");
  const setupPending =
    !profile.setup.skipped &&
    !(profile.setup.goals && (!salah.enabled || prayerCfg.items.length > 0));

  const nodes: DaylineNode[] = [
    { id: "readiness", label: "Readiness", value: "At session start", state: "unknown" },
    {
      id: "plan",
      label: "Plan",
      value: planned ? planned.title : "Rest day",
      state: "done",
    },
    {
      id: "now",
      label: "Now",
      value: ag.next ? ag.next.label : "Nothing left",
      state: "current",
    },
    { id: "recovery", label: "Recovery", value: "From your records", state: "next" },
  ];
  const stage =
    sel === "now" ? (
      <AgendaNextWidget {...ctx} />
    ) : sel === "readiness" ? (
      <Stage
        tone="quiet"
        kicker="Readiness"
        title="Check in when you start"
        meta="Readiness is a self-report taken at the start of a session. Nothing is inferred from your behaviour."
        actions={
          <Link to="/train" className={buttonClasses({ variant: "secondary" })}>
            Open Train
          </Link>
        }
      />
    ) : sel === "plan" ? (
      <Stage
        tone="quiet"
        kicker="Plan"
        title={planned ? `Workout ${planned.letter}: ${planned.title}` : "Rest day"}
        meta={
          planned
            ? `${planned.exercises.length} exercises`
            : "No session planned. A rest day counts as a plan."
        }
        actions={
          <>
            <Link to="/train" className={buttonClasses({ variant: "secondary" })}>
              Open Train
            </Link>
            <Link to="/plan" className={buttonClasses({ variant: "ghost" })}>
              Edit the week
            </Link>
          </>
        }
      />
    ) : (
      <Stage
        tone="quiet"
        kicker="Recovery"
        title="Recovery follows your records"
        meta="Sleep, soreness and training load adjust the plan once you have logged enough. Missing days are never counted against you."
        actions={
          <Link to="/progress" className={buttonClasses({ variant: "secondary" })}>
            See progress
          </Link>
        }
      />
    );

  return (
    <Canvas
      width="wide"
      kicker={<time dateTime={today}>{formatDateLong(today)}</time>}
      title={
        <>
          {greeting(Math.floor(localMinutes(now, tz) / 60))}
          {profile.name ? `, ${profile.name}` : ""}
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="grid content-start gap-6">
          <Dayline nodes={nodes} selectedId={sel} onSelect={setSel}>
            {stage}
          </Dayline>
          {signals.length > 0 && <MetricStrip metrics={signals} label="Chosen signals" />}
          {setupPending && (
            <Link
              to="/settings"
              className="flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 text-sm"
            >
              <span>
                <strong className="font-semibold">Finish setup.</strong> Confirm your goals
                {salah.enabled ? " and prayer source" : ""} so Today uses your own numbers.
              </span>
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <div className="grid content-start gap-8">
          {showTimeline && <AgendaTimelineWidget {...ctx} />}
        </div>
      </div>
      {others.length > 0 && (
        <Section title="More from today" className="mt-2">
          <div className="grid gap-4 pt-2 md:grid-cols-2 xl:grid-cols-3">
            {others.map((w) => {
              const el = render[w.id]();
              return el ? (
                <div key={w.id} className="min-w-0">
                  {el}
                </div>
              ) : null;
            })}
          </div>
        </Section>
      )}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => setEdit(true)}>
          <VIcon name="settings" size={16} />
          Customise Today
        </Button>
      </div>
      <EditTodaySheet open={edit} onOpenChange={setEdit} widgets={widgets} hidden={hiddenReasons} />
    </Canvas>
  );
}
