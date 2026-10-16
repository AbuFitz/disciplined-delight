import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, Field, Sheet, Switch, TextInput } from "@/components/nl/ui";
import { useSalahEnabled } from "@/data/agenda";
import { applyBatch, newId } from "@/data/db";
import { useCollection } from "@/data/hooks";
import { usePrayer } from "@/data/prayer-hooks";
import { scopeGeneration } from "@/data/scope";
import { COL, type RoutineBlock } from "@/data/types";
import { addDays, startOfWeek, to12h, WEEKDAY_SHORT } from "@/domain/dates";
import { DAY_PARTS, planRoutine, type ActivitySpec, type Link } from "@/domain/routine";
import { cn } from "@/lib/utils";

type Preset = {
  key: string;
  label: string;
  kind: RoutineBlock["kind"];
  link: Link;
  durationMin: number;
  part: keyof typeof DAY_PARTS;
  weekdays: number[];
  needsSalah?: boolean;
};
const ALL = [0, 1, 2, 3, 4, 5, 6];
const PRESETS: Preset[] = [
  {
    key: "checkin",
    label: "Mind check-in",
    kind: "mind",
    link: { type: "mind", kind: "checkin" },
    durationMin: 5,
    part: "evening",
    weekdays: ALL,
  },
  {
    key: "reflect",
    label: "Evening reflection",
    kind: "mind",
    link: { type: "mind", kind: "reflection" },
    durationMin: 10,
    part: "evening",
    weekdays: ALL,
  },
  {
    key: "focus",
    label: "Focus block",
    kind: "mind",
    link: { type: "mind", kind: "focus" },
    durationMin: 45,
    part: "morning",
    weekdays: [0, 1, 2, 3, 4],
  },
  {
    key: "walk",
    label: "Walk",
    kind: "personal",
    link: { type: "manual" },
    durationMin: 30,
    part: "afternoon",
    weekdays: ALL,
  },
  {
    key: "prep",
    label: "Meal prep",
    kind: "meal-prep",
    link: { type: "manual" },
    durationMin: 60,
    part: "afternoon",
    weekdays: [6],
  },
  {
    key: "quran",
    label: "Qur'an and dhikr",
    kind: "soul",
    link: { type: "manual" },
    durationMin: 10,
    part: "morning",
    weekdays: ALL,
    needsSalah: true,
  },
];
const PART_LABEL: Record<keyof typeof DAY_PARTS, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
};

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

/** Build a routine around the person's real sleep, work and prayer times. Nothing is placed over them. */
export function RoutineBuilder({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const blocks = useCollection<RoutineBlock>(COL.routine);
  const salah = useSalahEnabled();
  const prayer = usePrayer(Date.now());
  const live = blocks.items.filter((b) => !b.archivedAt);
  const sleepB = live.find((b) => b.kind === "sleep");
  const workB = live.find((b) => b.kind === "work");
  const [bed, setBed] = useState(sleepB?.start ?? "22:30");
  const [wake, setWake] = useState(sleepB?.end ?? "06:30");
  const [hasWork, setHasWork] = useState(!!workB || !sleepB);
  const [workDays, setWorkDays] = useState<number[]>(workB?.weekdays ?? [0, 1, 2, 3, 4]);
  const [ws, setWs] = useState(workB?.start ?? "09:00");
  const [we, setWe] = useState(workB?.end ?? "17:00");
  const [on, setOn] = useState<
    Record<string, { on: boolean; mins: number; part: keyof typeof DAY_PARTS; days: number[] }>
  >(() =>
    Object.fromEntries(
      PRESETS.map((p) => [
        p.key,
        {
          on: ["checkin", "reflect"].includes(p.key),
          mins: p.durationMin,
          part: p.part,
          days: p.weekdays,
        },
      ]),
    ),
  );
  const [step, setStep] = useState<"day" | "fit" | "preview">("day");
  const [busy, setBusy] = useState(false);

  const base = startOfWeek(prayer.today);
  const refDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(base, i)), [base]);

  const dayBlocks = useMemo(() => {
    const keep = live.filter((b) => b.kind !== "sleep" && b.kind !== "work");
    const sleep: RoutineBlock = {
      id: sleepB?.id ?? newId(),
      label: "Sleep",
      kind: "sleep",
      start: bed,
      end: wake,
      weekdays: ALL,
      order: sleepB?.order ?? 0,
    };
    const work: RoutineBlock | null = hasWork
      ? {
          id: workB?.id ?? newId(),
          label: "Work",
          kind: "work",
          start: ws,
          end: we,
          weekdays: workDays,
          order: workB?.order ?? 1,
        }
      : null;
    return { keep, sleep, work };
  }, [live, sleepB, workB, bed, wake, hasWork, workDays, ws, we]);

  const specs: ActivitySpec[] = PRESETS.filter(
    (p) => on[p.key]?.on && (!p.needsSalah || salah.enabled),
  ).map((p) => ({
    label: p.label,
    kind: p.kind,
    link: p.link,
    durationMin: on[p.key]!.mins,
    prefer: DAY_PARTS[on[p.key]!.part],
    weekdays: on[p.key]!.days,
  }));

  const result = useMemo(
    () =>
      step === "preview"
        ? planRoutine({
            existing: [
              ...dayBlocks.keep,
              dayBlocks.sleep,
              ...(dayBlocks.work ? [dayBlocks.work] : []),
            ] as never[],
            specs,
            refDates,
            prayerStart: salah.enabled
              ? (d) => {
                  const day = prayer.lookup(d);
                  return day ? (p) => day.start[p] : undefined;
                }
              : undefined,
            mkId: newId,
            firstOrder: blocks.items.length + 2,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, dayBlocks, JSON.stringify(specs), refDates, salah.enabled],
  );

  const save = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const ops = [
        {
          collection: COL.routine,
          id: dayBlocks.sleep.id,
          op: "put" as const,
          data: dayBlocks.sleep,
        },
        ...(dayBlocks.work
          ? [
              {
                collection: COL.routine,
                id: dayBlocks.work.id,
                op: "put" as const,
                data: dayBlocks.work,
              },
            ]
          : []),
        ...result.placed.map((b) => ({
          collection: COL.routine,
          id: b.id,
          op: "put" as const,
          data: b,
        })),
      ];
      await applyBatch(ops, { generation: scopeGeneration() });
      toast.success(
        `${result.placed.length} activit${result.placed.length === 1 ? "y" : "ies"} added to your week`,
      );
      onOpenChange(false);
      setStep("day");
    } catch {
      toast.error("Couldn't save your routine. Nothing was changed; try again.");
    } finally {
      setBusy(false);
    }
  };

  const dayPill = (days: number[], set: (d: number[]) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAY_SHORT.map((d, i) => {
        const sel = days.includes(i);
        return (
          <button
            key={d}
            role="checkbox"
            aria-checked={sel}
            onClick={() => set(sel ? days.filter((x) => x !== i) : [...days, i].sort())}
            className={cn(
              "min-h-11 min-w-12 rounded-full border px-3 text-sm font-medium",
              sel ? "border-primary bg-primary text-primary-foreground" : "border-input",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Build my routine"
      description="Fits things around your real sleep, work and prayer times. You can edit everything afterwards."
      wide
      footer={
        <div className="flex gap-2">
          {step !== "day" && (
            <Button onClick={() => setStep(step === "preview" ? "fit" : "day")}>Back</Button>
          )}
          {step === "day" && (
            <Button variant="primary" className="flex-1" onClick={() => setStep("fit")}>
              Next: what to fit in
            </Button>
          )}
          {step === "fit" && (
            <Button
              variant="primary"
              className="flex-1"
              disabled={specs.length === 0}
              onClick={() => setStep("preview")}
            >
              See where they fit
            </Button>
          )}
          {step === "preview" && (
            <Button
              variant="primary"
              className="flex-1"
              busy={busy}
              disabled={!result}
              onClick={() => void save()}
            >
              Add to my week
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-5 pb-3">
        {step === "day" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedtime">
                <TextInput type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
              </Field>
              <Field label="Wake up">
                <TextInput type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
              </Field>
            </div>
            <Switch label="I work set hours" checked={hasWork} onChange={setHasWork} />
            {hasWork && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Work starts">
                    <TextInput type="time" value={ws} onChange={(e) => setWs(e.target.value)} />
                  </Field>
                  <Field label="Work ends">
                    <TextInput type="time" value={we} onChange={(e) => setWe(e.target.value)} />
                  </Field>
                </div>
                <fieldset>
                  <legend className="mb-1 text-sm font-medium">Work days</legend>
                  {dayPill(workDays, setWorkDays)}
                </fieldset>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Used only to avoid placing things over these hours.{" "}
              {salah.enabled ? "Prayer times are avoided too." : ""}
            </p>
          </>
        )}
        {step === "fit" && (
          <ul className="grid gap-3">
            {PRESETS.filter((p) => !p.needsSalah || salah.enabled).map((p) => {
              const s = on[p.key]!;
              const set = (patch: Partial<typeof s>) =>
                setOn((o) => ({ ...o, [p.key]: { ...s, ...patch } }));
              return (
                <li key={p.key} className="rounded-2xl border border-line p-3">
                  <Switch label={p.label} checked={s.on} onChange={(v) => set({ on: v })} />
                  {s.on && (
                    <div className="mt-2 grid gap-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <Field label="Minutes">
                          <TextInput
                            type="number"
                            inputMode="numeric"
                            min={5}
                            max={180}
                            step={5}
                            value={s.mins}
                            onChange={(e) =>
                              set({ mins: Math.max(5, Math.min(180, Number(e.target.value) || 5)) })
                            }
                            className="w-28"
                          />
                        </Field>
                        <div
                          role="radiogroup"
                          aria-label={`${p.label}: part of the day`}
                          className="flex flex-wrap gap-1.5"
                        >
                          {(Object.keys(DAY_PARTS) as (keyof typeof DAY_PARTS)[]).map((k) => (
                            <button
                              key={k}
                              role="radio"
                              aria-checked={s.part === k}
                              onClick={() => set({ part: k })}
                              className={cn(
                                "min-h-11 rounded-full border px-3 text-sm",
                                s.part === k
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-line",
                              )}
                            >
                              {PART_LABEL[k]}
                            </button>
                          ))}
                        </div>
                      </div>
                      {dayPill(s.days, (d) => set({ days: d }))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {step === "preview" && result && (
          <>
            {result.placed.length > 0 && (
              <ul className="grid gap-2" aria-label="Placed">
                {result.placed.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line p-3"
                  >
                    <div>
                      <p className="font-medium">{b.label}</p>
                      <p className="text-sm text-muted-foreground tnum">
                        {to12h(b.start)}
                        {b.end ? `–${to12h(b.end)}` : ""} ·{" "}
                        {b.weekdays.map((d) => WEEKDAY_SHORT[d]).join(", ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {result.unplaced.length > 0 && (
              <div className="rounded-2xl border border-warn/60 p-3" role="status">
                <p className="font-semibold">Couldn't fit</p>
                <ul className="mt-1 grid gap-2 text-sm">
                  {result.unplaced.map((u) => (
                    <li key={u.spec.label}>
                      <strong>{u.spec.label}</strong>: {u.reason}{" "}
                      {u.fitsOn.length ? (
                        <>
                          It would fit on {u.fitsOn.map((d) => WEEKDAY_SHORT[d]).join(", ")}. Go
                          back and keep just those days, or shorten it.
                        </>
                      ) : (
                        <>Try fewer minutes or another part of the day.</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.placed.length === 0 && result.unplaced.length === 0 && (
              <Chip>Nothing selected</Chip>
            )}
            <p className="text-xs text-muted-foreground">
              Sleep and work hours are saved too, so the next routine can avoid them.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
