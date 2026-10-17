import { get, list, put } from "./db";
import { assertGeneration, scopeGeneration } from "./scope";
import {
  COL,
  type MindEntry,
  type Modules,
  type PrayerLog,
  type PrayerSettings,
  type RoutineBlock,
  type RoutineCompletion,
  type RoutineException,
  type Session,
  type WorkoutTemplate,
} from "./types";
import { makeLookup, type StoredPrayerDay } from "./prayer";
import { plannedTemplateFor } from "./selectors";
import type { MealLog } from "@/domain/nutrition";
import { addDays, localDate, localMinutes } from "@/domain/dates";
import { agendaFor, type RoutineBlockLike } from "@/domain/routine";
import {
  buildReminders,
  DEFAULT_REMINDER_PREFS,
  type ReminderPrefs,
  type RoutineReminderOccurrence,
} from "@/domain/reminders";
import { supabase } from "@/lib/supabase";

export const getReminderPrefs = async (): Promise<ReminderPrefs> => ({
  ...DEFAULT_REMINDER_PREFS,
  ...((await get<ReminderPrefs>(COL.reminderPrefs, "main")) ?? {}),
});
export const saveReminderPrefs = (p: ReminderPrefs) => put(COL.reminderPrefs, "main", p);

export async function computeReminders(now = Date.now()) {
  const [
    prefs,
    settings,
    days,
    templates,
    blocks,
    exceptions,
    completions,
    sessions,
    meals,
    mind,
    prayerLogs,
    modules,
  ] = await Promise.all([
    getReminderPrefs(),
    get<PrayerSettings>(COL.prayerSettings, "main"),
    list<StoredPrayerDay>(COL.prayerDays),
    list<WorkoutTemplate>(COL.templates),
    list<RoutineBlock>(COL.routine),
    list<RoutineException>(COL.routineExceptions),
    list<RoutineCompletion>(COL.routineDone),
    list<Session>(COL.sessions),
    list<MealLog>(COL.mealLogs),
    list<MindEntry>(COL.mind),
    list<PrayerLog>(COL.prayerLogs),
    list<Modules>(COL.modules),
  ]);
  const tz = settings?.timezone ?? "Europe/London";
  const today = localDate(now, tz);
  const lookup = makeLookup(days, settings);
  const salahEnabled = modules.find((item) => item.id === "main")?.salah ?? !!settings;
  const routine: RoutineReminderOccurrence[] = [];
  const reminderBlocks = new Map(
    blocks
      .filter(
        (block) =>
          !block.archivedAt &&
          block.kind !== "work" &&
          block.kind !== "sleep" &&
          typeof block.reminderMinutes === "number" &&
          Number.isFinite(block.reminderMinutes) &&
          block.reminderMinutes >= 0 &&
          block.reminderMinutes <= 240,
      )
      .map((block) => [block.id, block]),
  );

  if (reminderBlocks.size) {
    for (let offset = 0; offset < 4; offset++) {
      const date = addDays(today, offset);
      const day = lookup(date);
      const previous = lookup(addDays(date, -1));
      const planned = plannedTemplateFor(templates, date);
      const finished = sessions.filter(
        (session) => session.date === date && session.status === "completed",
      );
      const agenda = agendaFor({
        date,
        today,
        nowMin: localMinutes(now, tz),
        blocks: blocks as RoutineBlockLike[],
        exceptions,
        completions,
        prayer: {
          enabled: salahEnabled,
          start: (prayer) => day?.start[prayer],
          startPrev: (prayer) => previous?.start[prayer],
          logged: new Set(prayerLogs.filter((log) => log.date === date).map((log) => log.prayer)),
        },
        workout: {
          planned: planned
            ? {
                id: planned.id,
                letter: planned.letter,
                title: planned.title,
                time: planned.time,
              }
            : undefined,
          completed: new Set(finished.map((session) => session.templateId)),
          anyCompleted: finished.length > 0,
        },
        mealsLogged: meals.filter((meal) => meal.date === date).length,
        mind: new Set(mind.filter((entry) => entry.date === date).map((entry) => entry.kind)),
      });
      for (const item of agenda.items) {
        if (item.source !== "block" || !item.blockId || item.context || item.continued) continue;
        const block = reminderBlocks.get(item.blockId);
        if (!block || block.reminderMinutes == null) continue;
        routine.push({
          date,
          key: item.key,
          label: item.label,
          detail: item.detail,
          startMin: item.startMin,
          leadMinutes: block.reminderMinutes,
          status: item.status,
        });
      }
    }
  }
  return buildReminders({
    now,
    tz,
    prefs,
    prayerLookup: lookup,
    training: templates
      .filter((t) => !t.archivedAt)
      .map((t) => ({
        id: t.id,
        weekday: t.weekday,
        time: t.time,
        letter: t.letter,
        title: t.title,
      })),
    routine,
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

/** Refreshes server rows only for a device that already owns a push subscription. */
export async function refreshSubscribedSchedule(): Promise<number | null> {
  if (!supabase || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration || !(await registration.pushManager.getSubscription())) return null;
  return uploadSchedule();
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
  await reg.showNotification("VAYVOR test", {
    body: "Notifications are working on this device.",
    icon: "/icon-192.png",
    tag: "test",
  });
}
