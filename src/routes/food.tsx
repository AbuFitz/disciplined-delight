import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  EmptyState,
  Group,
  Meter,
  PageHeader,
  Panel,
  Section,
  Skeleton,
  Switch,
} from "@/components/nl/ui";
import { PillTabs } from "@/components/nl/week-nav";
import { MealLogSheet } from "@/components/nl/MealLog";
import { useFoodData } from "@/data/food-hooks";
import { WeekPlanner } from "@/components/nl/food-plan";
import { MealsTab } from "@/components/nl/food-manage";
import { ShoppingTab } from "@/components/nl/shopping";
import { assignDayTemplate } from "@/data/actions";
import { put } from "@/data/db";
import { useCollection, useProfile, useToday } from "@/data/hooks";
import { eatenTotals, plannedTotals } from "@/data/selectors";
import { COL, type DayTemplate, type FoodDay, type MealPlanEntry } from "@/data/types";
import { recipeNutrition } from "@/domain/nutrition";

type Tab = "today" | "week" | "meals" | "shop";
export const Route = createFileRoute("/food")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s.tab === "week" || s.tab === "meals" || s.tab === "shop" ? { tab: s.tab } : {},
  component: FoodPage,
});

function FoodPage() {
  const tab: Tab = Route.useSearch().tab ?? "today";
  const nav = useNavigate();
  const today = useToday();
  const { profile } = useProfile();
  const food = useFoodData(today);
  const dayTemplates = useCollection<DayTemplate>(COL.dayTemplates).items.filter(
    (d) => !d.archivedAt,
  );
  const [log, setLog] = useState(false);
  const foodDays = useCollection<FoodDay>(COL.foodDays).items;
  const dayDone = foodDays.find((d) => d.date === today)?.complete ?? false;
  if (!profile || !food.ready) return <Skeleton className="h-72 rounded-3xl" />;

  const eaten = eatenTotals(food.logs);
  const planned = plannedTotals(food.plan, food.recipeMap, food.ingMap);
  const t = profile.targets;

  const stat = (label: string, value: number, target?: number) => (
    <div className="min-w-0 rounded-2xl bg-background/40 px-3 py-2">
      <p className="tnum text-lg font-semibold leading-tight">
        {Math.round(value)}
        <span className="text-xs font-normal text-foreground/70">
          {target ? ` / ${target}` : ""} g
        </span>
      </p>
      <p className="text-xs text-foreground/70">{label}</p>
    </div>
  );

  return (
    <>
      <PageHeader title="Food" />
      <PillTabs
        className="mb-5"
        label="Food sections"
        value={tab}
        onChange={(v) => nav({ to: "/food", search: v === "today" ? {} : { tab: v } })}
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "Week plan" },
          { value: "meals", label: "Meals" },
          { value: "shop", label: "Shopping" },
        ]}
      />

      {tab === "meals" ? (
        <MealsTab recipes={food.allRecipes} ingredients={food.ingredients} />
      ) : tab === "shop" ? (
        <ShoppingTab
          today={today}
          recipes={food.allRecipes}
          ingredients={food.ingredients}
          allPlan={food.allPlan}
          profile={profile}
        />
      ) : tab === "week" ? (
        <WeekPlanner
          today={today}
          recipes={food.recipes}
          ingMap={food.ingMap}
          recipeMap={food.recipeMap}
          allPlan={food.allPlan}
        />
      ) : (
        <div className="grid gap-x-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid content-start">
            <Panel tone="warm" className="mb-3 p-5 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground/80">Eaten today</p>
                {t.status === "provisional" && <Chip tone="warn">Target not confirmed</Chip>}
              </div>
              <p className="num mt-1 text-6xl font-semibold tnum">
                {food.logs.length ? Math.round(eaten.kcal).toLocaleString("en-GB") : "–"}
                <span className="ml-2 text-lg font-normal text-foreground/75">
                  {t.kcal ? `of ${t.kcal.toLocaleString("en-GB")} kcal` : "kcal"}
                </span>
              </p>
              {food.logs.length > 0 ? (
                <>
                  <Meter className="mt-3" label="Calories eaten" value={eaten.kcal} max={t.kcal} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {stat("Protein", eaten.protein, t.protein || undefined)}
                    {stat("Carbs", eaten.carbs)}
                    {stat("Fat", eaten.fat)}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-foreground/75">
                  Nothing logged yet. That's unknown, not zero.
                </p>
              )}
              {t.status === "provisional" && (
                <p className="mt-3 text-xs text-foreground/70">
                  Carried over from your original app ({t.source}). Confirm it in Settings.
                </p>
              )}
              <Button
                variant="primary"
                size="lg"
                className="mt-4 w-full"
                onClick={() => setLog(true)}
              >
                <Plus className="size-5" />
                Log a meal
              </Button>
            </Panel>
            <Group className="mb-6 px-4">
              <Switch
                label="I've logged everything today"
                hint="Lets Progress treat today as a complete day."
                checked={dayDone}
                onChange={(v) =>
                  put(COL.foodDays, today, {
                    id: today,
                    date: today,
                    complete: v,
                  } satisfies FoodDay)
                }
              />
            </Group>
            <section aria-label="Logged meals">
              <Section title="Logged">
                {food.logs.length === 0 ? (
                  <EmptyState
                    title="No meals logged"
                    body="Log a planned meal in one tap, or add what you ate."
                  />
                ) : (
                  <Group as="ul">
                    {food.logs.map((l) => (
                      <li
                        key={l.id}
                        className="flex min-h-16 items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {l.name}
                            {l.portion !== 1 ? ` × ${l.portion}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground tnum">
                            {Math.round(l.macros.kcal)} kcal · {Math.round(l.macros.protein)} g
                            protein{l.macrosSource === "legacy-estimate" ? " · estimate" : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </Group>
                )}
              </Section>
            </section>
          </div>

          <section aria-label="Planned for today">
            <Section
              title="Planned today"
              action={
                food.plan.length > 0 && (
                  <button
                    onClick={() => nav({ to: "/food", search: { tab: "week" } })}
                    className="inline-flex min-h-11 items-center px-2 font-semibold text-primary"
                  >
                    Week plan
                  </button>
                )
              }
            >
              {food.plan.length === 0 ? (
                <EmptyState
                  title="Nothing planned today"
                  body="Use a day template, or plan the whole week."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {dayTemplates.map((d) => (
                        <Button
                          key={d.id}
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await assignDayTemplate(today, d, food.recipeMap);
                            toast.success(`${d.name} planned for today`);
                          }}
                        >
                          {d.name}
                        </Button>
                      ))}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => nav({ to: "/food", search: { tab: "week" } })}
                      >
                        Plan the week
                      </Button>
                    </div>
                  }
                />
              ) : (
                <>
                  <Group as="ul">
                    {food.plan.map((e: MealPlanEntry) => {
                      const r = e.recipeId ? food.recipeMap.get(e.recipeId) : undefined;
                      const n = r ? recipeNutrition(r, food.ingMap) : null;
                      return (
                        <li
                          key={e.id}
                          className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1 basis-40">
                            <p className="font-semibold">{e.name}</p>
                            <p className="text-sm capitalize text-muted-foreground tnum">
                              {e.slot}
                              {n ? ` · ${Math.round(n.perServing.kcal * e.portion)} kcal` : ""}
                              {n?.source === "legacy-estimate" ? " (estimate)" : ""}
                            </p>
                            {r?.items && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {r.items.slice(0, 3).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {e.status === "planned" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="bg-surface-2/70"
                                onClick={() =>
                                  put(COL.mealPlan, e.id, { ...e, status: "prepared" })
                                }
                              >
                                Prepared
                              </Button>
                            )}
                            {e.status === "prepared" && <Chip tone="info">Prepared</Chip>}
                            {e.status === "eaten" ? (
                              <Chip tone="ok">Eaten</Chip>
                            ) : e.status === "skipped" ? (
                              <Chip>Skipped</Chip>
                            ) : (
                              <Button size="sm" variant="primary" onClick={() => setLog(true)}>
                                Log
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </Group>
                  <p className="mt-2 px-1 text-sm text-muted-foreground tnum">
                    Plan total: {Math.round(planned.macros.kcal)} kcal ·{" "}
                    {Math.round(planned.macros.protein)} g protein. A plan, not what you've eaten.
                  </p>
                </>
              )}
            </Section>
          </section>
        </div>
      )}
      <MealLogSheet open={log} onOpenChange={setLog} date={today} />
    </>
  );
}
