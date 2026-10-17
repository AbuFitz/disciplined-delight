import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveProfile } from "@/data/actions";
import { useProfile } from "@/data/hooks";
import type { FaithPractice, FaithProfile, FaithTradition } from "@/data/types";
import { hasIslamicPrayerPack, normalizeFaithProfile, resolveFaithProfile } from "@/domain/faith";
import { Button, CheckButton, Field, Select, TextInput } from "./ui";
import { setSalahEnabled } from "@/data/routine-actions";
import { getReminderPrefs, saveReminderPrefs } from "@/data/reminders";

const traditions: { value: FaithTradition; label: string }[] = [
  { value: "not_for_me", label: "Not for me" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "islam", label: "Islam" },
  { value: "christianity", label: "Christianity" },
  { value: "judaism", label: "Judaism" },
  { value: "hindu_traditions", label: "Hindu traditions" },
  { value: "buddhist_traditions", label: "Buddhist traditions" },
  { value: "sikhism", label: "Sikhism" },
  { value: "jainism", label: "Jainism" },
  { value: "bahai", label: "Bahá’í" },
  { value: "shinto", label: "Shinto" },
  { value: "indigenous_traditional", label: "Indigenous / traditional" },
  { value: "spiritual", label: "Spiritual / no organised religion" },
  { value: "custom", label: "Self-described" },
];
const practices: { value: FaithPractice; label: string }[] = [
  { value: "prayer_remembrance", label: "Prayer or remembrance" },
  { value: "scripture_reading", label: "Scripture or reading" },
  { value: "meditation_contemplation", label: "Meditation or contemplation" },
  { value: "fasting_dietary", label: "Fasting or dietary observance" },
  { value: "sacred_dates", label: "Sacred dates or seasons" },
  { value: "weekly_rest_worship", label: "Weekly rest or worship" },
  { value: "community_service", label: "Community or service" },
  { value: "pilgrimage_preparation", label: "Pilgrimage preparation" },
  { value: "custom_ritual", label: "Custom ritual or routine" },
];

export function FaithSettings() {
  const { profile } = useProfile();
  const [draft, setDraft] = useState<FaithProfile>(() => resolveFaithProfile(profile ?? {}));
  const [multiple, setMultiple] = useState(
    () => resolveFaithProfile(profile ?? {}).traditions.length > 1,
  );
  useEffect(() => setDraft(resolveFaithProfile(profile ?? {})), [profile]);
  const toggle = (value: FaithPractice) =>
    setDraft((old) => ({
      ...old,
      practices: old.practices.includes(value)
        ? old.practices.filter((item) => item !== value)
        : [...old.practices, value],
    }));
  const active =
    draft.traditions.length > 0 &&
    !draft.traditions.includes("not_for_me") &&
    !draft.traditions.includes("prefer_not_to_say");
  const mode = multiple ? "multiple" : (draft.traditions[0] ?? "not_for_me");
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Optional and private. VAYVOR never infers this from your name, location, diet or activity.
        Tradition-specific content needs editorial review; this release provides custom schedules.
      </p>
      <Field label="Tradition or path" hint="This list is not intended to be exhaustive.">
        <Select
          value={mode}
          onChange={(event) => {
            if (event.target.value === "multiple") {
              setMultiple(true);
              setDraft({ ...draft, traditions: [], enabled: false, practices: [] });
              return;
            }
            setMultiple(false);
            const tradition = event.target.value as FaithTradition;
            setDraft({
              ...draft,
              traditions: [tradition],
              enabled: tradition !== "not_for_me" && tradition !== "prefer_not_to_say",
              practices:
                tradition === "not_for_me" || tradition === "prefer_not_to_say"
                  ? []
                  : draft.practices,
            });
          }}
        >
          {traditions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          <option value="multiple">Multiple traditions</option>
        </Select>
      </Field>
      {multiple && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Select each tradition or path</legend>
          <div className="grid gap-px border-y border-line sm:grid-cols-2">
            {traditions
              .filter((item) => item.value !== "not_for_me" && item.value !== "prefer_not_to_say")
              .map((item) => (
                <label key={item.value} className="flex min-h-14 items-center gap-3 py-2">
                  <CheckButton
                    checked={draft.traditions.includes(item.value)}
                    onChange={() =>
                      setDraft((old) => ({
                        ...old,
                        enabled: true,
                        traditions: old.traditions.includes(item.value)
                          ? old.traditions.filter((value) => value !== item.value)
                          : [...old.traditions, item.value],
                      }))
                    }
                    label={item.label}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
          </div>
        </fieldset>
      )}
      {active && (
        <>
          <Field
            label={
              draft.traditions.includes("custom")
                ? "How you describe it"
                : "Branch, school or community (optional)"
            }
          >
            <TextInput
              value={
                draft.traditions.includes("custom")
                  ? (draft.customLabel ?? "")
                  : (draft.branch ?? "")
              }
              onChange={(event) =>
                setDraft({
                  ...draft,
                  ...(draft.traditions.includes("custom")
                    ? { customLabel: event.target.value }
                    : { branch: event.target.value }),
                })
              }
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Practices to support</legend>
            <div className="grid gap-px border-y border-line">
              {practices.map((practice) => (
                <label key={practice.value} className="flex min-h-14 items-center gap-3 py-2">
                  <CheckButton
                    checked={draft.practices.includes(practice.value)}
                    onChange={() => toggle(practice.value)}
                    label={practice.label}
                  />
                  <span>{practice.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <div>
        <Button
          variant="primary"
          onClick={async () => {
            const enabled = active;
            const faith = normalizeFaithProfile({ ...draft, enabled, private: true as const });
            const modules = profile?.modules ?? [
              "training",
              "nutrition",
              "mind",
              "routines",
              "community",
            ];
            const nextModules = enabled
              ? Array.from(new Set([...modules, "spirituality" as const]))
              : modules.filter((item) => item !== "spirituality");
            const prayerPackEnabled = hasIslamicPrayerPack(faith);
            await saveProfile({
              faith,
              faithRoutines: prayerPackEnabled,
              modules: nextModules,
              setup: { ...profile!.setup, prayer: prayerPackEnabled },
            });
            await setSalahEnabled(prayerPackEnabled);
            if (!prayerPackEnabled) {
              const reminders = await getReminderPrefs();
              await saveReminderPrefs({
                ...reminders,
                prayer: { ...reminders.prayer, enabled: false },
              });
            }
            toast.success(
              enabled ? "Faith & reflection preferences saved" : "Faith & reflection disabled",
            );
          }}
        >
          Save private preferences
        </Button>
      </div>
    </div>
  );
}
