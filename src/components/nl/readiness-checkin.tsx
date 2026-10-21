import { useMemo, useState } from "react";
import { Button, Field, NumberField, Panel, Segmented, Select } from "./ui";
import { VIcon } from "./icon";
import { saveSession } from "@/data/actions";
import type { ReadinessCheckIn, Session } from "@/data/types";
import { applyReadinessAction, estimateReadiness } from "@/domain/adaptation";
import { BuddyGuide } from "./buddy-guide";

const scale = [1, 2, 3, 4, 5] as const;
const scaleOptions = scale.map((value) => ({ value: String(value), label: String(value) }));
const plannedMinutes = (session: Session) =>
  Math.max(
    20,
    Math.round(
      session.exercises.reduce(
        (sum, exercise) =>
          sum +
          exercise.sets.length * 1.1 +
          (exercise.sets.length * (exercise.restSeconds ?? 90)) / 60,
        5,
      ),
    ),
  );

export function ReadinessCheckIn({ session }: { session: Session }) {
  const estimate = plannedMinutes(session);
  const [input, setInput] = useState({
    sleep: 3 as ReadinessCheckIn["sleep"],
    soreness: 3 as ReadinessCheckIn["soreness"],
    energy: 3 as ReadinessCheckIn["energy"],
    stress: 3 as ReadinessCheckIn["stress"],
    timeAvailable: estimate,
    aggravatingExerciseId: "",
  });
  const [review, setReview] = useState(false);
  const result = useMemo(
    () =>
      estimateReadiness(
        { ...input, aggravatingExerciseId: input.aggravatingExerciseId || undefined },
        estimate,
      ),
    [input, estimate],
  );
  const persist = async (decision: ReadinessCheckIn["decision"], apply: boolean) => {
    const readiness: ReadinessCheckIn = {
      ...input,
      aggravatingExerciseId: input.aggravatingExerciseId || undefined,
      submittedAt: Date.now(),
      score: result.score,
      suggestion: result.action,
      reason: result.reason,
      contributors: result.contributors,
      decision,
      decidedAt: Date.now(),
    };
    const withCheckIn = {
      ...session,
      readiness,
      workStartedAt: session.workStartedAt ?? Date.now(),
    };
    await saveSession(
      apply ? { ...applyReadinessAction(withCheckIn, result.action), readiness } : withCheckIn,
    );
  };

  return (
    <Panel className="mb-4" aria-labelledby="readiness-title">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <VIcon name="readiness" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="readiness-title" className="text-xl font-semibold leading-tight">
            How ready do you feel?
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Optional. A self-reported estimate, not medical advice. You decide whether anything
            changes.
          </p>
        </div>
      </div>

      {!review ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Rating
            label="Sleep quality"
            low="Poor"
            high="Strong"
            value={input.sleep}
            onChange={(sleep) => setInput((old) => ({ ...old, sleep }))}
          />
          <Rating
            label="Energy"
            low="Low"
            high="High"
            value={input.energy}
            onChange={(energy) => setInput((old) => ({ ...old, energy }))}
          />
          <Rating
            label="Soreness"
            low="None"
            high="High"
            value={input.soreness}
            onChange={(soreness) => setInput((old) => ({ ...old, soreness }))}
          />
          <Rating
            label="Stress"
            low="Low"
            high="High"
            value={input.stress}
            onChange={(stress) => setInput((old) => ({ ...old, stress }))}
          />
          <Field label="Time available" hint={`Planned estimate: about ${estimate} min`}>
            <NumberField
              label="Time available"
              value={input.timeAvailable}
              onChange={(timeAvailable) =>
                setInput((old) => ({ ...old, timeAvailable: timeAvailable ?? estimate }))
              }
              unit="min"
              step={5}
              decimals={0}
            />
          </Field>
          <Field
            label="Movement that feels aggravating (optional)"
            hint="Choose only if a planned movement feels uncomfortable today."
          >
            <Select
              value={input.aggravatingExerciseId}
              onChange={(event) =>
                setInput((old) => ({ ...old, aggravatingExerciseId: event.target.value }))
              }
            >
              <option value="">None</option>
              {session.exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-2 sm:flex sm:flex-wrap md:col-span-2">
            <Button variant="primary" size="lg" onClick={() => setReview(true)}>
              Review suggestion
            </Button>
            <Button variant="ghost" onClick={() => void persist("dismissed", false)}>
              Skip check-in
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-foreground/6 p-4">
          <p className="num text-sm text-primary">Self-reported signal {result.score}/100</p>
          <h2 className="mt-1 text-xl font-semibold">{label(result.action)}</h2>
          <p className="mt-2 max-w-2xl">{result.reason}</p>
          {result.contributors.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Why: {result.contributors.join("; ")}.
            </p>
          ) : null}
          <BuddyGuide
            event={{
              kind: "readiness",
              score: result.score,
              soreness: input.soreness,
              action: result.action,
              reason: result.reason,
            }}
          />
          {result.action === "swap_aggravating" && (
            <p className="mt-2 text-sm text-warn">
              The app will not choose a medical substitute. Open that exercise and choose a
              comfortable same-intent alternative.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void persist("accepted", true)}>
              {result.action === "keep" ? "Confirm and start" : "Use this adjustment"}
            </Button>
            <Button onClick={() => void persist("kept_plan", false)}>Keep original plan</Button>
            <Button variant="ghost" onClick={() => setReview(false)}>
              Edit check-in
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Rating({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div>
      <p aria-hidden className="mb-1.5 px-1 text-sm font-medium">
        {label}
      </p>
      <Segmented
        label={label}
        value={String(value)}
        onChange={(next) => onChange(Number(next) as 1 | 2 | 3 | 4 | 5)}
        options={scaleOptions}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
function label(action: ReadinessCheckIn["suggestion"]) {
  return {
    keep: "Keep today’s plan",
    reduce_set: "Reduce one working set",
    lower_load: "Lower target load by about 10%",
    shorten: "Shorten today’s session",
    swap_aggravating: "Swap the aggravating movement",
  }[action];
}
