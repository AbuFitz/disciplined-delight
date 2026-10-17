import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";
import { Button, PageHeader, SignalRail, Skeleton } from "@/components/nl/ui";
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
import { useSalahEnabled } from "@/data/agenda";
import { usePrayer } from "@/data/prayer-hooks";
import { resolveLayout } from "@/data/actions";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { plannedTemplateFor } from "@/data/selectors";
import {
  COL,
  type PrayerSettings,
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

function TodayPage() {
  const now = useNow(30_000);
  const { profile, ready } = useProfile();
  const layout = useCollection<TodayLayout>(COL.layout);
  const weights = useCollection<WeighIn>(COL.weighIns);
  const prayerCfg = useCollection<PrayerSettings>(COL.prayerSettings);
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const [edit, setEdit] = useState(false);
  const salah = useSalahEnabled();
  const { tz, today } = usePrayer(now);
  const widgets = useMemo(() => resolveLayout(layout.items[0]), [layout.items]);

  if (!ready || !profile)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );

  const planned = plannedTemplateFor(templates.items, today);
  const focus = planned
    ? `Today's focus: Workout ${planned.letter}, ${planned.title}.`
    : salah.enabled
      ? "Today's focus: rest, food and prayer on time."
      : "Today's focus: rest and food.";
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
  const render: Record<WidgetId, () => ReactElement | null> = {
    "next-action": () => <AgendaNextWidget {...ctx} />,
    prayer: () => (salah.enabled ? <PrayerWidget {...ctx} /> : null),
    food: () => (enabled("nutrition") ? <FoodWidget {...ctx} /> : null),
    training: () => (enabled("training") ? <TrainingWidget {...ctx} /> : null),
    weight: () => (enabled("training") && hasWeight ? <WeightWidget {...ctx} /> : null),
    budget: () => (enabled("nutrition") && hasBudget ? <BudgetWidget {...ctx} /> : null),
    timeline: () => (enabled("routines") ? <AgendaTimelineWidget {...ctx} /> : null),
    checklist: () => <ChecklistWidget {...ctx} />,
  };

  const visible = widgets.filter((w) => w.visible);
  const nextAction = visible.find((w) => w.id === "next-action");
  const others = visible.filter((w) => w.id !== "next-action");
  const setupPending =
    !profile.setup.skipped &&
    !(profile.setup.goals && (!salah.enabled || prayerCfg.items.length > 0));
  // Mobile order: the next meaningful action leads, then the signal, setup nudge and the rest.
  // Wider screens keep the signal rail directly under the header.
  return (
    <div className="flex flex-col">
      <div className="order-1">
        <PageHeader
          eyebrow={<time dateTime={today}>Today · {formatDateLong(today)}</time>}
          title={
            <>
              {greeting(Math.floor(localMinutes(now, tz) / 60))}
              {profile.name ? `, ${profile.name}` : ""}
            </>
          }
          sub={focus}
          actions={
            <Button variant="secondary" onClick={() => setEdit(true)}>
              <VIcon name="settings" size={16} />
              Edit Today
            </Button>
          }
        />
      </div>
      {nextAction && (
        <div className="order-2 mb-5 min-w-0 md:order-4 md:mb-4">{render["next-action"]()}</div>
      )}
      <SignalRail
        className="order-3 md:order-2"
        items={[
          { label: "Readiness", value: "Self-report when you start", state: "next" },
          {
            label: "Plan",
            value: planned ? planned.title : "Recovery day",
            state: planned ? "current" : "done",
          },
          {
            label: "Current work",
            value: planned ? "Training scheduled" : "No forced target",
            state: planned ? "next" : "done",
          },
          { label: "Recovery", value: "Adjust from your records", state: "next" },
        ]}
      />
      {setupPending && (
        <Link
          to="/settings"
          className="order-4 mb-5 flex min-h-12 items-center justify-between gap-3 border-y border-line px-1 text-sm md:order-3"
        >
          <span>
            <strong className="font-semibold">Finish setup.</strong> Confirm your goals
            {salah.enabled ? " and prayer source" : ""} so Today uses your own numbers.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
      <div className="order-5 grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {others.map((w) => {
          const el = render[w.id]();
          if (!el) return null;
          return (
            <div
              key={w.id}
              className={cn("min-w-0", w.size === "expanded" && "md:col-span-2 xl:col-span-2")}
            >
              {el}
            </div>
          );
        })}
      </div>
      <EditTodaySheet open={edit} onOpenChange={setEdit} widgets={widgets} hidden={hiddenReasons} />
    </div>
  );
}
