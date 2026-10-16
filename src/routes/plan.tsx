import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BlockSheet, WorkoutSheet } from "@/components/nl/plan";
import { Button, Chip, PageHeader, Skeleton } from "@/components/nl/ui";
import { useCollection, useNow } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import { activeTemplates, sessionForDate } from "@/data/selectors";
import {
  COL,
  type MealPlanEntry,
  type RoutineBlock,
  type RoutineException,
  type Session,
  type WorkoutTemplate,
} from "@/data/types";
import {
  addDays,
  formatDateLong,
  to12h,
  weekDates,
  weekdayIndex,
  WEEKDAY_SHORT,
  type ISODate,
} from "@/domain/dates";
import { PRAYER_LABEL, PRAYERS } from "@/domain/prayer";
import { findConflicts, minToHHMM, occurrencesFor, type Occurrence } from "@/domain/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({ component: PlanPage });

type Item =
  | { kind: "block"; time: number; occ: Occurrence; block: RoutineBlock; conflict: boolean }
  | { kind: "prayer"; time: number; label: string }
  | { kind: "workout"; time: number; tpl: WorkoutTemplate; done: boolean; conflict: boolean }
  | { kind: "meals"; time: number; count: number };

function PlanPage() {
  const now = useNow(60_000);
  const prayer = usePrayer(now);
  const blocks = useCollection<RoutineBlock>(COL.routine);
  const ex = useCollection<RoutineException>(COL.routineExceptions).items;
  const tpls = useCollection<WorkoutTemplate>(COL.templates);
  const sess = useCollection<Session>(COL.sessions).items;
  const meals = useCollection<MealPlanEntry>(COL.mealPlan).items;
  const today = prayer.today;
  const [anchor, setAnchor] = useState<ISODate | null>(null);
  const [sel, setSel] = useState<ISODate | null>(null);
  const [edit, setEdit] = useState<{ block: Partial<RoutineBlock>; date?: ISODate } | null>(null);
  const [wk, setWk] = useState<{ tpl: WorkoutTemplate; date: ISODate } | null>(null);
  const base = anchor ?? today;
  const days = weekDates(base);
  const selected = sel && days.includes(sel) ? sel : days.includes(today) ? today : days[0]!;

  const byDay = useMemo(() => {
    const out = new Map<ISODate, { items: Item[]; conflicts: number }>();
    const template = activeTemplates(tpls.items);
    for (const d of days) {
      const day = prayer.lookup(d);
      const occs = occurrencesFor(d, blocks.items, ex, (p) => day?.start[p]);
      const wkTpl = template.find((t) => t.weekday === weekdayIndex(d));
      const toMin = (h: string) => {
        const [a = 0, b = 0] = h.split(":").map(Number);
        return a * 60 + b;
      };
      const wOcc: Occurrence | null = wkTpl?.time
        ? {
            key: `w:${d}`,
            blockId: wkTpl.id,
            label: `Workout ${wkTpl.letter}`,
            startMin: toMin(wkTpl.time),
            endMin: toMin(wkTpl.time) + 60,
            moved: false,
            relative: false,
          }
        : null;
      const conflicts = findConflicts(wOcc ? [...occs, wOcc] : occs);
      const bad = new Set(conflicts.flatMap(([a, b]) => [a.key, b.key]));
      const items: Item[] = occs.map((o) => ({
        kind: "block",
        time: o.startMin,
        occ: o,
        block: blocks.items.find((b) => b.id === o.blockId)!,
        conflict: bad.has(o.key),
      }));
      if (day)
        for (const p of PRAYERS)
          items.push({ kind: "prayer", time: toMin(day.start[p]), label: PRAYER_LABEL[p] });
      if (wkTpl)
        items.push({
          kind: "workout",
          time: wOcc?.startMin ?? 24 * 60 - 1,
          tpl: wkTpl,
          done: sessionForDate(sess, d, wkTpl.id).some((s) => s.status === "completed"),
          conflict: !!wOcc && bad.has(wOcc.key),
        });
      const n = meals.filter((m) => m.date === d && m.status !== "skipped").length;
      if (n) items.push({ kind: "meals", time: 24 * 60 - 2, count: n });
      out.set(d, { items: items.sort((a, b) => a.time - b.time), conflicts: conflicts.length });
    }
    return out;
  }, [days, blocks.items, ex, tpls.items, sess, meals, prayer.lookup]);

  if (!blocks.ready || !tpls.ready) return <Skeleton className="h-72" />;

  return (
    <>
      <PageHeader
        eyebrow="Week"
        title="Plan the week"
        actions={
          <Button variant="primary" onClick={() => setEdit({ block: {} })}>
            <Plus className="size-4" />
            Add block
          </Button>
        }
      />
      <div className="mb-4 flex items-center gap-1">
        <button
          aria-label="Previous week"
          onClick={() => setAnchor(addDays(base, -7))}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-0 flex-1 px-2 text-center font-medium">
          {formatDateLong(days[0]!)} – {formatDateLong(days[6]!).split(" ").slice(1).join(" ")}
        </p>
        <button
          aria-label="Next week"
          onClick={() => setAnchor(addDays(base, 7))}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
        >
          <ChevronRight className="size-5" />
        </button>
        {anchor && (
          <Button variant="ghost" size="sm" onClick={() => setAnchor(null)}>
            This week
          </Button>
        )}
      </div>

      <div role="tablist" aria-label="Day" className="mb-4 grid grid-cols-7 gap-1 lg:hidden">
        {days.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === selected}
            onClick={() => setSel(d)}
            className={cn(
              "min-h-14 rounded-2xl border px-1 text-center",
              d === selected ? "border-primary bg-primary text-primary-foreground" : "border-line",
              d === today && d !== selected && "border-primary/60",
            )}
          >
            <span className="block text-[0.65rem] uppercase">{WEEKDAY_SHORT[weekdayIndex(d)]}</span>
            <span className="num block text-lg font-semibold">{d.slice(8)}</span>
            {(byDay.get(d)?.conflicts ?? 0) > 0 && <span className="sr-only">Has conflicts</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(7,minmax(0,1fr))]">
        {days.map((d) => {
          const info = byDay.get(d)!;
          return (
            <section
              key={d}
              aria-label={formatDateLong(d)}
              className={cn(
                "min-w-0 rounded-3xl border bg-surface p-3",
                d === today ? "border-primary" : "border-line",
                d !== selected && "hidden lg:block",
              )}
            >
              <div className="mb-1 hidden items-baseline justify-between lg:flex">
                <p className="eyebrow">{WEEKDAY_SHORT[weekdayIndex(d)]}</p>
                <p className="num text-lg font-semibold">{d.slice(8)}</p>
              </div>
              <h2 className="mb-1 font-display text-xl font-semibold lg:hidden">
                {formatDateLong(d)}
              </h2>
              {info.conflicts > 0 && (
                <p
                  role="status"
                  className="mb-2 flex items-center gap-1.5 rounded-xl bg-warn/15 px-2.5 py-1.5 text-xs text-warn"
                >
                  <AlertTriangle className="size-3.5" />
                  {info.conflicts} overlap{info.conflicts > 1 ? "s" : ""}. Tap a block to change it.
                </p>
              )}
              {info.items.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nothing planned.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {info.items.map((it, i) => {
                    if (it.kind === "prayer")
                      return (
                        <li
                          key={i}
                          className="flex min-h-9 flex-wrap items-center gap-x-2 px-2 text-sm text-muted-foreground"
                        >
                          <span className="tnum min-w-14 shrink-0">
                            {to12h(minToHHMM(it.time))}
                          </span>
                          <span>{it.label}</span>
                          <span className="eyebrow !text-[0.6rem]">Prayer</span>
                        </li>
                      );
                    if (it.kind === "meals")
                      return (
                        <li key={i} className="px-2 py-1 text-sm text-muted-foreground">
                          {it.count} meal{it.count > 1 ? "s" : ""} planned
                        </li>
                      );
                    if (it.kind === "workout")
                      return (
                        <li key={i}>
                          <button
                            onClick={() => setWk({ tpl: it.tpl, date: d })}
                            className={cn(
                              "flex min-h-12 w-full items-center gap-2 rounded-2xl bg-[image:var(--panel-green)] px-3 py-2 text-left text-sm lg:flex-col lg:items-start lg:gap-0.5",
                              it.conflict && "ring-2 ring-warn",
                            )}
                          >
                            <span className="tnum min-w-14 shrink-0">
                              {it.tpl.time ? to12h(it.tpl.time) : "Any"}
                            </span>
                            <span className="font-medium">Workout {it.tpl.letter}</span>
                            {it.done && <Chip tone="ok">Done</Chip>}
                          </button>
                        </li>
                      );
                    return (
                      <li key={it.occ.key}>
                        <button
                          onClick={() => setEdit({ block: it.block, date: d })}
                          className={cn(
                            "flex min-h-12 w-full flex-wrap items-center gap-2 rounded-2xl border border-line px-3 py-2 text-left text-sm hover:bg-surface-2 lg:flex-col lg:items-start lg:gap-0.5",
                            it.conflict && "border-warn",
                          )}
                        >
                          <span className="tnum min-w-14 shrink-0 text-muted-foreground">
                            {to12h(minToHHMM(it.occ.startMin))}
                          </span>
                          <span className="min-w-0 max-w-full flex-1 truncate font-medium lg:flex-none">
                            {it.occ.label}
                          </span>
                          {it.occ.moved && <Chip>Moved</Chip>}
                          {it.occ.relative && <Chip>Prayer-linked</Chip>}
                          {it.conflict && (
                            <AlertTriangle
                              className="size-4 shrink-0 text-warn"
                              aria-label="Overlaps another block"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <BlockSheet
        block={edit?.block ?? null}
        date={edit?.date}
        count={blocks.items.length}
        onClose={() => setEdit(null)}
      />
      <WorkoutSheet
        tpl={wk?.tpl ?? null}
        date={wk?.date ?? today}
        today={today}
        onClose={() => setWk(null)}
        done={
          wk
            ? sessionForDate(sess, wk.date, wk.tpl.id).some((s) => s.status === "completed")
            : false
        }
      />
    </>
  );
}
