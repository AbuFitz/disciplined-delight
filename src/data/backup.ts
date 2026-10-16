import {
  BACKUP_APP,
  BACKUP_SCHEMA,
  previewImport,
  type Backup,
  type BackupRecord,
  type ImportMode,
} from "@/domain/backup";
import { bulkPut, clearCollections, dumpAll, setMeta, type StoredRecord } from "./db";

/** Calculated prayer-time cache is regenerated from the provider, so it isn't part of a backup. */
const EXCLUDED = (r: StoredRecord) =>
  r.collection === "prayerDays" && (r.data as { origin?: string }).origin === "calculated";

export const group = (records: StoredRecord[]) => {
  const out: Record<string, BackupRecord[]> = {};
  for (const r of records) {
    if (EXCLUDED(r)) continue;
    (out[r.collection] ??= []).push({ id: r.id, data: r.data, deletedAt: r.deletedAt ?? null });
  }
  return out;
};

export async function currentGrouped() {
  return group(await dumpAll());
}

export async function buildBackup(): Promise<Backup> {
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    attachments: "none",
    collections: await currentGrouped(),
  };
}

export async function previewBackup(b: Backup, mode: ImportMode) {
  return previewImport(await currentGrouped(), b, mode);
}

/** Applies a backup. Merge never overwrites existing ids; replace clears the collections the backup contains first. */
export async function applyBackup(b: Backup, mode: ImportMode) {
  if (mode === "replace") await clearCollections(Object.keys(b.collections));
  const items = Object.entries(b.collections).flatMap(([collection, recs]) =>
    recs.filter((r) => !r.deletedAt).map((r) => ({ collection, id: r.id, data: r.data })),
  );
  const res = await bulkPut(items, { overwrite: mode === "replace" });
  await setMeta("lastImport", { at: Date.now(), mode, ...res });
  return res;
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupFilename = () => `vayvor-backup-${new Date().toISOString().slice(0, 10)}.json`;

export const ERASE_GROUPS = {
  training: { label: "Training sessions", cols: ["sessions"] },
  food: { label: "Food logs", cols: ["mealLogs", "foodDays"] },
  prayer: { label: "Prayer logs", cols: ["prayerLogs"] },
  weight: { label: "Weigh-ins", cols: ["weighIns"] },
  legacy: { label: "Original-app history", cols: ["legacyDays"] },
} as const;

/** Soft-deletes (tombstones) every live record in the collections and returns what it removed, so it can be undone. */
export async function eraseCollections(cols: readonly string[]) {
  const { listRecords, remove } = await import("./db");
  const removed: { collection: string; id: string }[] = [];
  for (const c of cols) {
    for (const r of await listRecords(c)) {
      if (r.deletedAt) continue;
      await remove(c, r.id);
      removed.push({ collection: c, id: r.id });
    }
  }
  return removed;
}

export async function undoErase(removed: { collection: string; id: string }[]) {
  const { restore } = await import("./db");
  for (const r of removed) await restore(r.collection, r.id);
}
