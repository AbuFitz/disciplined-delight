import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  Field,
  Group,
  NumberField,
  PageHeader,
  Section,
  Segmented,
  Sheet,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
  Select,
} from "@/components/nl/ui";
import { saveProfile } from "@/data/actions";
import { newId, put } from "@/data/db";
import { useCollection, useProfile } from "@/data/hooks";
import {
  COL,
  type AppModule,
  type ChecklistItem,
  type PrayerSettings,
  type Profile,
} from "@/data/types";
import { DataSection } from "@/components/nl/data-section";
import { AccountSection } from "@/components/nl/account-section";
import { RemindersSection } from "@/components/nl/reminders-section";
import { InstallSection } from "@/components/nl/install-section";
import {
  getAccentWorld,
  getThemePref,
  setAccentWorld,
  setThemePref,
  type AccentWorld,
  type ThemePref,
} from "@/lib/theme";
import { WORLDS } from "@/lib/colour-worlds";
import { cn } from "@/lib/utils";
import { setSalahEnabled } from "@/data/routine-actions";
import { FeedbackSection } from "@/components/nl/feedback-section";
import { IntegrationsPanel } from "@/components/nl/integrations-panel";
import { CompanionSettings } from "@/components/nl/companion-settings";
import { GymSettings } from "@/components/nl/gym-settings";
import { FaithSettings } from "@/components/nl/faith-settings";
import { VIcon, type VIconName } from "@/components/nl/icon";
import { hasIslamicPrayerPack, resolveFaithProfile } from "@/domain/faith";
import { SetupPath } from "@/components/nl/setup-path";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

type SettingsSectionId =
  | "profile"
  | "modules"
  | "training"
  | "food"
  | "faith"
  | "appearance"
  | "companion"
  | "reminders"
  | "checklist"
  | "install"
  | "account"
  | "data"
  | "help"
  | "credits";

/** Older anchors (and links elsewhere in the app) still resolve to the right sheet. */
const HASH_ALIAS: Record<string, SettingsSectionId> = {
  nutrition: "food",
  budget: "food",
  feedback: "help",
};

const SECTION_META: Record<SettingsSectionId, { title: string; hint: string; icon: VIconName }> = {
  profile: {
    title: "Profile & goals",
    hint: "Used for wording and chart reference lines only.",
    icon: "today",
  },
  modules: {
    title: "Your areas",
    hint: "These choices shape navigation and what appears on Today.",
    icon: "checklist",
  },
  training: {
    title: "Training",
    hint: "Gym Mode, haptic cues, music and connections.",
    icon: "training",
  },
  food: {
    title: "Food",
    hint: "Targets and your weekly budget.",
    icon: "nutrition",
  },
  faith: {
    title: "Faith & reflection",
    hint: "Private, optional practice support. Never inferred.",
    icon: "spirituality",
  },
  appearance: {
    title: "Appearance",
    hint: "Theme and colour world. Saved on this device.",
    icon: "readiness",
  },
  companion: {
    title: "Buddy",
    hint: "An optional, private coach for real plan and app states.",
    icon: "buddy",
  },
  reminders: {
    title: "Notifications",
    hint: "Opt in per type. Off by default.",
    icon: "timer",
  },
  checklist: {
    title: "Reminder checklist",
    hint: "Supplements, water, food prep.",
    icon: "checklist",
  },
  install: {
    title: "Install VAYVOR",
    hint: "App-like launch and an offline shell on this device.",
    icon: "external",
  },
  account: {
    title: "Account & sync",
    hint: "Guests stay on this device. Sign in only if you want backup and friends.",
    icon: "community",
  },
  data: {
    title: "Data & backup",
    hint: "Where it lives, backups, and moving between devices.",
    icon: "archive",
  },
  help: {
    title: "Help & feedback",
    hint: "Report a bug or idea without exposing private records.",
    icon: "alert",
  },
  credits: {
    title: "About & credits",
    hint: "Sources and open-content licences for the exercise library.",
    icon: "library",
  },
};

const GROUPS: { title: string; ids: SettingsSectionId[] }[] = [
  { title: "Plan", ids: ["profile", "modules", "training", "food", "faith"] },
  {
    title: "Experience",
    ids: ["appearance", "companion", "reminders", "checklist", "install"],
  },
  { title: "You & data", ids: ["account", "data", "help", "credits"] },
];

const isSectionId = (id: string): id is SettingsSectionId => id in SECTION_META;
const resolveHash = (raw: string): SettingsSectionId | null => {
  const id = raw.replace(/^#/, "");
  if (isSectionId(id)) return id;
  return HASH_ALIAS[id] ?? null;
};

const pillLink =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-surface-2 px-6 font-semibold transition active:scale-[0.97]";

/** A titled block inside a settings sheet. */
function Block({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-4">
      {(title || hint) && (
        <div>
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** A soft rounded well for optional advanced settings. */
function Well({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-3xl bg-surface-2/60 px-4">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{summary}</span>
        <VIcon name="collapse" size={18} className="shrink-0 transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 pb-4">{children}</div>
    </details>
  );
}

function NavRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: VIconName;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition active:bg-surface-2/70"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <VIcon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight [overflow-wrap:anywhere]">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">
            {hint}
          </span>
        )}
      </span>
      <VIcon name="next" size={18} className="shrink-0 text-muted-foreground" />
    </button>
  );
}

const GOAL_LABEL: Record<Profile["goal"]["kind"], string> = {
  "gain-weight": "Gain weight gradually",
  strength: "Get stronger",
  maintain: "Maintain",
  "lose-weight": "Lose weight",
  custom: "Something else",
};

function SettingsPage() {
  const { profile, ready } = useProfile();
  const prayer = useCollection<PrayerSettings>(COL.prayerSettings).items[0];
  const checklist = useCollection<ChecklistItem>(COL.checklist);
  const [d, setD] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<ThemePref>("dark");
  const [accent, setAccent] = useState<AccentWorld>("cobalt");
  const [item, setItem] = useState<Partial<ChecklistItem> | null>(null);
  const [archive, setArchive] = useState<ChecklistItem | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(null);
  useEffect(() => {
    if (profile && !d) setD(profile);
  }, [profile, d]);
  useEffect(() => {
    setTheme(getThemePref());
    setAccent(getAccentWorld());
  }, []);
  useEffect(() => {
    if (!ready) return;
    const openHash = () => {
      const id = resolveHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, [ready]);
  if (!ready || !d || !profile) return <Skeleton className="h-72" />;

  const dirtyGoals =
    JSON.stringify([d.name, d.goal, d.allergies, d.dietaryNotes]) !==
    JSON.stringify([profile.name, profile.goal, profile.allergies, profile.dietaryNotes]);
  const dirtyTargets = JSON.stringify(d.targets) !== JSON.stringify(profile.targets);
  const t = d.targets;
  const setT = (p: Partial<Profile["targets"]>) => setD({ ...d, targets: { ...d.targets, ...p } });
  const openSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
  };
  const closeSection = () => {
    setActiveSection(null);
    window.history.replaceState(null, "", window.location.pathname);
  };
  const faithOn = hasIslamicPrayerPack(resolveFaithProfile(profile));
  const worldName = WORLDS.find((w) => w.id === accent)?.name ?? "Cobalt";
  const hints: Partial<Record<SettingsSectionId, string>> = {
    profile: GOAL_LABEL[profile.goal.kind],
    food:
      profile.targets.status === "confirmed"
        ? "Targets confirmed"
        : profile.targets.status === "provisional"
          ? "Targets carried over"
          : "Targets not set",
    appearance: `${theme === "system" ? "Match device" : theme === "dark" ? "Dark" : "Light"} · ${worldName}`,
    checklist: `${checklist.items.filter((i) => !i.archivedAt).length} items`,
  };
  const initial = (profile.name.trim()[0] ?? "V").toUpperCase();

  const body = (id: SettingsSectionId): ReactNode => {
    switch (id) {
      case "profile":
        return (
          <>
            <div>
              <Link to="/onboarding" className={pillLink}>
                Review guided setup
              </Link>
            </div>
            <Field label="Name (optional)" htmlFor="s-name">
              <TextInput
                id="s-name"
                value={d.name}
                onChange={(e) => setD({ ...d, name: e.target.value })}
              />
            </Field>
            <Field label="Goal" htmlFor="s-goal">
              <Select
                id="s-goal"
                value={d.goal.kind}
                onChange={(e) =>
                  setD({
                    ...d,
                    goal: {
                      ...d.goal,
                      kind: e.target.value as Profile["goal"]["kind"],
                    },
                  })
                }
              >
                <option value="gain-weight">Gain weight gradually</option>
                <option value="strength">Get stronger</option>
                <option value="maintain">Maintain</option>
                <option value="lose-weight">Lose weight</option>
                <option value="custom">Something else</option>
              </Select>
            </Field>
            <Field
              label="Target weight (optional)"
              hint="Your own goal. The app doesn't set one for you."
            >
              <NumberField
                label="Target weight"
                unit="kg"
                step={0.5}
                decimals={1}
                value={d.goal.targetWeightKg}
                onChange={(v) => setD({ ...d, goal: { ...d.goal, targetWeightKg: v } })}
              />
            </Field>
            <Field
              label="Allergies"
              htmlFor="s-all"
              hint="Private to your account. Included in sync and exported backups when enabled."
            >
              <TextArea
                id="s-all"
                className="min-h-20"
                value={d.allergies ?? ""}
                onChange={(e) => setD({ ...d, allergies: e.target.value })}
                placeholder="None, or list them"
              />
            </Field>
            <Field
              label="Dietary notes"
              htmlFor="s-diet"
              hint="Private to your account. Included in sync and exported backups when enabled."
            >
              <TextArea
                id="s-diet"
                className="min-h-20"
                value={d.dietaryNotes ?? ""}
                onChange={(e) => setD({ ...d, dietaryNotes: e.target.value })}
                placeholder="e.g. Halal only"
              />
            </Field>
            <div>
              <Button
                variant="primary"
                disabled={!dirtyGoals}
                onClick={async () => {
                  await saveProfile({
                    name: d.name.trim(),
                    goal: d.goal,
                    allergies: d.allergies,
                    dietaryNotes: d.dietaryNotes,
                    setup: { ...profile.setup, goals: true },
                  });
                  toast.success("Saved");
                }}
              >
                Save
              </Button>
            </div>
          </>
        );
      case "modules":
        return (
          <>
            {(
              [
                ["training", "Training"],
                ["nutrition", "Nutrition"],
                ["mind", "Mind"],
                ["routines", "Routines and Plan"],
                ["community", "Community"],
                ["spirituality", "Faith & reflection"],
              ] as [AppModule, string][]
            ).map(([id, label]) => {
              const selected = d.modules ?? [
                "training",
                "nutrition",
                "mind",
                "routines",
                "community",
              ];
              return (
                <Switch
                  key={id}
                  label={label}
                  checked={selected.includes(id)}
                  onChange={(on) =>
                    setD({
                      ...d,
                      modules: on ? [...selected, id] : selected.filter((item) => item !== id),
                    })
                  }
                />
              );
            })}
            <div>
              <Button
                variant="secondary"
                onClick={async () => {
                  const modules = d.modules ?? [
                    "training",
                    "nutrition",
                    "mind",
                    "routines",
                    "community",
                  ];
                  await saveProfile({
                    modules,
                    faithRoutines: modules.includes("spirituality") ? d.faithRoutines : false,
                  });
                  if (!modules.includes("spirituality")) await setSalahEnabled(false);
                  toast.success("Areas updated");
                }}
              >
                Save areas
              </Button>
            </div>
          </>
        );
      case "food":
        return (
          <>
            <Block title="Nutrition targets">
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  tone={
                    t.status === "confirmed"
                      ? "ok"
                      : t.status === "provisional"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {t.status === "confirmed"
                    ? "Confirmed by you"
                    : t.status === "provisional"
                      ? "Carried over, not confirmed"
                      : "Not set"}
                </Chip>
                {t.status === "provisional" && (
                  <span className="text-sm text-muted-foreground">From: {t.source}</span>
                )}
              </div>
              <div className="grid gap-3 min-[480px]:grid-cols-2">
                <Field label="Calories per day">
                  <NumberField
                    label="Calories"
                    unit="kcal"
                    step={50}
                    decimals={0}
                    value={t.kcal}
                    onChange={(v) => setT({ kcal: v })}
                  />
                </Field>
                <Field label="Protein per day">
                  <NumberField
                    label="Protein"
                    unit="g"
                    step={5}
                    decimals={0}
                    value={t.protein}
                    onChange={(v) => setT({ protein: v })}
                  />
                </Field>
                <Field label="Carbs range (low)">
                  <NumberField
                    label="Carbs low"
                    unit="g"
                    stepper={false}
                    value={t.carbsRange?.[0]}
                    onChange={(v) =>
                      setT({
                        carbsRange:
                          v != null && t.carbsRange
                            ? [v, t.carbsRange[1]]
                            : v != null
                              ? [v, v]
                              : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Carbs range (high)">
                  <NumberField
                    label="Carbs high"
                    unit="g"
                    stepper={false}
                    value={t.carbsRange?.[1]}
                    onChange={(v) =>
                      setT({
                        carbsRange:
                          v != null && t.carbsRange
                            ? [t.carbsRange[0], v]
                            : v != null
                              ? [v, v]
                              : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Fat range (low)">
                  <NumberField
                    label="Fat low"
                    unit="g"
                    stepper={false}
                    value={t.fatRange?.[0]}
                    onChange={(v) =>
                      setT({
                        fatRange:
                          v != null && t.fatRange
                            ? [v, t.fatRange[1]]
                            : v != null
                              ? [v, v]
                              : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Fat range (high)">
                  <NumberField
                    label="Fat high"
                    unit="g"
                    stepper={false}
                    value={t.fatRange?.[1]}
                    onChange={(v) =>
                      setT({
                        fatRange:
                          v != null && t.fatRange
                            ? [t.fatRange[0], v]
                            : v != null
                              ? [v, v]
                              : undefined,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={async () => {
                    await saveProfile({
                      targets: {
                        ...t,
                        status: "confirmed",
                        source: "Set by you",
                      },
                      setup: { ...profile.setup, food: true },
                    });
                    toast.success("Targets confirmed");
                  }}
                  disabled={!dirtyTargets && t.status === "confirmed"}
                >
                  {t.status === "confirmed" ? "Save targets" : "Confirm these targets"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await saveProfile({ targets: { status: "unset" } });
                    setD({ ...d, targets: { status: "unset" } });
                    toast("Targets cleared");
                  }}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The maintenance estimate in Progress is information only. It never changes these
                numbers.
              </p>
            </Block>
            <Block title="Food budget" hint="Used for the weekly budget on Today and in Food.">
              <Field label="Weekly food budget">
                <NumberField
                  label="Weekly budget"
                  unit="£"
                  step={5}
                  decimals={2}
                  value={d.budgetPencePerWeek != null ? d.budgetPencePerWeek / 100 : undefined}
                  onChange={(v) =>
                    setD({
                      ...d,
                      budgetPencePerWeek: v != null ? Math.round(v * 100) : undefined,
                    })
                  }
                />
              </Field>
              <div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await saveProfile({
                      budgetPencePerWeek: d.budgetPencePerWeek,
                    });
                    toast.success("Budget saved");
                  }}
                >
                  Save budget
                </Button>
              </div>
            </Block>
          </>
        );
      case "faith":
        return (
          <>
            <FaithSettings />
            {faithOn && (
              <div className="rounded-3xl bg-surface-2/60 p-4">
                <p className="text-sm text-muted-foreground">
                  {prayer
                    ? `${prayer.mode === "manual" ? "Manual times" : "Calculated times"} for ${prayer.locality}.`
                    : "Islamic prayer tools are selected, but times are not configured."}
                </p>
                <Link to="/salah" className={cn(pillLink, "mt-3")}>
                  {prayer ? "Open Salah settings" : "Set up Salah"}
                </Link>
              </div>
            )}
          </>
        );
      case "training":
        return (
          <>
            <Switch
              label="Keep the screen on during a session"
              hint="Only where your browser supports it. Sessions work without it."
              checked={!!profile.wakeLock}
              onChange={async (v) => {
                await saveProfile({ wakeLock: v });
              }}
            />
            <Well summary="Gym Mode, music and optional location">
              <p className="text-sm text-muted-foreground">
                Configure this only when it is useful. Location permission is requested from a
                direct action inside this section.
              </p>
              <GymSettings />
            </Well>
            <Well summary="Connections: music, health, location, notifications">
              <IntegrationsPanel />
            </Well>
          </>
        );
      case "appearance":
        return (
          <>
            <Segmented
              label="Theme"
              value={theme}
              onChange={(v) => {
                setTheme(v);
                setThemePref(v);
              }}
              options={[
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
                { value: "system", label: "Match device" },
              ]}
            />
            <div
              role="radiogroup"
              aria-label="Colour world"
              className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3"
            >
              {WORLDS.map((w) => {
                const on = w.id === accent;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setAccent(w.id);
                      setAccentWorld(w.id);
                    }}
                    className={cn(
                      "flex min-h-16 min-w-0 items-center gap-3 rounded-2xl bg-surface-2/60 p-3 text-left transition active:scale-[0.97]",
                      on && "bg-primary/15 ring-2 ring-primary",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-9 shrink-0 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${w.swatch[0]} 50%, ${w.swatch[1]} 50%)`,
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{w.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{w.note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-3xl bg-surface-2/60 p-4" aria-live="polite">
              <p className="eyebrow text-primary">Live signal preview</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
              <p className="mt-2 text-sm">
                Focus rings, active navigation, charts, Buddy and Gym Mode use this semantic signal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setAccent("cobalt");
                  setAccentWorld("cobalt");
                }}
              >
                Reset colour
              </Button>
              <p className="text-xs text-muted-foreground">
                Curated for readable light and dark contrast; no identity is inferred.
              </p>
            </div>
          </>
        );
      case "install":
        return <InstallSection />;
      case "reminders":
        return <RemindersSection showPrayer={faithOn} />;
      case "account":
        return <AccountSection />;
      case "data":
        return (
          <>
            <DataSection />
            <div>
              <Link to="/privacy" className={pillLink}>
                Read the privacy map
              </Link>
            </div>
          </>
        );
      case "help":
        return <FeedbackSection />;
      case "companion":
        return <CompanionSettings />;
      case "credits":
        return (
          <>
            <p className="text-sm text-muted-foreground">
              Every imported exercise and photo keeps its contributor, original source and licence.
            </p>
            <div>
              <Link to="/credits" className={pillLink}>
                View library credits
              </Link>
            </div>
          </>
        );
      case "checklist":
        return (
          <>
            <p className="text-sm text-muted-foreground">
              Items from your original app are only a record of what you used to track, not advice.
            </p>
            <Group as="ul">
              {checklist.items
                .filter((i) => !i.archivedAt)
                .sort((a, b) => a.order - b.order)
                .map((i) => (
                  <li
                    key={i.id}
                    className="flex min-h-16 items-center justify-between gap-2 pl-4 pr-2"
                  >
                    <button
                      className="min-h-12 min-w-0 flex-1 py-2 text-left"
                      onClick={() => setItem(i)}
                    >
                      <p className="font-semibold">{i.label}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {i.fromLegacy ? "From original app. " : ""}
                        {i.detail}
                      </p>
                    </button>
                    <button
                      aria-label={`Archive ${i.label}`}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
                      onClick={() => setArchive(i)}
                    >
                      <VIcon name="archive" size={18} />
                    </button>
                  </li>
                ))}
            </Group>
            <div>
              <Button variant="secondary" onClick={() => setItem({ label: "", detail: "" })}>
                <VIcon name="add" size={16} />
                Add reminder
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <PageHeader title="Settings" sub="Nothing here is required. Come back any time." />

      <button
        type="button"
        onClick={() => openSection("profile")}
        className="mb-6 flex min-h-20 w-full items-center gap-4 rounded-3xl bg-surface/80 p-4 text-left transition active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold leading-tight">
            {profile.name.trim() || "Your profile"}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {GOAL_LABEL[profile.goal.kind]}
          </span>
        </span>
        <VIcon name="next" size={18} className="shrink-0 text-muted-foreground" />
      </button>

      <SetupPath />

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <Group>
            {group.ids.map((id) => (
              <NavRow
                key={id}
                icon={SECTION_META[id].icon}
                label={SECTION_META[id].title}
                hint={hints[id] ?? SECTION_META[id].hint}
                onClick={() => openSection(id)}
              />
            ))}
          </Group>
        </Section>
      ))}

      {activeSection && (
        <Sheet
          open
          onOpenChange={(o) => !o && closeSection()}
          title={SECTION_META[activeSection].title}
          description={SECTION_META[activeSection].hint}
          wide
        >
          <div className="grid gap-5 pb-4">{body(activeSection)}</div>
        </Sheet>
      )}

      <Sheet
        open={!!item}
        onOpenChange={(o) => !o && setItem(null)}
        title={item?.id ? "Edit reminder" : "New reminder"}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!item?.label?.trim()}
            onClick={async () => {
              const id = item!.id ?? newId();
              const order = item!.order ?? checklist.items.length;
              await put(COL.checklist, id, {
                ...item,
                id,
                order,
                label: item!.label!.trim(),
              } as ChecklistItem);
              setItem(null);
              toast.success("Saved");
            }}
          >
            Save reminder
          </Button>
        }
      >
        <div className="grid gap-4 pb-2">
          <Field label="Label" htmlFor="ck-l">
            <TextInput
              id="ck-l"
              value={item?.label ?? ""}
              onChange={(e) => setItem({ ...item, label: e.target.value })}
            />
          </Field>
          <Field label="Details (optional)" htmlFor="ck-d">
            <TextInput
              id="ck-d"
              value={item?.detail ?? ""}
              onChange={(e) => setItem({ ...item, detail: e.target.value })}
            />
          </Field>
        </div>
      </Sheet>
      <ConfirmDialog
        open={!!archive}
        onOpenChange={(o) => !o && setArchive(null)}
        tone="primary"
        title={`Archive "${archive?.label}"?`}
        confirmLabel="Archive"
        body="It disappears from Today. Past ticks are kept."
        onConfirm={async () => {
          await put(COL.checklist, archive!.id, {
            ...archive!,
            archivedAt: new Date().toISOString(),
          });
          setArchive(null);
          toast("Archived");
        }}
      />
    </>
  );
}
