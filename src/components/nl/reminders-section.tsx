import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, Field, NumberField, Switch, TextInput } from "./ui";
import { useCollection } from "@/data/hooks";
import { COL, type PrayerSettings } from "@/data/types";
import { makeLookup, type StoredPrayerDay } from "@/data/prayer";
import {
  disablePush,
  enablePush,
  getReminderPrefs,
  pushCapability,
  saveReminderPrefs,
  sendTestNotification,
  uploadSchedule,
  type PushCapability,
} from "@/data/reminders";
import { useSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PRAYER_LABEL, PRAYERS, type PrayerName } from "@/domain/prayer";
import {
  DEFAULT_REMINDER_PREFS,
  quietConflictsWithFajr,
  type ReminderPrefs,
} from "@/domain/reminders";

export function RemindersSection() {
  const auth = useSession();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [cap, setCap] = useState<PushCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = useCollection<PrayerSettings>(COL.prayerSettings).items[0];
  const days = useCollection<StoredPrayerDay>(COL.prayerDays).items;
  const lookup = useMemo(() => makeLookup(days, settings), [days, settings]);

  useEffect(() => {
    void getReminderPrefs().then(setPrefs);
    void pushCapability().then(setCap);
  }, []);
  const update = (p: ReminderPrefs) => {
    setPrefs(p);
    void saveReminderPrefs(p);
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      void pushCapability().then(setCap);
    }
  };

  const fajrClash = quietConflictsWithFajr({
    now: Date.now(),
    tz: settings?.timezone ?? "Europe/London",
    prefs,
    prayerLookup: lookup,
  });
  const anyOn = prefs.prayer.enabled || prefs.training.enabled || prefs.food.enabled;
  const serverReady = isSupabaseConfigured && !!auth.user && !!cap?.vapidConfigured;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-line p-3 text-sm" aria-label="Delivery status">
        <p className="font-medium">What's available on this device</p>
        <ul className="mt-1 grid gap-1 text-muted-foreground">
          <li>
            Notifications:{" "}
            {cap == null
              ? "checking…"
              : !cap.supported
                ? cap.needsInstall
                  ? "On iPhone and iPad, add VAYVOR to your Home Screen first, then open it from there."
                  : "Not supported by this browser."
                : cap.permission === "granted"
                  ? "Allowed"
                  : cap.permission === "denied"
                    ? "Blocked in your settings"
                    : "Not asked yet"}
          </li>
          <li>
            Reminders while the app is closed:{" "}
            {serverReady
              ? cap?.subscribed
                ? "Set up on this device"
                : "Available. Turn on below."
              : "Not available until a cloud account, push keys and the reminder service are set up. See the setup notes."}
          </li>
        </ul>
      </div>

      <div>
        <Switch
          label="Prayer reminders"
          hint="Before each prayer starts, from your Salah times."
          checked={prefs.prayer.enabled}
          onChange={(v) => update({ ...prefs, prayer: { ...prefs.prayer, enabled: v } })}
        />
        {prefs.prayer.enabled && (
          <div className="grid gap-3 pb-2 pl-1">
            <Field label="How long before">
              <NumberField
                label="Prayer lead time"
                unit="min"
                min={0}
                max={120}
                step={5}
                decimals={0}
                value={prefs.prayer.leadMinutes}
                onChange={(v) =>
                  update({ ...prefs, prayer: { ...prefs.prayer, leadMinutes: v ?? 0 } })
                }
              />
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Which prayers</legend>
              <div className="flex flex-wrap gap-1.5">
                {PRAYERS.map((p: PrayerName) => {
                  const on = prefs.prayer.which.includes(p);
                  return (
                    <button
                      key={p}
                      aria-pressed={on}
                      onClick={() =>
                        update({
                          ...prefs,
                          prayer: {
                            ...prefs.prayer,
                            which: on
                              ? prefs.prayer.which.filter((x) => x !== p)
                              : [...prefs.prayer.which, p],
                          },
                        })
                      }
                      className={`min-h-11 rounded-full border px-4 text-sm font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                    >
                      {PRAYER_LABEL[p]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}
        <Switch
          label="Training reminders"
          hint="Before a workout that has a usual time."
          checked={prefs.training.enabled}
          onChange={(v) => update({ ...prefs, training: { ...prefs.training, enabled: v } })}
        />
        {prefs.training.enabled && (
          <Field label="How long before">
            <NumberField
              label="Training lead time"
              unit="min"
              min={0}
              max={240}
              step={15}
              decimals={0}
              value={prefs.training.leadMinutes}
              onChange={(v) =>
                update({ ...prefs, training: { ...prefs.training, leadMinutes: v ?? 0 } })
              }
            />
          </Field>
        )}
        <Switch
          label="Food check-in"
          hint="A daily nudge to log meals."
          checked={prefs.food.enabled}
          onChange={(v) => update({ ...prefs, food: { ...prefs.food, enabled: v } })}
        />
        {prefs.food.enabled && (
          <Field label="Time" htmlFor="rm-food">
            <TextInput
              id="rm-food"
              type="time"
              value={prefs.food.time}
              onChange={(e) =>
                update({ ...prefs, food: { ...prefs.food, time: e.target.value || "20:00" } })
              }
            />
          </Field>
        )}
        <Switch
          label="Quiet hours"
          hint="Hold reminders back overnight."
          checked={prefs.quiet.enabled}
          onChange={(v) => update({ ...prefs, quiet: { ...prefs.quiet, enabled: v } })}
        />
        {prefs.quiet.enabled && (
          <div className="grid gap-3 pl-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" htmlFor="rm-q1">
                <TextInput
                  id="rm-q1"
                  type="time"
                  value={prefs.quiet.start}
                  onChange={(e) =>
                    update({
                      ...prefs,
                      quiet: { ...prefs.quiet, start: e.target.value || "22:00" },
                    })
                  }
                />
              </Field>
              <Field label="Until" htmlFor="rm-q2">
                <TextInput
                  id="rm-q2"
                  type="time"
                  value={prefs.quiet.end}
                  onChange={(e) =>
                    update({ ...prefs, quiet: { ...prefs.quiet, end: e.target.value || "05:00" } })
                  }
                />
              </Field>
            </div>
            {fajrClash && (
              <div role="alert" className="rounded-2xl border border-warn/50 p-3 text-sm">
                <p>Your quiet hours cover the Fajr reminder.</p>
                <div className="mt-2">
                  <Switch
                    label="Still send my Fajr reminder"
                    checked={prefs.quiet.allowFajr}
                    onChange={(v) => update({ ...prefs, quiet: { ...prefs.quiet, allowFajr: v } })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          busy={busy}
          onClick={() =>
            act(async () => {
              await sendTestNotification();
              toast.success("Test sent. Check for the notification.");
            })
          }
        >
          Send a test notification
        </Button>
        {serverReady && !cap?.subscribed && (
          <Button
            variant="primary"
            busy={busy}
            disabled={!anyOn || !cap?.supported}
            onClick={() =>
              act(async () => {
                await enablePush();
                const n = await uploadSchedule();
                toast.success(`Background reminders on. ${n} scheduled.`);
              })
            }
          >
            Turn on background reminders
          </Button>
        )}
        {serverReady && cap?.subscribed && (
          <>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() =>
                act(async () => {
                  const n = await uploadSchedule();
                  toast.success(`${n} reminders scheduled for the next 48 hours.`);
                })
              }
            >
              Refresh schedule
            </Button>
            <Button
              variant="ghost"
              busy={busy}
              onClick={() =>
                act(async () => {
                  await disablePush();
                  toast("Background reminders turned off.");
                })
              }
            >
              Turn off
            </Button>
          </>
        )}
        {cap?.subscribed && <Chip tone="ok">Subscribed</Chip>}
      </div>
      <p className="text-xs text-muted-foreground">
        Delivery isn't guaranteed to the minute: phones and push services can delay messages.
        Reminders are scheduled for the next 48 hours and refreshed whenever the app syncs. If the
        app isn't opened for a long time, old reminders are dropped instead of arriving late.
      </p>
    </div>
  );
}
