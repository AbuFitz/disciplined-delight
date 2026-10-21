import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BlockSheet, WorkoutSheet } from "@/components/nl/plan";
import { RoutineBuilder } from "@/components/nl/routine-builder";
import { Button, Chip, EmptyState, Group, PageHeader, Section, Skeleton } from "@/components/nl/ui";
import { WeekNav, weekRangeLabel } from "@/components/nl/week-nav";
import { VIcon } from "@/components/nl/icon";
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
import { resumeBlock } from "@/data/routine-actions";
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
  const prayerLookup = prayer.lookup;
  const [anchor, setAnchor] = useState<ISODate | null>(null);
  const [sel, setSel] = useState<ISODate | null>(null);
  const [edit, setEdit] = useState<{ block: Partial<RoutineBlock>; date?: ISODate } | null>(null);
  const [wk, setWk] = useState<{ tpl: WorkoutTemplate; date: ISODate } | null>(null);
  const [building, setBuilding] = useState(false);
  const base = anchor ?? today;
  const days = weekDates(base);
  const selected = sel && days.includes(sel) ? sel : days.includes(today) ? today : days[0]!;

  const byDay = useMemo(() => {
    const out = new Map<ISODate, { items: Item[]; conflicts: number }>();
    const template = activeTemplates(tpls.items);
    for (const d of days) {
      const day = prayerLookup(d);
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
  }, [days, blocks.items, ex, tpls.items, sess, meals, prayerLookup]);

  if (!blocks.ready || !tpls.ready) return <Skeleton className="h-72 rounded-3xl" />;

  const activeBlocks = blocks.items.filter((b) => !b.archivedAt).sort((a, b) => a.order - b.order);
  const placed = tpls.items.filter((t) => !t.archivedAt && t.weekday != null).length;
  const weekLabel = weekRangeLabel(days[0]!, days[6]!);

  return (
    <>
      <PageHeader
        title="Plan"
        sub={
          activeBlocks.length || placed
            ? `${activeBlocks.length} routine ${activeBlocks.length === 1 ? "block" : "blocks"} · ${placed} ${placed === 1 ? "session" : "sessions"} placed`
            : undefined
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:max-w-lg">
        <Button variant="primary" size="lg" className="px-3" onClick={() => setEdit({ block: {} })}>
          <VIcon name="add" size={18} />
          Add block
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="bg-surface/80 px-3 !border-transparent"
          onClick={() => setBuilding(true)}
        >
          Build my routine
        </Button>
      </div>
      <WeekNav
        className="mb-3"
        label={weekLabel}
        onPrev={() => setAnchor(addDays(base, -7))}
        onNext={() => setAnchor(addDays(base, 7))}
        trailing={
          anchor ? (
            <Button
              variant="ghost"
              size="sm"
              className="bg-surface/80"
              onClick={() => setAnchor(null)}
            >
              This week
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Day" className="mb-4 grid grid-cols-7 gap-1.5 lg:hidden">
        {days.map((d) => {
          const on = d === selected;
          const n = byDay.get(d)?.items.filter((i) => i.kind !== "prayer").length ?? 0;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={on}
              onClick={() => setSel(d)}
              className={cn(
                "flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full transition active:scale-95",
                on ? "bg-primary text-primary-foreground" : "bg-surface/80",
              )}
            >
              <span className={cn("text-[0.7rem] font-medium", !on && "text-muted-foreground")}>
                {WEEKDAY_SHORT[weekdayIndex(d)]}
              </span>
              <span className="num text-lg font-semibold leading-none">{Number(d.slice(8))}</span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  n > 0 ? (on ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
                  d === today && n === 0 && (on ? "bg-primary-foreground/50" : "bg-foreground/30"),
                )}
              />
              {(byDay.get(d)?.conflicts ?? 0) > 0 && <span className="sr-only">Has conflicts</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(7,minmax(0,1fr))]">
        {days.map((d) => {
          const info = byDay.get(d)!;
          return (
            <section
              key={d}
              aria-label={formatDateLong(d)}
              className={cn(
                "min-w-0 rounded-3xl bg-surface/80 p-3 lg:p-2.5",
                d === today && "ring-2 ring-primary/60",
                d !== selected && "hidden lg:block",
              )}
            >
              <div className="mb-2 hidden items-baseline justify-between px-1 lg:flex">
                <p className="text-sm font-semibold">{WEEKDAY_SHORT[weekdayIndex(d)]}</p>
                <p className="num text-lg font-semibold">{Number(d.slice(8))}</p>
              </div>
              <h2 className="mb-2 px-1 text-lg font-bold tracking-tight lg:hidden">
                {formatDateLong(d)}
                {d === today && (
                  <span className="ml-2 text-sm font-medium text-primary">Today</span>
                )}
              </h2>
              {info.conflicts > 0 && (
                <p
                  role="status"
                  className="mb-2 flex items-center gap-1.5 rounded-2xl bg-warn/15 px-3 py-2 text-xs text-warn"
                >
                  <VIcon name="alert" size={16} />
                  {info.conflicts} overlap{info.conflicts > 1 ? "s" : ""}. Tap a block to change it.
                </p>
              )}
              {info.items.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                  Nothing planned.
                </p>
              ) : (
                <ul className="grid gap-1.5">
                  {info.items.map((it, i) => {
                    if (it.kind === "prayer")
                      return (
                        <li
                          key={i}
                          className="flex min-h-9 flex-wrap items-center gap-x-2 px-3 text-sm text-muted-foreground"
                        >
                          <span className="tnum min-w-16 shrink-0 lg:min-w-0">
                            {to12h(minToHHMM(it.time))}
                          </span>
                          <span>{it.label}</span>
                          <span className="sr-only">Prayer</span>
                          <VIcon name="spirituality" size={16} className="opacity-70" />
                        </li>
                      );
                    if (it.kind === "meals")
                      return (
                        <li
                          key={i}
                          className="flex min-h-9 items-center gap-2 px-3 text-sm text-muted-foreground"
                        >
                          <VIcon name="nutrition" size={16} className="opacity-70" />
                          {it.count} meal{it.count > 1 ? "s" : ""} planned
                        </li>
                      );
                    if (it.kind === "workout")
                      return (
                        <li key={i}>
                          <button
                            onClick={() => setWk({ tpl: it.tpl, date: d })}
                            className={cn(
                              "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-primary/15 px-3 py-2 text-left text-sm transition active:scale-[0.98] lg:flex-col lg:items-start lg:gap-0.5",
                              it.conflict && "ring-2 ring-warn",
                            )}
                          >
                            <span className="tnum min-w-16 shrink-0 lg:min-w-0">
                              {it.tpl.time ? to12h(it.tpl.time) : "Any"}
                            </span>
                            <span className="min-w-0 flex-1 font-semibold lg:flex-none">
                              Workout {it.tpl.letter}
                            </span>
                            {it.done && <Chip tone="ok">Done</Chip>}
                          </button>
                        </li>
                      );
                    return (
                      <li key={it.occ.key}>
                        <button
                          onClick={() => setEdit({ block: it.block, date: d })}
                          className={cn(
                            "flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface-2/70 px-3 py-2 text-left text-sm transition active:scale-[0.98] hover:bg-surface-2 lg:flex-col lg:items-start lg:gap-0.5",
                            it.conflict && "ring-2 ring-warn",
                          )}
                        >
                          <span className="tnum min-w-16 shrink-0 text-muted-foreground lg:min-w-0">
                            {to12h(minToHHMM(it.occ.startMin))}
                          </span>
                          <span className="min-w-0 max-w-full flex-1 truncate font-semibold lg:flex-none">
                            {it.occ.label}
                          </span>
                          {it.occ.moved && <Chip>Moved</Chip>}
                          {it.occ.relative && <Chip>Prayer-linked</Chip>}
                          {it.conflict && (
                            <VIcon
                              name="alert"
                              size={16}
                              className="shrink-0 text-warn"
                              label="Overlaps another block"
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

      <Section
        className="mt-8"
        title="Repeating"
        action={
          activeBlocks.length > 0 && (
            <button
              onClick={() => setEdit({ block: {} })}
              className="inline-flex min-h-11 items-center px-2 font-semibold text-primary"
            >
              Add
            </button>
          )
        }
      >
        {activeBlocks.length === 0 ? (
          <EmptyState
            title="No repeating blocks yet"
            body="Add a block, or build a routine around your day."
            action={
              <Button variant="primary" onClick={() => setBuilding(true)}>
                Build my routine
              </Button>
            }
          />
        ) : (
          <Group as="ul">
            {activeBlocks.map((b) => {
              const paused =
                !!b.pausedFrom &&
                b.pausedFrom <= today &&
                (b.pausedUntil == null || b.pausedUntil > today);
              return (
                <li key={b.id} className="flex items-center gap-2 px-4 py-1.5">
                  <button
                    className="min-h-14 min-w-0 flex-1 text-left"
                    onClick={() => setEdit({ block: b })}
                  >
                    <span className="block truncate font-semibold">{b.label}</span>
                    <span className="tnum block text-sm text-muted-foreground">
                      {b.relativeTo
                        ? "Prayer-linked"
                        : `${to12h(b.start)}${b.end ? `–${to12h(b.end)}` : ""}`}{" "}
                      ·{" "}
                      {b.weekdays.length === 7
                        ? "Daily"
                        : b.weekdays.map((d) => WEEKDAY_SHORT[d]).join(", ")}
                    </span>
                  </button>
                  {paused && <Chip tone="warn">Paused</Chip>}
                  {paused && (
                    <Button size="sm" onClick={() => void resumeBlock(b.id, today)}>
                      Resume
                    </Button>
                  )}
                </li>
              );
            })}
          </Group>
        )}
      </Section>
      <RoutineBuilder open={building} onOpenChange={setBuilding} />
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
