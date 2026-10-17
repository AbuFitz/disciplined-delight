import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Chip,
  ConfirmDialog,
  Field,
  NumberField,
  PageHeader,
  Row,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
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

function Section({
  id,
  title,
  hint,
  children,
  open,
  onToggle,
}: {
  id: SettingsSectionId;
  title: string;
  hint?: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: (id: SettingsSectionId) => void;
}) {
  const contentId = `${id}-settings-content`;
  return (
    <section
      id={id}
      tabIndex={-1}
      className="scroll-mt-24 border-t border-line outline-none focus-visible:ring-2 focus-visible:ring-ring first:border-t-0"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        className="flex min-h-20 w-full items-center justify-between gap-4 py-5 text-left"
        onClick={() => onToggle(id)}
      >
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="block font-display text-2xl font-semibold">{title}</span>
          {hint && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
        </span>
        <VIcon
          name={open ? "collapse" : "next"}
          className={`shrink-0 ${open ? "text-primary" : "text-muted-foreground"}`}
        />
      </button>
      {open ? (
        <div
          id={contentId}
          className="grid gap-x-10 pb-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]"
        >
          <div className="grid min-w-0 max-w-xl gap-4">{children}</div>
        </div>
      ) : null}
    </section>
  );
}

type SettingsSectionId =
  | "profile"
  | "modules"
  | "nutrition"
  | "budget"
  | "faith"
  | "training"
  | "appearance"
  | "install"
  | "reminders"
  | "account"
  | "data"
  | "help"
  | "companion"
  | "credits"
  | "checklist";

const settingsGroups: Array<{
  title: string;
  items: Array<{ id: SettingsSectionId; label: string; icon: VIconName }>;
}> = [
  {
    title: "Plan and preferences",
    items: [
      { id: "profile", label: "You and your goal", icon: "today" },
      { id: "modules", label: "Your areas", icon: "checklist" },
      { id: "training", label: "Training and Gym Mode", icon: "training" },
      { id: "nutrition", label: "Nutrition targets", icon: "nutrition" },
      { id: "budget", label: "Food budget", icon: "nutrition" },
      { id: "faith", label: "Faith & reflection", icon: "spirituality" },
    ],
  },
  {
    title: "Experience",
    items: [
      { id: "appearance", label: "Appearance", icon: "readiness" },
      { id: "companion", label: "Companion", icon: "buddy" },
      { id: "reminders", label: "Reminders", icon: "timer" },
      { id: "checklist", label: "Reminder checklist", icon: "checklist" },
      { id: "install", label: "Install VAYVOR", icon: "external" },
    ],
  },
  {
    title: "Account and support",
    items: [
      { id: "account", label: "Account", icon: "community" },
      { id: "data", label: "Your data", icon: "archive" },
      { id: "help", label: "Help and feedback", icon: "alert" },
      { id: "credits", label: "Credits & licences", icon: "library" },
    ],
  },
];

function SettingsPage() {
  const { profile, ready } = useProfile();
  const prayer = useCollection<PrayerSettings>(COL.prayerSettings).items[0];
  const checklist = useCollection<ChecklistItem>(COL.checklist);
  const [d, setD] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<ThemePref>("dark");
  const [accent, setAccent] = useState<AccentWorld>("cobalt");
  const [item, setItem] = useState<Partial<ChecklistItem> | null>(null);
  const [archive, setArchive] = useState<ChecklistItem | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
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
      const id = window.location.hash.slice(1);
      if (!settingsGroups.some((group) => group.items.some((entry) => entry.id === id))) return;
      setActiveSection(id as SettingsSectionId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = document.getElementById(id);
          target?.scrollIntoView({ block: "start" });
          target?.focus({ preventScroll: true });
        });
      });
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
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    });
  };
  const sectionProps = (id: SettingsSectionId) => ({
    id,
    open: activeSection === id,
    onToggle: openSection,
  });

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Make it yours"
        sub="Nothing here is required. Skip what you don't need and come back later."
      />
      <SetupPath />

      <nav className="mb-8 border-y border-line py-5" aria-label="Settings categories">
        <p className="eyebrow">Choose one area</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <div className="mt-2 grid gap-px border border-line bg-line">
                {group.items.map((entry) => {
                  const selected = activeSection === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-current={selected ? "location" : undefined}
                      onClick={() => openSection(entry.id)}
                      className={`flex min-h-12 items-center gap-3 bg-background px-3 text-left text-sm font-medium hover:bg-surface ${selected ? "border-l-2 border-primary text-primary" : "border-l-2 border-transparent"}`}
                    >
                      <VIcon name={entry.icon} size={18} active={selected} />
                      <span>{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <Section
        {...sectionProps("profile")}
        title="You and your goal"
        hint="Used for wording and chart reference lines only."
      >
        <div>
          <Link
            to="/onboarding"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-medium"
          >
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
              setD({ ...d, goal: { ...d.goal, kind: e.target.value as Profile["goal"]["kind"] } })
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
      </Section>

      <Section
        {...sectionProps("modules")}
        title="Your areas"
        hint="These choices shape navigation and what appears on Today. Plan connects every enabled area."
      >
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
          const selected = d.modules ?? ["training", "nutrition", "mind", "routines", "community"];
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
      </Section>

      <Section
        {...sectionProps("nutrition")}
        title="Nutrition targets"
        hint="Gradual weight gain is usually measured over weeks. If you follow advice from a clinician or dietitian, use their numbers."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            tone={t.status === "confirmed" ? "ok" : t.status === "provisional" ? "warn" : "neutral"}
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
                    v != null && t.fatRange ? [v, t.fatRange[1]] : v != null ? [v, v] : undefined,
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
                    v != null && t.fatRange ? [t.fatRange[0], v] : v != null ? [v, v] : undefined,
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
                targets: { ...t, status: "confirmed", source: "Set by you" },
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
          The maintenance estimate in Progress is information only. It never changes these numbers.
        </p>
      </Section>

      <Section
        {...sectionProps("budget")}
        title="Food budget"
        hint="Used for the weekly budget on Today and in Food."
      >
        <Field label="Weekly food budget">
          <NumberField
            label="Weekly budget"
            unit="£"
            step={5}
            decimals={2}
            value={d.budgetPencePerWeek != null ? d.budgetPencePerWeek / 100 : undefined}
            onChange={(v) =>
              setD({ ...d, budgetPencePerWeek: v != null ? Math.round(v * 100) : undefined })
            }
          />
        </Field>
        <div>
          <Button
            variant="secondary"
            onClick={async () => {
              await saveProfile({ budgetPencePerWeek: d.budgetPencePerWeek });
              toast.success("Budget saved");
            }}
          >
            Save budget
          </Button>
        </div>
      </Section>

      <Section
        {...sectionProps("faith")}
        title="Faith & reflection"
        hint="Private, optional practice support. Choose this explicitly; it is never inferred."
      >
        <FaithSettings />
        {hasIslamicPrayerPack(resolveFaithProfile(profile)) && (
          <div className="border-l-2 border-primary pl-4">
            <p className="text-sm text-muted-foreground">
              {prayer
                ? `${prayer.mode === "manual" ? "Manual times" : "Calculated times"} for ${prayer.locality}.`
                : "Islamic prayer tools are selected, but times are not configured."}
            </p>
            <Link
              to="/salah"
              className="mt-2 inline-flex min-h-11 items-center rounded-md border border-input px-5 font-medium"
            >
              {prayer ? "Open Salah settings" : "Set up Salah"}
            </Link>
          </div>
        )}
      </Section>

      <Section {...sectionProps("training")} title="Training">
        <Switch
          label="Keep the screen on during a session"
          hint="Only where your browser supports it. Sessions work without it."
          checked={!!profile.wakeLock}
          onChange={async (v) => {
            await saveProfile({ wakeLock: v });
          }}
        />
        <details className="mt-6 border-t border-line pt-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Gym Mode, music and optional location
          </summary>
          <p className="mb-4 text-sm text-muted-foreground">
            Configure this only when it is useful. Location permission is requested from a direct
            action inside this section.
          </p>
          <GymSettings />
        </details>
        <details className="border-t border-line pt-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Connections: music, health, location, notifications
          </summary>
          <IntegrationsPanel />
        </details>
      </Section>

      <Section {...sectionProps("appearance")} title="Appearance">
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
        <Field
          label="Colour world"
          hint="Curated for readable light and dark contrast; no identity is inferred."
        >
          <Select
            value={accent}
            onChange={(event) => {
              const value = event.target.value as AccentWorld;
              setAccent(value);
              setAccentWorld(value);
            }}
          >
            <option value="mint">Mint signal</option>
            <option value="cobalt">Cobalt</option>
            <option value="violet">Violet</option>
            <option value="coral">Ember coral</option>
            <option value="amber">Amber</option>
            <option value="rose">Rose</option>
            <option value="slate">Monochrome slate</option>
          </Select>
        </Field>
        <div className="spatial-glass border p-4" aria-live="polite">
          <p className="eyebrow text-primary">Live signal preview</p>
          <div className="mt-2 h-1.5 w-full bg-surface-2">
            <div className="h-full w-2/3 bg-primary" />
          </div>
          <p className="mt-2 text-sm">
            Focus rings, active navigation, charts, Buddy and Gym Mode use this semantic signal.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setAccent("cobalt");
            setAccentWorld("cobalt");
          }}
        >
          Reset colour
        </Button>
        <p className="text-xs text-muted-foreground">Saved on this device.</p>
      </Section>

      <Section
        {...sectionProps("install")}
        title="Install VAYVOR"
        hint="App-like launch and an offline shell on this device."
      >
        <InstallSection />
      </Section>

      <Section
        {...sectionProps("reminders")}
        title="Reminders"
        hint="Opt in per type. Off by default."
      >
        <RemindersSection showPrayer={hasIslamicPrayerPack(resolveFaithProfile(profile))} />
      </Section>

      <Section
        {...sectionProps("account")}
        title="Account"
        hint="Sign in for backup and friends. Guests stay on this device."
      >
        <AccountSection />
      </Section>

      <Section
        {...sectionProps("data")}
        title="Your data"
        hint="Where it lives, backups, and moving between devices."
      >
        <DataSection />
        <div>
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-medium"
          >
            Read the privacy map
          </Link>
        </div>
      </Section>

      <Section
        {...sectionProps("help")}
        title="Help and feedback"
        hint="Report a bug, correction, accessibility issue or idea without exposing private records."
      >
        <FeedbackSection />
      </Section>

      <Section
        {...sectionProps("companion")}
        title="Companion"
        hint="An optional, private coach for real plan and app states—not a decorative mascot."
      >
        <CompanionSettings />
      </Section>

      <Section
        {...sectionProps("credits")}
        title="Credits & licences"
        hint="Sources and open-content licences for the exercise library."
      >
        <p className="text-sm text-muted-foreground">
          Every imported exercise and photo keeps its contributor, original source and licence.
        </p>
        <div>
          <Link
            to="/credits"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-medium"
          >
            View library credits
          </Link>
        </div>
      </Section>

      <Section
        {...sectionProps("checklist")}
        title="Reminder checklist"
        hint="Supplements, water, food prep. Items from your original app are only a record of what you used to track, not advice."
      >
        <ul>
          {checklist.items
            .filter((i) => !i.archivedAt)
            .sort((a, b) => a.order - b.order)
            .map((i) => (
              <Row as="li" key={i.id} className="justify-between">
                <button className="min-w-0 text-left" onClick={() => setItem(i)}>
                  <p className="font-medium">{i.label}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {i.fromLegacy ? "From original app. " : ""}
                    {i.detail}
                  </p>
                </button>
                <button
                  aria-label={`Archive ${i.label}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-2"
                  onClick={() => setArchive(i)}
                >
                  <VIcon name="archive" size={16} />
                </button>
              </Row>
            ))}
        </ul>
        <div>
          <Button variant="secondary" onClick={() => setItem({ label: "", detail: "" })}>
            <VIcon name="add" size={16} />
            Add reminder
          </Button>
        </div>
      </Section>

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
