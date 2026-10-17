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
import type { MediaItem } from "@/domain/catalogue";
import { ExerciseMedia } from "./exercise-media";
import { suggestAdaptation, type AdaptationSuggestion } from "@/domain/adaptation";
import { VIcon } from "./icon";
import { BuddyGuide } from "./buddy-guide";
import { livePersonalRecord, plateBreakdown, warmupRamp } from "@/domain/training-tools";

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
const removeLastWorking = (sets: SessionSet[]) => {
  let target = -1;
  for (let index = sets.length - 1; index >= 0; index--) {
    if (sets[index]?.kind === "working") {
      target = index;
      break;
    }
  }
  return target < 0 ? sets : sets.filter((_, index) => index !== target);
};
const keepWorking = (sets: SessionSet[], count: number) => {
  let seen = 0;
  return sets.filter((set) => set.kind !== "working" || seen++ < count);
};
const applyReadinessPlaceholder = (
  placeholder: { weightKg?: number; reps?: number; seconds?: number; distanceM?: number },
  session: Session,
) =>
  session.readiness?.decision === "accepted" &&
  session.readiness.suggestion === "lower_load" &&
  placeholder.weightKg != null
    ? { ...placeholder, weightKg: Math.round(placeholder.weightKg * 0.9 * 2) / 2 }
    : placeholder;

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
      <VIcon name="timer" />
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
            <VIcon name={running ? "pause" : "play"} size={16} />
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
        <VIcon name="skip" size={16} />
        {done ? "Dismiss" : "Skip"}
      </Button>
    </div>
  );
}

/* ------------------------------ Gym mode ------------------------------ */
export function GymMode({
  session,
  sessions,
  now,
  mediaFor,
  preferences,
  music,
  wake,
  onExit,
  onFinish,
}: {
  session: Session;
  sessions: Session[];
  now: number;
  mediaFor: (exercise: SessionExercise) => MediaItem | undefined;
  preferences: { voice: boolean; haptics: boolean; autoMedia: boolean; livePulse?: boolean };
  music?: { provider: "spotify" | "apple"; url: string };
  wake: { status: "off" | "active" | "unavailable" | "denied"; retry: () => void };
  onExit: () => void;
  onFinish: () => void;
}) {
  const firstPending = session.exercises.findIndex((exercise) =>
    exercise.sets.some((set) => set.kind !== "warmup" && !set.completed && !set.skipped),
  );
  const [index, setExerciseIndex] = useState(Math.max(0, firstPending));
  const [showMedia, setShowMedia] = useState(preferences.autoMedia);
  const [lastCompleted, setLastCompleted] = useState<{ exerciseId: string; setId: string } | null>(
    null,
  );
  const [note, setNote] = useState(false);
  const [replace, setReplace] = useState(false);
  const exercise = session.exercises[Math.min(index, session.exercises.length - 1)]!;
  const pendingIndex = exercise.sets.findIndex((set) => !set.completed && !set.skipped);
  const currentSetIndex = pendingIndex >= 0 ? pendingIndex : Math.max(0, exercise.sets.length - 1);
  const set = exercise.sets[currentSetIndex]!;
  const previous = previousComparable(exercise, sessions, session.id);
  const placeholder = placeholderFor(exercise, currentSetIndex, previous);
  const nextExercise = session.exercises[index + 1];
  const media = mediaFor(exercise);
  useEffect(() => {
    if (pendingIndex < 0 && index < session.exercises.length - 1) {
      setExerciseIndex(index + 1);
      setShowMedia(preferences.autoMedia);
    }
  }, [pendingIndex, index, session.exercises.length, preferences.autoMedia]);
  const patch = (change: Partial<SessionSet>) =>
    saveSession(
      updateEx(session, exercise.id, (item) => ({
        ...item,
        sets: item.sets.map((entry) => (entry.id === set.id ? { ...entry, ...change } : entry)),
      })),
    );
  const complete = async () => {
    const next = startRest(
      updateEx(session, exercise.id, (item) => ({
        ...item,
        sets: item.sets.map((entry) =>
          entry.id === set.id
            ? {
                ...entry,
                completed: true,
                skipped: false,
                weightKg: entry.weightKg ?? placeholder.weightKg,
                reps: entry.reps ?? placeholder.reps,
                seconds: entry.seconds ?? placeholder.seconds,
              }
            : entry,
        ),
      })),
      exercise.restSeconds ?? 90,
    );
    await saveSession(next);
    setLastCompleted({ exerciseId: exercise.id, setId: set.id });
    if (preferences.haptics && navigator.vibrate) navigator.vibrate(80);
    if (preferences.voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(
        new SpeechSynthesisUtterance(`Set complete. Rest ${exercise.restSeconds ?? 90} seconds.`),
      );
    }
  };
  const undo = async () => {
    if (!lastCompleted) return;
    await saveSession({
      ...updateEx(session, lastCompleted.exerciseId, (item) => ({
        ...item,
        sets: item.sets.map((entry) =>
          entry.id === lastCompleted.setId ? { ...entry, completed: false } : entry,
        ),
      })),
      rest: undefined,
    });
    setLastCompleted(null);
  };

  if (session.rest) {
    return (
      <div className="gym-mode mx-auto min-h-[calc(100dvh-9rem)] max-w-3xl border-x border-line px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button onClick={onExit} className="min-h-11 text-sm font-semibold">
            Exit heads-up
          </button>
          {lastCompleted && (
            <Button size="sm" variant="ghost" onClick={() => void undo()}>
              Undo set
            </Button>
          )}
        </div>
        <p className="eyebrow mt-12 text-center">Rest interval</p>
        <div className="mt-5 flex justify-center">
          <RestBar session={session} now={now} />
        </div>
        <div className="mx-auto mt-12 max-w-md border-t border-line pt-5 text-center">
          <p className="eyebrow">Next</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {pendingIndex >= 0 ? exercise.name : (nextExercise?.name ?? "Finish the session")}
          </p>
        </div>
        <div className="mx-auto mt-6 max-w-md text-left">
          <BuddyGuide
            compact
            event={{
              kind: "rest",
              seconds: Math.round(session.rest.durationMs / 1000),
              next: pendingIndex >= 0 ? exercise.name : (nextExercise?.name ?? "finish"),
            }}
          />
        </div>
        {music && (
          <a
            href={music.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mx-auto mt-8 flex min-h-12 w-fit items-center gap-2 border-b border-line px-2 text-sm font-semibold"
          >
            <VIcon name={music.provider === "spotify" ? "spotify" : "appleMusic"} />
            Open {music.provider === "spotify" ? "Spotify" : "Apple Music"}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="gym-mode mx-auto min-h-[calc(100dvh-9rem)] max-w-4xl border-x border-line px-3 py-4 sm:px-8">
      <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <button onClick={onExit} className="min-h-11 text-sm font-semibold">
          Exit heads-up
        </button>
        <div className="text-right text-xs text-muted-foreground">
          <p>Screen: {wake.status}</p>
          {(wake.status === "denied" || wake.status === "off") && (
            <button className="underline" onClick={wake.retry}>
              Retry wake lock
            </button>
          )}
          {wake.status === "unavailable" && <p>Use your device’s display setting if needed.</p>}
          {wake.status === "denied" && (
            <p>Allow screen wake in browser permissions or continue normally.</p>
          )}
        </div>
        <Button size="sm" variant="danger" onClick={onFinish}>
          End
        </Button>
      </header>
      {preferences.livePulse && (
        <div className="border-b border-line py-3 text-sm" role="status">
          <span className="mr-2 inline-block size-2 bg-primary" aria-hidden />
          You’re training now. Live aggregate counts are unavailable until authenticated realtime
          presence is configured—no people or numbers are invented.
        </div>
      )}
      <BuddyGuide compact event={{ kind: "gym_start", exercise: exercise.name }} />
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center border-y border-line py-3 text-sm">
        <button
          disabled={index === 0}
          onClick={() => setExerciseIndex((value) => Math.max(0, value - 1))}
          className="min-h-11 truncate text-left text-muted-foreground disabled:opacity-30"
        >
          ← {session.exercises[index - 1]?.name ?? "Start"}
        </button>
        <span className="num px-3 text-primary">
          {index + 1}/{session.exercises.length}
        </span>
        <button
          disabled={index === session.exercises.length - 1}
          onClick={() =>
            setExerciseIndex((value) => Math.min(session.exercises.length - 1, value + 1))
          }
          className="min-h-11 truncate text-right text-muted-foreground disabled:opacity-30"
        >
          {nextExercise?.name ?? "Finish"} →
        </button>
      </div>
      <main className="py-7 text-center">
        <p className="eyebrow">
          Current movement · set {currentSetIndex + 1} of {exercise.sets.length}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.8rem,11vw,6rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
          {exercise.name}
        </h1>
        <p className="num mt-4 text-lg text-muted-foreground">
          {previous
            ? `Last: ${previous.sets.map((entry) => formatSet(entry, exercise.tracking)).join(" · ")}`
            : exercise.prescription.schemeText}
        </p>
        {showMedia && media && (
          <div className="mx-auto mt-5 max-w-xl">
            <ExerciseMedia
              item={media}
              alt={`${exercise.name} form demonstration`}
              className="h-64 w-full"
              eager
            />
          </div>
        )}
        <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3">
          <NumberField
            label="Weight"
            value={set.weightKg}
            placeholder={placeholder.weightKg?.toString() ?? "0"}
            onChange={(weightKg) => void patch({ weightKg })}
            unit="kg"
            step={exercise.incrementKg ?? 2.5}
            decimals={1}
            className="[&_input]:h-20 [&_input]:text-3xl"
          />
          <NumberField
            label="Reps"
            value={set.reps}
            placeholder={placeholder.reps?.toString() ?? String(exercise.prescription.repMax)}
            onChange={(reps) => void patch({ reps })}
            step={1}
            decimals={0}
            className="[&_input]:h-20 [&_input]:text-3xl"
          />
          <div className="col-span-2">
            <Segmented
              label="Reps in reserve"
              value={set.rir == null ? "" : String(set.rir)}
              onChange={(value) => void patch({ rir: Number(value) })}
              options={["0", "1", "2", "3", "4"].map((value) => ({
                value,
                label: value === "4" ? "4+" : value,
              }))}
            />
          </div>
        </div>
        <button
          onClick={() => void complete()}
          disabled={session.status === "paused"}
          className="mx-auto mt-7 min-h-24 w-full max-w-xl border border-primary bg-primary px-8 font-display text-3xl font-semibold text-primary-foreground active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {session.status === "paused" ? "Session paused" : "Complete set"}
        </button>
        <div className="mx-auto mt-3 flex max-w-xl flex-wrap justify-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void patch({ skipped: true, completed: false })}
          >
            Skip set
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReplace(true)}>
            Swap
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNote(true)}>
            Note
          </Button>
          {media && (
            <Button size="sm" variant="ghost" onClick={() => setShowMedia((value) => !value)}>
              {showMedia ? "Hide" : "Show"} form
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              session.status === "paused" ? resumeSession(session) : pauseSession(session)
            }
          >
            {session.status === "paused" ? "Resume" : "Pause"}
          </Button>
        </div>
      </main>
      <ReplaceSheet
        open={replace}
        onOpenChange={setReplace}
        ex={exercise}
        onReplace={(name) => {
          void saveSession(
            updateEx(session, exercise.id, (item) => ({
              ...item,
              name,
              substitutedFrom: item.substitutedFrom ?? item.name,
            })),
          );
          setReplace(false);
        }}
      />
      <NoteSheet
        open={note}
        onOpenChange={setNote}
        value={exercise.note ?? ""}
        onSave={(value) => {
          void saveSession(
            updateEx(session, exercise.id, (item) => ({ ...item, note: value || undefined })),
          );
          setNote(false);
        }}
      />
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
      : set.kind === "drop"
        ? "Drop set"
        : set.kind === "failure"
          ? "Failure set"
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
          trigger={<VIcon name="more" />}
          items={[
            { label: "Working set", onSelect: () => onChange({ kind: "working" }) },
            { label: "Warm-up set", onSelect: () => onChange({ kind: "warmup" }) },
            { label: "Drop set", onSelect: () => onChange({ kind: "drop" }) },
            {
              label: "Failure set",
              onSelect: () => onChange({ kind: "failure", rir: 0, rpe: 10 }),
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
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Segmented
            label="Reps in reserve"
            value={set.rir == null ? "" : String(set.rir)}
            onChange={(v) => onChange({ rir: Number(v) })}
            options={["0", "1", "2", "3", "4"].map((x) => ({
              value: x,
              label: x === "4" ? "4+" : x,
            }))}
          />
          <Segmented
            label="Rate of perceived exertion"
            value={set.rpe == null ? "" : String(set.rpe)}
            onChange={(v) => onChange({ rpe: Number(v) })}
            options={["6", "7", "8", "9", "10"].map((x) => ({ value: x, label: x }))}
          />
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
  media,
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
  media?: MediaItem;
}) {
  const [effort, setEffort] = useState(false);
  const [replace, setReplace] = useState(false);
  const [note, setNote] = useState(false);
  const [adaptEdit, setAdaptEdit] = useState(false);
  const prev = useMemo(
    () => previousComparable(ex, sessions, session.id),
    [ex, sessions, session.id],
  );
  const adaptation = useMemo(() => suggestAdaptation(ex, sessions, _now), [ex, sessions, _now]);
  const old = !prev ? legacyHint(ex, legacy) : null;
  const working = ex.sets.filter((s) => s.kind === "working");
  const doneCount = working.filter((s) => s.completed).length;
  const pr = useMemo(
    () => livePersonalRecord(ex, sessions, session.id),
    [ex, sessions, session.id],
  );
  const toolTarget =
    adaptation.weightKg ??
    working.find((set) => set.weightKg != null)?.weightKg ??
    prev?.sets.find((set) => set.weightKg != null)?.weightKg;

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
          <VIcon name="collapse" className={cn("ml-auto transition", open && "rotate-180")} />
        </button>
        <Menu
          label={`Options for ${ex.name}`}
          trigger={<VIcon name="more" />}
          items={[
            { label: "Replace exercise", onSelect: () => setReplace(true) },
            { label: "Add note", onSelect: () => setNote(true) },
            {
              label: effort ? "Hide effort (RIR)" : "Track effort (RIR)",
              onSelect: () => setEffort((v) => !v),
            },
            {
              label: "Preference: more next time",
              onSelect: () =>
                void saveSession(
                  updateEx(session, ex.id, (item) => ({ ...item, preference: "more" })),
                ),
            },
            {
              label: "Preference: less next time",
              onSelect: () =>
                void saveSession(
                  updateEx(session, ex.id, (item) => ({ ...item, preference: "less" })),
                ),
            },
            {
              label: "Preference: never use this",
              onSelect: () =>
                void saveSession(
                  updateEx(session, ex.id, (item) => ({ ...item, preference: "never" })),
                ),
            },
            {
              label: "Equipment unavailable",
              onSelect: () =>
                void saveSession(
                  updateEx(session, ex.id, (item) => ({
                    ...item,
                    preference: "equipment_unavailable",
                  })),
                ),
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
          {media && (
            <div>
              <ExerciseMedia
                item={media}
                alt={`${ex.name} movement demonstration`}
                className="h-56 w-full sm:h-72"
                eager
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {media.kind === "image" ? "Illustration" : "Motion demonstration"} by{" "}
                {media.author || "unknown author"} · {media.licence.short}
              </p>
            </div>
          )}
          {ex.cue && <p className="px-1 text-sm text-muted-foreground">{ex.cue}</p>}
          {ex.note && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <VIcon name="note" size={16} className="mr-1.5 inline" />
              {ex.note}
            </p>
          )}
          {ex.preference && (
            <p className="border-l-2 border-warm pl-3 text-xs text-muted-foreground">
              Saved preference: {ex.preference.replaceAll("_", " ")}. This will inform the next
              suggestion.
            </p>
          )}
          <div className="rounded-2xl bg-surface-2/60 px-3 py-2.5 text-sm">
            {pr && (
              <p
                className="mb-2 border-l-2 border-primary pl-3 font-semibold text-primary"
                role="status"
              >
                Estimated strength best: {pr.current} kg e1RM
                {pr.improvement
                  ? ` · +${pr.improvement.toFixed(1)} kg`
                  : " · first recorded baseline"}
              </p>
            )}
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
            <AdaptationBox
              exercise={ex.name}
              suggestion={adaptation}
              decision={ex.adaptation}
              onAccept={() => {
                if (adaptation.action === "swap") return setReplace(true);
                const next = updateEx(session, ex.id, (exercise) => {
                  const sets =
                    adaptation.action === "reduce_set"
                      ? removeLastWorking(exercise.sets)
                      : exercise.sets.map((set) =>
                          set.kind === "working" && !set.completed && adaptation.weightKg != null
                            ? { ...set, weightKg: adaptation.weightKg, suggested: true }
                            : set,
                        );
                  return {
                    ...exercise,
                    sets,
                    adaptation: {
                      id: newId(),
                      action: adaptation.action,
                      status: "accepted",
                      reason: adaptation.reason,
                      suggestedWeightKg: adaptation.weightKg,
                      appliedWeightKg: adaptation.weightKg,
                      suggestedSets: adaptation.sets,
                      appliedSets: adaptation.sets,
                      decidedAt: Date.now(),
                    },
                  };
                });
                void saveSession(next);
              }}
              onModify={() => setAdaptEdit(true)}
              onDismiss={() =>
                void saveSession(
                  updateEx(session, ex.id, (exercise) => ({
                    ...exercise,
                    adaptation: {
                      id: newId(),
                      action: adaptation.action,
                      status: "dismissed",
                      reason: adaptation.reason,
                      suggestedWeightKg: adaptation.weightKg,
                      suggestedSets: adaptation.sets,
                      decidedAt: Date.now(),
                    },
                  })),
                )
              }
            />
            {ex.tracking === "weight_reps" && toolTarget && toolTarget > 0 ? (
              <TrainingCalculators
                targetKg={toolTarget}
                barbell={ex.equipment?.toLowerCase().includes("barbell") ?? false}
                hasWarmups={ex.sets.some((set) => set.kind === "warmup")}
                onAddWarmups={() => {
                  const warmups = warmupRamp(toolTarget).map((set) => ({
                    ...set,
                    id: newId(),
                    completed: false,
                    skipped: false,
                  }));
                  void saveSession(
                    updateEx(session, ex.id, (exercise) => ({
                      ...exercise,
                      sets: [...warmups, ...exercise.sets],
                    })),
                  );
                  toast.success("Warm-up ramp added");
                }}
              />
            ) : null}
          </div>
          <ul className="grid gap-2">
            {ex.sets.map((s, i) => (
              <SetRow
                key={s.id}
                ex={ex}
                index={i}
                set={s}
                ph={applyReadinessPlaceholder(placeholderFor(ex, i, prev), session)}
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
              <VIcon name="add" size={16} />
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
              adaptation:
                adaptation.action === "swap" && !e.adaptation
                  ? {
                      id: newId(),
                      action: "swap",
                      status: "accepted",
                      reason: adaptation.reason,
                      decidedAt: Date.now(),
                    }
                  : e.adaptation,
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
      <AdaptationEditSheet
        open={adaptEdit}
        onOpenChange={setAdaptEdit}
        suggestion={adaptation}
        currentSets={working.length}
        onSave={(weight, sets) => {
          void saveSession(
            updateEx(session, ex.id, (exercise) => ({
              ...exercise,
              sets: keepWorking(exercise.sets, sets).map((set) =>
                set.kind === "working" && !set.completed && weight != null
                  ? { ...set, weightKg: weight, suggested: true }
                  : set,
              ),
              adaptation: {
                id: newId(),
                action: adaptation.action,
                status: "modified",
                reason: adaptation.reason,
                suggestedWeightKg: adaptation.weightKg,
                appliedWeightKg: weight,
                suggestedSets: adaptation.sets,
                appliedSets: sets,
                decidedAt: Date.now(),
              },
            })),
          );
          setAdaptEdit(false);
        }}
      />
    </section>
  );
}

function TrainingCalculators({
  targetKg,
  barbell,
  hasWarmups,
  onAddWarmups,
}: {
  targetKg: number;
  barbell: boolean;
  hasWarmups: boolean;
  onAddWarmups: () => void;
}) {
  const ramp = warmupRamp(targetKg);
  const plates = plateBreakdown(targetKg);
  return (
    <details className="mt-3 border-t border-line pt-2">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Warm-up & plate tools
      </summary>
      <div className="grid gap-3 pb-2 text-sm">
        <div>
          <p className="text-muted-foreground">Warm-up estimate for a {targetKg} kg working set</p>
          <p className="num mt-1">
            {ramp.map((set) => `${set.weightKg} kg × ${set.reps}`).join(" · ")}
          </p>
          <Button size="sm" className="mt-2" disabled={hasWarmups} onClick={onAddWarmups}>
            {hasWarmups ? "Warm-ups already added" : "Add warm-up sets"}
          </Button>
        </div>
        {barbell && (
          <div className="border-l-2 border-line pl-3">
            <p className="text-muted-foreground">Plates per side · assumes a 20 kg bar</p>
            <p className="num mt-1">
              {plates.plates.length
                ? plates.plates.map((plate) => `${plate.countPerSide} × ${plate.kg} kg`).join(" + ")
                : "Bar only"}
              {plates.remainderPerSide > 0
                ? ` · ${plates.remainderPerSide} kg unavailable per side`
                : ""}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

function AdaptationBox({
  exercise,
  suggestion,
  decision,
  onAccept,
  onModify,
  onDismiss,
}: {
  exercise: string;
  suggestion: AdaptationSuggestion;
  decision?: SessionExercise["adaptation"];
  onAccept: () => void;
  onModify: () => void;
  onDismiss: () => void;
}) {
  if (decision)
    return (
      <p className="mt-2 border-t border-line pt-2 text-xs text-muted-foreground">
        Adaptation {decision.status}: {decision.reason}
      </p>
    );
  return (
    <div className="mt-3 border-l-2 border-primary pl-3">
      <BuddyGuide compact event={{ kind: "adaptation", exercise, reason: suggestion.reason }} />
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={suggestion.action === "hold" ? "neutral" : "ok"}>Adaptation</Chip>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {suggestion.confidence} · {suggestion.observations} observations
        </span>
      </div>
      <p className="mt-1.5">{suggestion.reason}</p>
      {(suggestion.weightKg != null || suggestion.sets != null) && (
        <p className="num mt-1 text-sm text-primary">
          {suggestion.weightKg != null ? `${suggestion.weightKg} kg` : ""}
          {suggestion.weightKg != null && suggestion.sets != null ? " · " : ""}
          {suggestion.sets != null ? `${suggestion.sets} sets` : ""}
        </p>
      )}
      {suggestion.action !== "hold" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" onClick={onAccept}>
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={onModify}>
            Modify
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

function AdaptationEditSheet({
  open,
  onOpenChange,
  suggestion,
  currentSets,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: AdaptationSuggestion;
  currentSets: number;
  onSave: (weight: number | undefined, sets: number) => void;
}) {
  const [weight, setWeight] = useState<number | undefined>();
  const [sets, setSets] = useState(currentSets);
  useEffect(() => {
    if (open) {
      setWeight(suggestion.weightKg);
      setSets(suggestion.sets ?? currentSets);
    }
  }, [open, suggestion.weightKg, suggestion.sets, currentSets]);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Modify adaptation"
      description="Your value wins. The original suggestion and your modification are both retained in this session."
      footer={
        <Button variant="primary" className="w-full" onClick={() => onSave(weight, sets)}>
          Use my targets
        </Button>
      }
    >
      <div className="grid gap-4 pb-3">
        <NumberField
          label="Target weight"
          value={weight}
          onChange={setWeight}
          unit="kg"
          step={0.5}
          decimals={1}
        />
        <NumberField
          label="Working sets"
          value={sets}
          onChange={(value) => setSets(Math.max(1, Math.min(currentSets, value ?? currentSets)))}
          step={1}
          decimals={0}
        />
      </div>
    </Sheet>
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
            <VIcon name="replace" size={16} />
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
          <div className="text-right">
            <span
              className="num block text-3xl font-semibold tnum"
              role="timer"
              aria-label="Session time"
            >
              {fmtClock(sessionElapsedMs(session, now))}
            </span>
            {!session.readiness?.decision ? (
              <span className="text-xs text-foreground/70">Starts after check-in</span>
            ) : null}
          </div>
          {session.readiness?.decision ? (
            <Button
              variant="secondary"
              onClick={() => (paused ? resumeSession(session) : pauseSession(session))}
            >
              {paused ? (
                <>
                  <VIcon name="play" size={16} />
                  Resume
                </>
              ) : (
                <>
                  <VIcon name="pause" size={16} />
                  Pause
                </>
              )}
            </Button>
          ) : null}
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
          <VIcon name="finish" size={16} />
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
