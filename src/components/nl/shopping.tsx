import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  CheckButton,
  Chip,
  EmptyState,
  Field,
  Meter,
  NumberField,
  Panel,
  Row,
  Sheet,
  TextInput,
} from "./ui";
import { IngredientEditor } from "./food-manage";
import { newId, put, remove } from "@/data/db";
import { useCollection } from "@/data/hooks";
import {
  COL,
  type Batch,
  type MealPlanEntry,
  type PantryItem,
  type Profile,
  type Purchase,
} from "@/data/types";
import { addDays, formatDateLong, weekDates, type ISODate } from "@/domain/dates";
import { formatGBP, toPence } from "@/domain/money";
import type { Ingredient, Recipe } from "@/domain/nutrition";
import {
  budgetSummary,
  buildShoppingList,
  requirements,
  type PlannedUse,
  type ShoppingRow,
} from "@/domain/shopping";
import type { Quantity } from "@/domain/units";

type Check = { id: string; weekStart: ISODate; ingredientId: string; bought: boolean };

const qty = (base: number, family: ShoppingRow["family"]) => {
  const r = Math.round(base * 10) / 10;
  if (family === "g") return r >= 1000 ? `${r / 1000} kg` : `${r} g`;
  if (family === "ml") return r >= 1000 ? `${r / 1000} l` : `${r} ml`;
  return `${r}`;
};

export function ShoppingTab({
  today,
  recipes,
  ingredients,
  allPlan,
  profile,
}: {
  today: ISODate;
  recipes: Recipe[];
  ingredients: Ingredient[];
  allPlan: MealPlanEntry[];
  profile: Profile;
}) {
  const [anchor, setAnchor] = useState<ISODate>(today);
  const days = weekDates(anchor);
  const weekStart = days[0]!;
  const batches = useCollection<Batch>(COL.batches).items;
  const pantryQ = useCollection<PantryItem>(COL.pantry).items;
  const checks = useCollection<Check>(COL.shopChecks).items;
  const purchases = useCollection<Purchase>(COL.purchases).items;
  const [ing, setIng] = useState<Ingredient | null>(null);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const { rows, noData } = useMemo(() => {
    const entries = allPlan.filter(
      (e) => days.includes(e.date) && (e.status === "planned" || e.status === "prepared"),
    );
    const uses: PlannedUse[] = [];
    let missing = 0;
    for (const e of entries) {
      const batch = e.batchId ? batches.find((b) => b.id === e.batchId) : undefined;
      const r = recipeMap.get(batch?.recipeId ?? e.recipeId ?? "");
      if (!r || r.lines.length === 0) {
        missing++;
        continue;
      }
      uses.push({ recipe: r, servings: e.portion, batchId: batch?.id });
    }
    const pantry: Record<string, Quantity> = {};
    for (const p of pantryQ) pantry[p.ingredientId] = { amount: p.amount, unit: p.unit };
    return { rows: buildShoppingList(requirements(uses), ingMap, pantry), noData: missing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlan, batches, recipeMap, ingMap, pantryQ, weekStart]);

  const weekPurchases = purchases.filter((p) => days.includes(p.date));
  const spent = weekPurchases.reduce((s, p) => s + p.totalPence, 0);
  const sum = budgetSummary(rows, spent, profile.budgetPencePerWeek);
  const bought = (id: string) => checks.find((c) => c.id === `${weekStart}:${id}`)?.bought ?? false;

  const groups = useMemo(() => {
    const g = new Map<string, ShoppingRow[]>();
    for (const r of rows) {
      const shop = ingMap.get(r.ingredientId)?.pack?.shop ?? "Anywhere";
      g.set(shop, [...(g.get(shop) ?? []), r]);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, ingMap]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-1">
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

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {rows.length === 0 ? (
            <EmptyState
              title="Nothing to buy yet"
              body={
                noData
                  ? `${noData} planned meal${noData > 1 ? "s have" : " has"} no ingredient lines, so they can't add to the list. Add ingredients to those meals.`
                  : "Plan meals for this week in the Week plan tab. Ingredients are added here automatically."
              }
            />
          ) : (
            groups.map(([shop, list]) => (
              <section key={shop} aria-label={shop} className="mb-6">
                <h2 className="eyebrow mb-1">{shop}</h2>
                <ul>
                  {list.map((r) => {
                    const i = ingMap.get(r.ingredientId);
                    const done = bought(r.ingredientId);
                    return (
                      <Row as="li" key={r.ingredientId} className="items-start">
                        <CheckButton
                          label={`${i?.name ?? "Item"} bought`}
                          checked={done}
                          onChange={(v) =>
                            put(COL.shopChecks, `${weekStart}:${r.ingredientId}`, {
                              id: `${weekStart}:${r.ingredientId}`,
                              weekStart,
                              ingredientId: r.ingredientId,
                              bought: v,
                            } satisfies Check)
                          }
                        />
                        <button className="min-w-0 flex-1 text-left" onClick={() => i && setIng(i)}>
                          <p
                            className={done ? "font-medium line-through opacity-60" : "font-medium"}
                          >
                            {i?.name ?? r.ingredientId}
                          </p>
                          <p className="text-sm text-muted-foreground tnum">
                            Need {qty(r.needBase, r.family)}
                            {r.pantryBase > 0 ? ` · pantry ${qty(r.pantryBase, r.family)}` : ""}
                            {r.toBuyBase > 0
                              ? ` · buy ${qty(r.toBuyBase, r.family)}`
                              : " · covered by pantry"}
                          </p>
                          {r.packs != null ? (
                            <p className="text-sm tnum">
                              {r.packs} × {i!.pack!.amount} {i!.pack!.unit} ·{" "}
                              {formatGBP(r.packCostPence ?? 0)}
                            </p>
                          ) : (
                            <p className="text-sm text-warn">No price or pack size. Tap to add.</p>
                          )}
                        </button>
                      </Row>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
          {noData > 0 && rows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {noData} planned meal(s) without ingredient lines aren't included.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPantryOpen(true)}
              disabled={rows.length === 0}
            >
              Pantry stock
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                for (const c of checks.filter((c) => c.weekStart === weekStart))
                  await remove(COL.shopChecks, c.id);
                toast("Ticks cleared");
              }}
            >
              Clear ticks
            </Button>
          </div>
        </div>

        <aside className="grid content-start gap-4" aria-label="Budget">
          <Panel tone="warm">
            <p className="eyebrow !text-foreground/70">Estimated checkout</p>
            <p className="num mt-1 text-4xl font-semibold tnum">
              {formatGBP(sum.estimatedCheckoutPence)}
            </p>
            <p className="mt-1 text-sm text-foreground/80 tnum">
              Whole packs after pantry.{" "}
              {sum.coverage < 1
                ? `Only ${rows.length - sum.unpricedCount} of ${rows.length} items are priced, so this is not the full bill.`
                : rows.length
                  ? "All items priced."
                  : ""}
            </p>
            {sum.coverage < 1 && (
              <Meter
                className="mt-2"
                label="Items priced"
                value={rows.length - sum.unpricedCount}
                max={rows.length}
              />
            )}
          </Panel>
          <Panel>
            <div className="flex items-start justify-between">
              <p className="eyebrow">Actual spend this week</p>
              <Button size="sm" variant="secondary" onClick={() => setBuyOpen(true)}>
                <Plus className="size-4" />
                Record
              </Button>
            </div>
            <p className="num mt-1 text-4xl font-semibold tnum">{formatGBP(spent)}</p>
            <p className="text-sm text-muted-foreground tnum">
              {profile.budgetPencePerWeek != null
                ? `${formatGBP(profile.budgetPencePerWeek)} budget · ${sum.remainingPence! >= 0 ? `${formatGBP(sum.remainingPence!)} left` : `${formatGBP(-sum.remainingPence!)} over`}`
                : "Set a weekly budget in Settings."}
            </p>
            <ul className="mt-2">
              {weekPurchases.map((p) => (
                <Row as="li" key={p.id} className="min-h-12 justify-between py-1">
                  <div>
                    <p className="font-medium tnum">{formatGBP(p.totalPence)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateLong(p.date)}
                      {p.shop ? ` · ${p.shop}` : ""}
                    </p>
                  </div>
                  <button
                    aria-label="Delete purchase"
                    onClick={async () => {
                      await remove(COL.purchases, p.id);
                      toast("Purchase removed");
                    }}
                    className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Row>
              ))}
            </ul>
          </Panel>
          <p className="text-xs text-muted-foreground">
            Estimated checkout is a plan. Actual spend is only what you record. Cost per portion
            appears on each meal in the Meals tab. <Chip>No savings are claimed</Chip>
          </p>
        </aside>
      </div>

      <IngredientEditor ingredient={ing} onClose={() => setIng(null)} />
      <PantrySheet
        open={pantryOpen}
        onOpenChange={setPantryOpen}
        rows={rows}
        ingMap={ingMap}
        pantry={pantryQ}
      />
      <PurchaseSheet open={buyOpen} onOpenChange={setBuyOpen} today={today} />
    </div>
  );
}

function PantrySheet({
  open,
  onOpenChange,
  rows,
  ingMap,
  pantry,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: ShoppingRow[];
  ingMap: Map<string, Ingredient>;
  pantry: PantryItem[];
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Pantry stock"
      description="Optional. Only items you tell us about are deducted from the list. Nothing is tracked automatically."
    >
      <ul className="pb-3">
        {rows.map((r) => {
          const i = ingMap.get(r.ingredientId);
          if (!i) return null;
          const cur = pantry.find((p) => p.ingredientId === r.ingredientId);
          const unit = r.family === "g" ? "g" : r.family === "ml" ? "ml" : "count";
          return (
            <Row as="li" key={r.ingredientId} className="justify-between">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <NumberField
                label={`${i.name} in pantry`}
                className="w-44"
                unit={unit === "count" ? "" : unit}
                stepper={false}
                value={cur?.amount}
                placeholder="0"
                onChange={(v) =>
                  put(COL.pantry, r.ingredientId, {
                    ingredientId: r.ingredientId,
                    amount: v ?? 0,
                    unit,
                    updatedAt: Date.now(),
                  } satisfies PantryItem)
                }
              />
            </Row>
          );
        })}
      </ul>
    </Sheet>
  );
}

function PurchaseSheet({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  today: ISODate;
}) {
  const [amount, setAmount] = useState<number | undefined>();
  const [shop, setShop] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Record a purchase"
      description="Actual spend stays as you enter it, even if prices change later."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={amount == null || amount <= 0}
          onClick={async () => {
            const p: Purchase = {
              id: newId(),
              date,
              shop: shop.trim() || undefined,
              note: note.trim() || undefined,
              totalPence: toPence(amount!)!,
            };
            await put(COL.purchases, p.id, p);
            toast.success(`Recorded ${formatGBP(p.totalPence)}`);
            setAmount(undefined);
            setShop("");
            setNote("");
            onOpenChange(false);
          }}
        >
          Save purchase
        </Button>
      }
    >
      <div className="grid gap-4 pb-3">
        <Field label="Total spent">
          <NumberField
            label="Total spent"
            unit="£"
            step={1}
            decimals={2}
            value={amount}
            onChange={setAmount}
          />
        </Field>
        <Field label="Date" htmlFor="pu-d">
          <TextInput
            id="pu-d"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Shop (optional)" htmlFor="pu-s">
          <TextInput id="pu-s" value={shop} onChange={(e) => setShop(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="pu-n">
          <TextInput id="pu-n" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}
