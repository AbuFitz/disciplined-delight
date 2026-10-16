import { useSyncExternalStore } from "react";

/** What the user is told about where their data lives. Local saves are never called backups. */
export type SyncMode = "local" | "waiting" | "syncing" | "synced" | "attention";
let state: { mode: SyncMode; detail?: string } = { mode: "local" };
const subs = new Set<() => void>();
export const setSyncStatus = (s: { mode: SyncMode; detail?: string }) => {
  state = s;
  subs.forEach((f) => f());
};
export const useSyncStatus = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
    () => state,
  );

export const SYNC_LABEL: Record<SyncMode, string> = {
  local: "This device only",
  waiting: "Changes waiting",
  syncing: "Syncing",
  synced: "Synced",
  attention: "Needs attention",
};
