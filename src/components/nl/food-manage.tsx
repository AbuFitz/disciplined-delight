import { Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Field,
  Group,
  NumberField,
  Row,
  Section,
  Select,
  Sheet,
  Switch,
  TextArea,
  TextInput,
} from "./ui";
import { VIcon } from "./icon";
import { newId, put } from "@/data/db";
import { useCollection, useToday } from "@/data/hooks";
import { COL, type DayTemplate } from "@/data/types";
import { formatGBP, toPence } from "@/domain/money";
import {
  lineMacros,
  recipeCost,
  recipeNutrition,
  type Ingredient,
  type Recipe,
  type RecipeLine,
} from "@/domain/nutrition";
import type { Unit } from "@/domain/units";

const UNITS: Unit[] = ["g", "kg", "ml", "l", "count"];
const SLOTS = ["breakfast", "lunch", "dinner", "evening", "snack"];

/* ------------------------------ Ingredient ------------------------------ */
export function IngredientEditor({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved?: (i: Ingredient) => void;
}) {
  const today = useToday();
  const [i, setI] = useState<Ingredient | null>(null);
  const [hasNutrition, setHasNutrition] = useState(false);
  const [hasPack, setHasPack] = useState(false);
  const [price, setPrice] = useState<number | undefined>();
  const [seen, setSeen] = useState<string | null>(null);
  if ((ingredient?.id ?? null) !== seen) {
    setSeen(ingredient?.id ?? null);
    setI(ingredient);
    setHasNutrition(!!ingredient?.macros);
    setHasPack(!!ingredient?.pack);
    setPrice(ingredient?.pack ? ingredient.pack.pricePence / 100 : undefined);
  }
  if (!i) return null;
  const set = (p: Partial<Ingredient>) => setI({ ...i, ...p });
  const m = i.macros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const pk = i.pack ?? { amount: 1, unit: i.perUnit, pricePence: 0, recordedOn: today };
  const valid =
    i.name.trim() &&
    i.perAmount > 0 &&
    (!hasPack || (pk.amount > 0 && price != null && price >= 0));

  const save = async () => {
    const out: Ingredient = {
      ...i,
      name: i.name.trim(),
      macros: hasNutrition ? (i.macros ?? m) : undefined,
      provenance: hasNutrition ? (i.provenance ?? "label") : undefined,
      pack: hasPack
        ? {
            ...pk,
            pricePence: toPence(price ?? 0) ?? 0,
            // Re-date the price whenever it changes.
            recordedOn:
              ingredient?.pack && ingredient.pack.pricePence === toPence(price ?? 0)
                ? pk.recordedOn
                : today,
          }
        : undefined,
    };
    await put(COL.ingredients, out.id, out);
    toast.success("Ingredient saved");
    onSaved?.(out);
    onClose();
  };

  return (
    <Sheet
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={ingredient?.name ? "Edit ingredient" : "New ingredient"}
      description="Nutrition and prices are only what you enter. Nothing is looked up or guessed."
      footer={
        <Button variant="primary" size="lg" className="w-full" disabled={!valid} onClick={save}>
          Save ingredient
        </Button>
      }
    >
      <div className="grid gap-4 pb-4">
        <Field label="Name" htmlFor="i-n">
          <TextInput id="i-n" value={i.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Food state"
            hint="Raw, dry and cooked weights are different. Never mix them."
            htmlFor="i-s"
          >
            <Select
              id="i-s"
              value={i.state ?? ""}
              onChange={(e) => set({ state: (e.target.value || undefined) as Ingredient["state"] })}
            >
              <option value="">Not specified</option>
              <option value="raw">Raw</option>
              <option value="dry">Dry</option>
              <option value="cooked">Cooked</option>
              <option value="prepared">Prepared</option>
            </Select>
          </Field>
          <Field label="Counted in" htmlFor="i-u">
            <Select
              id="i-u"
              value={i.perUnit}
              onChange={(e) =>
                set({
                  perUnit: e.target.value as Unit,
                  perAmount: e.target.value === "count" ? 1 : i.perAmount,
                })
              }
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Halal note (optional)"
          hint="Only add what you've checked, for example a label or certification you saw."
          htmlFor="i-h"
        >
          <TextInput
            id="i-h"
            value={i.halalNote ?? ""}
            onChange={(e) => set({ halalNote: e.target.value || undefined })}
          />
        </Field>

        <Switch label="I have nutrition data" checked={hasNutrition} onChange={setHasNutrition} />
        {hasNutrition && (
          <div className="grid gap-3 rounded-2xl border border-line p-3">
            <Field label={`Nutrition is for`}>
              <NumberField
                label="Declared amount"
                unit={i.perUnit}
                value={i.perAmount}
                onChange={(v) => set({ perAmount: v ?? 100 })}
                stepper={false}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                <Field key={k} label={k === "kcal" ? "Calories" : k[0]!.toUpperCase() + k.slice(1)}>
                  <NumberField
                    label={k}
                    unit={k === "kcal" ? "kcal" : "g"}
                    stepper={false}
                    value={m[k]}
                    onChange={(v) => set({ macros: { ...m, [k]: v ?? 0 } })}
                  />
                </Field>
              ))}
            </div>
            <Field label="Where this came from" htmlFor="i-p">
              <Select
                id="i-p"
                value={i.provenance ?? "label"}
                onChange={(e) => set({ provenance: e.target.value as Ingredient["provenance"] })}
              >
                <option value="label">Product label</option>
                <option value="user-estimate">My own estimate</option>
              </Select>
            </Field>
          </div>
        )}

        <Switch label="I know the pack and price" checked={hasPack} onChange={setHasPack} />
        {hasPack && (
          <div className="grid gap-3 rounded-2xl border border-line p-3">
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field label="Pack size">
                <NumberField
                  label="Pack size"
                  value={pk.amount}
                  onChange={(v) => set({ pack: { ...pk, amount: v ?? 0 } })}
                  stepper={false}
                />
              </Field>
              <Field label="Unit" htmlFor="i-pu">
                <Select
                  id="i-pu"
                  value={pk.unit}
                  onChange={(e) => set({ pack: { ...pk, unit: e.target.value as Unit } })}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Pack price" hint="Price date is recorded when you change it.">
              <NumberField
                label="Pack price"
                unit="£"
                value={price}
                onChange={setPrice}
                step={0.1}
                decimals={2}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Shop" htmlFor="i-sh">
                <TextInput
                  id="i-sh"
                  value={pk.shop ?? ""}
                  onChange={(e) => set({ pack: { ...pk, shop: e.target.value || undefined } })}
                />
              </Field>
              <Field label="Price source" htmlFor="i-so">
                <TextInput
                  id="i-so"
                  placeholder="Receipt, shelf…"
                  value={pk.source ?? ""}
                  onChange={(e) => set({ pack: { ...pk, source: e.target.value || undefined } })}
                />
              </Field>
            </div>
            {ingredient?.pack && (
              <p className="text-xs text-muted-foreground">
                Last priced {ingredient.pack.recordedOn}.
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------ Recipe ------------------------------ */
const blankRecipe = (): Recipe => ({
  id: newId(),
  name: "",
  slot: "lunch",
  yield: 1,
  lines: [],
});

export function RecipeEditor({
  recipe,
  isNew,
  onClose,
  ingredients,
}: {
  recipe: Recipe | null;
  isNew: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
}) {
  const [r, setR] = useState<Recipe | null>(null);
  const [newIng, setNewIng] = useState<Ingredient | null>(null);
  const [archive, setArchive] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if ((recipe?.id ?? null) !== seen) {
    setSeen(recipe?.id ?? null);
    setR(recipe);
  }
  const map = useMemo(() => new Map(ingredients.map((x) => [x.id, x])), [ingredients]);
  if (!r) return null;
  const set = (p: Partial<Recipe>) => setR({ ...r, ...p });
  const nut = recipeNutrition(r, map);
  const cost = recipeCost(r, map);
  const setLine = (idx: number, p: Partial<RecipeLine>) =>
    set({ lines: r.lines.map((l, j) => (j === idx ? { ...l, ...p } : l)) });
  const usable = ingredients.filter((x) => !x.archivedAt);

  return (
    <>
      <Sheet
        open
        wide
        onOpenChange={(o) => !o && onClose()}
        title={isNew ? "New meal" : "Edit meal"}
        description="Totals are calculated from ingredients you've given data for."
        footer={
          <div className="flex gap-2">
            {!isNew && (
              <>
                <Button
                  variant="secondary"
                  aria-label="Duplicate meal"
                  onClick={async () => {
                    const c: Recipe = {
                      ...r,
                      id: newId(),
                      name: `${r.name} copy`,
                      lines: r.lines.map((l) => ({ ...l })),
                    };
                    await put(COL.recipes, c.id, c);
                    toast.success("Duplicated");
                    onClose();
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="danger" onClick={() => setArchive(true)}>
                  Archive
                </Button>
              </>
            )}
            <Button
              variant="primary"
              className="flex-1"
              disabled={!r.name.trim() || r.yield <= 0}
              onClick={async () => {
                await put(COL.recipes, r.id, { ...r, name: r.name.trim() });
                toast.success("Meal saved");
                onClose();
              }}
            >
              Save meal
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 pb-4">
          <Field label="Name" htmlFor="r-n">
            <TextInput id="r-n" value={r.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Usual slot" htmlFor="r-s">
                <Select
                  id="r-s"
                  value={r.slot ?? "lunch"}
                  onChange={(e) => set({ slot: e.target.value as Recipe["slot"] })}
                >
                  {SLOTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Makes (servings)">
              <NumberField
                label="Servings the recipe makes"
                value={r.yield}
                onChange={(v) => set({ yield: v ?? 1 })}
                min={1}
                step={1}
                decimals={0}
              />
            </Field>
            <Field label="Prep (min)">
              <NumberField
                label="Preparation minutes"
                value={r.prepMinutes}
                onChange={(v) => set({ prepMinutes: v })}
                stepper={false}
                decimals={0}
              />
            </Field>
          </div>

          <section aria-label="Ingredients">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="eyebrow">Ingredients</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNewIng({ id: newId(), name: "", perAmount: 100, perUnit: "g" })}
                >
                  New ingredient
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={usable.length === 0}
                  onClick={() =>
                    set({
                      lines: [
                        ...r.lines,
                        { ingredientId: usable[0]!.id, amount: 100, unit: usable[0]!.perUnit },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add line
                </Button>
              </div>
            </div>
            {r.lines.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                {r.legacyEstimate
                  ? "No structured ingredients yet. The original estimate below is used until you add them."
                  : "Add ingredients to calculate nutrition and cost."}
              </p>
            ) : (
              <ul className="grid gap-2">
                {r.lines.map((l, idx) => {
                  const ing = map.get(l.ingredientId);
                  const lm = ing ? lineMacros(l, ing) : null;
                  return (
                    <li key={idx} className="rounded-2xl border border-line p-2.5">
                      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <Select
                          aria-label="Ingredient"
                          value={l.ingredientId}
                          onChange={(e) => {
                            const n = map.get(e.target.value);
                            setLine(idx, {
                              ingredientId: e.target.value,
                              unit: n?.perUnit ?? l.unit,
                            });
                          }}
                        >
                          {usable.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                              {x.state ? ` (${x.state})` : ""}
                            </option>
                          ))}
                        </Select>
                        <button
                          aria-label="Remove line"
                          onClick={() => set({ lines: r.lines.filter((_, j) => j !== idx) })}
                          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-[1fr_6rem] gap-2">
                        <NumberField
                          label="Amount"
                          value={l.amount}
                          onChange={(v) => setLine(idx, { amount: v ?? 0 })}
                          stepper={false}
                        />
                        <Select
                          aria-label="Unit"
                          value={l.unit}
                          onChange={(e) => setLine(idx, { unit: e.target.value as Unit })}
                        >
                          {UNITS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </Select>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground tnum">
                        {lm
                          ? `${Math.round(lm.kcal)} kcal · ${Math.round(lm.protein)} g protein`
                          : "No nutrition data for this amount"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-surface-2/60 p-3" aria-label="Calculated totals">
            <p className="eyebrow">Per serving</p>
            <p className="num mt-1 text-3xl font-semibold tnum">
              {Math.round(nut.perServing.kcal)} kcal
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {Math.round(nut.perServing.protein)} g protein
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {nut.source === "legacy-estimate" && <Chip tone="warn">Original estimate</Chip>}
              {nut.source === "partial" && (
                <Chip tone="warn">
                  Incomplete: {nut.missingIngredients.length} ingredient(s) missing data
                </Chip>
              )}
              {nut.source === "structured" && <Chip tone="ok">From ingredients</Chip>}
            </div>
            {nut.missingIngredients.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Missing: {nut.missingIngredients.join(", ")}
              </p>
            )}
            <p className="mt-3 text-sm tnum">
              Cost per portion:{" "}
              <strong>
                {cost.pricedLines ? formatGBP(cost.perServingPence) : "no prices yet"}
              </strong>
              {cost.totalLines > 0 && cost.coverage < 1 && (
                <span className="text-warn">
                  {" "}
                  · only {cost.pricedLines} of {cost.totalLines} ingredients priced, so this is
                  incomplete
                </span>
              )}
            </p>
          </section>

          {r.items && r.items.length > 0 && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm">
                Original ingredient notes
              </summary>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {r.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
          )}
          <Field label="Notes" htmlFor="r-no">
            <TextArea
              id="r-no"
              className="min-h-20"
              value={r.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value || undefined })}
            />
          </Field>
        </div>
      </Sheet>
      <IngredientEditor
        ingredient={newIng}
        onClose={() => setNewIng(null)}
        onSaved={(i) =>
          set({ lines: [...r.lines, { ingredientId: i.id, amount: i.perAmount, unit: i.perUnit }] })
        }
      />
      <ConfirmDialog
        open={archive}
        onOpenChange={setArchive}
        tone="primary"
        title="Archive this meal?"
        body="It leaves your lists. Meals you've already logged keep their saved totals."
        confirmLabel="Archive"
        onConfirm={async () => {
          await put(COL.recipes, r.id, { ...r, archivedAt: new Date().toISOString() });
          setArchive(false);
          onClose();
          toast("Archived");
        }}
      />
    </>
  );
}

/* ------------------------------ Day template ------------------------------ */
export function DayTemplateEditor({
  template,
  isNew,
  onClose,
  recipes,
}: {
  template: DayTemplate | null;
  isNew: boolean;
  onClose: () => void;
  recipes: Recipe[];
}) {
  const [t, setT] = useState<DayTemplate | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  if ((template?.id ?? null) !== seen) {
    setSeen(template?.id ?? null);
    setT(template);
  }
  if (!t) return null;
  const set = (p: Partial<DayTemplate>) => setT({ ...t, ...p });
  const usable = recipes.filter((r) => !r.archivedAt);
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "New day template" : "Edit day template"}
      description="A complete day you can drop onto any date in the week planner."
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Button
                variant="secondary"
                aria-label="Duplicate day template"
                onClick={async () => {
                  const c: DayTemplate = {
                    ...t,
                    id: newId(),
                    legacyId: undefined,
                    name: `${t.name} copy`,
                    meals: t.meals.map((m) => ({ ...m })),
                  };
                  await put(COL.dayTemplates, c.id, c);
                  toast.success("Duplicated");
                  onClose();
                }}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await put(COL.dayTemplates, t.id, { ...t, archivedAt: new Date().toISOString() });
                  toast("Archived");
                  onClose();
                }}
              >
                Archive
              </Button>
            </>
          )}
          <Button
            variant="primary"
            className="flex-1"
            disabled={!t.name.trim() || t.meals.length === 0}
            onClick={async () => {
              await put(COL.dayTemplates, t.id, { ...t, name: t.name.trim() });
              toast.success("Day template saved");
              onClose();
            }}
          >
            Save template
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 pb-4">
        <Field label="Name" htmlFor="d-n">
          <TextInput id="d-n" value={t.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Description (optional)" htmlFor="d-s">
          <TextInput
            id="d-s"
            value={t.subtitle ?? ""}
            onChange={(e) => set({ subtitle: e.target.value || undefined })}
          />
        </Field>
        <ul className="grid gap-2">
          {t.meals.map((m, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-line p-2.5"
            >
              <div className="grid gap-2">
                <Select
                  aria-label="Meal"
                  value={m.recipeId}
                  onChange={(e) =>
                    set({
                      meals: t.meals.map((x, j) =>
                        j === idx ? { ...x, recipeId: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {usable.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    aria-label="Slot"
                    value={m.slot}
                    onChange={(e) =>
                      set({
                        meals: t.meals.map((x, j) =>
                          j === idx ? { ...x, slot: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {SLOTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                  <NumberField
                    label="Portion"
                    value={m.portion}
                    min={0.25}
                    step={0.5}
                    decimals={2}
                    onChange={(v) =>
                      set({
                        meals: t.meals.map((x, j) => (j === idx ? { ...x, portion: v ?? 1 } : x)),
                      })
                    }
                  />
                </div>
              </div>
              <button
                aria-label="Remove meal"
                onClick={() => set({ meals: t.meals.filter((_, j) => j !== idx) })}
                className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={usable.length === 0}
            onClick={() =>
              set({
                meals: [
                  ...t.meals,
                  { recipeId: usable[0]!.id, slot: usable[0]!.slot ?? "lunch", portion: 1 },
                ],
              })
            }
          >
            <Plus className="size-4" />
            Add meal
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------ Meals tab ------------------------------ */
export function MealsTab({
  recipes,
  ingredients,
}: {
  recipes: Recipe[];
  ingredients: Ingredient[];
}) {
  const dayTemplates = useCollection<DayTemplate>(COL.dayTemplates).items.filter(
    (d) => !d.archivedAt,
  );
  const map = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [day, setDay] = useState<DayTemplate | null>(null);
  const [ing, setIng] = useState<Ingredient | null>(null);
  const active = recipes.filter((r) => !r.archivedAt);
  return (
    <div>
      <Section
        title="Day templates"
        action={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setDay({ id: newId(), name: "", meals: [] })}
          >
            <Plus className="size-4" />
            New day
          </Button>
        }
      >
        {dayTemplates.length === 0 ? (
          <EmptyState
            title="No day templates"
            body="A day template is a set of meals you can drop onto any day."
          />
        ) : (
          <Group as="ul" className="mb-0">
            {dayTemplates.map((d) => (
              <Row as="li" key={d.id} onClick={() => setDay(d)} className="justify-between px-4">
                <div className="min-w-0">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.subtitle ?? `${d.meals.length} meals`}
                    {d.legacyTotals ? ` · original estimate ${d.legacyTotals.kcal} kcal` : ""}
                  </p>
                </div>
                <VIcon name="next" size={20} className="shrink-0 text-muted-foreground" />
                <span className="sr-only">Edit</span>
              </Row>
            ))}
          </Group>
        )}
      </Section>

      <Section
        title="Meals"
        action={
          <Button size="sm" variant="primary" onClick={() => setRecipe(blankRecipe())}>
            <Plus className="size-4" />
            New meal
          </Button>
        }
      >
        {active.length === 0 ? (
          <EmptyState
            title="No meals yet"
            body="Create a meal with ingredients to get nutrition, cost and a shopping list."
          />
        ) : (
          <Group as="ul">
            {active.map((r) => {
              const n = recipeNutrition(r, map);
              const c = recipeCost(r, map);
              return (
                <Row
                  as="li"
                  key={r.id}
                  onClick={() => setRecipe(r)}
                  className="justify-between px-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-sm text-muted-foreground tnum">
                      {Math.round(n.perServing.kcal)} kcal · {Math.round(n.perServing.protein)} g
                      protein
                      {n.source === "legacy-estimate"
                        ? " · estimate"
                        : n.source === "partial"
                          ? " · incomplete"
                          : ""}
                      {c.pricedLines
                        ? ` · ${formatGBP(c.perServingPence)} per portion${c.coverage < 1 ? " (partial)" : ""}`
                        : ""}
                    </p>
                  </div>
                  <VIcon name="next" size={20} className="shrink-0 text-muted-foreground" />
                  <span className="sr-only">Edit</span>
                </Row>
              );
            })}
          </Group>
        )}
      </Section>

      <Section
        title="Ingredients and prices"
        action={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIng({ id: newId(), name: "", perAmount: 100, perUnit: "g" })}
          >
            <Plus className="size-4" />
            New ingredient
          </Button>
        }
      >
        <Group as="ul">
          {ingredients
            .filter((i) => !i.archivedAt)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((i) => (
              <Row as="li" key={i.id} onClick={() => setIng(i)} className="justify-between px-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.name}</p>
                  <p className="text-sm text-muted-foreground tnum">
                    {i.macros
                      ? `${i.macros.kcal} kcal per ${i.perAmount} ${i.perUnit}`
                      : "No nutrition data"}{" "}
                    ·{" "}
                    {i.pack
                      ? `${formatGBP(i.pack.pricePence)} per ${i.pack.amount} ${i.pack.unit}${i.pack.shop ? ` at ${i.pack.shop}` : ""}`
                      : "No price"}
                  </p>
                </div>
                <VIcon name="next" size={20} className="shrink-0 text-muted-foreground" />
                <span className="sr-only">Edit</span>
              </Row>
            ))}
        </Group>
      </Section>

      <RecipeEditor
        recipe={recipe}
        isNew={!!recipe && !recipes.some((r) => r.id === recipe.id)}
        ingredients={ingredients}
        onClose={() => setRecipe(null)}
      />
      <DayTemplateEditor
        template={day}
        isNew={!!day && !dayTemplates.some((d) => d.id === day.id)}
        recipes={recipes}
        onClose={() => setDay(null)}
      />
      <IngredientEditor ingredient={ing} onClose={() => setIng(null)} />
    </div>
  );
}
