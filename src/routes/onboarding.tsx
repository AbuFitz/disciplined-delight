import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BuddyCharacter } from "@/components/buddy/BuddyCharacter";
import { BuddySetup } from "@/components/buddy/BuddySetup";
import { ColourWorldPicker } from "@/components/nl/colour-world";
import { Chip, ProgressMap, Row } from "@/components/onboarding/parts";
import "@/components/onboarding/journey.css";
import { Wordmark } from "@/components/brand/Wordmark";
import {
  ProfileApiError,
  profileApi,
  setReadyProfile,
  useAccountProfile,
} from "@/data/account-profile";
import { saveProfile } from "@/data/actions";
import { useCatalogue, useEquipmentProfile } from "@/data/catalogue-runtime";
import { saveCompanionConfig } from "@/data/companion";
import { put } from "@/data/db";
import { NeedsChoice, acceptPlan } from "@/data/plan-actions";
import { saveReminderPrefs } from "@/data/reminders";
import type { AppModule, Profile } from "@/data/types";
import { COL } from "@/data/types";
import { generatePlan, type Plan } from "@/domain/planner";
import { schemeText } from "@/domain/plan-templates";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/domain/dates";
import { DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
import {
  AVOID_OPTIONS,
  DEFAULT_ANSWERS,
  DEFERRED,
  DRAFT_KEY,
  FIRST_DAY_STEPS,
  INTENT_OPTIONS,
  KIT_CHOICES,
  KIT_DEFAULTS,
  LEVEL_OPTIONS,
  MINUTE_OPTIONS,
  PLACE_OPTIONS,
  QUICK_STEPS,
  STEP_LABEL,
  WHY,
  furthestValid,
  parseDraft,
  serialiseDraft,
  stepValid,
  toPlanInput,
  toPlanningProfile,
  type Answers,
  type StepId,
} from "@/domain/onboarding";
import { EQUIPMENT_LABEL } from "@/domain/catalogue";
import { DEFAULT_REMINDER_PREFS } from "@/domain/reminders";
import { checkUsername } from "@/domain/username";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useReducedMotionPref } from "@/lib/media-prefs";

const STEP_IDS = new Set<string>([...QUICK_STEPS, "personalise"]);
export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>): { s?: StepId } =>
    typeof s.s === "string" && STEP_IDS.has(s.s) ? { s: s.s as StepId } : {},
  component: OnboardingPage,
});

const HINT: Record<StepId, string> = {
  intent: "One decision per screen. Skip anything you like.",
  experience: "No wrong answer. This just sets a comfortable start.",
  constraints: "Optional. Only what you want us to know.",
  days: "Pick days you can really keep.",
  time: "Shorter and regular beats long and rare.",
  kit: "Only exercises you can actually do.",
  plan: "Here's what I'd start with, and why.",
  start: "Last step. Everything else can wait.",
  personalise: "Make me look and sound like yours.",
};
const TITLE: Record<StepId, string> = {
  intent: "What do you want from training?",
  experience: "How would you describe your experience?",
  constraints: "Anything to avoid or keep safe?",
  days: "Which days can you train?",
  time: "How long can each session be?",
  kit: "Where will you train, and with what?",
  plan: "Your first week",
  start: "Ready to start",
  personalise: "Make it yours",
};
const LEAD: Partial<Record<StepId, string>> = {
  intent: "Pick the closest. You can change it later.",
  experience: "This sets how much we start with.",
  days: "At least two days. Rest days matter too.",
  time: "Including warm-up. You can shorten any session later.",
  kit: "Choose where, then tick what you have.",
};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const MODULES: AppModule[] = ["training", "nutrition", "routines"];

function OnboardingPage() {
  const nav = useNavigate();
  const { s } = Route.useSearch();
  const { user } = useAuth();
  const account = useAccountProfile();
  const equipment = useEquipmentProfile();
  const cat = useCatalogue();
  const reduced = useReducedMotionPref();
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [buddy, setBuddy] = useState<CompanionConfig>(DEFAULT_COMPANION);
  const [buddyTouched, setBuddyTouched] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "free" | "taken" | "error"
  >("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  const needsHandle = !!user && account.state.status !== "ready";
  const ctx = useMemo(() => ({ needsHandle }), [needsHandle]);
  const syntax = checkUsername(answers.username);
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((old) => ({ ...old, [key]: value }));

  // Resume: restore the draft once, then land on the furthest screen the answers allow.
  useEffect(() => {
    if (hydrated) return;
    let draft = null;
    try {
      draft = parseDraft(localStorage.getItem(DRAFT_KEY));
    } catch {
      /* storage unavailable: start fresh */
    }
    if (draft) {
      setAnswers(draft.answers);
      if (!s && draft.step !== "intent") {
        setResumed(true);
        nav({
          to: "/onboarding",
          search: { s: furthestValid(draft.step, draft.answers, ctx) },
          replace: true,
        });
      }
    }
    setHydrated(true);
  }, [hydrated, s, nav, ctx]);

  const step: StepId = s ?? "intent";
  const reachable = furthestValid(step, answers, ctx);
  useEffect(() => {
    if (!hydrated) return;
    if (reachable !== step) nav({ to: "/onboarding", search: { s: reachable }, replace: true });
  }, [hydrated, reachable, step, nav]);

  // Autosave every change, so leaving or closing the tab never loses an answer.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, serialiseDraft(step, answers));
    } catch {
      /* storage unavailable: the journey still works for this visit */
    }
  }, [hydrated, step, answers]);

  // Prefill from an existing account profile.
  useEffect(() => {
    if (account.state.status === "ready" && !answers.username)
      setAnswers((a) => ({
        ...a,
        username: account.state.status === "ready" ? account.state.profile.username : "",
        name:
          a.name || (account.state.status === "ready" ? account.state.profile.display_name : ""),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.state.status]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: false });
    document.title = `${STEP_LABEL[step]} · Set up VAYVOR`;
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (!needsHandle || !answers.username || !syntax.ok) return setAvailability("idle");
    setAvailability("checking");
    const t = setTimeout(
      () =>
        void profileApi.available(answers.username).then(
          (free) => setAvailability(free ? "free" : "taken"),
          () => setAvailability("error"),
        ),
      350,
    );
    return () => clearTimeout(t);
  }, [needsHandle, answers.username, syntax.ok]);

  const go = (to: StepId, replace = false) =>
    nav({ to: "/onboarding", search: { s: to }, replace });
  const idx = QUICK_STEPS.indexOf(step === "personalise" ? "start" : step);
  const next = () => {
    if (!stepValid(step, answers, ctx)) return;
    if (step === "personalise") return go("start");
    if (idx < QUICK_STEPS.length - 1) go(QUICK_STEPS[idx + 1]!);
  };
  const back = () => {
    if (step === "personalise") return go("start");
    if (idx > 0) go(QUICK_STEPS[idx - 1]!);
  };

  // First-week plan, generated from the answers with the same generator as the plan builder.
  const planKey = JSON.stringify(toPlanInput(answers));
  const generated = useMemo(
    () =>
      step === "plan" || step === "start"
        ? cat.snapshot
          ? generatePlan(
              toPlanInput(answers),
              cat.exercises.filter((e) => e.source.provider !== "custom"),
            )
          : null
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step === "plan" || step === "start", cat.snapshot, planKey],
  );
  const plan: Plan | null = generated && generated.ok ? generated.plan : null;

  const finish = async (skipped = false) => {
    if (needsHandle && !skipped && !stepValid("start", answers, ctx)) return;
    setBusy(true);
    setError(null);
    try {
      let handle: string | undefined;
      const tz = timezone();
      const displayName = answers.name.trim();
      if (user) {
        const saved =
          account.state.status === "ready"
            ? await profileApi.update({
                username: answers.username.trim(),
                displayName,
                timezone: tz,
              })
            : await profileApi.create(answers.username.trim(), displayName, tz);
        setReadyProfile(user.id, saved);
        handle = saved.username;
      }
      const planning = toPlanningProfile(answers);
      const kit = skipped ? (["bodyweight"] as const) : answers.kit;
      await Promise.all([
        saveProfile({
          name: displayName,
          username: handle,
          timezone: tz,
          modules: skipped ? ["training", "routines"] : MODULES,
          pillars: ["body", "mind"] as NonNullable<Profile["pillars"]>,
          goal: { kind: skipped ? "strength" : planning.primaryGoal },
          planning,
          returnToTraining: !skipped && answers.level === "returning",
          setup: {
            goals: !skipped,
            routine: true,
            prayer: true,
            food: false,
            completed: true,
            skipped,
          },
        }),
        equipment.save([...kit]),
        buddyTouched
          ? saveCompanionConfig({ ...buddy, name: buddy.name.trim() || buddy.name })
          : Promise.resolve(),
        saveReminderPrefs({
          ...DEFAULT_REMINDER_PREFS,
          training: { enabled: !skipped, leadMinutes: 60 },
          food: { enabled: false, time: "20:00" },
          prayer: { ...DEFAULT_REMINDER_PREFS.prayer, enabled: false },
          quiet: {
            enabled: true,
            start: planning.quiet.start,
            end: planning.quiet.end,
            allowFajr: false,
          },
        }),
      ]);
      if (!skipped && plan) {
        const args = { plan, byId: cat.byId, equipment: answers.kit };
        try {
          await acceptPlan(args);
        } catch (e) {
          if (e instanceof NeedsChoice) await acceptPlan({ ...args, handle: "add" });
          else throw e;
        }
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      toast.success(skipped ? "Start simple. Personalise any time." : "Your first week is ready");
      // Reload once at the setup boundary so the shell reads the saved profile before its redirect guard runs.
      window.location.replace("/");
    } catch (caught) {
      if (caught instanceof ProfileApiError && caught.code === "username_taken") {
        setAvailability("taken");
        setError("Someone just took that handle. Try another.");
      } else if (caught instanceof ProfileApiError && caught.code === "profile_exists")
        nav({ to: "/", replace: true });
      else
        setError(
          caught instanceof Error
            ? caught.message
            : "Couldn't save your setup. Your answers are kept.",
        );
    } finally {
      setBusy(false);
    }
  };

  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const valid = stepValid(step, answers, ctx);
  const lastQuick = step === "start";
  const why = WHY[step];
  const startOver = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setAnswers(DEFAULT_ANSWERS);
    setResumed(false);
    go("intent");
  };

  return (
    <div className="jr">
      <header className="jr-head">
        <Link to="/" aria-label="VAYVOR" className="flex min-h-11 items-center">
          <Wordmark className="text-[1rem]" />
        </Link>
        <button type="button" className="jr-skip" disabled={busy} onClick={() => void finish(true)}>
          Skip setup
        </button>
      </header>
      <div className="jr-body">
        <ProgressMap steps={QUICK_STEPS} current={step} />
        <form
          className="jr-col flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (lastQuick) void finish();
            else next();
          }}
        >
          <main className="jr-main" aria-busy={busy}>
            {resumed && (
              <p className="jr-note" role="status">
                Picking up where you left off.{" "}
                <button type="button" className="jr-link" onClick={startOver}>
                  Start over
                </button>
              </p>
            )}
            <div className="jr-hint">
              <BuddyCharacter
                variant={buddy.variant}
                state={step === "plan" ? "point" : step === "start" ? "encourage" : "explain"}
                motion={reduced ? "off" : buddy.motion}
                palette={buddy.palette}
                expression={buddy.expression}
                size={40}
                name={buddy.name}
              />
              <span>{HINT[step]}</span>
            </div>
            <h1 ref={heading} tabIndex={-1} className="jr-h1">
              {TITLE[step]}
            </h1>
            {LEAD[step] && <p className="jr-lead">{LEAD[step]}</p>}
            {why && (
              <details className="jr-why">
                <summary>Why we ask</summary>
                <p>{why}</p>
              </details>
            )}

            {step === "intent" && (
              <fieldset className="jr-rows">
                <legend className="sr-only">Training outcome</legend>
                {INTENT_OPTIONS.map((o) => (
                  <Row
                    key={o.id}
                    name="intent"
                    on={answers.intent === o.id}
                    onChange={() => set("intent", o.id)}
                    title={o.title}
                    text={o.text}
                  />
                ))}
              </fieldset>
            )}

            {step === "experience" && (
              <fieldset className="jr-rows">
                <legend className="sr-only">Experience</legend>
                {LEVEL_OPTIONS.map((o) => (
                  <Row
                    key={o.id}
                    name="level"
                    on={answers.level === o.id}
                    onChange={() => set("level", o.id)}
                    title={o.title}
                    text={o.text}
                  />
                ))}
              </fieldset>
            )}

            {step === "constraints" && (
              <>
                <fieldset className="jr-rows">
                  <legend className="jr-sub">Needed to build a plan</legend>
                  <Row
                    type="checkbox"
                    name="adult"
                    on={answers.adult}
                    onChange={() => set("adult", !answers.adult)}
                    title="I'm 18 or over"
                    text="VAYVOR plans are for adults."
                  />
                </fieldset>
                <fieldset className="jr-chips">
                  <legend className="jr-sub w-full">Leave these out (optional)</legend>
                  {AVOID_OPTIONS.map((o) => (
                    <Chip
                      key={o.id}
                      name="avoid"
                      on={answers.avoid.includes(o.id)}
                      onChange={() => set("avoid", toggle(answers.avoid, o.id))}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </fieldset>
                <label className="jr-field">
                  Anything else we should know? (optional)
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={answers.note}
                    onChange={(e) => set("note", e.target.value)}
                    placeholder="For example: sore left knee"
                  />
                </label>
                <fieldset className="jr-rows">
                  <Row
                    type="checkbox"
                    name="clinician"
                    on={answers.clinicianRestricted}
                    onChange={() => set("clinicianRestricted", !answers.clinicianRestricted)}
                    title="A clinician has limited my exercise"
                    text="Then VAYVOR won't build a plan. Follow their advice."
                  />
                </fieldset>
                {answers.clinicianRestricted && (
                  <p className="jr-note" role="status">
                    Understood. We'll set you up without a plan, so you can log what your clinician
                    says is safe.
                  </p>
                )}
              </>
            )}

            {step === "days" && (
              <>
                <fieldset className="jr-days">
                  <legend className="sr-only">Training days</legend>
                  {WEEKDAY_SHORT.map((d, i) => (
                    <label key={d} className="jr-day" data-on={answers.days.includes(i)}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        name="days"
                        aria-label={WEEKDAY_LONG[i]}
                        checked={answers.days.includes(i)}
                        onChange={() =>
                          set(
                            "days",
                            toggle(answers.days, i).sort((a, b) => a - b),
                          )
                        }
                      />
                      {d}
                    </label>
                  ))}
                </fieldset>
                <p className="jr-lead" aria-live="polite">
                  {answers.days.length >= 2
                    ? `${answers.days.length} days a week`
                    : "Pick at least 2 days"}
                </p>
              </>
            )}

            {step === "time" && (
              <fieldset className="jr-rows">
                <legend className="sr-only">Session length</legend>
                {MINUTE_OPTIONS.map((m) => (
                  <Row
                    key={m}
                    name="minutes"
                    on={answers.minutes === m}
                    onChange={() => set("minutes", m)}
                    title={`${m} minutes`}
                    text={
                      m <= 30
                        ? "Short and focused"
                        : m <= 45
                          ? "A solid standard session"
                          : m <= 60
                            ? "Room for accessories"
                            : "Longer, fuller sessions"
                    }
                  />
                ))}
              </fieldset>
            )}

            {step === "kit" && (
              <>
                <fieldset className="jr-rows">
                  <legend className="sr-only">Where you train</legend>
                  {PLACE_OPTIONS.map((o) => (
                    <Row
                      key={o.id}
                      name="place"
                      on={answers.place === o.id}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, place: o.id, kit: KIT_DEFAULTS[o.id] }))
                      }
                      title={o.title}
                      text={o.text}
                    />
                  ))}
                </fieldset>
                {answers.place && (
                  <fieldset className="jr-chips">
                    <legend className="jr-sub w-full">What you have</legend>
                    {KIT_CHOICES.map((k) => (
                      <Chip
                        key={k}
                        name="kit"
                        on={answers.kit.includes(k)}
                        onChange={() => set("kit", toggle(answers.kit, k))}
                      >
                        {EQUIPMENT_LABEL[k]}
                      </Chip>
                    ))}
                  </fieldset>
                )}
              </>
            )}

            {step === "plan" && (
              <PlanPreview
                answers={answers}
                plan={plan}
                ready={!!cat.snapshot}
                generated={generated}
                onChange={() => go("constraints")}
              />
            )}

            {step === "start" && (
              <StartScreen
                answers={answers}
                setAnswers={setAnswers}
                plan={plan}
                go={go}
                needsHandle={needsHandle}
                signedIn={!!user}
                availability={availability}
                syntaxError={answers.username ? (syntax.ok ? undefined : syntax.reason) : undefined}
              />
            )}

            {step === "personalise" && (
              <div className="grid gap-8">
                <ColourWorldPicker />
                <BuddySetup
                  progressive
                  value={buddy}
                  onChange={(b) => {
                    setBuddy(b);
                    setBuddyTouched(true);
                  }}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="jr-error">
                {error}
              </p>
            )}
          </main>
          <div className="jr-bar">
            <div className="jr-bar-in">
              {(idx > 0 || step === "personalise") && (
                <button
                  type="button"
                  className="jr-btn jr-btn-ghost"
                  onClick={back}
                  disabled={busy}
                >
                  Back
                </button>
              )}
              <button type="submit" className="jr-btn jr-btn-primary" disabled={!valid || busy}>
                {busy
                  ? "Saving…"
                  : lastQuick
                    ? plan
                      ? "Start my first week"
                      : "Start"
                    : step === "personalise"
                      ? "Done"
                      : step === "plan"
                        ? "Looks good"
                        : step === "constraints"
                          ? "Continue"
                          : "Continue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanPreview({
  answers,
  plan,
  ready,
  generated,
  onChange,
}: {
  answers: Answers;
  plan: Plan | null;
  ready: boolean;
  generated: ReturnType<typeof generatePlan> | null;
  onChange: () => void;
}) {
  if (!ready || !generated)
    return <div className="jr-skel" role="status" aria-label="Building your plan" />;
  if (!generated.ok)
    return (
      <>
        <p className="jr-note" role="status">
          {generated.message}
        </p>
        <p className="jr-lead">
          You can still start. Log your own sessions, or build a plan later in Training.
        </p>
        <button type="button" className="jr-link" onClick={onChange}>
          Change my answers
        </button>
      </>
    );
  const first = plan!.sessions[0];
  const dayName = (wd: number) => WEEKDAY_SHORT[(wd + 6) % 7];
  const why = [
    `You chose ${answers.days.length} days of ${answers.minutes} minutes, so each session is fitted to ${answers.minutes} minutes.`,
    `Exercises come only from the kit you ticked.`,
    answers.avoid.length
      ? `Left out: ${answers.avoid.map((a) => AVOID_OPTIONS.find((o) => o.id === a)?.label.toLowerCase()).join(", ")}.`
      : "",
    ...plan!.rationale.slice(0, 2),
  ].filter(Boolean);
  return (
    <>
      <ol className="jr-plan" aria-label="Weekly sessions">
        {plan!.sessions.map((s, i) => (
          <li key={i}>
            <b>{dayName(s.weekday)}</b>
            <span>
              {s.title}
              <small>
                {s.focus} · about {s.estimatedMinutes} min
              </small>
            </span>
          </li>
        ))}
      </ol>
      <p className="jr-sub">Why this</p>
      <ul className="jr-list">
        {why.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      {first && (
        <details className="jr-why" open>
          <summary>First day, step by step</summary>
          <ol className="jr-plan">
            {first.exercises.slice(0, 5).map((x) => (
              <li key={x.slotKey}>
                <b>{x.sets}×</b>
                <span>
                  {x.name}
                  <small>{schemeText(x)}</small>
                </span>
              </li>
            ))}
          </ol>
          <ul className="jr-list">
            {FIRST_DAY_STEPS.map((f) => (
              <li key={f.title}>
                <strong>{f.title}.</strong> {f.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="jr-lead">
        Loads start from your own first logged sets. Nothing is guessed from your body weight.
      </p>
    </>
  );
}

function StartScreen({
  answers,
  setAnswers,
  plan,
  go,
  needsHandle,
  signedIn,
  availability,
  syntaxError,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  plan: Plan | null;
  go: (s: StepId) => void;
  needsHandle: boolean;
  signedIn: boolean;
  availability: "idle" | "checking" | "free" | "taken" | "error";
  syntaxError?: string;
}) {
  const rows: [string, string, StepId][] = [
    ["Outcome", INTENT_OPTIONS.find((o) => o.id === answers.intent)?.title ?? "", "intent"],
    ["Experience", LEVEL_OPTIONS.find((o) => o.id === answers.level)?.title ?? "", "experience"],
    ["Days", answers.days.map((d) => WEEKDAY_SHORT[d]).join(" "), "days"],
    ["Time", `${answers.minutes} minutes`, "time"],
    [
      "Kit",
      `${PLACE_OPTIONS.find((o) => o.id === answers.place)?.title ?? ""} · ${answers.kit.length} items`,
      "kit",
    ],
  ];
  return (
    <>
      <dl className="jr-review">
        {rows.map(([k, v, to]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
            <button
              type="button"
              className="jr-link"
              onClick={() => go(to)}
              aria-label={`Change ${k.toLowerCase()}`}
            >
              Change
            </button>
          </div>
        ))}
      </dl>
      <p className="jr-lead">
        {plan
          ? `${plan.sessions.length} sessions ready for your first week.`
          : "No plan yet. You can build one any time in Training."}
      </p>

      <p className="jr-sub">Your name (optional)</p>
      <label className="jr-field">
        <span className="sr-only">Your name</span>
        <input
          type="text"
          autoComplete="given-name"
          maxLength={60}
          value={answers.name}
          onChange={(e) => setAnswers((a) => ({ ...a, name: e.target.value }))}
        />
      </label>
      {needsHandle && (
        <label className="jr-field">
          Choose a handle (required for your account)
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            value={answers.username}
            onChange={(e) => setAnswers((a) => ({ ...a, username: e.target.value }))}
            aria-describedby="handle-state"
          />
          <span
            id="handle-state"
            className="text-xs font-normal text-muted-foreground"
            aria-live="polite"
          >
            {syntaxError ??
              (availability === "checking"
                ? "Checking…"
                : availability === "free"
                  ? "Available"
                  : availability === "taken"
                    ? "Taken. Try another."
                    : availability === "error"
                      ? "Couldn't check right now."
                      : "Letters, numbers and underscores.")}
          </span>
        </label>
      )}

      <p className="jr-sub">Where your data lives</p>
      <ul className="jr-list">
        <li>Everything stays on this device unless you sign in. Local-first: it works offline.</li>
        {isSupabaseConfigured ? (
          signedIn ? (
            <li>You're signed in, so your plan can sync and back up across devices.</li>
          ) : (
            <li>
              Signing in unlocks sync between devices, backup and optional crews.{" "}
              <Link
                to="/welcome"
                search={{ mode: "signup" }}
                className="underline underline-offset-4"
              >
                Sign in or create an account
              </Link>
              . Your answers here are saved and wait for you.
            </li>
          )
        ) : (
          <li>Accounts aren't enabled in this build, so there is nothing to sign in to yet.</li>
        )}
      </ul>

      <p className="jr-sub">Everything else can wait</p>
      <details className="jr-why">
        <summary>What we didn't ask</summary>
        <ul className="jr-list">
          {DEFERRED.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p>All of it is in Settings, and Today's setup path suggests it one piece at a time.</p>
      </details>
      <button type="button" className="jr-link" onClick={() => go("personalise")}>
        Choose a colour world and companion now (optional)
      </button>
    </>
  );
}
