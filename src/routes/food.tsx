import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  EmptyState,
  Meter,
  PageHeader,
  Panel,
  Row,
  Segmented,
  Skeleton,
  Switch,
} from "@/components/nl/ui";
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
  if (!profile || !food.ready) return <Skeleton className="h-72" />;

  const eaten = eatenTotals(food.logs);
  const planned = plannedTotals(food.plan, food.recipeMap, food.ingMap);
  const t = profile.targets;

  return (
    <>
      <PageHeader
        eyebrow="Food"
        title="Eat consistently"
        actions={
          <Button variant="primary" onClick={() => setLog(true)}>
            <Plus className="size-4" />
            Log a meal
          </Button>
        }
      />
      <div className="mb-6">
        <Segmented
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
      </div>

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
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid content-start gap-5">
            <Panel tone="warm">
              <div className="flex items-center justify-between">
                <p className="eyebrow !text-foreground/70">Eaten today</p>
                {t.status === "provisional" && <Chip tone="warn">Target not confirmed</Chip>}
              </div>
              <p className="num mt-2 text-6xl font-semibold tnum">
                {food.logs.length ? Math.round(eaten.kcal).toLocaleString("en-GB") : "–"}
                <span className="ml-2 text-lg font-normal text-foreground/75">
                  {t.kcal ? `of ${t.kcal.toLocaleString("en-GB")} kcal` : "kcal"}
                </span>
              </p>
              {food.logs.length > 0 ? (
                <>
                  <Meter className="mt-3" label="Calories eaten" value={eaten.kcal} max={t.kcal} />
                  <p className="mt-2 text-sm tnum">
                    {Math.round(eaten.protein)}
                    {t.protein ? ` / ${t.protein}` : ""} g protein · {Math.round(eaten.carbs)} g
                    carbs · {Math.round(eaten.fat)} g fat
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-foreground/75">
                  Nothing logged yet. That's unknown, not zero.
                </p>
              )}
              <div className="mt-3 border-t border-foreground/15 pt-2">
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
              </div>
              {t.status === "provisional" && (
                <p className="mt-3 text-xs text-foreground/70">
                  Target carried over from your original app ({t.source}). Confirm or change it in
                  Settings.
                </p>
              )}
            </Panel>
            <section aria-label="Logged meals">
              <h2 className="eyebrow mb-1">Logged</h2>
              {food.logs.length === 0 ? (
                <EmptyState
                  title="No meals logged"
                  body="Log a planned meal in one tap, or add what you actually ate."
                />
              ) : (
                <ul>
                  {food.logs.map((l) => (
                    <Row as="li" key={l.id} className="justify-between">
                      <div>
                        <p className="font-medium">
                          {l.name}
                          {l.portion !== 1 ? ` × ${l.portion}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground tnum">
                          {Math.round(l.macros.kcal)} kcal · {Math.round(l.macros.protein)} g
                          protein{l.macrosSource === "legacy-estimate" ? " · estimate" : ""}
                        </p>
                      </div>
                    </Row>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-label="Planned for today">
            <h2 className="eyebrow mb-1">Planned today</h2>
            {food.plan.length === 0 ? (
              <EmptyState
                title="Nothing planned today"
                body="Use one of your day templates, or plan the whole week."
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
                <ul>
                  {food.plan.map((e: MealPlanEntry) => {
                    const r = e.recipeId ? food.recipeMap.get(e.recipeId) : undefined;
                    const n = r ? recipeNutrition(r, food.ingMap) : null;
                    return (
                      <Row as="li" key={e.id} className="justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{e.name}</p>
                          <p className="text-sm capitalize text-muted-foreground tnum">
                            {e.slot}
                            {n ? ` · ${Math.round(n.perServing.kcal * e.portion)} kcal` : ""}
                            {n?.source === "legacy-estimate" ? " (estimate)" : ""}
                          </p>
                          {r?.items && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {r.items.slice(0, 3).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {e.status === "planned" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => put(COL.mealPlan, e.id, { ...e, status: "prepared" })}
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
                      </Row>
                    );
                  })}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground tnum">
                  Plan total: {Math.round(planned.macros.kcal)} kcal ·{" "}
                  {Math.round(planned.macros.protein)} g protein. This is the plan, not what you've
                  eaten.
                </p>
              </>
            )}
          </section>
        </div>
      )}
      <MealLogSheet open={log} onOpenChange={setLog} date={today} />
    </>
  );
}
