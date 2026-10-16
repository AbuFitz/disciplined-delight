import { Link, createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { Button, PageHeader, Skeleton } from "@/components/nl/ui";
import {
  BudgetWidget,
  ChecklistWidget,
  EditTodaySheet,
  FoodWidget,
  NextActionWidget,
  PrayerWidget,
  TimelineWidget,
  TrainingWidget,
  WeightWidget,
} from "@/components/nl/today";
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
import { formatDateLong, localDate, localMinutes } from "@/domain/dates";
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
  const tz = profile?.timezone ?? "Europe/London";
  const today = localDate(now, tz);
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
    : "Today's focus: rest, food and prayer on time.";
  const hasBudget = profile.budgetPencePerWeek != null;
  const hasWeight = weights.items.length > 0;
  const hiddenReasons: Partial<Record<WidgetId, string>> = {
    ...(hasWeight ? {} : { weight: "Appears once you log a weigh-in." }),
    ...(hasBudget ? {} : { budget: "Appears once you set a weekly budget in Food." }),
  };
  const ctx = { profile, today, now };
  const render: Record<WidgetId, () => ReactElement | null> = {
    "next-action": () => <NextActionWidget {...ctx} />,
    prayer: () => <PrayerWidget {...ctx} />,
    food: () => <FoodWidget {...ctx} />,
    training: () => <TrainingWidget {...ctx} />,
    weight: () => (hasWeight ? <WeightWidget {...ctx} /> : null),
    budget: () => (hasBudget ? <BudgetWidget {...ctx} /> : null),
    timeline: () => <TimelineWidget {...ctx} />,
    checklist: () => <ChecklistWidget {...ctx} />,
  };

  return (
    <>
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
            <SlidersHorizontal className="size-4" />
            Edit Today
          </Button>
        }
      />
      {!profile.setup.skipped && !(profile.setup.goals && prayerCfg.items.length > 0) && (
        <Link
          to="/settings"
          className="mb-5 flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4 text-sm"
        >
          <span>
            <strong className="font-semibold">Finish setup.</strong> Confirm your goals and prayer
            source so Today uses your own numbers.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
        {widgets
          .filter((w) => w.visible)
          .map((w) => {
            const el = render[w.id]();
            if (!el) return null;
            return (
              <div
                key={w.id}
                className={cn(
                  "min-w-0",
                  (w.id === "next-action" || w.size === "expanded") &&
                    "md:col-span-2 xl:col-span-2",
                  w.id === "next-action" && "xl:col-span-3",
                )}
              >
                {el}
              </div>
            );
          })}
      </div>
      <EditTodaySheet open={edit} onOpenChange={setEdit} widgets={widgets} hidden={hiddenReasons} />
    </>
  );
}
