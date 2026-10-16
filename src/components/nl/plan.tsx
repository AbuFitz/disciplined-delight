import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  ConfirmDialog,
  Field,
  NumberField,
  Segmented,
  Select,
  Sheet,
  Switch,
  TextInput,
} from "./ui";
import { startSession } from "@/data/actions";
import { newId, put } from "@/data/db";
import { COL, type RoutineBlock, type RoutineException, type WorkoutTemplate } from "@/data/types";
import { addDays, formatDateLong, WEEKDAY_SHORT, type ISODate } from "@/domain/dates";
import { usePrayer } from "@/data/prayer-hooks";
import { PRAYER_LABEL, PRAYERS, type PrayerName } from "@/domain/prayer";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

const KINDS: { value: RoutineBlock["kind"]; label: string }[] = [
  { value: "routine", label: "Routine" },
  { value: "workout", label: "Workout" },
  { value: "meal", label: "Meal" },
  { value: "meal-prep", label: "Meal prep" },
  { value: "mind", label: "Mind" },
  { value: "soul", label: "Soul" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work (context)" },
  { value: "sleep", label: "Sleep (context)" },
];

type LinkKey = "manual" | "workout" | "meal" | "checkin" | "reflection" | "focus" | PrayerName;
const linkKey = (l: RoutineBlock["link"]): LinkKey =>
  !l || l.type === "manual"
    ? "manual"
    : l.type === "prayer"
      ? l.prayer
      : l.type === "mind"
        ? l.kind
        : l.type;
const keyToLink = (k: LinkKey): RoutineBlock["link"] =>
  k === "manual"
    ? { type: "manual" }
    : k === "workout" || k === "meal"
      ? { type: k }
      : k === "checkin" || k === "reflection" || k === "focus"
        ? { type: "mind", kind: k }
        : { type: "prayer", prayer: k };

/** Edit a recurring block. When opened from a date, a single occurrence can be skipped or moved without changing the series. */
export function BlockSheet({
  block,
  date,
  onClose,
  count,
}: {
  block: Partial<RoutineBlock> | null;
  date?: ISODate;
  onClose: () => void;
  count: number;
}) {
  const [b, setB] = useState<Partial<RoutineBlock>>({});
  const [scope, setScope] = useState<"day" | "series">("series");
  const [oStart, setOStart] = useState("");
  const [oEnd, setOEnd] = useState("");
  const [archive, setArchive] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const key = block ? (block.id ?? "new") : null;
  if (key !== seen) {
    setSeen(key);
    if (block) {
      setB(block);
      setScope(date && block.id ? "day" : "series");
      setOStart(block.start ?? "");
      setOEnd(block.end ?? "");
    }
  }
  const isNew = !block?.id;
  const set = (p: Partial<RoutineBlock>) => setB((o) => ({ ...o, ...p }));
  const rel = b.relativeTo;

  const saveSeries = async () => {
    const id = b.id ?? newId();
    const out = {
      ...({
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        kind: "routine",
        start: "09:00",
        label: "",
        order: count,
      } as RoutineBlock),
      ...b,
      id,
    } as RoutineBlock;
    out.label = out.label.trim();
    await put(COL.routine, id, out);
    toast.success(isNew ? "Block added" : "Series updated");
    onClose();
  };
  const saveDay = async (kind: "skip" | "move" | "rest") => {
    const ex: RoutineException = {
      id: `${b.id}:${date}`,
      blockId: b.id!,
      date: date!,
      kind: kind === "move" ? "move" : "skip",
      reason: kind === "rest" ? "rest" : kind === "skip" ? "skip" : undefined,
      start: kind === "move" ? oStart : undefined,
      end: kind === "move" ? oEnd || undefined : undefined,
    };
    await put(COL.routineExceptions, ex.id, ex);
    toast.success(
      kind === "move"
        ? "Moved for this day"
        : kind === "rest"
          ? "Marked as a rest day"
          : "Skipped for this day",
    );
    onClose();
  };

  const occurrenceMode = !isNew && !!date;
  return (
    <Sheet
      open={!!block}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Add a block" : b.label || "Block"}
      description={occurrenceMode ? formatDateLong(date!) : undefined}
      footer={
        scope === "day" && occurrenceMode ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => saveDay("skip")}>
              Skip
            </Button>
            <Button variant="secondary" onClick={() => saveDay("rest")}>
              Rest day
            </Button>
            <Button
              className="flex-1"
              variant="primary"
              disabled={!oStart}
              onClick={() => saveDay("move")}
            >
              Move this day
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="danger" onClick={() => setArchive(true)}>
                Archive
              </Button>
            )}
            <Button
              className="flex-1"
              variant="primary"
              disabled={!b.label?.trim() || !(b.weekdays?.length ?? 7)}
              onClick={saveSeries}
            >
              {isNew ? "Add block" : "Save series"}
            </Button>
          </div>
        )
      }
    >
      <div className="grid gap-4 pb-3">
        {occurrenceMode && (
          <Segmented
            label="What to change"
            value={scope}
            onChange={setScope}
            options={[
              { value: "day", label: "This day only" },
              { value: "series", label: "Every time" },
            ]}
          />
        )}
        {scope === "day" && occurrenceMode ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="o-s">
              <TextInput
                id="o-s"
                type="time"
                value={oStart}
                onChange={(e) => setOStart(e.target.value)}
              />
            </Field>
            <Field label="Ends" htmlFor="o-e">
              <TextInput
                id="o-e"
                type="time"
                value={oEnd}
                onChange={(e) => setOEnd(e.target.value)}
              />
            </Field>
            <p className="col-span-2 text-xs text-muted-foreground">
              Only {formatDateLong(date!)} changes. The recurring block stays as it is.
            </p>
          </div>
        ) : (
          <>
            <Field label="Name" htmlFor="b-l">
              <TextInput
                id="b-l"
                value={b.label ?? ""}
                onChange={(e) => set({ label: e.target.value })}
              />
            </Field>
            <Field label="Notes (optional)" htmlFor="b-d">
              <TextInput
                id="b-d"
                value={b.detail ?? ""}
                onChange={(e) => set({ detail: e.target.value })}
              />
            </Field>
            <Field label="Type" htmlFor="b-k">
              <Select
                id="b-k"
                value={b.kind ?? "routine"}
                onChange={(e) => set({ kind: e.target.value as RoutineBlock["kind"] })}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            {b.kind !== "work" && b.kind !== "sleep" && (
              <Field
                label="Counts as done when"
                hint="Linked activities complete themselves when you log the real thing, so there is nothing separate to tick."
                htmlFor="b-link"
              >
                <Select
                  id="b-link"
                  value={linkKey(b.link)}
                  onChange={(e) => set({ link: keyToLink(e.target.value as LinkKey) })}
                >
                  <option value="manual">I tick it off myself</option>
                  <option value="workout">A workout is finished</option>
                  <option value="meal">A meal is logged</option>
                  <option value="checkin">I save a Mind check-in</option>
                  <option value="reflection">I save a reflection</option>
                  <option value="focus">I finish a focus session</option>
                  {PRAYERS.map((p) => (
                    <option key={p} value={p}>
                      {PRAYER_LABEL[p]} is logged as prayed
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Repeats on</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_SHORT.map((d, i) => {
                  const on = (b.weekdays ?? [0, 1, 2, 3, 4, 5, 6]).includes(i);
                  return (
                    <button
                      key={d}
                      aria-pressed={on}
                      onClick={() => {
                        const cur = b.weekdays ?? [0, 1, 2, 3, 4, 5, 6];
                        set({ weekdays: on ? cur.filter((x) => x !== i) : [...cur, i].sort() });
                      }}
                      className={cn(
                        "min-h-11 min-w-12 rounded-full border px-3 text-sm font-medium",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {!isNew && <PauseControl b={b} set={set} />}
            <Switch
              label="Time relative to a prayer"
              hint="Follows the prayer through the year, like 40 minutes before Fajr."
              checked={!!rel}
              onChange={(v) =>
                set({ relativeTo: v ? { prayer: "fajr", offsetMinutes: -30 } : undefined })
              }
            />
            {rel ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prayer" htmlFor="b-p">
                  <Select
                    id="b-p"
                    value={rel.prayer}
                    onChange={(e) =>
                      set({ relativeTo: { ...rel, prayer: e.target.value as PrayerName } })
                    }
                  >
                    {PRAYERS.map((p) => (
                      <option key={p} value={p}>
                        {PRAYER_LABEL[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Minutes (− before, + after)">
                  <NumberField
                    label="Offset minutes"
                    min={-240}
                    max={240}
                    step={5}
                    decimals={0}
                    value={rel.offsetMinutes}
                    onChange={(v) => set({ relativeTo: { ...rel, offsetMinutes: v ?? 0 } })}
                  />
                </Field>
                <Field
                  label="Length (optional)"
                  hint="Set an end time to give it a length."
                  htmlFor="b-len"
                >
                  <TextInput
                    id="b-len"
                    type="time"
                    value={b.end ?? ""}
                    onChange={(e) => set({ end: e.target.value || undefined, start: "00:00" })}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts" htmlFor="b-s">
                  <TextInput
                    id="b-s"
                    type="time"
                    value={b.start ?? ""}
                    onChange={(e) => set({ start: e.target.value })}
                  />
                </Field>
                <Field label="Ends (optional)" htmlFor="b-e">
                  <TextInput
                    id="b-e"
                    type="time"
                    value={b.end ?? ""}
                    onChange={(e) => set({ end: e.target.value || undefined })}
                  />
                </Field>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={archive}
        onOpenChange={setArchive}
        tone="primary"
        title="Archive this block?"
        body="It leaves your week. Past records and the block itself are kept."
        confirmLabel="Archive"
        onConfirm={async () => {
          await put(COL.routine, b.id!, {
            ...(b as RoutineBlock),
            archivedAt: new Date().toISOString(),
          });
          setArchive(false);
          onClose();
          toast("Archived");
        }}
      />
    </Sheet>
  );
}

/** Change a workout's weekday/time for the future, or do it today instead; history is never touched. */
export function WorkoutSheet({
  tpl,
  date,
  today,
  onClose,
  done,
}: {
  tpl: WorkoutTemplate | null;
  date: ISODate;
  today: ISODate;
  onClose: () => void;
  done: boolean;
}) {
  const nav = useNavigate();
  const [wd, setWd] = useState<number | null>(tpl?.weekday ?? null);
  const [time, setTime] = useState(tpl?.time ?? "");
  const [seen, setSeen] = useState<string | null>(null);
  if ((tpl?.id ?? null) !== seen) {
    setSeen(tpl?.id ?? null);
    setWd(tpl?.weekday ?? null);
    setTime(tpl?.time ?? "");
  }
  return (
    <Sheet
      open={!!tpl}
      onOpenChange={(o) => !o && onClose()}
      title={tpl ? `Workout ${tpl.letter}: ${tpl.title}` : ""}
      description={formatDateLong(date)}
      footer={
        tpl && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={async () => {
              await put(COL.templates, tpl.id, { ...tpl, weekday: wd, time: time || undefined });
              toast.success("Schedule updated for future weeks");
              onClose();
            }}
          >
            Save schedule
          </Button>
        )
      }
    >
      {tpl && (
        <div className="grid gap-4 pb-3">
          {!done && date <= today && (
            <Button
              variant="secondary"
              onClick={async () => {
                await startSession(tpl, today);
                onClose();
                nav({ to: "/train/session" });
              }}
            >
              {date < today ? "Do it today instead" : "Start now"}
            </Button>
          )}
          <Field
            label="Weekday"
            hint="Changes future weeks only. Sessions you've already done keep their date."
            htmlFor="w-d"
          >
            <Select
              id="w-d"
              value={wd ?? ""}
              onChange={(e) => setWd(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">Not scheduled</option>
              {WEEKDAY_SHORT.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Usual start time (optional)" htmlFor="w-t">
            <TextInput
              id="w-t"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
      )}
    </Sheet>
  );
}

/** Pause a series without losing it, and resume it again. Pausing never deletes past records. */
function PauseControl({
  b,
  set,
}: {
  b: Partial<RoutineBlock>;
  set: (p: Partial<RoutineBlock>) => void;
}) {
  const today = usePrayer(Date.now()).today;
  const paused =
    !!b.pausedFrom && (b.pausedUntil == null || b.pausedUntil > today) && b.pausedFrom <= today;
  const scheduled = !!b.pausedFrom && !paused && b.pausedFrom > today;
  return (
    <fieldset className="rounded-2xl border border-line p-3">
      <legend className="px-1 text-sm font-medium">Pause</legend>
      {paused || scheduled ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            {paused ? "Paused" : "Pauses"} from {b.pausedFrom}
            {b.pausedUntil ? ` until ${b.pausedUntil}` : " until you resume"}.
          </p>
          <Button size="sm" onClick={() => set({ pausedFrom: undefined, pausedUntil: undefined })}>
            Resume
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Hide it from your days for a while, without deleting it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => set({ pausedFrom: today, pausedUntil: null })}>
              Pause until I resume
            </Button>
            <Button
              size="sm"
              onClick={() => set({ pausedFrom: today, pausedUntil: addDays(today, 7) })}
            >
              Pause for a week
            </Button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Choose "Save series" to apply.</p>
    </fieldset>
  );
}
