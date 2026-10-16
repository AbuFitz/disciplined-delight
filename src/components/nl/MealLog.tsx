import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, Undo2 } from "lucide-react";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  NumberField,
  Row,
  Segmented,
  Sheet,
  TextInput,
} from "./ui";
import { useFoodData } from "@/data/food-hooks";
import { logMeal, unlogMeal } from "@/data/actions";
import { put } from "@/data/db";
import { COL, type MealPlanEntry } from "@/data/types";
import {
  recipeCost,
  recipeNutrition,
  scaleMacros,
  type MealLog,
  type Recipe,
} from "@/domain/nutrition";
import type { ISODate } from "@/domain/dates";

const PORTIONS = [0.5, 1, 1.5, 2];

export function MealLogSheet({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: ISODate;
}) {
  const food = useFoodData(date);
  const [tab, setTab] = useState<"planned" | "saved" | "quick">("planned");
  const [portion, setPortion] = useState(1);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState<number | undefined>();
  const [protein, setProtein] = useState<number | undefined>();
  const [carbs, setCarbs] = useState<number | undefined>();
  const [fat, setFat] = useState<number | undefined>();
  const [editing, setEditing] = useState<MealLog | null>(null);

  const pending = food.plan.filter((p) => p.status !== "eaten" && p.status !== "skipped");
  const effectiveTab =
    tab === "planned" && pending.length === 0 && food.plan.length === 0 ? "saved" : tab;

  const logRecipe = async (r: Recipe, entry?: MealPlanEntry) => {
    const n = recipeNutrition(r, food.ingMap);
    const c = recipeCost(r, food.ingMap);
    const p = entry?.portion ?? portion;
    await logMeal({
      date,
      name: r.name,
      recipeId: r.id,
      planEntryId: entry?.id,
      portion: p,
      macros: scaleMacros(n.perServing, p),
      macrosSource: n.source,
      costPence: c.pricedLines ? Math.round(c.perServingPence * p) : undefined,
      costCoverage: c.pricedLines ? c.coverage : undefined,
    });
    toast.success(`Logged ${r.name}${p !== 1 ? ` × ${p}` : ""}`);
  };

  const saveQuick = async () => {
    if (!name.trim() || kcal == null) return;
    await logMeal({
      date,
      name: name.trim(),
      portion: 1,
      macros: { kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
      macrosSource: "manual",
    });
    toast.success(`Logged ${name.trim()}`);
    setName("");
    setKcal(undefined);
    setProtein(undefined);
    setCarbs(undefined);
    setFat(undefined);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log a meal"
      description="Planned, prepared and eaten are separate. Only logged meals count as eaten."
    >
      <div className="grid gap-5 pb-2">
        <Segmented
          label="Source"
          value={effectiveTab}
          onChange={setTab}
          options={[
            { value: "planned", label: "Planned" },
            { value: "saved", label: "Saved meals" },
            { value: "quick", label: "Quick add" },
          ]}
        />

        {effectiveTab !== "quick" && (
          <Field label="Portion eaten">
            <div className="flex flex-wrap items-center gap-2">
              {PORTIONS.map((p) => (
                <button
                  key={p}
                  aria-pressed={portion === p}
                  onClick={() => setPortion(p)}
                  className={`min-h-11 min-w-14 rounded-full border px-4 text-sm font-medium ${portion === p ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                >
                  {p === 0.5 ? "½" : p === 1.5 ? "1½" : p}
                </button>
              ))}
            </div>
          </Field>
        )}

        {effectiveTab === "planned" &&
          (pending.length === 0 ? (
            <EmptyState
              title="Nothing planned for today"
              body="Plan meals in Food, or log from your saved meals."
            />
          ) : (
            <ul>
              {pending.map((e) => {
                const r = e.recipeId ? food.recipeMap.get(e.recipeId) : undefined;
                const n = r ? recipeNutrition(r, food.ingMap) : null;
                return (
                  <Row as="li" key={e.id} className="justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-sm text-muted-foreground tnum">
                        {e.slot}
                        {n
                          ? ` · ${Math.round(n.perServing.kcal * portion)} kcal · ${Math.round(n.perServing.protein * portion)} g protein`
                          : ""}
                        {n?.source === "legacy-estimate" ? " · estimate" : ""}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!r}
                      onClick={() => r && logRecipe(r, { ...e, portion })}
                    >
                      <Check className="size-4" />
                      Eaten
                    </Button>
                  </Row>
                );
              })}
            </ul>
          ))}

        {effectiveTab === "saved" &&
          (food.recipes.length === 0 ? (
            <EmptyState title="No saved meals yet" body="Create meals in Food, or use Quick add." />
          ) : (
            <ul>
              {food.recipes.map((r) => {
                const n = recipeNutrition(r, food.ingMap);
                return (
                  <Row as="li" key={r.id} className="justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground tnum">
                        {Math.round(n.perServing.kcal)} kcal · {Math.round(n.perServing.protein)} g
                        protein
                        {n.source === "legacy-estimate"
                          ? " · estimate"
                          : n.source === "partial"
                            ? " · incomplete data"
                            : ""}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => logRecipe(r)}>
                      Log
                    </Button>
                  </Row>
                );
              })}
            </ul>
          ))}

        {effectiveTab === "quick" && (
          <div className="grid gap-4">
            <Field label="What did you eat?" htmlFor="qa-name">
              <TextInput
                id="qa-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken wrap"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calories">
                <NumberField
                  label="Calories"
                  value={kcal}
                  onChange={setKcal}
                  unit="kcal"
                  step={50}
                  stepper={false}
                />
              </Field>
              <Field label="Protein">
                <NumberField
                  label="Protein"
                  value={protein}
                  onChange={setProtein}
                  unit="g"
                  stepper={false}
                />
              </Field>
              <Field label="Carbs (optional)">
                <NumberField
                  label="Carbs"
                  value={carbs}
                  onChange={setCarbs}
                  unit="g"
                  stepper={false}
                />
              </Field>
              <Field label="Fat (optional)">
                <NumberField label="Fat" value={fat} onChange={setFat} unit="g" stepper={false} />
              </Field>
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={!name.trim() || kcal == null}
              onClick={saveQuick}
            >
              Log meal
            </Button>
          </div>
        )}

        {food.logs.length > 0 && (
          <section aria-label="Logged today">
            <h3 className="eyebrow mb-1">Logged for this day</h3>
            <ul>
              {food.logs.map((l) => (
                <Row as="li" key={l.id} className="justify-between">
                  <button className="min-w-0 text-left" onClick={() => setEditing(l)}>
                    <p className="truncate font-medium">
                      {l.name}
                      {l.portion !== 1 ? ` × ${l.portion}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground tnum">
                      {Math.round(l.macros.kcal)} kcal · {Math.round(l.macros.protein)} g protein ·
                      tap to correct
                    </p>
                  </button>
                  <button
                    aria-label={`Undo ${l.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                    onClick={async () => {
                      const entry = l.planEntryId
                        ? food.allPlan.find((p) => p.id === l.planEntryId)
                        : undefined;
                      await unlogMeal(l);
                      toast("Entry removed", {
                        action: {
                          label: "Put back",
                          onClick: () => {
                            void put(COL.mealLogs, l.id, l);
                            if (entry)
                              void put(COL.mealPlan, entry.id, {
                                ...entry,
                                status: "eaten",
                                mealLogId: l.id,
                              });
                          },
                        },
                      });
                    }}
                  >
                    <Undo2 className="size-4" />
                  </button>
                </Row>
              ))}
            </ul>
          </section>
        )}
      </div>
      {editing && <CorrectLog log={editing} onClose={() => setEditing(null)} />}
    </Sheet>
  );
}

function CorrectLog({ log, onClose }: { log: MealLog; onClose: () => void }) {
  const [name, setName] = useState(log.name);
  const [kcal, setKcal] = useState<number | undefined>(Math.round(log.macros.kcal));
  const [protein, setProtein] = useState<number | undefined>(Math.round(log.macros.protein));
  const [carbs, setCarbs] = useState<number | undefined>(Math.round(log.macros.carbs));
  const [fat, setFat] = useState<number | undefined>(Math.round(log.macros.fat));
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Correct this entry"
      description="This changes the logged amounts only, not your saved meal."
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await unlogMeal(log);
              onClose();
              toast("Entry removed");
            }}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
          <Button
            className="flex-1"
            variant="primary"
            onClick={async () => {
              await put(COL.mealLogs, log.id, {
                ...log,
                name: name.trim() || log.name,
                macrosSource: "manual",
                macros: {
                  kcal: kcal ?? 0,
                  protein: protein ?? 0,
                  carbs: carbs ?? 0,
                  fat: fat ?? 0,
                },
              });
              onClose();
              toast.success("Entry corrected");
            }}
          >
            Save correction
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <NumberField
              label="Calories"
              value={kcal}
              onChange={setKcal}
              unit="kcal"
              stepper={false}
            />
          </Field>
          <Field label="Protein">
            <NumberField
              label="Protein"
              value={protein}
              onChange={setProtein}
              unit="g"
              stepper={false}
            />
          </Field>
          <Field label="Carbs">
            <NumberField label="Carbs" value={carbs} onChange={setCarbs} unit="g" stepper={false} />
          </Field>
          <Field label="Fat">
            <NumberField label="Fat" value={fat} onChange={setFat} unit="g" stepper={false} />
          </Field>
        </div>
        <Chip>Original source: {log.macrosSource.replace("-", " ")}</Chip>
      </div>
    </Sheet>
  );
}
