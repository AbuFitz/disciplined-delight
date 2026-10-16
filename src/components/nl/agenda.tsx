import { Link, useNavigate } from "@tanstack/react-router";
import { Check, MoreHorizontal, Play, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Field,
  Menu,
  Panel,
  Sheet,
  TextInput,
} from "@/components/nl/ui";
import { logPrayer, startSession, unlogPrayer } from "@/data/actions";
import { useAgenda } from "@/data/agenda";
import { useCollection } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import {
  clearCompletion,
  clearException,
  moveOccurrence,
  pauseBlock,
  restOccurrence,
  setCompletion,
  skipOccurrence,
} from "@/data/routine-actions";
import { COL, type WorkoutTemplate } from "@/data/types";
import { addDays, to12h, type ISODate } from "@/domain/dates";
import type { PrayerName } from "@/domain/prayer";
import type { AgendaItem, Status } from "@/domain/routine";
import { minToHHMM } from "@/domain/schedule";
import { cn } from "@/lib/utils";
import { MealLogSheet } from "./MealLog";
import { useActiveSession } from "./Shell";

const timeLabel = (i: AgendaItem) =>
  i.floating
    ? "Any time"
    : `${to12h(minToHHMM(i.startMin))}${i.endMin - i.startMin > 15 && i.source !== "prayer" ? `–${to12h(minToHHMM(i.endMin))}` : ""}`;

const STATUS_LABEL: Record<Status, string> = {
  upcoming: "Upcoming",
  now: "Now",
  done: "Done",
  skipped: "Skipped",
  missed: "Missed",
  rest: "Rest day",
};
const STATUS_TONE: Record<Status, "neutral" | "ok" | "warn" | "info"> = {
  upcoming: "neutral",
  now: "info",
  done: "ok",
  skipped: "neutral",
  missed: "warn",
  rest: "neutral",
};

const origDate = (i: AgendaItem, fallback: ISODate) => i.key.split(":")[1] ?? fallback;

/** Everything you can do to one item, in one place so Today's card and timeline stay consistent. */
function useItemActions(date: ISODate) {
  const nav = useNavigate();
  const templates = useCollection<WorkoutTemplate>(COL.templates).items;
  const active = useActiveSession();
  const prayer = usePrayer(Date.now());
  const day = prayer.lookup(date);
  const fail = () => toast.error("Couldn't save that. Nothing was changed; try again.");
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch {
      fail();
    }
  };
  const tpl = (i: AgendaItem) =>
    templates.find((t) =>
      i.link.type === "workout" && i.link.templateId ? t.id === i.link.templateId : false,
    );
  return {
    active,
    done: (i: AgendaItem) => {
      if (i.link.type === "prayer") {
        const p = i.link.prayer as PrayerName;
        return run(() =>
          logPrayer(date, p, {
            sourceSnapshot: day ? { sourceId: day.sourceId, startTime: day.start[p] } : undefined,
          }),
        );
      }
      if (i.blockId) return run(() => setCompletion(i.blockId!, date, "done"));
    },
    undo: (i: AgendaItem) => {
      if (i.link.type === "prayer" && i.derived)
        return run(() =>
          unlogPrayer(date, i.link.type === "prayer" ? (i.link.prayer as PrayerName) : "fajr"),
        );
      if (i.blockId)
        return run(async () => {
          await clearCompletion(i.blockId!, date);
          await clearException(i.blockId!, origDate(i, date));
        });
    },
    skip: (i: AgendaItem) =>
      i.blockId && run(() => skipOccurrence(i.blockId!, origDate(i, date)), "Skipped for today"),
    rest: (i: AgendaItem) =>
      i.blockId && run(() => restOccurrence(i.blockId!, origDate(i, date)), "Marked as a rest day"),
    pause: (i: AgendaItem) =>
      i.blockId &&
      !i.blockId.startsWith("workout:") &&
      run(() => pauseBlock(i.blockId!, date), "Paused. Resume it any time in the planner."),
    startWorkout: (i: AgendaItem) =>
      run(async () => {
        const t = tpl(i) ?? templates.find((x) => i.key.includes(x.id));
        if (!t) throw new Error("no template");
        await startSession(t, date);
        nav({ to: "/train/session" });
      }),
    continueWorkout: () => nav({ to: "/train/session" }),
  };
}

function PrimaryAction({
  item,
  date,
  onLogMeal,
}: {
  item: AgendaItem;
  date: ISODate;
  onLogMeal: () => void;
}) {
  const a = useItemActions(date);
  const nav = useNavigate();
  if (item.link.type === "workout")
    return a.active ? (
      <Button variant="primary" size="lg" onClick={a.continueWorkout}>
        <Play className="size-4 fill-current" />
        Continue session
      </Button>
    ) : (
      <Button variant="primary" size="lg" onClick={() => void a.startWorkout(item)}>
        <Play className="size-4 fill-current" />
        Start session
      </Button>
    );
  if (item.link.type === "prayer")
    return (
      <Button variant="primary" size="lg" onClick={() => void a.done(item)}>
        <Check className="size-4" />
        Mark as prayed
      </Button>
    );
  if (item.link.type === "meal")
    return (
      <Button variant="primary" size="lg" onClick={onLogMeal}>
        <Utensils className="size-4" />
        Log a meal
      </Button>
    );
  if (item.link.type === "mind")
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={() =>
          nav({
            to: "/mind",
            search: {
              tab:
                item.link.type === "mind" && item.link.kind === "checkin"
                  ? undefined
                  : item.link.type === "mind" && item.link.kind === "reflection"
                    ? "reflect"
                    : "focus",
            },
          })
        }
      >
        Open Mind
      </Button>
    );
  return (
    <Button variant="primary" size="lg" onClick={() => void a.done(item)}>
      <Check className="size-4" />
      Done
    </Button>
  );
}

/* ------------------------------ Next up ------------------------------ */
export function AgendaNextWidget({ today }: { today: ISODate; now?: number; profile?: unknown }) {
  const ag = useAgenda();
  const [logOpen, setLogOpen] = useState(false);
  const a = useItemActions(today);
  const n = ag.next;
  const summary = ag.counts.total ? `${ag.counts.done} of ${ag.counts.total} done` : null;
  return (
    <Panel tone="ink" className="md:p-8" aria-label="Next up">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>Next up</Eyebrow>
        {summary && <span className="eyebrow tnum">{summary}</span>}
      </div>
      {!ag.ready ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-foreground/10" />
      ) : n ? (
        <>
          <h2 className="display-title mt-3 text-[clamp(2rem,8vw,3.25rem)] [overflow-wrap:anywhere]">
            {n.label}
          </h2>
          <p className="mt-3 text-lg">
            <span className="tnum font-semibold">{timeLabel(n)}</span>
            {n.status === "now" && <span> · happening now</span>}
            {n.moved && <span> · moved</span>}
          </p>
          {n.detail && <p className="mt-1 max-w-xl">{n.detail}</p>}
          {n.conflict && (
            <p className="mt-2 text-sm">
              Overlaps another activity. Move one of them from the timeline.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PrimaryAction item={n} date={today} onLogMeal={() => setLogOpen(true)} />
            {n.blockId && n.link.type !== "prayer" && (
              <Button variant="secondary" onClick={() => void a.skip(n)}>
                Skip today
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLogOpen(true)}>
              <Utensils className="size-4" />
              Log a meal
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="display-title mt-3 text-[clamp(2rem,8vw,3.25rem)]">
            {ag.items.some((i) => !i.context)
              ? ag.counts.total > 0 && ag.counts.done === ag.counts.total
                ? "All done"
                : "Nothing left today"
              : "Nothing scheduled"}
          </h2>
          <p className="mt-3 max-w-xl text-lg">
            {ag.items.some((i) => !i.context)
              ? ag.counts.missed
                ? `${ag.counts.missed} ${ag.counts.missed === 1 ? "thing" : "things"} slipped by today. That's fine: tick them off if you did them, or leave them.`
                : "Enjoy the rest of your day."
              : "Build a routine around your day, or log a meal."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to="/plan"
              className="inline-flex min-h-14 items-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground"
            >
              {ag.items.some((i) => !i.context) ? "Open the week" : "Build my routine"}
            </Link>
            <Button variant="secondary" onClick={() => setLogOpen(true)}>
              <Utensils className="size-4" />
              Log a meal
            </Button>
          </div>
        </>
      )}
      <MealLogSheet open={logOpen} onOpenChange={setLogOpen} date={today} />
    </Panel>
  );
}

/* ------------------------------ Timeline ------------------------------ */
export function AgendaTimelineWidget({
  today,
}: {
  today: ISODate;
  now?: number;
  profile?: unknown;
}) {
  const ag = useAgenda();
  const nav = useNavigate();
  const a = useItemActions(today);
  const [moving, setMoving] = useState<AgendaItem | null>(null);
  const rows = ag.items;
  return (
    <Panel aria-label="Today's timeline">
      <Eyebrow>Today's timeline</Eyebrow>
      {!ag.ready ? (
        <div className="mt-3 h-24 animate-pulse rounded-2xl bg-surface-2" />
      ) : rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nothing scheduled"
            body="Add the things you do in a week, or let VAYVOR place them around your work and sleep."
            action={
              <Link
                to="/plan"
                className="inline-flex min-h-11 items-center rounded-full border border-input px-5 text-sm font-semibold"
              >
                Open the week
              </Link>
            }
          />
        </div>
      ) : (
        <ol className="mt-2">
          {rows.map((r) => {
            const dim =
              r.status === "done" || r.status === "skipped" || r.status === "rest" || r.context;
            const items: { label: string; onSelect: () => void; danger?: boolean }[] = [];
            if (!r.context) {
              if (r.status === "done" && r.blockId && !r.derived)
                items.push({ label: "Mark not done", onSelect: () => void a.undo(r) });
              if (r.status === "done" && r.link.type === "prayer" && r.derived)
                items.push({ label: "Mark not prayed", onSelect: () => void a.undo(r) });
              if (r.status === "skipped" || r.status === "rest")
                items.push({
                  label: r.status === "rest" ? "Undo rest day" : "Undo skip",
                  onSelect: () => void a.undo(r),
                });
              if (
                r.status !== "done" &&
                r.status !== "skipped" &&
                r.status !== "rest" &&
                r.blockId
              ) {
                if (r.link.type !== "prayer")
                  items.push({ label: "Skip today", onSelect: () => void a.skip(r) });
                if (r.kind === "workout" || r.link.type === "workout")
                  items.push({ label: "Rest day", onSelect: () => void a.rest(r) });
                if (r.source === "block")
                  items.push({ label: "Move…", onSelect: () => setMoving(r) });
                if (r.source === "block")
                  items.push({ label: "Pause this activity", onSelect: () => void a.pause(r) });
              }
              if (r.source === "block")
                items.push({
                  label: "Edit in the week",
                  onSelect: () => nav({ to: "/plan" }),
                });
            }
            return (
              <li
                key={r.key}
                className={cn("border-t border-line py-3 first:border-t-0", dim && "opacity-60")}
              >
                <div className="flex items-start gap-3">
                  <span className="w-[5.5rem] shrink-0 pt-0.5 text-sm tnum text-muted-foreground">
                    {timeLabel(r)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium [overflow-wrap:anywhere]">
                      {r.label}
                      {r.continued && (
                        <span className="text-muted-foreground">
                          {" "}
                          (until {to12h(minToHHMM(r.endMin))})
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {!r.context && (
                        <Chip tone={STATUS_TONE[r.status]}>
                          {STATUS_LABEL[r.status]}
                          {r.status === "done" && r.derived ? " · from your record" : ""}
                        </Chip>
                      )}
                      {r.moved && <Chip>Moved</Chip>}
                      {r.conflict && <Chip tone="warn">Overlaps</Chip>}
                    </div>
                  </div>
                  {!r.context &&
                    r.status !== "done" &&
                    r.status !== "skipped" &&
                    r.status !== "rest" &&
                    (r.blockId || r.link.type === "prayer") &&
                    r.link.type !== "meal" &&
                    r.link.type !== "mind" &&
                    r.link.type !== "workout" && (
                      <Button
                        size="sm"
                        onClick={() => void a.done(r)}
                        aria-label={`Mark ${r.label} done`}
                      >
                        <Check className="size-4" />
                        {r.link.type === "prayer" ? "Prayed" : "Done"}
                      </Button>
                    )}
                  {items.length > 0 && (
                    <Menu
                      label={`Options for ${r.label}`}
                      trigger={<MoreHorizontal className="size-5" />}
                      items={items}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <MoveSheet item={moving} date={today} onClose={() => setMoving(null)} />
    </Panel>
  );
}

function MoveSheet({
  item,
  date,
  onClose,
}: {
  item: AgendaItem | null;
  date: ISODate;
  onClose: () => void;
}) {
  const [day, setDay] = useState<ISODate>(date);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const orig = item ? origDate(item, date) : date;
  const dur = item ? item.endMin - item.startMin : 0;
  return (
    <Sheet
      open={!!item}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={item ? `Move ${item.label}` : "Move"}
      description="Only this one occurrence changes. The repeating activity stays as it is."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          busy={busy}
          disabled={!/^\d\d:\d\d$/.test(time || (item ? minToHHMM(item.startMin) : ""))}
          onClick={async () => {
            if (!item?.blockId) return;
            setBusy(true);
            try {
              const start = time || minToHHMM(item.startMin);
              const [h = 0, m = 0] = start.split(":").map(Number);
              await moveOccurrence(item.blockId, orig, {
                toDate: day,
                start,
                end: dur > 0 ? minToHHMM(h * 60 + m + dur) : undefined,
              });
              toast.success("Moved");
              onClose();
            } catch {
              toast.error("Couldn't move it. Nothing was changed; try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Move
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        <Field label="Day">
          <div className="flex flex-wrap gap-2">
            {[date, addDays(date, 1)].map((d, i) => (
              <button
                key={d}
                role="radio"
                aria-checked={day === d}
                onClick={() => setDay(d)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold",
                  day === d ? "border-primary bg-primary text-primary-foreground" : "border-line",
                )}
              >
                {i === 0 ? "Today" : "Tomorrow"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Start time">
          <TextInput
            type="time"
            value={time || (item ? minToHHMM(item.startMin) : "")}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}
