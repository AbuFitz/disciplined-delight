import { useEffect } from "react";
import { useScope } from "./account";
import { getMeta, onAnyChange, outboxCount, setMeta } from "./db";
import { scopeDbName } from "./scope";
import { getConflicts, runSync, type SyncResult } from "./sync-engine";
import { setSyncStatus } from "./sync-status";
import { createSupabaseRemote } from "./supabase-remote";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export type SyncLink = { userId: string; since: number };
export const SYNC_LINK_KEY = "sync:link";

/**
 * Every sync entry point (automatic passes and the "Sync now" button) goes through here.
 * It refuses unless the storage scope, the signed-in account and the account this database was
 * created for are all the same person. (Defence in depth: the scope already separates the databases.)
 */
export async function syncNow(
  scope: ReturnType<typeof useScope>,
  userId: string | undefined,
): Promise<SyncResult | { skipped: string }> {
  if (!isSupabaseConfigured) return { skipped: "Accounts aren't set up in this build." };
  if (scope.kind !== "user" || !userId || scope.userId !== userId)
    return { skipped: "Not signed in to this data." };
  const link = await getMeta<SyncLink>(SYNC_LINK_KEY);
  if (link && link.userId !== userId)
    return { skipped: "This data belongs to a different account." };
  if (!link) await setMeta(SYNC_LINK_KEY, { userId, since: Date.now() } satisfies SyncLink);
  return runSync(createSupabaseRemote());
}

/**
 * Keeps a signed-in account's data in sync. Guests are never synced: guest data stays on the device
 * until the person chooses to import it into an account.
 */
export function useSyncRunner() {
  const auth = useAuth();
  const scope = useScope();
  const userId = auth.user?.id;
  const key = scopeDbName(scope);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSyncStatus({ mode: "local", detail: "Cloud backup isn't configured in this build." });
      return;
    }
    if (scope.kind !== "user" || !userId || scope.userId !== userId) {
      setSyncStatus({ mode: "local", detail: "Guest: saved on this device only." });
      return;
    }
    let cancelled = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pass = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        if (!navigator.onLine) {
          if (!cancelled)
            setSyncStatus({
              mode: (await outboxCount()) ? "waiting" : "synced",
              detail: "Offline. Changes will sync when you reconnect.",
            });
          return;
        }
        setSyncStatus({ mode: "syncing" });
        const res = await syncNow(scope, userId);
        if (cancelled) return; // the account changed while syncing; the next scope sets its own status
        if ("skipped" in res) setSyncStatus({ mode: "attention", detail: res.skipped });
        else if (res.error === "cancelled") return;
        else {
          const conflicts = (await getConflicts()).length;
          if (res.error)
            setSyncStatus({
              mode: (await outboxCount()) ? "waiting" : "attention",
              detail: res.error,
            });
          else if (conflicts)
            setSyncStatus({
              mode: "attention",
              detail: `${conflicts} change${conflicts > 1 ? "s" : ""} to review in Settings.`,
            });
          else setSyncStatus({ mode: (await outboxCount()) ? "waiting" : "synced" });
        }
      } catch {
        /* scope changed or storage unavailable: the next effect run reports status */
      } finally {
        running = false;
      }
    };

    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void pass(), 2000);
    };
    void pass();
    const off = onAnyChange(soon);
    const interval = setInterval(() => void pass(), 60_000);
    const vis = () => document.visibilityState === "visible" && void pass();
    window.addEventListener("online", soon);
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelled = true;
      off();
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("online", soon);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [key, userId]); // eslint-disable-line react-hooks/exhaustive-deps
}
