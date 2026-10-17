import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, Field, Panel, Select, Sheet, TextInput } from "./ui";
import { VIcon } from "./icon";
import { ExerciseMediaThumb } from "./exercise-media";
import { startSession } from "@/data/actions";
import { newId, put, remove } from "@/data/db";
import { useCollection, useProfile, useToday } from "@/data/hooks";
import { COL, type WorkoutTemplate } from "@/data/types";
import { useCatalogue } from "@/data/catalogue-runtime";
import type { MediaItem } from "@/domain/catalogue";
import {
  AUTHORED_PROGRAMMES,
  AUTHORED_WORKOUTS,
  authoredWorkoutToTemplate,
  filterAuthoredWorkouts,
  type AuthoredProgramme,
  type AuthoredWorkout,
} from "@/domain/workout-library";

type LibraryPref = { id: string; favourite: boolean; savedAt: number };
type ProgrammeEnrollment = {
  id: string;
  programmeId: string;
  version: string;
  startedAt: number;
  templateIds: string[];
};

const options = {
  goal: ["strength", "muscle", "fitness", "return"],
  level: ["new", "returning", "some"],
  equipment: ["bodyweight", "dumbbell", "cable", "machine", "barbell"],
  location: ["home", "gym", "anywhere"],
  muscle: ["full body", "chest", "back", "shoulders", "quads", "hamstrings", "glutes", "core"],
  constraint: ["time-short", "low impact", "no equipment", "low volume"],
} as const;
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type WorkoutLibraryTab = "workouts" | "programmes";

export function WorkoutLibrary({
  activeTab,
  onTabChange,
}: {
  activeTab?: WorkoutLibraryTab;
  onTabChange?: (tab: WorkoutLibraryTab) => void;
} = {}) {
  const nav = useNavigate();
  const today = useToday();
  const { profile } = useProfile();
  const catalogue = useCatalogue();
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const prefs = useCollection<LibraryPref>(COL.workoutLibraryPrefs);
  const enrolled = useCollection<ProgrammeEnrollment>(COL.programEnrollments);
  const [localTab, setLocalTab] = useState<WorkoutLibraryTab>("workouts");
  const tab = activeTab ?? localTab;
  const selectTab = (value: WorkoutLibraryTab) => {
    setLocalTab(value);
    onTabChange?.(value);
  };
  const [query, setQuery] = useState({
    text: "",
    goal: "",
    level: "",
    duration: 0,
    equipment: "",
    location: "",
    muscle: "",
    constraint: "",
  });
  const [open, setOpen] = useState<AuthoredWorkout | null>(null);
  const [programme, setProgramme] = useState<AuthoredProgramme | null>(null);
  const [schedule, setSchedule] = useState<AuthoredWorkout | null>(null);
  const [weekday, setWeekday] = useState("0");
  const [pending, setPending] = useState<string | null>(null);
  const results = useMemo(() => filterAuthoredWorkouts(AUTHORED_WORKOUTS, query), [query]);
  const favourites = new Set(prefs.items.filter((item) => item.favourite).map((item) => item.id));

  const saveTemplate = async (workout: AuthoredWorkout, day: number | null) => {
    if (pending) return null;
    setPending(`save:${workout.id}`);
    const template = authoredWorkoutToTemplate(workout, templates.items.length);
    try {
      await put(COL.templates, template.id, { ...template, weekday: day });
      toast.success(day == null ? "Saved to your workouts" : `Scheduled for ${days[day]}`);
      return template;
    } catch {
      toast.error("That workout could not be saved. Nothing else changed.");
      return null;
    } finally {
      setPending(null);
    }
  };
  const start = async (workout: AuthoredWorkout) => {
    if (pending) return;
    setPending(`start:${workout.id}`);
    try {
      const template = authoredWorkoutToTemplate(workout, templates.items.length);
      await startSession(template, today, profile?.timezone);
      await nav({ to: "/train/session" });
    } catch {
      toast.error(
        "The session could not open. Check Training—an interrupted start can be resumed.",
      );
    } finally {
      setPending(null);
    }
  };
  const enroll = async (item: AuthoredProgramme) => {
    if (pending || enrolled.items.some((entry) => entry.programmeId === item.id)) return;
    setPending(`programme:${item.id}`);
    const spread =
      item.daysPerWeek === 2 ? [0, 3] : item.daysPerWeek === 3 ? [0, 2, 4] : [0, 1, 3, 5];
    const ids: string[] = [];
    try {
      for (const [index, workoutId] of item.workoutIds.entries()) {
        const workout = AUTHORED_WORKOUTS.find((entry) => entry.id === workoutId)!;
        const template = authoredWorkoutToTemplate(workout, templates.items.length + index);
        template.id = newId();
        template.weekday = spread[index] ?? null;
        await put(COL.templates, template.id, template);
        ids.push(template.id);
      }
      await put(COL.programEnrollments, item.id, {
        id: item.id,
        programmeId: item.id,
        version: item.version,
        startedAt: Date.now(),
        templateIds: ids,
      } satisfies ProgrammeEnrollment);
      setProgramme(null);
      toast.success(`${item.title} added to your plan`);
    } catch {
      await Promise.all(ids.map((id) => remove(COL.templates, id)));
      toast.error("The programme was not added. Any partial copies were removed.");
    } finally {
      setPending(null);
    }
  };

  return (
    <section
      id="discover-workouts"
      tabIndex={-1}
      className="mt-10 scroll-mt-24 border-t border-line pt-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-labelledby="workout-library-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Authored library · v2026.10</p>
          <h2 id="workout-library-title" className="mt-1 font-display text-3xl font-semibold">
            Ready-to-run training
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Deliberate sessions and multi-week structures built from the licensed VAYVOR exercise
            catalogue. Every target remains editable.
          </p>
        </div>
        <div className="flex border-b border-line" role="tablist" aria-label="Library type">
          {(["workouts", "programmes"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => selectTab(value)}
              className={`min-h-11 border-b-2 px-4 text-sm font-semibold capitalize ${tab === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {tab === "workouts" ? (
        <>
          <div className="mt-6 grid gap-3 border-y border-line py-4 md:grid-cols-4">
            <label className="relative md:col-span-2">
              <span className="sr-only">Search workouts</span>
              <VIcon
                name="search"
                className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
              />
              <TextInput
                value={query.text}
                onChange={(event) => setQuery((old) => ({ ...old, text: event.target.value }))}
                placeholder="Search goal, workout or muscle"
                className="pl-10"
              />
            </label>
            <Filter
              label="Goal"
              value={query.goal}
              values={options.goal}
              onChange={(goal) => setQuery((old) => ({ ...old, goal }))}
            />
            <Filter
              label="Level"
              value={query.level}
              values={options.level}
              onChange={(level) => setQuery((old) => ({ ...old, level }))}
            />
            <Filter
              label="Equipment"
              value={query.equipment}
              values={options.equipment}
              onChange={(equipment) => setQuery((old) => ({ ...old, equipment }))}
            />
            <Filter
              label="Location"
              value={query.location}
              values={options.location}
              onChange={(location) => setQuery((old) => ({ ...old, location }))}
            />
            <Filter
              label="Muscle"
              value={query.muscle}
              values={options.muscle}
              onChange={(muscle) => setQuery((old) => ({ ...old, muscle }))}
            />
            <Filter
              label="Constraint"
              value={query.constraint}
              values={options.constraint}
              onChange={(constraint) => setQuery((old) => ({ ...old, constraint }))}
            />
            <Filter
              label="Duration"
              value={query.duration ? String(query.duration) : ""}
              values={["30", "45", "60"]}
              onChange={(duration) => setQuery((old) => ({ ...old, duration: Number(duration) }))}
              suffix=" min max"
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            {results.length} of {AUTHORED_WORKOUTS.length} workouts
          </p>
          <div className="mt-3 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
            {results.map((workout, index) => (
              <article
                key={workout.id}
                className={`bg-background p-5 ${index % 3 === 1 ? "md:translate-y-0 xl:py-8" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="num text-sm text-primary">
                    {workout.duration} MIN · {workout.location.toUpperCase()}
                  </p>
                  <button
                    aria-label={`${favourites.has(workout.id) ? "Remove" : "Add"} ${workout.title} favourite`}
                    onClick={() =>
                      void put(COL.workoutLibraryPrefs, workout.id, {
                        id: workout.id,
                        favourite: !favourites.has(workout.id),
                        savedAt: Date.now(),
                      } satisfies LibraryPref)
                    }
                    className="min-h-11 min-w-11"
                  >
                    <VIcon
                      name="favourite"
                      className={
                        favourites.has(workout.id)
                          ? "fill-current text-primary"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                </div>
                <h3 className="font-display text-2xl font-semibold">{workout.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{workout.summary}</p>
                <p className="mt-4 border-t border-line pt-3 text-sm">
                  {workout.exercises.length} movements · {workout.muscles.join(" / ")}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    busy={pending === `start:${workout.id}`}
                    busyLabel="Starting…"
                    disabled={!!pending}
                    onClick={() => void start(workout)}
                  >
                    <VIcon name="play" size={16} />
                    Start
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(workout)}>
                    Details
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {AUTHORED_PROGRAMMES.map((item) => {
            const active = enrolled.items.some((entry) => entry.programmeId === item.id);
            return (
              <Panel key={item.id} className="!rounded-none border-l-4 border-l-primary">
                <p className="eyebrow">
                  {item.weeks} weeks · {item.daysPerWeek} days/week
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                <div className="mt-4 flex items-center gap-2">
                  {active && <Chip tone="ok">In your plan</Chip>}
                  <Button
                    size="sm"
                    variant={active ? "ghost" : "secondary"}
                    onClick={() => setProgramme(item)}
                  >
                    {active ? "View structure" : "Review programme"}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <WorkoutDetail
        workout={open}
        mediaById={
          new Map(catalogue.exercises.map((exercise) => [exercise.id, exercise.media[0]] as const))
        }
        onClose={() => setOpen(null)}
        onStart={start}
        onSave={(workout) => saveTemplate(workout, null)}
        onSchedule={setSchedule}
        pending={pending}
      />
      <ScheduleSheet
        workout={schedule}
        weekday={weekday}
        setWeekday={setWeekday}
        onClose={() => setSchedule(null)}
        onSave={async () => {
          if (schedule) await saveTemplate(schedule, Number(weekday));
          setSchedule(null);
        }}
      />
      <ProgrammeDetail
        item={programme}
        active={!!programme && enrolled.items.some((entry) => entry.programmeId === programme.id)}
        onClose={() => setProgramme(null)}
        onEnroll={enroll}
        pending={pending}
      />
    </section>
  );
}

function Filter({
  label,
  value,
  values,
  onChange,
  suffix = "",
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All {label.toLowerCase()}s</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {item}
          {suffix}
        </option>
      ))}
    </Select>
  );
}

function WorkoutDetail({
  workout,
  mediaById,
  onClose,
  onStart,
  onSave,
  onSchedule,
  pending,
}: {
  workout: AuthoredWorkout | null;
  mediaById: Map<string, MediaItem | undefined>;
  onClose: () => void;
  onStart: (workout: AuthoredWorkout) => Promise<void>;
  onSave: (workout: AuthoredWorkout) => Promise<unknown>;
  onSchedule: (workout: AuthoredWorkout) => void;
  pending: string | null;
}) {
  return (
    <Sheet
      open={!!workout}
      onOpenChange={(value) => !value && onClose()}
      title={workout?.title ?? "Workout"}
      description={workout?.summary}
      wide
    >
      {workout && (
        <div className="pb-4">
          <div className="mb-5 grid grid-cols-3 border-y border-line py-3 text-center">
            <Metric value={`${workout.duration}`} label="minutes" />
            <Metric value={`${workout.exercises.length}`} label="movements" />
            <Metric value={workout.level.join(" / ")} label="level" />
          </div>
          <ol>
            {workout.exercises.map((exercise, index) => (
              <li
                key={exercise.id}
                className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-4"
              >
                <span className="num text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="grid min-w-0 gap-3 sm:grid-cols-[5.5rem_1fr]">
                  {exercise.catalogueId && mediaById.get(exercise.catalogueId) ? (
                    <ExerciseMediaThumb
                      item={mediaById.get(exercise.catalogueId)!}
                      alt={`${exercise.name} form reference`}
                      className="aspect-square w-full border border-line"
                    />
                  ) : (
                    <div
                      className="hidden aspect-square border border-dashed border-line bg-surface-2 sm:block"
                      aria-label="Media unavailable"
                    />
                  )}
                  <div>
                    <h4 className="font-semibold">{exercise.name}</h4>
                    <p className="num text-sm">
                      {exercise.schemeText} · {exercise.restSeconds}s rest
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {exercise.intent}
                      {exercise.substitutions[0]
                        ? ` · substitute: ${exercise.substitutions[0]}`
                        : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              busy={pending === `start:${workout.id}`}
              busyLabel="Starting…"
              disabled={!!pending}
              variant="primary"
              onClick={() => void onStart(workout)}
            >
              <VIcon name="play" size={16} />
              Start now
            </Button>
            <Button
              busy={pending === `save:${workout.id}`}
              disabled={!!pending}
              onClick={() => void onSave(workout)}
            >
              Save a copy
            </Button>
            <Button variant="ghost" onClick={() => onSchedule(workout)}>
              <VIcon name="calendar" size={16} />
              Schedule
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Targets are authored guidance, not medical advice. Edit or substitute anything that is
            not comfortable. Programme changes apply only after you confirm them.
          </p>
        </div>
      )}
    </Sheet>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="eyebrow !text-[0.62rem]">{label}</p>
    </div>
  );
}

function ScheduleSheet({
  workout,
  weekday,
  setWeekday,
  onClose,
  onSave,
}: {
  workout: AuthoredWorkout | null;
  weekday: string;
  setWeekday: (value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Sheet
      open={!!workout}
      onOpenChange={(value) => !value && onClose()}
      title="Schedule workout"
      description="This saves an editable copy in your plan."
    >
      <div className="grid gap-4 pb-4">
        <Field label="Training day">
          <Select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
            {days.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="primary" onClick={() => void onSave()}>
          Add to plan
        </Button>
      </div>
    </Sheet>
  );
}

function ProgrammeDetail({
  item,
  active,
  onClose,
  onEnroll,
  pending,
}: {
  item: AuthoredProgramme | null;
  active: boolean;
  onClose: () => void;
  onEnroll: (item: AuthoredProgramme) => Promise<void>;
  pending: string | null;
}) {
  return (
    <Sheet
      open={!!item}
      onOpenChange={(value) => !value && onClose()}
      title={item?.title ?? "Programme"}
      description={item?.summary}
      wide
    >
      {item && (
        <div className="grid gap-5 pb-4">
          <div className="grid grid-cols-3 border-y border-line py-3 text-center">
            <Metric value={`${item.weeks}`} label="weeks" />
            <Metric value={`${item.daysPerWeek}`} label="days / week" />
            <Metric value={item.goal} label="goal" />
          </div>
          <div>
            <p className="eyebrow">Weekly sequence</p>
            <ol className="mt-2">
              {item.workoutIds.map((id, index) => (
                <li key={`${id}-${index}`} className="border-b border-line py-3">
                  <span className="num mr-3 text-muted-foreground">D{index + 1}</span>
                  {AUTHORED_WORKOUTS.find((workout) => workout.id === id)?.title}
                </li>
              ))}
            </ol>
          </div>
          <RuleText title="Progression" text={item.progression} />
          <RuleText title="Deload guardrail" text={item.deload} />
          <RuleText title="Return after a break" text={item.returnRule} />
          {active ? (
            <p className="text-sm text-primary">
              This programme is already in your plan. Your saved templates remain editable and
              versioned to {item.version}.
            </p>
          ) : (
            <Button
              busy={pending === `programme:${item.id}`}
              busyLabel="Adding…"
              disabled={!!pending}
              variant="primary"
              onClick={() => void onEnroll(item)}
            >
              Add programme to my plan
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
function RuleText({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
