import { get, list, put } from "./db";
import { assertGeneration, scopeGeneration } from "./scope";
import { COL, type PrayerSettings, type WorkoutTemplate } from "./types";
import { makeLookup, type StoredPrayerDay } from "./prayer";
import { buildReminders, DEFAULT_REMINDER_PREFS, type ReminderPrefs } from "@/domain/reminders";
import { supabase } from "@/lib/supabase";

export const getReminderPrefs = async (): Promise<ReminderPrefs> => ({
  ...DEFAULT_REMINDER_PREFS,
  ...((await get<ReminderPrefs>(COL.reminderPrefs, "main")) ?? {}),
});
export const saveReminderPrefs = (p: ReminderPrefs) => put(COL.reminderPrefs, "main", p);

export async function computeReminders(now = Date.now()) {
  const [prefs, settings, days, templates] = await Promise.all([
    getReminderPrefs(),
    get<PrayerSettings>(COL.prayerSettings, "main"),
    list<StoredPrayerDay>(COL.prayerDays),
    list<WorkoutTemplate>(COL.templates),
  ]);
  return buildReminders({
    now,
    tz: settings?.timezone ?? "Europe/London",
    prefs,
    prayerLookup: makeLookup(days, settings),
    training: templates
      .filter((t) => !t.archivedAt)
      .map((t) => ({
        id: t.id,
        weekday: t.weekday,
        time: t.time,
        letter: t.letter,
        title: t.title,
      })),
  });
}

export type PushCapability = {
  supported: boolean;
  needsInstall: boolean; // iOS/iPadOS: Web Push only works from an installed Home Screen web app
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  vapidConfigured: boolean;
};

const b64 = (s: string) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(r, (c) => c.charCodeAt(0));
};
export const vapidKey = () => import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export async function pushCapability(): Promise<PushCapability> {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  const hasAPIs =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let subscribed = false;
  if (hasAPIs) {
    try {
      subscribed = !!(await (await navigator.serviceWorker.ready).pushManager.getSubscription());
    } catch {
      /* ignore */
    }
  }
  return {
    supported: hasAPIs && (!ios || standalone),
    needsInstall: ios && !standalone,
    permission: "Notification" in window ? Notification.permission : "unsupported",
    subscribed,
    vapidConfigured: !!vapidKey(),
  };
}

/** Must be called from a user gesture. Requests permission, subscribes, and uploads the subscription. */
export async function enablePush(): Promise<void> {
  if (!supabase)
    throw new Error("Sign in with a cloud account first: background reminders need a server.");
  const key = vapidKey();
  if (!key) throw new Error("Push isn't configured in this build (missing VITE_VAPID_PUBLIC_KEY).");
  const perm = await Notification.requestPermission();
  if (perm !== "granted")
    throw new Error(
      "Notifications are blocked. You can allow them in your browser or phone settings.",
    );
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  const j = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
    p_user_agent: navigator.userAgent.slice(0, 200),
    p_expires: sub.expirationTime ? new Date(sub.expirationTime).toISOString() : null,
  });
  if (error) throw new Error(error.message);
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub && supabase) await supabase.rpc("delete_push_subscription", { p_endpoint: sub.endpoint });
  await sub?.unsubscribe();
  if (supabase) await supabase.rpc("disable_reminders");
}

/** Uploads the next ~48h of reminders so the server can deliver them. Returns how many are scheduled. */
export async function uploadSchedule(): Promise<number> {
  if (!supabase) return 0;
  const gen = scopeGeneration();
  const items = (await computeReminders()).map((r) => ({
    key: r.key,
    kind: r.kind,
    fire_at: new Date(r.fireAt).toISOString(),
    title: r.title,
    body: r.body,
    url: r.url,
  }));
  assertGeneration(gen); // never upload another account's schedule
  const { error } = await supabase.rpc("replace_reminders", { p_items: items });
  if (error) throw new Error(error.message);
  return items.length;
}

/** A local notification, to prove permission and the service worker work on this device. */
export async function sendTestNotification() {
  if (Notification.permission !== "granted") {
    const p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("Notifications are blocked for this site.");
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg)
    throw new Error(
      "The service worker isn't active here (it only runs in the installed or production app).",
    );
  await reg.showNotification("New Life test", {
    body: "Notifications are working on this device.",
    icon: "/icon-192.png",
    tag: "test",
  });
}
