import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Repeat,
  Shuffle,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import { acceptPlan, NeedsChoice, type HandleExisting } from "@/data/plan-actions";
import { useCollection } from "@/data/hooks";
import { activeTemplates } from "@/data/selectors";
import { COL, type PlanRecord, type Session, type WorkoutTemplate } from "@/data/types";
import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  MUSCLE_LABEL,
  type CatalogueExercise,
  type EquipmentId,
  type MuscleId,
  type Pattern,
} from "@/domain/catalogue";
import { WEEKDAY_SHORT } from "@/domain/dates";
import { diffPlans, editedSince, toKey } from "@/domain/plan-diff";
import { schemeText } from "@/domain/plan-templates";
import {
  assessPlan,
  fillSlot,
  generatePlan,
  removeExercise,
  slotCandidates,
  substitutes,
  swapExercise,
  weeklyCredits,
  type Fix,
  type Plan,
  type PlanInput,
  type Style,
} from "@/domain/planner";
import type { Experience, Goal } from "@/domain/programmes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/train/build")({
  component: Builder,
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({
    from: typeof s.from === "string" ? s.from : undefined,
  }),
});

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
const nice = (s: string) => s.replace(/_/g, " ");

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
        "min-h-20 rounded-[1.25rem] border p-4 text-left transition active:scale-[0.99]",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-line bg-surface hover:border-foreground/40",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-display text-xl font-bold leading-tight [overflow-wrap:anywhere]">
          {title}
        </span>
        {selected && <Check className="size-[20px] shrink-0 text-primary" aria-hidden />}
      </span>
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
        "min-h-11 max-w-full rounded-full border px-4 text-sm font-semibold transition",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line text-foreground hover:border-foreground/40",
      )}
    >
      {on && <Check className="mr-1 inline size-[1em]" aria-hidden />}
      {children}
    </button>
  );
}

function Builder() {
  const nav = useNavigate();
  const { from } = Route.useSearch();
  const cat = useCatalogue();
  const kit = useEquipmentProfile();
  const favs = useFavourites();
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const plans = useCollection<PlanRecord>(COL.plans);
  const prior = from ? plans.items.find((p) => p.id === from) : undefined;

  const [step, setStep] = useState(from ? 5 : 0);
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
  const [variant, setVariant] = useState(0);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [handle, setHandle] = useState<HandleExisting | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ si: number; slotKey: string } | null>(null);
  const [fill, setFill] = useState<{ si: number; slotKey: string } | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Regeneration: start from the answers the plan was made with.
  useEffect(() => {
    if (!prior || seeded) return;
    const i = prior.input;
    setGoal(i.goal);
    setLevel(i.experience);
    setDays(i.daysPerWeek);
    setMinutes(i.sessionMinutes);
    setHave(i.equipment);
    setStyle(i.style ?? "mixed");
    setPriority(i.priorityMuscles ?? []);
    setAvoid(i.avoidPatterns ?? []);
    setPicked(i.preferredDays ?? []);
    setAdult(true);
    setClear(true);
    setVariant(prior.generation + 1);
    setSeeded(true);
  }, [prior, seeded]);

  const equipment = have ?? kit.have;
  const history = useMemo(() => {
    const h: Record<string, number> = {};
    for (const s of sessions.items)
      for (const e of s.exercises)
        if (e.catalogueId) h[e.catalogueId] = (h[e.catalogueId] ?? 0) + 1;
    return h;
  }, [sessions.items]);
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
    history,
    adult,
    clinicianRestricted: !clear,
    seed: variant ? `${prior?.seed.split(":")[0] ?? "vayvor"}:${variant}` : "vayvor",
    allowPartial: true,
  };
  const sig = JSON.stringify({ ...input, history: undefined, favourites: undefined });
  const generated = useMemo(
    () =>
      step === 5 && cat.snapshot && (!from || seeded)
        ? generatePlan(
            input,
            cat.exercises.filter((e) => e.source.provider !== "custom"),
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, cat.snapshot, sig, from, seeded],
  );
  useEffect(() => {
    setDraft(generated && generated.ok ? generated.plan : null);
    setSaveError(null);
  }, [generated]);
  const plan = draft;
  const assessment = useMemo(
    () => (plan ? assessPlan(plan, cat.exercises) : null),
    [plan, cat.exercises],
  );

  const existing = activeTemplates(templates.items);
  const oldTemplates = prior ? existing.filter((t) => prior.templateIds.includes(t.id)) : [];
  const handled = prior ? oldTemplates : existing;
  const edited = prior ? editedSince(prior.snapshot, templates.items) : false;
  const diff = useMemo(
    () =>
      prior && plan
        ? diffPlans(
            oldTemplates.map((t) => ({ title: t.title, exercises: t.exercises.map(toKey) })),
            plan.sessions.map((s) => ({
              title: s.title,
              exercises: s.exercises.map((x) => ({
                catalogueId: x.exerciseId,
                name: x.name,
                sets: x.sets,
                schemeText: schemeText(x),
              })),
            })),
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prior, plan, templates.items],
  );
  const loggedCount = prior
    ? sessions.items.filter((s) => prior.templateIds.includes(s.templateId)).length
    : 0;

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  const canNext = step === 4 ? adult && clear : true;
  const needsChoice = handled.length > 0;
  const blocked = !plan || !assessment?.canAccept || (needsChoice && !handle);

  const applyFix = (f: Fix) => {
    if (f.kind === "fill_slot") setFill({ si: f.sessionIndex, slotKey: f.slotKey });
    else if (f.kind === "add_equipment") setHave([...equipment, f.equipment]);
    else setMinutes(f.minutes);
  };

  const accept = async () => {
    if (!plan || !assessment?.canAccept) return;
    setSaving(true);
    setSaveError(null);
    try {
      await acceptPlan({
        plan,
        byId: cat.byId,
        handle: needsChoice ? (handle ?? undefined) : undefined,
        from: prior,
        equipment: !kit.configured || have ? equipment : undefined,
      });
      toast.success(prior ? "New plan saved. Your history is untouched." : "Plan saved.");
      nav({ to: "/train" });
    } catch (e) {
      setSaveError(
        e instanceof NeedsChoice
          ? e.message
          : "Nothing was changed: your schedule is exactly as it was. Check your connection to storage and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={prior ? "Regenerate plan" : `Plan builder · step ${step + 1} of ${STEPS.length}`}
        title={step === 5 ? (prior ? "A fresh take" : "Your plan") : "Build my plan"}
      />
      {!prior && (
        <ol className="mb-6 flex gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-foreground/15",
              )}
            >
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>
      )}

      {from && !prior && plans.ready && (
        <EmptyState
          title="That plan isn't here"
          body="It may have been replaced already."
          action={
            <Link to="/train" className="font-semibold underline">
              Back to Train
            </Link>
          }
        />
      )}

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
            This sets how many sets you start with and which exercises are suggested. You can always
            add more later.
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
                    "grid size-16 place-items-center rounded-[1.25rem] border font-display text-3xl font-extrabold",
                    days === n
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-line bg-surface",
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
                    "min-h-12 rounded-full border px-5 font-semibold",
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
                const idx = (i + 1) % 7;
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
          {generated && !generated.ok && (
            <EmptyState
              title="Can't build that"
              body={generated.message}
              action={
                <Button onClick={() => go(generated.kind === "unsupported" ? 4 : 2)}>
                  Change answers
                </Button>
              }
            />
          )}

          {plan && assessment && (
            <>
              <Panel aria-label="Summary" className="tint-green">
                <h2 className="display-title text-[clamp(1.9rem,8vw,3rem)]">
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
                <div className="mt-4">
                  <Button onClick={() => setVariant((v) => v + 1)}>
                    <Shuffle className="size-4" />
                    Try a different mix
                  </Button>
                </div>
              </Panel>

              {assessment.blockers.length > 0 && (
                <Panel aria-label="To fix before saving" className="border-warn/60">
                  <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                    <AlertTriangle className="size-5 text-warn" aria-hidden />
                    To fix before saving
                  </h3>
                  <ul className="mt-3 grid gap-4" role="list">
                    {assessment.blockers.map((b, i) => (
                      <li key={i}>
                        <p>{b.message}</p>
                        {b.fixes.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {b.fixes.map((f, k) => (
                              <Button
                                key={k}
                                size="sm"
                                variant="primary"
                                onClick={() => applyFix(f)}
                              >
                                {f.label}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Swap or remove the exercise, or change your kit in the Kit step.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {plan.suggestions.filter(
                    (s) =>
                      s.kind === "add_equipment" && s.equipment && !equipment.includes(s.equipment),
                  ).length > 0 && (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="eyebrow mb-2">Kit that would open up more options</p>
                      <div className="flex flex-wrap gap-2">
                        {plan.suggestions
                          .filter(
                            (s) =>
                              s.kind === "add_equipment" &&
                              s.equipment &&
                              !equipment.includes(s.equipment),
                          )
                          .map((s) => (
                            <Button
                              key={s.equipment}
                              size="sm"
                              onClick={() => setHave([...equipment, s.equipment!])}
                            >
                              Add {EQUIPMENT_LABEL[s.equipment!]}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </Panel>
              )}

              {diff && (
                <Panel aria-label="What changes">
                  <h3 className="font-display text-2xl font-bold">What changes</h3>
                  {edited && (
                    <p className="mt-1 text-sm text-warn">
                      You've edited this plan's workouts since it was created. Choosing "Replace"
                      archives your edited versions too (they stay recoverable).
                    </p>
                  )}
                  <ul className="mt-3 grid gap-3">
                    {diff.sessions.map((d) => (
                      <li key={d.title}>
                        <p className="font-semibold">{d.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0
                            ? "No changes."
                            : null}
                        </p>
                        {d.added.map((x) => (
                          <p key={"a" + x} className="text-sm">
                            + {x}
                          </p>
                        ))}
                        {d.removed.map((x) => (
                          <p key={"r" + x} className="text-sm text-muted-foreground line-through">
                            {x}
                          </p>
                        ))}
                        {d.changed.map((x) => (
                          <p key={"c" + x.name} className="text-sm">
                            {x.name}: {x.from} → {x.to}
                          </p>
                        ))}
                      </li>
                    ))}
                    {diff.sessionsAdded.map((t) => (
                      <li key={t} className="text-sm">
                        + New workout: {t}
                      </li>
                    ))}
                    {diff.sessionsRemoved.map((t) => (
                      <li key={t} className="text-sm text-muted-foreground">
                        Workout no longer in the plan: {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {loggedCount} logged {loggedCount === 1 ? "session stays" : "sessions stay"} in
                    your history whatever you choose.
                  </p>
                </Panel>
              )}

              {plan.sessions.map((s, si) => (
                <Panel key={s.title + si} aria-label={s.title}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight">
                      {s.title}
                    </h3>
                    <span
                      className={cn(
                        "eyebrow shrink-0",
                        s.estimatedMinutes > minutes && "!text-destructive",
                      )}
                    >
                      ~{s.estimatedMinutes} min · {WEEKDAY_SHORT[(s.weekday + 6) % 7]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.focus}</p>
                  {s.dropped.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Left out to fit your time or weekly limits: {s.dropped.join(", ")}.
                    </p>
                  )}
                  <ul className="mt-3 grid">
                    {s.slots.map((slot) => {
                      const x = s.exercises.find((e) => e.slotKey === slot.key);
                      if (!x) {
                        if (slot.priority > 2) return null;
                        return (
                          <li
                            key={slot.key}
                            className="flex items-center gap-3 border-t border-dashed border-warn/60 py-3 first:border-t-0"
                          >
                            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                              Missing: main {nice(slot.patterns[0]!)} exercise
                            </p>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setFill({ si, slotKey: slot.key })}
                            >
                              <Plus className="size-4" />
                              Choose
                            </Button>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={slot.key}
                          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line py-3 first:border-t-0"
                        >
                          <div className="min-w-[min(10rem,100%)] flex-1">
                            <p className="font-display text-lg font-bold leading-tight [overflow-wrap:anywhere]">
                              {x.name}
                            </p>
                            <p className="tnum text-sm text-muted-foreground">
                              {schemeText(x)} · rest{" "}
                              {x.restSec >= 60
                                ? `${Math.round((x.restSec / 60) * 2) / 2} min`
                                : `${x.restSec}s`}
                              {x.superset && (
                                <>
                                  {" "}
                                  · <Chip>Superset</Chip>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-1">
                            <Button
                              size="sm"
                              aria-label={`Swap ${x.name}`}
                              onClick={() => setSwap({ si, slotKey: slot.key })}
                            >
                              <Repeat className="size-4" />
                              Swap
                            </Button>
                            <button
                              aria-label={`Remove ${x.name}`}
                              className="grid size-[44px] shrink-0 place-items-center rounded-full hover:bg-surface-2"
                              onClick={() => setDraft(removeExercise(plan, si, slot.key))}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {s.slots.some(
                    (slot) => !s.exercises.some((e) => e.slotKey === slot.key) && slot.priority > 2,
                  ) && (
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
                      {s.slots
                        .filter(
                          (slot) =>
                            !s.exercises.some((e) => e.slotKey === slot.key) && slot.priority > 2,
                        )
                        .map((slot) => (
                          <Button
                            key={slot.key}
                            size="sm"
                            onClick={() => setFill({ si, slotKey: slot.key })}
                          >
                            <Plus className="size-4" />
                            {nice(slot.patterns[0]!)}
                          </Button>
                        ))}
                    </div>
                  )}
                </Panel>
              ))}

              {assessment.warnings.length > 0 && (
                <Panel aria-label="Worth knowing">
                  <h3 className="eyebrow mb-2">Worth knowing</h3>
                  <ul className="grid gap-1 text-sm text-muted-foreground">
                    {assessment.warnings.map((i, k) => (
                      <li key={k}>
                        {i.session ? `${i.session}: ` : ""}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel aria-label="Weekly volume">
                <h3 className="eyebrow mb-2">Hard sets per muscle per week (estimate)</h3>
                <p className="tnum text-sm text-muted-foreground">
                  {[...weeklyCredits(plan.sessions)]
                    .filter(([, n]) => n >= 1)
                    .sort((a, b) => b[1] - a[1])
                    .map(([m, n]) => `${MUSCLE_LABEL[m]} ${Math.round(n * 10) / 10}`)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Draft rules, not yet reviewed by a qualified coach (see docs/TRAINING-RULES.md).
                </p>
              </Panel>
              <Panel>
                <h3 className="eyebrow mb-2">Starting weights</h3>
                <p className="text-sm">
                  None are set. Find a weight where the last reps are hard but clean, then log it;
                  VAYVOR suggests when to go up.
                </p>
                {needsChoice && (
                  <div
                    className="mt-4 grid gap-2"
                    role="radiogroup"
                    aria-label="What to do with your current workouts"
                  >
                    <p className="text-sm font-semibold">
                      Your current {prior ? "plan's " : ""}workouts ({handled.length}): choose what
                      happens to them
                    </p>
                    <Choice
                      selected={handle === "add"}
                      onClick={() => setHandle("add")}
                      title="Keep them, add these unscheduled"
                      body="Nothing about your current schedule changes. Place the new workouts on the week yourself."
                    />
                    <Choice
                      selected={handle === "replace"}
                      onClick={() => setHandle("replace")}
                      title="Replace them with this plan"
                      body="The old workouts are archived, not deleted: restore them any time from Train. Logged sessions are never changed."
                    />
                  </div>
                )}
              </Panel>
            </>
          )}
          {saveError && (
            <Panel role="alert" aria-live="assertive" className="border-destructive/60">
              <p className="font-semibold text-destructive">Couldn't save</p>
              <p className="mt-1 text-sm">{saveError}</p>
              <div className="mt-3">
                <Button variant="primary" onClick={() => void accept()}>
                  Try again
                </Button>
              </div>
            </Panel>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-2">
        {step === 5 && plan && assessment && !assessment.canAccept && (
          <p className="text-sm text-muted-foreground" role="status">
            Resolve the items above to save this plan.
          </p>
        )}
        {step === 5 && plan && needsChoice && !handle && assessment?.canAccept && (
          <p className="text-sm text-muted-foreground" role="status">
            Choose what happens to your current workouts to continue.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 0 && !(prior && step === 5) ? (
            <Button onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <Link
              to="/train"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
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
              disabled={blocked}
              busy={saving}
              onClick={() => void accept()}
            >
              {prior ? "Use this version" : "Use this plan"}
            </Button>
          )}
        </div>
      </div>

      <PickSheet
        title="Swap exercise"
        open={!!swap}
        onClose={() => setSwap(null)}
        busyFilter
        options={(busy) => {
          if (!plan || !swap) return [];
          const s = plan.sessions[swap.si]!;
          const cur = s.exercises.find((x) => x.slotKey === swap.slotKey);
          const e = cur ? cat.byId.get(cur.exerciseId) : undefined;
          return e
            ? substitutes(e, cat.exercises, plan.input, {
                inSession: s.exercises.map((x) => x.exerciseId),
                unavailable: busy,
                limit: 8,
              }).map((x) => ({ e: x.exercise, why: x.reason }))
            : [];
        }}
        onPick={(e) => {
          if (plan && swap) setDraft(swapExercise(plan, swap.si, swap.slotKey, e));
          setSwap(null);
        }}
      />
      <PickSheet
        title="Choose an exercise"
        open={!!fill}
        onClose={() => setFill(null)}
        options={() =>
          plan && fill
            ? slotCandidates(plan, fill.si, fill.slotKey, cat.exercises, 10).map((e) => ({
                e,
                why: `Works ${e.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(", ")}${e.equipment.length ? ` with ${e.equipment.map((m) => EQUIPMENT_LABEL[m]).join(", ")}` : ", no kit needed"}.`,
              }))
            : []
        }
        onPick={(e) => {
          if (plan && fill) setDraft(fillSlot(plan, fill.si, fill.slotKey, e));
          setFill(null);
        }}
      />
    </>
  );
}

function PickSheet({
  title,
  open,
  onClose,
  options,
  onPick,
  busyFilter,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  options: (busy: EquipmentId[]) => { e: CatalogueExercise; why: string }[];
  onPick: (e: CatalogueExercise) => void;
  busyFilter?: boolean;
}) {
  const [busy, setBusy] = useState<EquipmentId[]>([]);
  const opts = open ? options(busy) : [];
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description="Only exercises that fit your kit and this movement."
    >
      <div className="grid gap-3 pb-2">
        {busyFilter && (
          <div className="flex flex-wrap gap-2">
            {(["machine", "cable", "barbell", "dumbbell"] as EquipmentId[]).map((q) => (
              <Pill
                key={q}
                on={busy.includes(q)}
                onClick={() =>
                  setBusy((b) => (b.includes(q) ? b.filter((x) => x !== q) : [...b, q]))
                }
              >
                {EQUIPMENT_LABEL[q]} busy
              </Pill>
            ))}
          </div>
        )}
        {opts.length === 0 ? (
          <EmptyState
            title="No options with your kit"
            body="Add equipment in the Kit step to unlock more."
          />
        ) : (
          <ul className="grid">
            {opts.map(({ e, why }) => (
              <li key={e.id} className="border-t border-line first:border-t-0">
                <button className="min-h-14 w-full py-3 text-left" onClick={() => onPick(e)}>
                  <span className="block font-display text-lg font-bold [overflow-wrap:anywhere]">
                    {e.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">{why}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
