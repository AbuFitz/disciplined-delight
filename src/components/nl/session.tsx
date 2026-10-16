import {
  ChevronDown,
  Flag,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipForward,
  StickyNote,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  CheckButton,
  Field,
  Menu,
  NumberField,
  Panel,
  Segmented,
  Sheet,
  TextArea,
  TextInput,
  ConfirmDialog,
} from "./ui";
import {
  discardSession,
  finishSession,
  pauseSession,
  restRemainingMs,
  resumeSession,
  saveSession,
  sessionElapsedMs,
} from "@/data/actions";
import { newId } from "@/data/db";
import {
  legacyHint,
  placeholderFor,
  previousComparable,
  sessionSummary,
  suggestionFor,
} from "@/data/session-logic";
import type {
  LegacyDayLog,
  Session,
  SessionExercise,
  SessionSet,
  WorkoutTemplate,
} from "@/data/types";
import { formatSet, trackingOf } from "@/domain/tracking";
import { cn } from "@/lib/utils";

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};

const updateEx = (s: Session, id: string, f: (e: SessionExercise) => SessionExercise): Session => ({
  ...s,
  exercises: s.exercises.map((e) => (e.id === id ? f(e) : e)),
});

/* ------------------------------ Rest timer bar ------------------------------ */
export function RestBar({ session, now }: { session: Session; now: number }) {
  const rem = restRemainingMs(session, now);
  const r = session.rest;
  useEffect(() => {
    if (r?.endsAt && rem === 0) {
      navigator.vibrate?.(200);
      void saveSession({ ...session, rest: { ...r, endsAt: null, remainingMs: 0 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rem === 0, r?.endsAt]);
  if (!r) return null;
  const running = r.endsAt != null;
  const done = (rem ?? 0) === 0;
  return (
    <div className="flex items-center gap-2" role="timer" aria-label="Rest timer">
      <Timer className="size-5 shrink-0" aria-hidden />
      <span className={cn("num min-w-[4.2rem] text-2xl font-semibold tnum", done && "text-spring")}>
        {done ? "Go" : fmtClock(rem ?? 0)}
      </span>
      {!done && (
        <>
          <Button
            size="sm"
            variant="secondary"
            aria-label={running ? "Pause rest" : "Resume rest"}
            onClick={() =>
              saveSession({
                ...session,
                rest: running
                  ? { ...r, endsAt: null, remainingMs: rem ?? 0 }
                  : {
                      ...r,
                      endsAt: Date.now() + (r.remainingMs ?? r.durationMs),
                      remainingMs: undefined,
                    },
              })
            }
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              saveSession({
                ...session,
                rest: {
                  ...r,
                  endsAt: (r.endsAt ?? Date.now() + (r.remainingMs ?? 0)) + 15000,
                  remainingMs: running ? undefined : (r.remainingMs ?? 0) + 15000,
                },
              })
            }
          >
            +15s
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => saveSession({ ...session, rest: undefined })}
      >
        <SkipForward className="size-4" />
        {done ? "Dismiss" : "Skip"}
      </Button>
    </div>
  );
}

const startRest = (s: Session, seconds = 90): Session => ({
  ...s,
  rest: { durationMs: seconds * 1000, endsAt: Date.now() + seconds * 1000 },
});

/* ------------------------------ Set row ------------------------------ */
function SetRow({
  ex,
  index,
  set,
  ph,
  onChange,
  showEffort,
  onRemove,
}: {
  ex: SessionExercise;
  index: number;
  set: SessionSet;
  ph: { weightKg?: number; reps?: number; seconds?: number; distanceM?: number };
  onChange: (patch: Partial<SessionSet>, completedNow?: boolean) => void;
  showEffort: boolean;
  onRemove: () => void;
}) {
  const label =
    set.kind === "warmup"
      ? "Warm-up"
      : `Set ${ex.sets.slice(0, index + 1).filter((x) => x.kind === "working").length}`;
  const tr = trackingOf(ex.tracking);
  const canComplete =
    tr === "weight_reps"
      ? (set.weightKg != null || ph.weightKg != null) && (set.reps != null || ph.reps != null)
      : tr === "time"
        ? set.seconds != null || ph.seconds != null
        : tr === "distance_time"
          ? set.seconds != null || set.distanceM != null || ph.seconds != null
          : set.reps != null || ph.reps != null;
  const toggle = (v: boolean) => {
    if (!v) return onChange({ completed: false });
    // Completing with blank fields records the shown suggestion: an explicit tap.
    onChange(
      {
        completed: true,
        skipped: false,
        ...(tr === "weight_reps" ? { weightKg: set.weightKg ?? ph.weightKg } : {}),
        ...(tr === "time" || tr === "distance_time"
          ? { seconds: set.seconds ?? ph.seconds }
          : { reps: set.reps ?? ph.reps }),
      },
      true,
    );
  };
  return (
    <li
      className={cn(
        "rounded-2xl border p-3",
        set.completed ? "border-primary/50 bg-primary/5" : "border-line",
        set.skipped && "opacity-60",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          {label}
          {set.skipped && <Chip>Skipped</Chip>}
          {set.completed && <Chip tone="ok">Done</Chip>}
        </span>
        <Menu
          label={`Options for ${label}`}
          trigger={<MoreHorizontal className="size-5" />}
          items={[
            {
              label: set.kind === "warmup" ? "Count as working set" : "Mark as warm-up",
              onSelect: () => onChange({ kind: set.kind === "warmup" ? "working" : "warmup" }),
            },
            {
              label: set.skipped ? "Unskip set" : "Skip set",
              onSelect: () => onChange({ skipped: !set.skipped, completed: false }),
            },
            { label: "Remove set", danger: true, onSelect: onRemove },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {tr === "weight_reps" && (
          <NumberField
            label={`${label} weight`}
            unit="kg"
            step={ex.incrementKg ?? 2.5}
            decimals={2}
            value={set.weightKg}
            placeholder={ph.weightKg != null ? String(ph.weightKg) : "0"}
            onChange={(v) => onChange({ weightKg: v })}
            className="w-[10.5rem]"
          />
        )}
        {tr === "assisted_reps" && (
          <NumberField
            label={`${label} assistance`}
            unit="kg assist"
            step={2.5}
            decimals={2}
            value={set.assistKg}
            placeholder="0"
            onChange={(v) => onChange({ assistKg: v })}
            className="w-[11.5rem]"
          />
        )}
        {(tr === "time" || tr === "distance_time") && (
          <NumberField
            label={`${label} seconds`}
            unit="sec"
            step={5}
            decimals={0}
            value={set.seconds}
            placeholder={ph.seconds != null ? String(ph.seconds) : "30"}
            onChange={(v) => onChange({ seconds: v })}
            className="w-[9.5rem]"
          />
        )}
        {tr === "distance_time" && (
          <NumberField
            label={`${label} distance`}
            unit="m"
            step={100}
            decimals={0}
            value={set.distanceM}
            placeholder="0"
            onChange={(v) => onChange({ distanceM: v })}
            className="w-[9.5rem]"
          />
        )}
        {tr !== "time" && tr !== "distance_time" && (
          <NumberField
            label={`${label} reps${ex.perSide ? " per side" : ""}`}
            step={1}
            decimals={0}
            value={set.reps}
            placeholder={ph.reps != null ? String(ph.reps) : String(ex.prescription.repMax)}
            onChange={(v) => onChange({ reps: v })}
            className="w-[9.5rem]"
          />
        )}
        <div className="ml-auto">
          <CheckButton
            size="lg"
            label={`${label} done`}
            checked={set.completed}
            onChange={toggle}
          />
        </div>
      </div>
      {!canComplete && !set.completed && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {tr === "weight_reps"
            ? "Enter weight and reps, then tick."
            : tr === "time" || tr === "distance_time"
              ? "Enter the time, then tick."
              : "Enter reps, then tick."}
        </p>
      )}
      {showEffort && (
        <div className="mt-2">
          <Segmented
            label="Reps in reserve"
            value={set.rir == null ? "" : String(set.rir)}
            onChange={(v) => onChange({ rir: Number(v) })}
            options={["0", "1", "2", "3", "4"].map((x) => ({
              value: x,
              label: x === "4" ? "4+" : x,
            }))}
          />
          <span className="ml-2 text-xs text-muted-foreground">RIR</span>
        </div>
      )}
    </li>
  );
}

/* ------------------------------ Exercise card ------------------------------ */
export function ExerciseCard({
  session,
  ex,
  index,
  total,
  open,
  onToggle,
  sessions,
  legacy,
  now: _now,
}: {
  session: Session;
  ex: SessionExercise;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  sessions: Session[];
  legacy: LegacyDayLog[];
  now: number;
}) {
  const [effort, setEffort] = useState(false);
  const [replace, setReplace] = useState(false);
  const [note, setNote] = useState(false);
  const prev = useMemo(
    () => previousComparable(ex, sessions, session.id),
    [ex, sessions, session.id],
  );
  const sug = suggestionFor(ex, prev);
  const old = !prev ? legacyHint(ex, legacy) : null;
  const working = ex.sets.filter((s) => s.kind === "working");
  const doneCount = working.filter((s) => s.completed).length;

  const patchSet = (sid: string, patch: Partial<SessionSet>, completedNow?: boolean) => {
    let next = updateEx(session, ex.id, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)),
    }));
    if (completedNow) next = startRest(next, ex.restSeconds ?? 90);
    void saveSession(next);
  };
  const moveEx = (dir: -1 | 1) => {
    const arr = [...session.exercises];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j]!, arr[index]!];
    void saveSession({ ...session, exercises: arr });
  };

  return (
    <section className="min-w-0 rounded-3xl border border-line bg-surface" aria-label={ex.name}>
      <div className="flex items-center gap-1 pr-2">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-[4.25rem] min-w-0 flex-1 items-center gap-3 px-5 py-3 text-left"
        >
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border text-sm font-semibold tnum",
              doneCount === working.length && working.length > 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input",
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">{ex.name}</span>
            <span className="block text-sm text-muted-foreground tnum">
              {ex.prescription.schemeText} · {doneCount}/{working.length} sets
              {ex.substitutedFrom ? " · substitute" : ""}
            </span>
          </span>
          <ChevronDown className={cn("ml-auto size-5 shrink-0 transition", open && "rotate-180")} />
        </button>
        <Menu
          label={`Options for ${ex.name}`}
          trigger={<MoreHorizontal className="size-5" />}
          items={[
            { label: "Replace exercise", onSelect: () => setReplace(true) },
            { label: "Add note", onSelect: () => setNote(true) },
            {
              label: effort ? "Hide effort (RIR)" : "Track effort (RIR)",
              onSelect: () => setEffort((v) => !v),
            },
            { label: "Move up", disabled: index === 0, onSelect: () => moveEx(-1) },
            { label: "Move down", disabled: index === total - 1, onSelect: () => moveEx(1) },
            {
              label: "Remove from this session",
              danger: true,
              onSelect: () =>
                void saveSession({
                  ...session,
                  exercises: session.exercises.filter((e) => e.id !== ex.id),
                }),
            },
          ]}
        />
      </div>

      {open && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 pb-4">
          {ex.cue && <p className="px-1 text-sm text-muted-foreground">{ex.cue}</p>}
          {ex.note && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <StickyNote className="mr-1.5 inline size-3.5" />
              {ex.note}
            </p>
          )}
          <div className="rounded-2xl bg-surface-2/60 px-3 py-2.5 text-sm">
            {prev ? (
              <p className="tnum">
                <span className="text-muted-foreground">Last time ({prev.date}):</span>{" "}
                {prev.sets.map((s) => formatSet(s, ex.tracking)).join(" · ")}
              </p>
            ) : old ? (
              <p>
                <span className="text-muted-foreground">Original app ({old.date}):</span>{" "}
                {old.weight} kg logged. No sets or reps were recorded then.
              </p>
            ) : (
              <p className="text-muted-foreground">No earlier session for this exercise.</p>
            )}
            {sug.kind === "increase" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip tone="ok">Suggestion</Chip>
                <span>
                  {sug.reason} Try {sug.toKg} kg.
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void saveSession(
                      updateEx(session, ex.id, (e) => ({
                        ...e,
                        sets: e.sets.map((s) =>
                          s.kind === "working" && !s.completed
                            ? { ...s, weightKg: sug.toKg, suggested: true }
                            : s,
                        ),
                      })),
                    )
                  }
                >
                  Use {sug.toKg} kg
                </Button>
              </div>
            )}
            {sug.kind === "hold" && <p className="mt-1.5 text-muted-foreground">{sug.reason}</p>}
            {sug.kind === "none" && prev && (
              <p className="mt-1.5 text-muted-foreground">{sug.reason}</p>
            )}
          </div>
          <ul className="grid gap-2">
            {ex.sets.map((s, i) => (
              <SetRow
                key={s.id}
                ex={ex}
                index={i}
                set={s}
                ph={placeholderFor(ex, i, prev)}
                showEffort={effort}
                onChange={(p, c) => patchSet(s.id, p, c)}
                onRemove={() =>
                  void saveSession(
                    updateEx(session, ex.id, (e) => ({
                      ...e,
                      sets: e.sets.filter((x) => x.id !== s.id),
                    })),
                  )
                }
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void saveSession(
                  updateEx(session, ex.id, (e) => ({
                    ...e,
                    sets: [...e.sets, { id: newId(), kind: "working", completed: false }],
                  })),
                )
              }
            >
              <Plus className="size-4" />
              Add set
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void saveSession(
                  updateEx(session, ex.id, (e) => ({
                    ...e,
                    sets: [{ id: newId(), kind: "warmup", completed: false }, ...e.sets],
                  })),
                )
              }
            >
              Add warm-up
            </Button>
          </div>
        </div>
      )}

      <ReplaceSheet
        open={replace}
        onOpenChange={setReplace}
        ex={ex}
        onReplace={(name) => {
          void saveSession(
            updateEx(session, ex.id, (e) => ({
              ...e,
              name,
              substitutedFrom: e.substitutedFrom ?? e.name,
              templateExerciseId: undefined,
            })),
          );
          setReplace(false);
          toast.success(`Replaced for this session only`);
        }}
      />
      <NoteSheet
        open={note}
        onOpenChange={setNote}
        value={ex.note ?? ""}
        onSave={(v) => {
          void saveSession(updateEx(session, ex.id, (e) => ({ ...e, note: v || undefined })));
          setNote(false);
        }}
      />
    </section>
  );
}

function ReplaceSheet({
  open,
  onOpenChange,
  ex,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ex: SessionExercise;
  onReplace: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const alt = ex.alternative;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Replace exercise"
      description="Applies to this session only. Your programme template isn't changed."
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => onReplace(name.trim())}
        >
          Replace
        </Button>
      }
    >
      <div className="grid gap-4 pb-2">
        {alt && (
          <Button variant="secondary" onClick={() => onReplace(alt)}>
            <Repeat className="size-4" />
            Use {alt}
          </Button>
        )}
        <Field label="Exercise name" htmlFor="rep-name">
          <TextInput
            id="rep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cable Chest Press"
          />
        </Field>
      </div>
    </Sheet>
  );
}
function NoteSheet({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (open) setV(value);
  }, [open, value]);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Exercise note"
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={() => onSave(v.trim())}>
          Save note
        </Button>
      }
    >
      <div className="pb-2">
        <TextArea
          aria-label="Note"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Seat position, how it felt…"
        />
      </div>
    </Sheet>
  );
}

/* ------------------------------ Session header + finish ------------------------------ */
export function SessionHeader({ session, now }: { session: Session; now: number }) {
  const paused = session.status === "paused";
  return (
    <Panel tone="green" className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow !text-foreground/70">
            Workout {session.templateLetter}
            {paused ? " · Paused" : ""}
          </p>
          <h1 className="display-title text-3xl md:text-4xl">{session.templateName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-3xl font-semibold tnum" role="timer" aria-label="Session time">
            {fmtClock(sessionElapsedMs(session, now))}
          </span>
          <Button
            variant="secondary"
            onClick={() => (paused ? resumeSession(session) : pauseSession(session))}
          >
            {paused ? (
              <>
                <Play className="size-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="size-4" />
                Pause
              </>
            )}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function FinishSheet({
  open,
  onOpenChange,
  session,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: Session;
  onDone: () => void;
}) {
  const sum = sessionSummary(session);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const all = sum.planned > 0 && sum.completed >= sum.planned;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Finish session"
      description="Choose how this session is recorded. Nothing you've logged is lost either way."
    >
      <div className="grid gap-4 pb-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            [`${sum.completed}/${sum.planned}`, "working sets"],
            [`${sum.exercisesTouched}/${sum.exerciseCount}`, "exercises"],
            [`${sum.volume.toLocaleString("en-GB")}`, "kg logged volume"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-surface-2/60 p-3">
              <dt className="eyebrow order-2 mt-1">{l}</dt>
              <dd className="num text-2xl font-semibold tnum">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          {all
            ? "All planned working sets are logged."
            : `${sum.planned - sum.completed} planned working sets aren't logged. You can still complete the workout, or end early to record it as partial.`}{" "}
          Volume counts only sets with both weight and reps.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={async () => {
            await finishSession(session, "completed");
            onOpenChange(false);
            toast.success("Workout completed");
            onDone();
          }}
        >
          <Flag className="size-4" />
          Complete workout
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await finishSession(session, "ended-early");
            onOpenChange(false);
            toast("Saved as a partial session");
            onDone();
          }}
        >
          End early (partial)
        </Button>
        <Button variant="danger" onClick={() => setConfirmDiscard(true)}>
          Discard session
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this session?"
        confirmLabel="Discard"
        body="Everything logged in this session will be removed. This can't be undone from the app."
        onConfirm={async () => {
          await discardSession(session.id);
          onOpenChange(false);
          onDone();
        }}
      />
    </Sheet>
  );
}

export type { WorkoutTemplate };
