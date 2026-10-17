import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/nl/auth-ui";
import {
  Button,
  Field,
  NumberField,
  Select,
  Switch,
  TextArea,
  TextInput,
} from "@/components/nl/ui";
import {
  ProfileApiError,
  profileApi,
  setReadyProfile,
  useAccountProfile,
} from "@/data/account-profile";
import { saveProfile } from "@/data/actions";
import { useEquipmentProfile } from "@/data/catalogue-runtime";
import { setSalahEnabled } from "@/data/routine-actions";
import type { AppModule, PlanningProfile, Profile } from "@/data/types";
import { COL } from "@/data/types";
import { put } from "@/data/db";
import { saveReminderPrefs } from "@/data/reminders";
import { DEFAULT_REMINDER_PREFS } from "@/domain/reminders";
import { checkUsername } from "@/domain/username";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { setupGuide } from "@/domain/setup-guide";
import { useProfile } from "@/data/hooks";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

const MODULES: { id: AppModule; title: string; text: string }[] = [
  { id: "training", title: "Training", text: "Workouts, exercise library and progress." },
  { id: "nutrition", title: "Nutrition", text: "Meals, food targets and shopping." },
  { id: "mind", title: "Mind", text: "Focus sessions, check-ins and reflection." },
  { id: "routines", title: "Routines", text: "One plan for your day and week." },
  { id: "community", title: "Community", text: "Optional crews, challenges and sharing." },
  {
    id: "spirituality",
    title: "Spirituality",
    text: "Private reflection and optional faith tools.",
  },
];
const KIT = ["bodyweight", "dumbbell", "barbell", "cable", "machine", "band"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const timezones = () => {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  const list = supported ? supported("timeZone") : ["Europe/London", "UTC"];
  return list.includes("UTC") ? list : ["UTC", ...list];
};

function Choice({
  on,
  title,
  text,
  onClick,
}: {
  on: boolean;
  title: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
        on ? "border-primary bg-primary/10" : "border-input hover:bg-surface-2",
      )}
    >
      <span>
        <span className="block font-semibold">{title}</span>
        {text && <span className="block text-sm text-muted-foreground">{text}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border",
          on ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {on && <Check className="size-4" />}
      </span>
    </button>
  );
}

const defaults: PlanningProfile = {
  primaryGoal: "strength",
  secondaryGoals: [],
  experience: "new",
  trainingDays: [0, 2, 4],
  sessionMinutes: 45,
  environment: "gym",
  constraints: "",
  dislikedMovements: "",
  nutritionApproach: "balanced",
  dietaryNeeds: "",
  sleep: { start: "23:00", end: "07:00" },
  work: { start: "09:00", end: "17:00", weekdays: [0, 1, 2, 3, 4] },
  quiet: { start: "21:30", end: "07:30" },
  reminderIntensity: "essential",
  physiology: {
    units: "metric",
    activity: "moderate",
    recovery: "okay",
    energy: "okay",
    limitations: "",
    medicalSafetyFlag: false,
  },
};

function OnboardingPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const account = useAccountProfile();
  const localProfile = useProfile();
  const equipment = useEquipmentProfile();
  const zones = useMemo(timezones, []);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [modules, setModules] = useState<AppModule[]>(["training", "nutrition", "routines"]);
  const [faith, setFaith] = useState(false);
  const [kit, setKit] = useState<(typeof KIT)[number][]>(["bodyweight"]);
  const [plan, setPlan] = useState<PlanningProfile>(defaults);
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "free" | "taken" | "error"
  >("idle");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syntax = checkUsername(username);

  useEffect(() => {
    if (hydrated || !localProfile.ready) return;
    const profile = localProfile.profile;
    const server = account.state.status === "ready" ? account.state.profile : undefined;
    if (server) {
      setUsername(server.username);
      setName(server.display_name);
      setTimezone(server.timezone);
      setAvailability("free");
    } else if (profile) {
      setName(profile.name);
      setTimezone(profile.timezone);
    }
    if (profile?.modules?.length) setModules(profile.modules);
    if (profile?.planning) setPlan(profile.planning);
    setFaith(!!profile?.faithRoutines);
    if (equipment.configured)
      setKit(
        equipment.have.filter((item): item is (typeof KIT)[number] =>
          KIT.includes(item as (typeof KIT)[number]),
        ),
      );
    setHydrated(true);
  }, [hydrated, localProfile.ready, localProfile.profile, account.state, equipment]);

  useEffect(() => {
    if (!user || !username || !syntax.ok) return setAvailability("idle");
    if (account.state.status === "ready" && username === account.state.profile.username) {
      setAvailability("free");
      return;
    }
    setAvailability("checking");
    const timer = setTimeout(
      () =>
        void profileApi.available(username).then(
          (free) => setAvailability(free ? "free" : "taken"),
          () => setAvailability("error"),
        ),
      350,
    );
    return () => clearTimeout(timer);
  }, [user, username, syntax.ok, account.state]);

  const toggle = <T,>(list: T[], value: T, set: (value: T[]) => void) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const basicsValid = !user || (syntax.ok && availability !== "taken" && name.trim().length > 0);
  const valid =
    step === 0
      ? basicsValid
      : step === 1
        ? modules.length > 0
        : step === 3
          ? !modules.includes("training") || (plan.trainingDays.length > 0 && kit.length > 0)
          : true;

  const finish = async (skipped = false) => {
    if (!basicsValid) return setStep(0);
    setBusy(true);
    setError(null);
    try {
      let handle: string | undefined;
      if (user) {
        const savedAccount =
          account.state.status === "ready"
            ? await profileApi.update({
                username: username.trim(),
                displayName: name.trim(),
                timezone,
              })
            : await profileApi.create(username.trim(), name.trim(), timezone);
        setReadyProfile(user.id, savedAccount);
        handle = savedAccount.username;
      }
      const selected: AppModule[] = skipped ? ["training", "routines"] : modules;
      const prayer = !skipped && selected.includes("spirituality") && faith;
      const pillars: NonNullable<Profile["pillars"]> = [];
      if (selected.some((item) => item === "training" || item === "nutrition"))
        pillars.push("body");
      if (selected.some((item) => item === "mind" || item === "routines")) pillars.push("mind");
      if (selected.includes("spirituality")) pillars.push("soul");
      await Promise.all([
        saveProfile({
          name: name.trim(),
          username: handle,
          timezone,
          modules: selected,
          pillars,
          faithRoutines: prayer,
          goal: { kind: skipped ? "strength" : plan.primaryGoal },
          planning: skipped ? defaults : plan,
          returnToTraining: !skipped && plan.experience === "returning",
          setup: {
            goals: !skipped,
            routine: selected.includes("routines"),
            prayer: !prayer,
            food: !selected.includes("nutrition"),
            completed: true,
            skipped,
          },
        }),
        equipment.save(skipped ? ["bodyweight"] : kit),
        setSalahEnabled(prayer),
        skipped
          ? Promise.resolve()
          : put(COL.routine, "setup-sleep", {
              id: "setup-sleep",
              label: "Sleep",
              start: plan.sleep.start,
              end: plan.sleep.end,
              weekdays: [0, 1, 2, 3, 4, 5, 6],
              kind: "sleep",
              order: -20,
            }),
        skipped
          ? Promise.resolve()
          : put(COL.routine, "setup-work", {
              id: "setup-work",
              label: "Work / fixed hours",
              start: plan.work.start,
              end: plan.work.end,
              weekdays: plan.work.weekdays,
              kind: "work",
              order: -10,
            }),
        saveReminderPrefs({
          ...DEFAULT_REMINDER_PREFS,
          training: {
            enabled: !skipped && plan.reminderIntensity !== "off",
            leadMinutes: plan.reminderIntensity === "active" ? 90 : 60,
          },
          food: {
            enabled:
              !skipped &&
              modules.includes("nutrition") &&
              ["supportive", "active"].includes(plan.reminderIntensity),
            time: "20:00",
          },
          prayer: { ...DEFAULT_REMINDER_PREFS.prayer, enabled: prayer },
          quiet: {
            enabled: !skipped && plan.reminderIntensity !== "off",
            start: plan.quiet.start,
            end: plan.quiet.end,
            allowFajr: false,
          },
        }),
      ]);
      toast.success(skipped ? "Start simple—personalise any time" : "Your space is ready");
      // Reload once at the setup boundary so the app shell reads the saved profile
      // from IndexedDB before its new-guest redirect guard runs. A client-side
      // navigation can otherwise race the collection cache and reopen onboarding.
      window.location.replace("/");
    } catch (caught) {
      if (caught instanceof ProfileApiError && caught.code === "username_taken") {
        setAvailability("taken");
        setStep(0);
        setError("Someone just took that handle. Try another.");
      } else if (caught instanceof ProfileApiError && caught.code === "profile_exists")
        nav({ to: "/", replace: true });
      else setError(caught instanceof Error ? caught.message : "Couldn't save your setup.");
    } finally {
      setBusy(false);
    }
  };

  const titles = [
    "Start with you",
    "Choose your areas",
    "Faith is always optional",
    "Build your training fit",
    "Fit it around life",
    "Check your setup",
  ];
  const guide = setupGuide(step, {
    modules,
    safetyGate:
      !!plan.physiology?.medicalSafetyFlag ||
      plan.physiology?.ageBand === "under-18" ||
      /pain|injur|surgery|medical/i.test(
        `${plan.constraints} ${plan.physiology?.limitations ?? ""}`,
      ),
    days: plan.trainingDays.length,
    minutes: plan.sessionMinutes,
  });
  const intros = [
    user
      ? "Create the profile attached to your account. Your email stays private."
      : "A name is optional. Your timezone keeps the daily plan accurate.",
    "These areas feed the same Today view, weekly plan and progress story. Change them later.",
    "VAYVOR never infers religion. Faith-specific tools stay off unless you explicitly opt in.",
    "These choices change exercise selection, weekly volume and session length.",
    "Sleep, work and quiet hours shape scheduling, recovery and reminders.",
    "Your setup becomes a deterministic starting plan—not a permanent prescription.",
  ];

  return (
    <AuthLayout title={titles[step]!} intro={intros[step]!}>
      <div className="flex items-center gap-1.5" aria-label={`Setup step ${step + 1} of 6`}>
        {titles.map((_, index) => (
          <span
            key={index}
            className={cn("h-1.5 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-line")}
          />
        ))}
      </div>
      <aside className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4" aria-live="polite">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Buddy · {guide.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guide.body}</p>
        </div>
      </aside>

      {step === 0 && (
        <div className="grid gap-4">
          {user && (
            <Field
              label="Handle"
              htmlFor="setup-handle"
              hint="3–20 letters, numbers or underscores."
              error={
                username && !syntax.ok
                  ? syntax.reason
                  : availability === "taken"
                    ? "That handle is taken."
                    : undefined
              }
            >
              <TextInput
                id="setup-handle"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>
          )}
          <Field label={user ? "Display name" : "Name (optional)"} htmlFor="setup-name">
            <TextInput
              id="setup-name"
              autoComplete="name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field
            label="Timezone"
            htmlFor="setup-timezone"
            hint="Used for your day, plan and optional reminders."
          >
            <Select
              id="setup-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {zones.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {step === 1 && (
        <fieldset className="grid gap-2">
          <legend className="sr-only">Choose areas</legend>
          {MODULES.map((module) => (
            <Choice
              key={module.id}
              on={modules.includes(module.id)}
              title={module.title}
              text={module.text}
              onClick={() => toggle(modules, module.id, setModules)}
            />
          ))}
        </fieldset>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
            <p className="font-semibold">Muslim prayer tools</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adds Salah times, optional reminders and a private prayer log. Off by default.
            </p>
            {modules.includes("spirituality") && (
              <div className="mt-4">
                <Switch label="Include Muslim prayer tools" checked={faith} onChange={setFaith} />
              </div>
            )}
          </div>
          {!modules.includes("spirituality") && (
            <p className="text-sm text-muted-foreground">
              Spirituality is not selected, so no faith features will appear.
            </p>
          )}
          {modules.includes("spirituality") && !faith && (
            <p className="text-sm text-muted-foreground">
              Spirituality will remain religion-neutral private reflection.
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary goal">
              <Select
                value={plan.primaryGoal}
                onChange={(event) =>
                  setPlan({
                    ...plan,
                    primaryGoal: event.target.value as PlanningProfile["primaryGoal"],
                  })
                }
              >
                <option value="strength">Strength</option>
                <option value="gain-weight">Muscle / gain weight</option>
                <option value="lose-weight">Fat loss</option>
                <option value="maintain">General fitness</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Experience">
              <Select
                value={plan.experience}
                onChange={(event) =>
                  setPlan({
                    ...plan,
                    experience: event.target.value as PlanningProfile["experience"],
                  })
                }
              >
                <option value="new">New</option>
                <option value="returning">Returning</option>
                <option value="some">Some experience</option>
                <option value="experienced">Experienced</option>
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Secondary goals</legend>
            <div className="flex flex-wrap gap-2">
              {(["mobility", "endurance", "energy", "consistency"] as const).map((goal) => (
                <button
                  type="button"
                  key={goal}
                  aria-pressed={plan.secondaryGoals.includes(goal)}
                  onClick={() =>
                    toggle(plan.secondaryGoals, goal, (secondaryGoals) =>
                      setPlan({ ...plan, secondaryGoals }),
                    )
                  }
                  className={cn(
                    "min-h-11 rounded-full border px-4 capitalize",
                    plan.secondaryGoals.includes(goal)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </fieldset>
          {modules.includes("training") && (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Preferred training days</legend>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={plan.trainingDays.includes(index)}
                      onClick={() =>
                        toggle(plan.trainingDays, index, (trainingDays) =>
                          setPlan({ ...plan, trainingDays: trainingDays.sort() }),
                        )
                      }
                      className={cn(
                        "size-11 rounded-full border text-sm",
                        plan.trainingDays.includes(index)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {day.slice(0, 1)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Session length">
                  <NumberField
                    label="Minutes"
                    unit="min"
                    value={plan.sessionMinutes}
                    step={5}
                    decimals={0}
                    onChange={(sessionMinutes) =>
                      sessionMinutes && setPlan({ ...plan, sessionMinutes })
                    }
                  />
                </Field>
                <Field label="Environment">
                  <Select
                    value={plan.environment}
                    onChange={(event) =>
                      setPlan({
                        ...plan,
                        environment: event.target.value as PlanningProfile["environment"],
                      })
                    }
                  >
                    <option value="gym">Gym</option>
                    <option value="home">Home</option>
                    <option value="outdoors">Outdoors</option>
                    <option value="mixed">Mixed</option>
                  </Select>
                </Field>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Equipment</legend>
                <div className="flex flex-wrap gap-2">
                  {KIT.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={kit.includes(item)}
                      onClick={() => toggle(kit, item, setKit)}
                      className={cn(
                        "min-h-11 rounded-full border px-4 capitalize",
                        kit.includes(item)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field
                label="Constraints, injuries or movements to avoid"
                hint="Free text for filtering and substitutions; seek qualified advice for injuries."
              >
                <TextArea
                  value={plan.constraints}
                  onChange={(event) => setPlan({ ...plan, constraints: event.target.value })}
                />
              </Field>
              <Field label="Disliked movements">
                <TextInput
                  placeholder="e.g. burpees, running"
                  value={plan.dislikedMovements}
                  onChange={(event) => setPlan({ ...plan, dislikedMovements: event.target.value })}
                />
              </Field>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-5">
          {modules.includes("nutrition") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nutrition approach">
                <Select
                  value={plan.nutritionApproach}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      nutritionApproach: event.target.value as PlanningProfile["nutritionApproach"],
                    })
                  }
                >
                  <option value="balanced">Balanced</option>
                  <option value="high-protein">Higher protein</option>
                  <option value="plant-based">Plant based</option>
                  <option value="intuitive">Intuitive / no targets</option>
                  <option value="custom">Custom</option>
                </Select>
              </Field>
              <Field label="Dietary needs">
                <TextInput
                  placeholder="Allergies, preferences, requirements"
                  value={plan.dietaryNeeds}
                  onChange={(event) => setPlan({ ...plan, dietaryNeeds: event.target.value })}
                />
              </Field>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Usual sleep">
              <div className="flex gap-2">
                <TextInput
                  type="time"
                  aria-label="Sleep starts"
                  value={plan.sleep.start}
                  onChange={(event) =>
                    setPlan({ ...plan, sleep: { ...plan.sleep, start: event.target.value } })
                  }
                />
                <TextInput
                  type="time"
                  aria-label="Wake time"
                  value={plan.sleep.end}
                  onChange={(event) =>
                    setPlan({ ...plan, sleep: { ...plan.sleep, end: event.target.value } })
                  }
                />
              </div>
            </Field>
            <Field label="Work / fixed hours">
              <div className="flex gap-2">
                <TextInput
                  type="time"
                  aria-label="Work starts"
                  value={plan.work.start}
                  onChange={(event) =>
                    setPlan({ ...plan, work: { ...plan.work, start: event.target.value } })
                  }
                />
                <TextInput
                  type="time"
                  aria-label="Work ends"
                  value={plan.work.end}
                  onChange={(event) =>
                    setPlan({ ...plan, work: { ...plan.work, end: event.target.value } })
                  }
                />
              </div>
            </Field>
          </div>
          <Field label="Quiet hours">
            <div className="flex gap-2">
              <TextInput
                type="time"
                aria-label="Quiet hours start"
                value={plan.quiet.start}
                onChange={(event) =>
                  setPlan({ ...plan, quiet: { ...plan.quiet, start: event.target.value } })
                }
              />
              <TextInput
                type="time"
                aria-label="Quiet hours end"
                value={plan.quiet.end}
                onChange={(event) =>
                  setPlan({ ...plan, quiet: { ...plan.quiet, end: event.target.value } })
                }
              />
            </div>
          </Field>
          <details className="rounded-2xl border border-line p-4">
            <summary className="cursor-pointer font-semibold">
              Optional physiology and recovery
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Used only to keep starting volume and session length conservative. Skip it now or edit
              it later. VAYVOR does not ask for sex or gender because this plan does not need them.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Age band">
                <Select
                  value={plan.physiology?.ageBand ?? ""}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      physiology: {
                        ...plan.physiology!,
                        ageBand: (event.target.value || undefined) as
                          NonNullable<PlanningProfile["physiology"]>["ageBand"] | undefined,
                      },
                    })
                  }
                >
                  <option value="">Prefer not to say</option>
                  <option value="under-18">Under 18</option>
                  <option value="18-29">18–29</option>
                  <option value="30-44">30–44</option>
                  <option value="45-64">45–64</option>
                  <option value="65-plus">65+</option>
                </Select>
              </Field>
              <Field label="Units">
                <Select
                  value={plan.physiology?.units}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      physiology: {
                        ...plan.physiology!,
                        units: event.target.value as "metric" | "imperial",
                      },
                    })
                  }
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Imperial</option>
                </Select>
              </Field>
              <Field label="Height (optional)">
                <NumberField
                  label="Height"
                  unit="cm"
                  decimals={0}
                  value={plan.physiology?.heightCm}
                  onChange={(heightCm) =>
                    setPlan({ ...plan, physiology: { ...plan.physiology!, heightCm } })
                  }
                />
              </Field>
              <Field label="Weight (optional)">
                <NumberField
                  label="Weight"
                  unit="kg"
                  decimals={1}
                  value={plan.physiology?.weightKg}
                  onChange={(weightKg) =>
                    setPlan({ ...plan, physiology: { ...plan.physiology!, weightKg } })
                  }
                />
              </Field>
              <Field label="Activity baseline">
                <Select
                  value={plan.physiology?.activity}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      physiology: {
                        ...plan.physiology!,
                        activity: event.target.value as "low" | "moderate" | "high",
                      },
                    })
                  }
                >
                  <option value="low">Mostly sedentary</option>
                  <option value="moderate">Some regular activity</option>
                  <option value="high">Highly active</option>
                </Select>
              </Field>
              <Field label="Current sessions / week">
                <NumberField
                  label="Current sessions"
                  decimals={0}
                  value={plan.physiology?.currentSessionsPerWeek}
                  onChange={(currentSessionsPerWeek) =>
                    setPlan({
                      ...plan,
                      physiology: { ...plan.physiology!, currentSessionsPerWeek },
                    })
                  }
                />
              </Field>
              <Field label="Years of regular training">
                <NumberField
                  label="Training history"
                  unit="years"
                  decimals={1}
                  value={plan.physiology?.trainingYears}
                  onChange={(trainingYears) =>
                    setPlan({ ...plan, physiology: { ...plan.physiology!, trainingYears } })
                  }
                />
              </Field>
              <Field label="Typical sleep hours">
                <NumberField
                  label="Sleep"
                  unit="hours"
                  decimals={1}
                  value={plan.physiology?.typicalSleepHours}
                  onChange={(typicalSleepHours) =>
                    setPlan({ ...plan, physiology: { ...plan.physiology!, typicalSleepHours } })
                  }
                />
              </Field>
              <Field label="Recovery lately">
                <Select
                  value={plan.physiology?.recovery}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      physiology: {
                        ...plan.physiology!,
                        recovery: event.target.value as "low" | "okay" | "good",
                      },
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="okay">Okay</option>
                  <option value="good">Good</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Movement limitations or injury areas">
                <TextArea
                  value={plan.physiology?.limitations ?? ""}
                  onChange={(event) =>
                    setPlan({
                      ...plan,
                      physiology: { ...plan.physiology!, limitations: event.target.value },
                    })
                  }
                />
              </Field>
              <Switch
                label="A clinician should guide my training"
                hint="Use for pregnancy/postpartum considerations, chronic conditions, current pain or medical restrictions. Automatic plan generation will pause."
                checked={!!plan.physiology?.medicalSafetyFlag}
                onChange={(medicalSafetyFlag) =>
                  setPlan({
                    ...plan,
                    physiology: { ...plan.physiology!, medicalSafetyFlag },
                  })
                }
              />
            </div>
          </details>
          <Field label="Reminder intensity">
            <Select
              value={plan.reminderIntensity}
              onChange={(event) =>
                setPlan({
                  ...plan,
                  reminderIntensity: event.target.value as PlanningProfile["reminderIntensity"],
                })
              }
            >
              <option value="off">Off</option>
              <option value="essential">Essential only</option>
              <option value="supportive">Supportive</option>
              <option value="active">Active coaching</option>
            </Select>
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-3 rounded-2xl border border-line bg-surface-2/50 p-4 text-sm">
          <p>
            <strong>Areas:</strong>{" "}
            {modules.map((item) => MODULES.find((module) => module.id === item)?.title).join(", ")}
          </p>
          <p>
            <strong>Goal:</strong> {plan.primaryGoal.replace("-", " ")} · {plan.experience} ·{" "}
            {plan.trainingDays.length} training days
          </p>
          <p>
            <strong>Time fit:</strong> {plan.sessionMinutes} minute sessions around{" "}
            {plan.work.start}–{plan.work.end} work and {plan.sleep.start}–{plan.sleep.end} sleep.
          </p>
          <p>
            <strong>Faith:</strong>{" "}
            {faith && modules.includes("spirituality")
              ? "Muslim prayer tools on"
              : "No faith-specific tools"}
          </p>
          <p className="text-muted-foreground">
            Why this plan: VAYVOR will cap session volume to your available time, use your chosen
            days, prefer exercises available in your environment, filter stated avoidances, protect
            sleep and quiet hours, and scale reminders to your choice.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => (step > 0 ? setStep(step - 1) : void finish(true))}
        >
          {step > 0 ? (
            <>
              <ChevronLeft className="size-4" /> Back
            </>
          ) : (
            "Skip personalisation"
          )}
        </Button>
        <Button
          variant="primary"
          size="lg"
          busy={busy}
          disabled={!valid}
          onClick={() => (step < 5 ? setStep(step + 1) : void finish())}
        >
          {step < 5 ? (
            <>
              Continue <ChevronRight className="size-4" />
            </>
          ) : (
            "Build my space"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Step {step + 1} of 6 · Back, skip or edit later at any time.
      </p>
    </AuthLayout>
  );
}
