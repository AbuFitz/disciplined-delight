export const BACKUP_APP = "new-life";
export const BACKUP_SCHEMA = 1;

export type BackupRecord = { id: string; data: unknown; deletedAt?: number | null };
export type Backup = {
  app: typeof BACKUP_APP;
  schema: number;
  exportedAt: string;
  /** Photos are not part of this format yet; see docs. */
  attachments: "none";
  collections: Record<string, BackupRecord[]>;
};

export type ImportMode = "merge" | "replace";

export type ImportPreview = {
  perCollection: {
    collection: string;
    incoming: number;
    added: number;
    identical: number;
    conflicting: number;
    replaced: number;
  }[];
  totals: { incoming: number; added: number; identical: number; conflicting: number };
};

export function parseBackup(
  text: string,
): { ok: true; backup: Backup } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const b = json as Partial<Backup>;
  if (!b || b.app !== BACKUP_APP) return { ok: false, error: "That isn't a New Life backup." };
  if (typeof b.schema !== "number" || b.schema > BACKUP_SCHEMA) {
    return {
      ok: false,
      error: "This backup is from a newer version of the app. Update first, then import.",
    };
  }
  if (!b.collections || typeof b.collections !== "object")
    return { ok: false, error: "The backup has no data." };
  for (const [name, recs] of Object.entries(b.collections)) {
    if (!Array.isArray(recs)) return { ok: false, error: `Collection "${name}" is malformed.` };
    for (const r of recs)
      if (!r || typeof r.id !== "string")
        return { ok: false, error: `A record in "${name}" has no id.` };
  }
  return { ok: true, backup: b as Backup };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Describes what an import would do without doing it.
 * merge: keeps every record you already have; adds the ones you don't; conflicting ids are kept as yours.
 * replace: everything on this device is replaced by the backup.
 */
export function previewImport(
  existing: Record<string, BackupRecord[]>,
  b: Backup,
  mode: ImportMode,
): ImportPreview {
  const per: ImportPreview["perCollection"] = [];
  for (const [collection, incoming] of Object.entries(b.collections)) {
    const have = new Map((existing[collection] ?? []).map((r) => [r.id, r]));
    let added = 0,
      identical = 0,
      conflicting = 0;
    for (const r of incoming) {
      const cur = have.get(r.id);
      if (!cur) added++;
      else if (same(cur.data, r.data) && !!cur.deletedAt === !!r.deletedAt) identical++;
      else conflicting++;
    }
    per.push({
      collection,
      incoming: incoming.length,
      added,
      identical,
      conflicting,
      replaced: mode === "replace" ? have.size : 0,
    });
  }
  const sum = (k: "incoming" | "added" | "identical" | "conflicting") =>
    per.reduce((s, p) => s + p[k], 0);
  return {
    perCollection: per,
    totals: {
      incoming: sum("incoming"),
      added: sum("added"),
      identical: sum("identical"),
      conflicting: sum("conflicting"),
    },
  };
}
