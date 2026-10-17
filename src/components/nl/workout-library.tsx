import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, Field, Panel, Select, Sheet, TextInput } from "./ui";
import { VIcon } from "./icon";
import { WorkoutMedia } from "./exercise-visual";
import { FormGuideSheet, MovementCarousel } from "./workout-detail";
import { startSession } from "@/data/actions";
import { newId, put, remove } from "@/data/db";
import { useCollection, useProfile, useToday } from "@/data/hooks";
import { COL, type WorkoutTemplate } from "@/data/types";
import { useCatalogue } from "@/data/catalogue-runtime";
import type { CatalogueExercise } from "@/domain/catalogue";
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
  embedded = false,
}: {
  activeTab?: WorkoutLibraryTab;
  onTabChange?: (tab: WorkoutLibraryTab) => void;
  /** Inside the Library page, which owns the heading and tabs. */
  embedded?: boolean;
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
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = [
    query.goal,
    query.level,
    query.equipment,
    query.location,
    query.muscle,
    query.constraint,
    query.duration,
  ].filter(Boolean).length;
  const [open, setOpen] = useState<AuthoredWorkout | null>(null);
  const [programme, setProgramme] = useState<AuthoredProgramme | null>(null);
  const [schedule, setSchedule] = useState<AuthoredWorkout | null>(null);
  const [weekday, setWeekday] = useState("0");
  const [pending, setPending] = useState<string | null>(null);
  const results = useMemo(() => filterAuthoredWorkouts(AUTHORED_WORKOUTS, query), [query]);
  const [guide, setGuide] = useState<{ workout: AuthoredWorkout; index: number } | null>(null);
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
      className={cn(
        "scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !embedded && "mt-10 border-t border-line pt-7",
      )}
      aria-labelledby={embedded ? undefined : "workout-library-title"}
      aria-label={embedded ? "Authored workouts and programmes" : undefined}
    >
      {!embedded && (
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
          <div
            className="flex flex-wrap border-b border-line"
            role="tablist"
            aria-label="Library type"
          >
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
      )}

      {tab === "workouts" ? (
        <>
          <div className="mt-5 border-y border-line py-3">
            <div className="flex items-center gap-2">
              <label className="relative min-w-0 flex-1">
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
              <button
                type="button"
                aria-expanded={showFilters}
                aria-controls="workout-filters"
                onClick={() => setShowFilters((v) => !v)}
                className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold underline underline-offset-4 aria-expanded:border-primary"
              >
                Filters{activeFilters ? ` (${activeFilters})` : ""}
              </button>
            </div>
            <div
              id="workout-filters"
              hidden={!showFilters}
              className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"
            >
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
          </div>
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            {results.length} of {AUTHORED_WORKOUTS.length} workouts
          </p>
          <div className="mt-3 grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {results.map((workout, index) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                featured={index === 0 && results.length > 2}
                byId={catalogue.byId}
                favourite={favourites.has(workout.id)}
                pending={pending}
                onFavourite={() =>
                  void put(COL.workoutLibraryPrefs, workout.id, {
                    id: workout.id,
                    favourite: !favourites.has(workout.id),
                    savedAt: Date.now(),
                  } satisfies LibraryPref)
                }
                onStart={() => void start(workout)}
                onOpen={() => setOpen(workout)}
              />
            ))}
          </div>
          {results.length === 0 && (
            <p className="mt-6 border border-dashed border-line p-6 text-center text-sm text-muted-foreground">
              No authored workout matches those filters. Clear one, or browse every exercise in the
              Exercises tab.
            </p>
          )}
        </>
      ) : (
        <div className="mt-6 grid gap-x-6 gap-y-10 lg:grid-cols-2">
          {AUTHORED_PROGRAMMES.map((item) => {
            const active = enrolled.items.some((entry) => entry.programmeId === item.id);
            const moves = item.workoutIds
              .flatMap((id) => AUTHORED_WORKOUTS.find((w) => w.id === id)?.exercises ?? [])
              .map((e) => ({
                name: e.name,
                media: e.catalogueId ? catalogue.byId.get(e.catalogueId)?.media : undefined,
              }));
            return (
              <article key={item.id} className="grid gap-4 border-t-2 border-foreground pt-3">
                <WorkoutMedia title={item.title} exercises={moves} />
                <div>
                  <p className="num text-sm text-primary">
                    {item.weeks} WEEKS · {item.daysPerWeek} DAYS / WEEK
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-semibold leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {active && <Chip tone="ok">In your plan</Chip>}
                    <Button
                      size="sm"
                      variant={active ? "ghost" : "secondary"}
                      onClick={() => setProgramme(item)}
                    >
                      {active ? "View structure" : "Review programme"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <WorkoutDetail
        workout={open}
        byId={catalogue.byId}
        onClose={() => setOpen(null)}
        onStart={start}
        onSave={(workout) => saveTemplate(workout, null)}
        onSchedule={setSchedule}
        onGuide={(workout, index) => setGuide({ workout, index })}
        pending={pending}
      />
      <FormGuideSheet
        workout={guide?.workout ?? null}
        index={guide?.index ?? null}
        byId={catalogue.byId}
        onClose={() => setGuide(null)}
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
      <option value="">Any {label.toLowerCase()}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {item}
          {suffix}
        </option>
      ))}
    </Select>
  );
}

function WorkoutCard({
  workout,
  featured,
  byId,
  favourite,
  pending,
  onFavourite,
  onStart,
  onOpen,
}: {
  workout: AuthoredWorkout;
  featured: boolean;
  byId: Map<string, CatalogueExercise>;
  favourite: boolean;
  pending: string | null;
  onFavourite: () => void;
  onStart: () => void;
  onOpen: () => void;
}) {
  const moves = useMemo(
    () =>
      workout.exercises.map((e) => ({
        name: e.name,
        media: e.catalogueId ? byId.get(e.catalogueId)?.media : undefined,
      })),
    [workout, byId],
  );
  return (
    <article
      className={cn(
        "grid content-start gap-4 border-t-2 border-foreground pt-3",
        featured && "lg:col-span-2 lg:grid-cols-[1.1fr_1fr] lg:gap-8",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${workout.title}`}
        className="block text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <WorkoutMedia title={workout.title} exercises={moves} />
      </button>
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="num min-w-0 text-sm text-primary [overflow-wrap:anywhere]">
            {workout.duration} MIN · {workout.location.toUpperCase()} ·{" "}
            {workout.level.join("/").toUpperCase()}
          </p>
          <button
            aria-label={`${favourite ? "Remove" : "Add"} ${workout.title} favourite`}
            aria-pressed={favourite}
            onClick={onFavourite}
            className="-mr-2 -mt-2 grid min-h-11 min-w-11 shrink-0 place-items-center"
          >
            <VIcon
              name="favourite"
              className={favourite ? "fill-current text-primary" : "text-muted-foreground"}
            />
          </button>
        </div>
        <h3
          className={cn(
            "font-display font-semibold leading-[0.98] tracking-[-0.03em] [overflow-wrap:anywhere]",
            featured ? "text-4xl" : "text-3xl",
          )}
        >
          {workout.title}
        </h3>
        <p className="text-sm text-muted-foreground">{workout.summary}</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 [&_dd]:[overflow-wrap:anywhere] border-y border-line py-2 text-sm">
          <dt className="text-muted-foreground">Movements</dt>
          <dd className="num">{workout.exercises.length}</dd>
          <dt className="text-muted-foreground">Works</dt>
          <dd>{workout.muscles.join(" / ")}</dd>
          <dt className="text-muted-foreground">Kit</dt>
          <dd>{workout.equipment.join(", ") || "None"}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            busy={pending === `start:${workout.id}`}
            busyLabel="Starting…"
            disabled={!!pending}
            onClick={onStart}
          >
            <VIcon name="play" size={16} />
            Start
          </Button>
          <Button size="sm" variant="secondary" onClick={onOpen}>
            Preview movements
          </Button>
        </div>
      </div>
    </article>
  );
}

function WorkoutDetail({
  workout,
  byId,
  onClose,
  onStart,
  onSave,
  onSchedule,
  onGuide,
  pending,
}: {
  workout: AuthoredWorkout | null;
  byId: Map<string, CatalogueExercise>;
  onClose: () => void;
  onStart: (workout: AuthoredWorkout) => Promise<void>;
  onSave: (workout: AuthoredWorkout) => Promise<unknown>;
  onSchedule: (workout: AuthoredWorkout) => void;
  onGuide: (workout: AuthoredWorkout, index: number) => void;
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
          <MovementCarousel workout={workout} byId={byId} onGuide={(i) => onGuide(workout, i)} />
          <ol className="mt-6 border-t border-line">
            {workout.exercises.map((exercise, index) => (
              <li
                key={exercise.id}
                className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 border-b border-line py-3"
              >
                <span className="num text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">
                  {exercise.name}
                </span>
                <span className="num text-sm text-muted-foreground">
                  {exercise.schemeText} · {exercise.restSeconds}s
                </span>
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
            not comfortable, and stop if you feel pain. Programme changes apply only after you
            confirm them.
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
