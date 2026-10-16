import { useEffect } from "react";
import { getMeta, onAnyChange, outboxCount } from "./db";
import { getConflicts, runSync } from "./sync-engine";
import { setSyncStatus } from "./sync-status";
import { createSupabaseRemote } from "./supabase-remote";
import { useSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export type SyncLink = { userId: string; since: number };
export const SYNC_LINK_KEY = "sync:link";

/**
 * Keeps this device in sync only when the user has explicitly linked it to their account.
 * Waits for auth to finish loading, refuses to sync if the signed-in account isn't the one linked,
 * and never reports "synced" unless a pass finished with nothing queued and no conflicts.
 */
export function useSyncRunner() {
  const { loading, user } = useSession();
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSyncStatus({ mode: "local", detail: "Cloud backup isn't configured in this build." });
      return;
    }
    if (loading) return;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const remote = createSupabaseRemote();

    const pass = async () => {
      if (running) return;
      running = true;
      try {
        const link = await getMeta<SyncLink>(SYNC_LINK_KEY);
        if (!link || !user) {
          setSyncStatus({
            mode: "local",
            detail: user ? "Signed in. Turn on sync in Settings." : undefined,
          });
          return;
        }
        if (link.userId !== user.id) {
          setSyncStatus({
            mode: "attention",
            detail: "This device is linked to a different account. Sync is paused.",
          });
          return;
        }
        if (!navigator.onLine) {
          setSyncStatus({
            mode: (await outboxCount()) ? "waiting" : "synced",
            detail: "Offline. Changes will sync when you reconnect.",
          });
          return;
        }
        setSyncStatus({ mode: "syncing" });
        const res = await runSync(remote);
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
      off();
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("online", soon);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [loading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
