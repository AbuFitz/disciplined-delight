import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  Panel,
  Sheet,
  Skeleton,
  Switch,
} from "@/components/nl/ui";
import { useCatalogue, useEquipmentProfile, useFavourites } from "@/data/catalogue-runtime";
import { newId, put } from "@/data/db";
import { useCollection } from "@/data/hooks";
import { activeTemplates } from "@/data/selectors";
import { COL, type Session, type WorkoutTemplate } from "@/data/types";
import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  MUSCLE_LABEL,
  type EquipmentId,
  type MuscleId,
  type Pattern,
} from "@/domain/catalogue";
import {
  estimateMinutes,
  generatePlan,
  substitutes,
  validatePlan,
  type Plan,
  type PlanInput,
  type Style,
} from "@/domain/planner";
import { planToTemplates, schemeText } from "@/domain/plan-templates";
import type { Experience, Goal } from "@/domain/programmes";
import { WEEKDAY_SHORT } from "@/domain/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/train/build")({ component: Builder });

const GOALS: { id: Goal; title: string; body: string }[] = [
  { id: "build_muscle", title: "Build muscle", body: "Moderate reps, steady volume." },
  { id: "get_stronger", title: "Get stronger", body: "Heavier, lower reps on the big lifts." },
  { id: "general_fitness", title: "Feel fitter", body: "A balanced all-round routine." },
  {
    id: "return_to_routine",
    title: "Get back into it",
    body: "Gentle volume to rebuild the habit.",
  },
];
const LEVELS: { id: Experience; title: string; body: string }[] = [
  { id: "new", title: "New to this", body: "Under about 6 months of regular lifting." },
  { id: "returning", title: "Coming back", body: "Trained before, a break since." },
  { id: "some", title: "Some experience", body: "Lifting steadily for a year or more." },
];
const PRESETS: { label: string; have: EquipmentId[]; style: Style }[] = [
  {
    label: "Full gym",
    have: [
      "dumbbell",
      "barbell",
      "cable",
      "machine",
      "bench",
      "incline_bench",
      "pullup_bar",
      "ez_bar",
      "kettlebell",
      "smith",
    ],
    style: "mixed",
  },
  { label: "Home dumbbells", have: ["dumbbell", "bench"], style: "free_weights" },
  { label: "Bodyweight only", have: [], style: "bodyweight" },
];
const STEPS = ["Goal", "Level", "Time", "Kit", "Extras", "Plan"] as const;
const AVOIDS: { id: Pattern; label: string }[] = [
  { id: "lunge", label: "Lunges and step-ups" },
  { id: "push_vertical", label: "Overhead pressing" },
  { id: "hinge", label: "Deadlift-type hinges" },
  { id: "squat", label: "Squats and leg press" },
];
const PRIORITY: MuscleId[] = [
  "chest",
  "lats",
  "shoulders",
  "quads",
  "hamstrings",
  "glutes",
  "biceps",
  "triceps",
  "abs",
];

function Choice({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body?: string;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "min-h-20 rounded-[1.5rem] border-2 p-4 text-left transition active:scale-[0.99]",
        selected
          ? "loud loud-green border-transparent"
          : "border-line bg-surface hover:border-foreground/40",
      )}
    >
      <span className="display-title block text-2xl">{title}</span>
      {body && <span className="mt-1 block text-sm text-muted-foreground">{body}</span>}
    </button>
  );
}

function Pill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line text-foreground hover:border-foreground/40",
      )}
    >
      {on && <Check className="mr-1 inline size-4" />}
      {children}
    </button>
  );
}

function Builder() {
  const nav = useNavigate();
  const cat = useCatalogue();
  const kit = useEquipmentProfile();
  const favs = useFavourites();
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("general_fitness");
  const [level, setLevel] = useState<Experience>("new");
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(60);
  const [picked, setPicked] = useState<number[]>([]);
  const [have, setHave] = useState<EquipmentId[] | null>(null);
  const [style, setStyle] = useState<Style>("mixed");
  const [priority, setPriority] = useState<MuscleId[]>([]);
  const [avoid, setAvoid] = useState<Pattern[]>([]);
  const [adult, setAdult] = useState(false);
  const [clear, setClear] = useState(false);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [saving, setSaving] = useState(false);

  const equipment = have ?? kit.have;
  const input: PlanInput = {
    goal,
    experience: level,
    daysPerWeek: days,
    sessionMinutes: minutes,
    equipment,
    style,
    preferredDays: picked.length === days ? picked : undefined,
    priorityMuscles: priority,
    avoidPatterns: avoid,
    favourites: favs.ids,
    history: useMemo(() => {
      const h: Record<string, number> = {};
      for (const s of sessions.items)
        for (const e of s.exercises)
          if (e.catalogueId) h[e.catalogueId] = (h[e.catalogueId] ?? 0) + 1;
      return h;
    }, [sessions.items]),
    adult,
    clinicianRestricted: !clear,
    seed: "vayvor",
  };

  const result = useMemo(
    () =>
      step === 5 && cat.snapshot
        ? generatePlan(
            { ...input, allowPartial: true },
            cat.exercises.filter((e) => e.source.provider !== "custom"),
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, cat.snapshot, JSON.stringify({ ...input, history: undefined })],
  );
  const plan = draft && step === 5 ? draft : result && result.ok ? result.plan : null;
  const issues = plan ? validatePlan(plan, cat.exercises) : [];
  const existing = activeTemplates(templates.items);

  const go = (n: number) => {
    setDraft(null);
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  const canNext = step === 4 ? adult && clear : true;
  const editSession = (
    si: number,
    fn: (xs: Plan["sessions"][number]["exercises"]) => Plan["sessions"][number]["exercises"],
  ) => {
    if (!plan) return;
    const sessionsNext = plan.sessions.map((s, i) => {
      if (i !== si) return s;
      const exercises = fn(s.exercises);
      return { ...s, exercises, estimatedMinutes: estimateMinutes(exercises) };
    });
    setDraft({ ...plan, sessions: sessionsNext });
  };

  const accept = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const maxOrder = templates.items.reduce((m, t) => Math.max(m, t.order), -1);
      const made = planToTemplates(plan, cat.byId, newId, maxOrder + 1).map((t) =>
        existing.length && mode === "add" ? { ...t, weekday: null } : t,
      );
      if (existing.length && mode === "replace") {
        for (const t of existing)
          await put(COL.templates, t.id, { ...t, archivedAt: new Date().toISOString() });
      }
      for (const t of made) await put(COL.templates, t.id, t);
      const id = newId();
      await put(COL.plans, id, {
        id,
        createdAt: new Date().toISOString(),
        rulesVersion: plan.rulesVersion,
        programmeId: plan.programmeId,
        input: plan.input,
        templateIds: made.map((t) => t.id),
        seed: plan.input.seed,
        exercises: plan.sessions.flatMap((s) =>
          s.exercises.map((x) => ({ id: x.exerciseId, name: x.name })),
        ),
        attribution:
          "Exercise data: wger.de contributors, licensed CC-BY-SA. See the Library for each exercise's credit.",
      });
      if (!kit.configured || have) await kit.save(equipment);
      nav({ to: "/train" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={`Plan builder · step ${step + 1} of ${STEPS.length}`}
        title={step === 5 ? "Your plan" : "Build my plan"}
      />
      <ol className="mb-6 flex gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={cn("h-2 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-foreground/15")}
          >
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section aria-label="Goal" className="grid gap-3 md:grid-cols-2" role="radiogroup">
          <h2 className="eyebrow md:col-span-2">What are you training for?</h2>
          {GOALS.map((g) => (
            <Choice
              key={g.id}
              selected={goal === g.id}
              onClick={() => setGoal(g.id)}
              title={g.title}
              body={g.body}
            />
          ))}
        </section>
      )}
      {step === 1 && (
        <section aria-label="Level" className="grid gap-3" role="radiogroup">
          <h2 className="eyebrow">Where are you at?</h2>
          {LEVELS.map((g) => (
            <Choice
              key={g.id}
              selected={level === g.id}
              onClick={() => setLevel(g.id)}
              title={g.title}
              body={g.body}
            />
          ))}
          <p className="text-sm text-muted-foreground">
            This sets how many sets you start with. You can always add more later.
          </p>
        </section>
      )}
      {step === 2 && (
        <section aria-label="Time" className="grid gap-6">
          <div>
            <h2 className="eyebrow mb-2">Days a week</h2>
            <div className="flex gap-2" role="radiogroup" aria-label="Days per week">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={days === n}
                  onClick={() => {
                    setDays(n);
                    setPicked([]);
                  }}
                  className={cn(
                    "stat-sm grid size-20 place-items-center rounded-[1.5rem] border-2",
                    days === n ? "loud loud-green border-transparent" : "border-line bg-surface",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {level === "new" && days > 3 && (
              <p className="mt-2 text-sm text-muted-foreground">
                New to training? We'll start you on 3 and you can add days later.
              </p>
            )}
          </div>
          <div>
            <h2 className="eyebrow mb-2">Minutes per session</h2>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Minutes per session"
            >
              {[30, 45, 60, 75, 90].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={minutes === n}
                  onClick={() => setMinutes(n)}
                  className={cn(
                    "min-h-12 rounded-full border-2 px-5 font-semibold",
                    minutes === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-line",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Includes a 5 minute warm-up and the rest between sets.
            </p>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Pick your days (optional)</h2>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_SHORT.map((d, i) => {
                const idx = (i + 1) % 7; // Mon-first labels -> 0 = Sunday
                return (
                  <Pill
                    key={d}
                    on={picked.includes(idx)}
                    onClick={() =>
                      setPicked((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]))
                    }
                  >
                    {d}
                  </Pill>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {picked.length === 0
                ? "Leave blank and we'll space them out."
                : picked.length === days
                  ? "Using your days."
                  : `Pick ${days} days, or clear to let us choose (${picked.length} picked).`}
            </p>
          </div>
        </section>
      )}
      {step === 3 && (
        <section aria-label="Kit" className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                onClick={() => {
                  setHave(p.have);
                  setStyle(p.style);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div>
            <h2 className="eyebrow mb-2">
              What you can use (bodyweight and mat are always included)
            </h2>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.filter((q) => q !== "bodyweight" && q !== "mat").map((q) => (
                <Pill
                  key={q}
                  on={equipment.includes(q)}
                  onClick={() =>
                    setHave(
                      equipment.includes(q) ? equipment.filter((x) => x !== q) : [...equipment, q],
                    )
                  }
                >
                  {EQUIPMENT_LABEL[q]}
                </Pill>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-label="Style" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["mixed", "A bit of everything"],
                ["machines_cables", "Machines and cables"],
                ["free_weights", "Free weights"],
                ["bodyweight", "Bodyweight first"],
              ] as [Style, string][]
            ).map(([id, t]) => (
              <Choice key={id} selected={style === id} onClick={() => setStyle(id)} title={t} />
            ))}
          </div>
        </section>
      )}
      {step === 4 && (
        <section aria-label="Extras" className="grid gap-5">
          <div>
            <h2 className="eyebrow mb-2">Bring up (up to 3)</h2>
            <div className="flex flex-wrap gap-2">
              {PRIORITY.map((m) => (
                <Pill
                  key={m}
                  on={priority.includes(m)}
                  onClick={() =>
                    setPriority((p) =>
                      p.includes(m) ? p.filter((x) => x !== m) : p.length < 3 ? [...p, m] : p,
                    )
                  }
                >
                  {MUSCLE_LABEL[m]}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Leave out</h2>
            <div className="flex flex-wrap gap-2">
              {AVOIDS.map((a) => (
                <Pill
                  key={a.id}
                  on={avoid.includes(a.id)}
                  onClick={() =>
                    setAvoid((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))
                  }
                >
                  {a.label}
                </Pill>
              ))}
            </div>
          </div>
          <Panel>
            <h2 className="eyebrow mb-2">Before we build</h2>
            <Switch checked={adult} onChange={setAdult} label="I'm 18 or over" />
            <Switch
              checked={clear}
              onChange={setClear}
              label="No doctor or physio has told me to avoid exercise"
              hint="If one has, ask them what's safe first. VAYVOR won't generate a plan around a restriction."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              General fitness guidance, not medical advice. Stop if something hurts, and see a
              professional for pain or injury.
            </p>
          </Panel>
        </section>
      )}
      {step === 5 && (
        <section aria-label="Plan" className="grid gap-4">
          {cat.status === "loading" && <Skeleton className="h-64" />}
          {cat.status === "error" && (
            <EmptyState
              title="The library didn't load"
              body={cat.error}
              action={<Button onClick={cat.retry}>Try again</Button>}
            />
          )}
          {result && !result.ok && result.kind !== "conflict" && (
            <EmptyState
              title="Can't build that"
              body={result.message}
              action={
                <Button onClick={() => go(result.kind === "unsupported" ? 4 : 2)}>
                  Change answers
                </Button>
              }
            />
          )}
          {result && !result.ok && result.kind === "conflict" && plan === null && null}
          {result && (result.ok || result.kind === "conflict") && plan && (
            <>
              {(() => {
                const conflicts = result.ok ? result.plan.conflicts : result.conflicts;
                const sugg = result.ok ? [] : result.suggestions;
                if (!conflicts.length) return null;
                return (
                  <Panel tone="warm" aria-label="Gaps">
                    <h2 className="display-title text-3xl">Some gaps</h2>
                    <ul className="mt-2 list-disc pl-5">
                      {conflicts.map((c, i) => (
                        <li key={i}>
                          {c.session}: {c.message}
                        </li>
                      ))}
                    </ul>
                    {sugg.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {sugg
                          .filter((s) => s.equipment)
                          .map((s) => (
                            <Button
                              key={s.equipment}
                              variant="primary"
                              onClick={() => setHave([...equipment, s.equipment!])}
                            >
                              Add {EQUIPMENT_LABEL[s.equipment!]}
                            </Button>
                          ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm">
                      You can still use this plan; the missing slots are just left out.
                    </p>
                  </Panel>
                );
              })()}
              <Panel tone="green">
                <h2 className="display-title text-[clamp(2.25rem,10vw,3.5rem)]">
                  {plan.programmeName}
                </h2>
                <ul className="mt-3 grid gap-1">
                  {plan.rationale.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  <strong>Effort:</strong> {plan.effort}
                </p>
              </Panel>
              {plan.sessions.map((s, si) => (
                <Panel key={s.title + si} aria-label={s.title}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="display-title text-3xl">{s.title}</h3>
                    <span className="eyebrow shrink-0">
                      ~{s.estimatedMinutes} min · {WEEKDAY_SHORT[(s.weekday + 6) % 7]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.focus}</p>
                  {s.dropped.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Left out to fit {minutes} minutes: {s.dropped.join(", ")}.
                    </p>
                  )}
                  <ul className="mt-3 grid">
                    {s.exercises.map((x, xi) => (
                      <li
                        key={x.slotKey + x.exerciseId}
                        className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg font-bold leading-tight">{x.name}</p>
                          <p className="tnum text-sm text-muted-foreground">
                            {schemeText(x)} · rest{" "}
                            {Math.round(x.restSec / 15) * 15 >= 60
                              ? `${Math.round(x.restSec / 30) / 2} min`
                              : `${x.restSec}s`}
                            {x.superset && (
                              <>
                                {" "}
                                · <Chip>Superset</Chip>
                              </>
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          aria-label={`Swap ${x.name}`}
                          onClick={() => setReplacing(si * 100 + xi)}
                        >
                          <Repeat className="size-4" />
                          Swap
                        </Button>
                        <button
                          aria-label={`Remove ${x.name}`}
                          className="grid size-11 place-items-center rounded-full hover:bg-surface-2"
                          onClick={() => editSession(si, (xs) => xs.filter((_, k) => k !== xi))}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
              {issues.length > 0 && (
                <Panel aria-label="Checks">
                  <h3 className="eyebrow mb-2">Worth knowing</h3>
                  <ul className="grid gap-1 text-sm">
                    {issues.map((i, k) => (
                      <li
                        key={k}
                        className={
                          i.severity === "error" ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {i.session ? `${i.session}: ` : ""}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel>
                <h3 className="eyebrow mb-2">Starting weights</h3>
                <p className="text-sm">
                  None are set. Find a weight where the last reps are hard but clean, then log it;
                  VAYVOR suggests when to go up.
                </p>
                {existing.length > 0 && (
                  <div
                    className="mt-4 grid gap-2"
                    role="radiogroup"
                    aria-label="What to do with your current workouts"
                  >
                    <Choice
                      selected={mode === "add"}
                      onClick={() => setMode("add")}
                      title="Add alongside what I have"
                      body="Your current programme stays as it is. The new workouts are added unscheduled; place them on the week yourself."
                    />
                    <Choice
                      selected={mode === "replace"}
                      onClick={() => setMode("replace")}
                      title="Replace my schedule"
                      body={`Archives your ${existing.length} current workouts (they leave your list; there is no restore screen yet) and schedules these.`}
                    />
                  </div>
                )}
              </Panel>
            </>
          )}
        </section>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button onClick={() => go(step - 1)}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <Link
            to="/train"
            className="min-h-11 py-3 text-sm font-semibold underline underline-offset-4"
          >
            Cancel
          </Link>
        )}
        {step < 5 ? (
          <Button variant="primary" size="lg" disabled={!canNext} onClick={() => go(step + 1)}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            disabled={!plan || plan.sessions.every((s) => s.exercises.length === 0)}
            busy={saving}
            onClick={() => void accept()}
          >
            Use this plan
          </Button>
        )}
      </div>

      <SwapSheet
        plan={plan}
        target={replacing}
        onClose={() => setReplacing(null)}
        all={cat.exercises}
        onPick={(si, xi, id) => {
          const e = cat.byId.get(id);
          if (!e) return;
          editSession(si, (xs) =>
            xs.map((x, k) =>
              k === xi
                ? {
                    ...x,
                    exerciseId: e.id,
                    name: e.name,
                    pattern: e.pattern,
                    tracking: e.tracking,
                    primaryMuscles: e.primaryMuscles,
                    secondaryMuscles: e.secondaryMuscles,
                    equipment: e.equipment,
                    ...(e.tracking === "time"
                      ? { seconds: x.seconds ?? 30, repMin: undefined, repMax: undefined }
                      : { repMin: x.repMin ?? 8, repMax: x.repMax ?? 12, seconds: undefined }),
                  }
                : x,
            ),
          );
          setReplacing(null);
        }}
      />
    </>
  );
}

function SwapSheet({
  plan,
  target,
  onClose,
  all,
  onPick,
}: {
  plan: Plan | null;
  target: number | null;
  onClose: () => void;
  all: ReturnType<typeof useCatalogue>["exercises"];
  onPick: (si: number, xi: number, id: string) => void;
}) {
  const [busy, setBusy] = useState<EquipmentId[]>([]);
  const si = target == null ? -1 : Math.floor(target / 100);
  const xi = target == null ? -1 : target % 100;
  const cur = plan && target != null ? plan.sessions[si]?.exercises[xi] : undefined;
  const curEx = cur ? all.find((e) => e.id === cur.exerciseId) : undefined;
  const subs = useMemo(
    () =>
      plan && curEx
        ? substitutes(curEx, all, plan.input, {
            inSession: plan.sessions[si]!.exercises.map((e) => e.exerciseId),
            unavailable: busy,
            limit: 8,
          })
        : [],
    [plan, curEx, all, si, busy],
  );
  return (
    <Sheet
      open={target != null && !!cur}
      onOpenChange={(o) => !o && onClose()}
      title={cur ? `Swap ${cur.name}` : "Swap"}
      description="Same movement, equipment you have."
    >
      <div className="grid gap-3 pb-2">
        <div className="flex flex-wrap gap-2">
          {(["machine", "cable", "barbell", "dumbbell"] as EquipmentId[]).map((q) => (
            <Pill
              key={q}
              on={busy.includes(q)}
              onClick={() => setBusy((b) => (b.includes(q) ? b.filter((x) => x !== q) : [...b, q]))}
            >
              {EQUIPMENT_LABEL[q]} busy
            </Pill>
          ))}
        </div>
        {subs.length === 0 ? (
          <EmptyState
            title="No other options"
            body="Nothing else fits that movement with your kit."
          />
        ) : (
          <ul className="grid">
            {subs.map((s) => (
              <li key={s.exercise.id} className="border-t border-line first:border-t-0">
                <button
                  className="min-h-14 w-full py-3 text-left"
                  onClick={() => onPick(si, xi, s.exercise.id)}
                >
                  <span className="block font-display text-lg font-bold">{s.exercise.name}</span>
                  <span className="block text-sm text-muted-foreground">{s.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
