import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Pill,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader, SectionLabel, Sheet, ThumbImage } from "@/components/sunrise/ui";
import { useShoppingChecklist } from "@/hooks/use-shopping-checklist";
import { useTrackerState } from "@/hooks/use-tracker-state";
import {
  DAY_PLAN_RULE,
  DAY_PLANS,
  MACRO_RANGE,
  MACROS,
  SHOPPING,
  SUPPLEMENTS,
  type DayMeal,
  type DayMealSlot,
  type ShoppingItem,
} from "@/lib/sunrise-data";

export const Route = createFileRoute("/nutrition")({
  component: NutritionPage,
});

// Adapted from NEWLIFE's MealCard tag styling (github.com/AbuFitz/NEWLIFE).
const TAG_STYLES: Record<DayMealSlot, string> = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch: "bg-blue-100 text-blue-700",
  dinner: "bg-purple-100 text-purple-700",
  evening: "bg-emerald-100 text-emerald-700",
};

const TAG_LABELS: Record<DayMealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  evening: "Evening",
};

function NutritionPage() {
  const tracker = useTrackerState();
  const shopping = useShoppingChecklist();
  const [dayId, setDayId] = useState<"a" | "b">("a");
  const [openMeal, setOpenMeal] = useState<DayMeal | null>(null);
  const [openShopping, setOpenShopping] = useState<ShoppingItem | null>(null);
  const day = DAY_PLANS.find((d) => d.id === dayId) ?? DAY_PLANS[0]!;

  return (
    <AppShell>
      <PageHeader
        title="Nutrition"
        note="2,760 kcal · 345g carbs · 92g fat · 138g protein — halal, no protein bars."
      />

      <div className="grid grid-cols-4 gap-2 px-5">
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
      <p className="mx-5 mt-2 text-[11px] leading-relaxed text-muted-foreground">{MACRO_RANGE}</p>

      <div className="mx-5 mt-4">
        <Callout icon={Info}>
          <span className="font-semibold text-foreground">Correction:</span> Lidl UK does not sell
          halal-certified meat — chicken, beef, lamb and mince need a halal butcher or Iceland's
          frozen halal range. Fish is halal by default, so Lidl's fish counter is fine.
        </Callout>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <SectionLabel>Full-day templates — pick one, not individual meals</SectionLabel>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {DAY_PLANS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDayId(d.id)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                dayId === d.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white shadow-soft"
              }`}
            >
              <div className="font-display text-base font-bold">{d.label}</div>
              <div
                className={`mt-0.5 text-[11px] leading-snug ${dayId === d.id ? "text-blue-200" : "text-muted-foreground"}`}
              >
                {d.subtitle}
              </div>
            </button>
          ))}
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">{DAY_PLAN_RULE}</p>

        <div className="mt-3 space-y-2">
          {day.meals.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpenMeal(m)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-3 text-left shadow-soft transition-colors hover:border-primary/40"
            >
              <ThumbImage src={m.image} alt={m.name} />
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${TAG_STYLES[m.slot]}`}
                >
                  {TAG_LABELS[m.slot]}
                </span>
                <div className="mt-1 text-sm font-semibold text-foreground">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.protein}g protein</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold text-primary">{m.kcal} kcal</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-border bg-secondary/50 p-3">
          <div className="text-center">
            <div className="text-xs font-bold text-foreground">{day.totals.kcal}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">kcal</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-foreground">{day.totals.carbs}g</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">carbs</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-foreground">{day.totals.fat}g</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">fat</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-foreground">{day.totals.protein}g</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">protein</div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingBasket className="h-4 w-4 text-primary" />
            <SectionLabel>Shopping checklist — tick as you go</SectionLabel>
          </div>
          <span className="text-xs font-semibold text-primary">
            {Object.values(shopping.checked).filter(Boolean).length}/{SHOPPING.length}
          </span>
        </div>
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
          {SHOPPING.map((s) => {
            const done = !!shopping.checked[s.id];
            return (
              <div
                key={s.id}
                className={`flex w-full items-center gap-3 p-3.5 transition-colors ${done ? "bg-secondary/60" : ""}`}
              >
                <button
                  onClick={() => shopping.toggle(s.id)}
                  aria-label={done ? "Mark not bought" : "Mark bought"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white"
                  }`}
                >
                  {done && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setOpenShopping(s)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {s.item}
                    </div>
                    <div className="truncate text-xs text-primary">{s.where}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
        {Object.values(shopping.checked).some(Boolean) && (
          <button
            onClick={shopping.clear}
            className="mt-2 text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Clear checklist
          </button>
        )}
      </div>

      <div className="mx-5 mt-4 space-y-3">
        <Callout icon={Sparkles}>
          Fine-tune exact portions in MyFitnessPal over the first week — the physical label always
          wins over the numbers here if a product changes its recipe.
        </Callout>
        <Callout icon={Flame}>
          <span className="font-semibold text-foreground">Meal prep tip:</span> batch-cook halal
          chicken twice a week (Sun + Wed), seasoned simply and roasted 25 min at 200°C. Portion
          into containers immediately.
        </Callout>
      </div>

      <div className="mt-7 px-5">
        <div className="flex items-center gap-1.5">
          <Pill className="h-4 w-4 text-primary" />
          <SectionLabel>Supplements — tap to check off today</SectionLabel>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {SUPPLEMENTS.map((s) => {
            const done = !!tracker.todayLog.supplements[s.id];
            return (
              <button
                key={s.id}
                onClick={() => tracker.toggleSupplement(s.id)}
                className={`rounded-2xl border p-3.5 text-left transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white shadow-soft"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{s.name}</span>
                  {done && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div
                  className={`mt-0.5 text-[11px] ${done ? "text-blue-200" : "text-muted-foreground"}`}
                >
                  {s.time}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Callout icon={Pill}>
            <span className="font-semibold text-foreground">Key fix:</span> keep all four morning
            supplements in a single pot or pillbox next to the kettle. If they're not visible, you
            won't take them.
          </Callout>
        </div>
      </div>

      <Sheet open={!!openMeal} onClose={() => setOpenMeal(null)}>
        {openMeal && (
          <div className="px-5 pt-2">
            <ThumbImage src={openMeal.image} alt={openMeal.name} size="lg" />
            <span
              className={`mt-4 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${TAG_STYLES[openMeal.slot]}`}
            >
              {TAG_LABELS[openMeal.slot]}
            </span>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-bold text-foreground">{openMeal.name}</h3>
              <span className="shrink-0 text-sm font-semibold text-primary">
                {openMeal.kcal} kcal
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-secondary py-1.5 text-center">
                <div className="text-xs font-bold text-foreground">{openMeal.carbs}g</div>
                <div className="text-[9px] uppercase text-muted-foreground">carbs</div>
              </div>
              <div className="rounded-lg bg-secondary py-1.5 text-center">
                <div className="text-xs font-bold text-foreground">{openMeal.fat}g</div>
                <div className="text-[9px] uppercase text-muted-foreground">fat</div>
              </div>
              <div className="rounded-lg bg-secondary py-1.5 text-center">
                <div className="text-xs font-bold text-foreground">{openMeal.protein}g</div>
                <div className="text-[9px] uppercase text-muted-foreground">protein</div>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {openMeal.items.map((it) => (
                <li key={it} className="flex gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>

      <Sheet open={!!openShopping} onClose={() => setOpenShopping(null)}>
        {openShopping && (
          <div className="px-5 pt-2 pb-2">
            <h3 className="font-display text-xl font-bold text-foreground">{openShopping.item}</h3>
            <div className="mt-1.5 text-sm font-semibold text-primary">{openShopping.where}</div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {openShopping.notes}
            </p>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}
