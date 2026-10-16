import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, Plus } from "lucide-react";
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
import { COL, type ChecklistItem, type PrayerSettings, type Profile } from "@/data/types";
import { DataSection } from "@/components/nl/data-section";
import { AccountSection } from "@/components/nl/account-section";
import { RemindersSection } from "@/components/nl/reminders-section";
import { InstallSection } from "@/components/nl/install-section";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-x-10 border-t border-line py-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))] first:border-t-0">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid min-w-0 max-w-xl gap-4">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { profile, ready } = useProfile();
  const prayer = useCollection<PrayerSettings>(COL.prayerSettings).items[0];
  const checklist = useCollection<ChecklistItem>(COL.checklist);
  const [d, setD] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<ThemePref>("dark");
  const [item, setItem] = useState<Partial<ChecklistItem> | null>(null);
  const [archive, setArchive] = useState<ChecklistItem | null>(null);
  useEffect(() => {
    if (profile && !d) setD(profile);
  }, [profile, d]);
  useEffect(() => setTheme(getThemePref()), []);
  if (!ready || !d || !profile) return <Skeleton className="h-72" />;

  const dirtyGoals =
    JSON.stringify([d.name, d.goal, d.allergies, d.dietaryNotes]) !==
    JSON.stringify([profile.name, profile.goal, profile.allergies, profile.dietaryNotes]);
  const dirtyTargets = JSON.stringify(d.targets) !== JSON.stringify(profile.targets);
  const t = d.targets;
  const setT = (p: Partial<Profile["targets"]>) => setD({ ...d, targets: { ...d.targets, ...p } });

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Make it yours"
        sub="Nothing here is required. Skip what you don't need and come back later."
      />

      <Section title="You and your goal" hint="Used for wording and chart reference lines only.">
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
        <Field label="Allergies" htmlFor="s-all" hint="Kept private on this device.">
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
          hint="Halal preference, medical or clinician advice you follow."
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

      <Section title="Food budget" hint="Used for the weekly budget on Today and in Food.">
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

      <Section title="Prayer" hint="Times come from your chosen source.">
        <p className="text-sm text-muted-foreground">
          {prayer
            ? `${prayer.mode === "manual" ? "Manual times" : "Calculated times"} for ${prayer.locality}.`
            : "Not set up yet."}
        </p>
        <div>
          <Link
            to="/salah"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-5 font-medium"
          >
            {prayer ? "Open Salah settings" : "Set up Salah"}
          </Link>
        </div>
      </Section>

      <Section title="Training">
        <Switch
          label="Keep the screen on during a session"
          hint="Only where your browser supports it. Sessions work without it."
          checked={!!profile.wakeLock}
          onChange={async (v) => {
            await saveProfile({ wakeLock: v });
          }}
        />
      </Section>

      <Section title="Appearance">
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
        <p className="text-xs text-muted-foreground">Saved on this device.</p>
      </Section>

      <Section title="Install VAYVOR" hint="App-like launch and an offline shell on this device.">
        <InstallSection />
      </Section>

      <Section title="Reminders" hint="Opt in per type. Off by default.">
        <RemindersSection />
      </Section>

      <Section title="Account" hint="Sign in for backup and friends. Guests stay on this device.">
        <AccountSection />
      </Section>

      <Section title="Your data" hint="Where it lives, backups, and moving between devices.">
        <DataSection />
      </Section>

      <Section
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
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
                  onClick={() => setArchive(i)}
                >
                  <Archive className="size-4" />
                </button>
              </Row>
            ))}
        </ul>
        <div>
          <Button variant="secondary" onClick={() => setItem({ label: "", detail: "" })}>
            <Plus className="size-4" />
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
