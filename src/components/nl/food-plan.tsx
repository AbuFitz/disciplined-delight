import { ChevronLeft, ChevronRight, CookingPot, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  NumberField,
  Row,
  Segmented,
  Select,
  Sheet,
  TextInput,
} from "./ui";
import { addPlanEntry, assignDayTemplate, copyWeekPlan, createBatch } from "@/data/actions";
import { put, remove } from "@/data/db";
import { useCollection } from "@/data/hooks";
import { bySlot, plannedTotals } from "@/data/selectors";
import { COL, type DayTemplate, type MealPlanEntry } from "@/data/types";
import {
  addDays,
  formatDateLong,
  weekDates,
  weekdayIndex,
  WEEKDAY_SHORT,
  type ISODate,
} from "@/domain/dates";
import { recipeNutrition, type Ingredient, type Recipe } from "@/domain/nutrition";
import { cn } from "@/lib/utils";

const SLOTS = ["breakfast", "lunch", "dinner", "evening", "snack"];
const STATUS_LABEL: Record<MealPlanEntry["status"], string> = {
  planned: "Planned",
  prepared: "Prepared",
  eaten: "Eaten",
  skipped: "Skipped",
};

export function WeekPlanner({
  today,
  recipes,
  ingMap,
  recipeMap,
  allPlan,
}: {
  today: ISODate;
  recipes: Recipe[];
  ingMap: Map<string, Ingredient>;
  recipeMap: Map<string, Recipe>;
  allPlan: MealPlanEntry[];
}) {
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [assign, setAssign] = useState<ISODate | null>(null);
  const [edit, setEdit] = useState<MealPlanEntry | null>(null);
  const [adding, setAdding] = useState<ISODate | null>(null);
  const [batch, setBatch] = useState(false);
  const days = weekDates(anchor);
  const dayTemplates = useCollection<DayTemplate>(COL.dayTemplates).items.filter(
    (d) => !d.archivedAt,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous week"
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-0 flex-1 px-2 text-center font-medium tnum">
            {formatDateLong(days[0]!)} – {formatDateLong(days[6]!).split(" ").slice(1).join(" ")}
          </p>
          <button
            aria-label="Next week"
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const n = await copyWeekPlan(addDays(days[0]!, -7), days[0]!);
              toast(n ? `Copied ${n} meals from last week` : "Last week had no plan to copy");
            }}
          >
            <Copy className="size-4" />
            Copy last week
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setBatch(true)}>
            <CookingPot className="size-4" />
            Batch cook
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const entries = allPlan.filter((e) => e.date === d).sort(bySlot);
          const tot = plannedTotals(entries, recipeMap, ingMap);
          return (
            <section
              key={d}
              aria-label={formatDateLong(d)}
              className={cn(
                "rounded-3xl border bg-surface p-4",
                d === today ? "border-primary" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="eyebrow">
                    {WEEKDAY_SHORT[weekdayIndex(d)]}
                    {d === today ? " · Today" : ""}
                  </p>
                  <h3 className="font-display text-lg font-semibold">
                    {formatDateLong(d).split(" ").slice(1).join(" ")}
                  </h3>
                </div>
                {tot.entries > 0 && (
                  <p className="text-right text-xs text-muted-foreground tnum">
                    {Math.round(tot.macros.kcal)} kcal
                    <br />
                    {Math.round(tot.macros.protein)} g protein
                    <br />
                    <span>planned</span>
                  </p>
                )}
              </div>
              {entries.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing planned.</p>
              ) : (
                <ul className="mt-2">
                  {entries.map((e) => (
                    <Row as="li" key={e.id} onClick={() => setEdit(e)} className="min-h-12 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {e.name}
                          {e.portion !== 1 ? ` × ${e.portion}` : ""}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {e.slot}
                          {e.batchId ? " · batch leftovers" : ""}
                        </p>
                      </div>
                      <Chip
                        tone={
                          e.status === "eaten" ? "ok" : e.status === "prepared" ? "info" : "neutral"
                        }
                      >
                        {STATUS_LABEL[e.status]}
                      </Chip>
                    </Row>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAssign(d)}>
                  Use a day template
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAdding(d)}>
                  <Plus className="size-4" />
                  Add meal
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <Sheet
        open={!!assign}
        onOpenChange={(o) => !o && setAssign(null)}
        title="Use a day template"
        description={
          assign ? `${formatDateLong(assign)}. Replaces meals that aren't eaten yet.` : ""
        }
      >
        <ul className="pb-2">
          {dayTemplates.length === 0 && <EmptyState title="No day templates" />}
          {dayTemplates.map((t) => (
            <Row as="li" key={t.id} className="justify-between">
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.subtitle ?? `${t.meals.length} meals`}
                  {t.legacyTotals ? ` · about ${t.legacyTotals.kcal} kcal (original estimate)` : ""}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await assignDayTemplate(assign!, t, recipeMap);
                  toast.success(`${t.name} planned for ${formatDateLong(assign!)}`);
                  setAssign(null);
                }}
              >
                Use
              </Button>
            </Row>
          ))}
        </ul>
      </Sheet>

      <EntrySheet entry={edit} onClose={() => setEdit(null)} recipes={recipes} />
      <AddMealSheet date={adding} onClose={() => setAdding(null)} recipes={recipes} />
      <BatchSheet open={batch} onOpenChange={setBatch} recipes={recipes} days={days} />
    </div>
  );
}

function EntrySheet({
  entry,
  onClose,
  recipes,
}: {
  entry: MealPlanEntry | null;
  onClose: () => void;
  recipes: Recipe[];
}) {
  const [portion, setPortion] = useState<number | undefined>(entry?.portion);
  const [recipeId, setRecipeId] = useState(entry?.recipeId ?? "");
  const [slot, setSlot] = useState(entry?.slot ?? "lunch");
  const [prev, setPrev] = useState<string | null>(null);
  if (entry && prev !== entry.id) {
    setPrev(entry.id);
    setPortion(entry.portion);
    setRecipeId(entry.recipeId ?? "");
    setSlot(entry.slot);
  }
  if (!entry && prev) setPrev(null);
  return (
    <Sheet
      open={!!entry}
      onOpenChange={(o) => !o && onClose()}
      title={entry?.name ?? "Meal"}
      description={entry ? `${formatDateLong(entry.date)} · ${STATUS_LABEL[entry.status]}` : ""}
      footer={
        entry && (
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={async () => {
                await remove(COL.mealPlan, entry.id);
                onClose();
                toast("Removed from plan");
              }}
            >
              Remove
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={async () => {
                const r = recipes.find((x) => x.id === recipeId);
                await put(COL.mealPlan, entry.id, {
                  ...entry,
                  recipeId: recipeId || undefined,
                  name: r?.name ?? entry.name,
                  portion: portion ?? 1,
                  slot,
                });
                onClose();
                toast.success("Plan updated");
              }}
            >
              Save changes
            </Button>
          </div>
        )
      }
    >
      {entry && (
        <div className="grid gap-4 pb-2">
          <Field
            label="Status"
            hint="Planned, prepared and eaten are separate. Log it as eaten from Today or Log a meal."
          >
            <Segmented
              label="Status"
              value={entry.status === "eaten" ? "planned" : entry.status}
              onChange={async (v) => {
                await put(COL.mealPlan, entry.id, { ...entry, status: v });
                toast(`Marked ${STATUS_LABEL[v].toLowerCase()}`);
              }}
              options={[
                { value: "planned", label: "Planned" },
                { value: "prepared", label: "Prepared" },
                { value: "skipped", label: "Skip" },
              ]}
            />
          </Field>
          <Field label="Meal" htmlFor="pe-meal">
            <Select id="pe-meal" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              <option value="">Custom ({entry.name})</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slot" htmlFor="pe-slot">
            <Select id="pe-slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Portion">
            <NumberField
              label="Portion"
              value={portion}
              onChange={setPortion}
              step={0.5}
              decimals={1}
              min={0.25}
            />
          </Field>
        </div>
      )}
    </Sheet>
  );
}

function AddMealSheet({
  date,
  onClose,
  recipes,
}: {
  date: ISODate | null;
  onClose: () => void;
  recipes: Recipe[];
}) {
  const [recipeId, setRecipeId] = useState("");
  const [slot, setSlot] = useState("lunch");
  const [custom, setCustom] = useState("");
  return (
    <Sheet
      open={!!date}
      onOpenChange={(o) => !o && onClose()}
      title="Add a meal"
      description={date ? formatDateLong(date) : ""}
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!recipeId && !custom.trim()}
          onClick={async () => {
            const r = recipes.find((x) => x.id === recipeId);
            await addPlanEntry({
              date: date!,
              slot,
              recipeId: r?.id,
              name: r?.name ?? custom.trim(),
              portion: 1,
            });
            setRecipeId("");
            setCustom("");
            onClose();
            toast.success("Meal added");
          }}
        >
          Add to plan
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Saved meal" htmlFor="am-r">
          <Select id="am-r" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">Choose…</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Or a simple custom meal"
          hint="Custom meals have no nutrition data until you log them with amounts."
        >
          <TextInput
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            disabled={!!recipeId}
            placeholder="e.g. Leftover curry"
          />
        </Field>
        <Field label="Slot" htmlFor="am-s">
          <Select id="am-s" value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}

function BatchSheet({
  open,
  onOpenChange,
  recipes,
  days,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipes: Recipe[];
  days: ISODate[];
}) {
  const [recipeId, setRecipeId] = useState("");
  const [yieldN, setYieldN] = useState<number | undefined>(4);
  const [cook, setCook] = useState<ISODate>(days[0]!);
  const [eat, setEat] = useState<Record<string, string>>({});
  const r = recipes.find((x) => x.id === recipeId);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Batch cook"
      description="Ingredients are counted once for the whole batch. Leftover servings point to it."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!r || !yieldN || Object.keys(eat).length === 0}
          onClick={async () => {
            await createBatch(
              r!.id,
              yieldN!,
              cook,
              Object.entries(eat).map(([date, slot]) => ({ date, slot, name: r!.name })),
            );
            toast.success(`Batch of ${yieldN} planned`);
            setEat({});
            onOpenChange(false);
          }}
        >
          Plan batch
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Recipe" htmlFor="b-r">
          <Select id="b-r" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">Choose…</option>
            {recipes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Servings the batch makes" hint="Serving yield, not days.">
          <NumberField label="Servings" value={yieldN} onChange={setYieldN} min={1} />
        </Field>
        <Field label="Cook on" htmlFor="b-c">
          <Select id="b-c" value={cook} onChange={(e) => setCook(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDateLong(d)}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Eat it on (slot)</legend>
          {days.map((d) => (
            <div
              key={d}
              className="flex min-h-11 items-center justify-between gap-3 border-t border-line py-1 first:border-t-0"
            >
              <span className="text-sm">{formatDateLong(d)}</span>
              <Select
                aria-label={`Slot for ${formatDateLong(d)}`}
                className="w-36"
                value={eat[d] ?? ""}
                onChange={(e) =>
                  setEat((o) => {
                    const n = { ...o };
                    if (e.target.value) n[d] = e.target.value;
                    else delete n[d];
                    return n;
                  })
                }
              >
                <option value="">Not eaten</option>
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </fieldset>
        {r && Object.keys(eat).length > (yieldN ?? 0) && (
          <p role="alert" className="text-sm text-warn">
            You've scheduled more servings than the batch makes.
          </p>
        )}
      </div>
    </Sheet>
  );
}

export { recipeNutrition };
