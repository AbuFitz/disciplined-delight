import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Flame,
  Info,
  Pill,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader, SectionLabel } from "@/components/sunrise/ui";
import { useTrackerState } from "@/hooks/use-tracker-state";
import { MACROS, MEALS, SHOPPING, SUPPLEMENTS } from "@/lib/sunrise-data";

export const Route = createFileRoute("/nutrition")({
  component: NutritionPage,
});

function NutritionPage() {
  const tracker = useTrackerState();

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
            className="rounded-xl border border-border bg-white px-2 py-2.5 text-center shadow-soft"
          >
            <div className="font-display text-sm font-bold text-foreground">{m.val}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-4">
        <Callout icon={Info}>
          <span className="font-semibold text-foreground">Correction:</span> Lidl UK does not sell
          halal-certified meat. Fish is halal by default, so Lidl's fish counter and tinned fish are
          fine — but chicken, beef, lamb and mince need a halal butcher or Iceland's frozen halal
          range.
        </Callout>
      </div>

      <div className="mt-6 px-5">
        <div className="flex items-center gap-1.5">
          <ShoppingBasket className="h-4 w-4 text-primary" />
          <SectionLabel>Where to get what</SectionLabel>
        </div>
        <div className="mt-3 space-y-2.5">
          {SHOPPING.map((s) => (
            <div key={s.item} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
              <div className="text-sm font-semibold">{s.item}</div>
              <div className="mt-1 text-xs font-medium text-primary">{s.where}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.notes}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 px-5">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <SectionLabel>Daily meal template</SectionLabel>
        </div>
        <div className="mt-3 space-y-2.5">
          {MEALS.map((m) => (
            <div
              key={m.name}
              className="overflow-hidden rounded-2xl border border-border shadow-soft"
            >
              <div className="flex items-center justify-between bg-secondary px-4 py-2.5">
                <span className="text-sm font-semibold text-foreground">{m.name}</span>
                <span className="text-xs font-medium text-primary">{m.kcal}</span>
              </div>
              <ul className="space-y-1.5 bg-white p-4">
                {m.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <Callout icon={Sparkles}>
            Fine-tune exact portions in MyFitnessPal over the first week to land the targets above.
          </Callout>
          <Callout icon={Flame}>
            <span className="font-semibold text-foreground">Meal prep tip:</span> batch-cook halal
            chicken twice a week (Sun + Wed), 1–1.5kg at a time, seasoned simply and roasted 25 min
            at 200°C. Portion into containers immediately.
          </Callout>
        </div>
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
    </AppShell>
  );
}
