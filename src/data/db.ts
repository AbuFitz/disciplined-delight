import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Local-first document store on IndexedDB.
 * - Every record has a stable id, a revision counter and an optional tombstone.
 * - Every write and its outbox entry are committed in ONE transaction, so a
 *   local save can never exist without its queued sync mutation.
 */
export type StoredRecord<T = unknown> = {
  collection: string;
  id: string;
  data: T;
  rev: number; // local revision, incremented per write
  serverRev?: number; // last known server revision
  updatedAt: number;
  deletedAt?: number | null;
};

export type Mutation = {
  seq?: number;
  mid: string; // idempotency key
  collection: string;
  id: string;
  op: "put" | "delete";
  baseServerRev: number;
  data?: unknown;
  ts: number;
  attempts: number;
  lastError?: string;
};

interface Schema extends DBSchema {
  records: {
    key: [string, string];
    value: StoredRecord;
    indexes: { byCollection: string };
  };
  outbox: { key: number; value: Mutation; indexes: { byMid: string } };
  meta: { key: string; value: unknown };
}

export const DB_NAME = "new-life";
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

export function getDB() {
  dbPromise ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const rec = db.createObjectStore("records", { keyPath: ["collection", "id"] });
      rec.createIndex("byCollection", "collection");
      const ob = db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      ob.createIndex("byMid", "mid", { unique: true });
      db.createObjectStore("meta");
    },
  });
  return dbPromise;
}

/** Test helper: drop the cached connection so a fresh DB can be opened. */
export async function closeDB() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const ALL = "*";

export function subscribe(collection: string, fn: Listener): () => void {
  const set = listeners.get(collection) ?? new Set();
  set.add(fn);
  listeners.set(collection, set);
  return () => set.delete(fn);
}
function notify(cols: Iterable<string>) {
  for (const c of new Set([...cols, ALL])) listeners.get(c)?.forEach((f) => f());
}

export const newId = () => crypto.randomUUID();

export type WriteOptions = { track?: boolean };

export async function put<T>(
  collection: string,
  id: string,
  data: T,
  opts: WriteOptions = {},
): Promise<StoredRecord<T>> {
  const db = await getDB();
  const tx = db.transaction(["records", "outbox"], "readwrite");
  const existing = (await tx.objectStore("records").get([collection, id])) as
    | StoredRecord<T>
    | undefined;
  const rec: StoredRecord<T> = {
    collection,
    id,
    data,
    rev: (existing?.rev ?? 0) + 1,
    serverRev: existing?.serverRev,
    updatedAt: Date.now(),
    deletedAt: null,
  };
  await tx.objectStore("records").put(rec as StoredRecord);
  if (opts.track !== false) {
    await tx.objectStore("outbox").add({
      mid: newId(),
      collection,
      id,
      op: "put",
      baseServerRev: existing?.serverRev ?? 0,
      data,
      ts: rec.updatedAt,
      attempts: 0,
    });
  }
  await tx.done;
  notify([collection]);
  return rec;
}

/** Soft delete (tombstone) so deletes can sync and be undone. */
export async function remove(
  collection: string,
  id: string,
  opts: WriteOptions = {},
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["records", "outbox"], "readwrite");
  const existing = await tx.objectStore("records").get([collection, id]);
  if (!existing) {
    await tx.done;
    return;
  }
  const rec: StoredRecord = {
    ...existing,
    rev: existing.rev + 1,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  };
  await tx.objectStore("records").put(rec);
  if (opts.track !== false) {
    await tx.objectStore("outbox").add({
      mid: newId(),
      collection,
      id,
      op: "delete",
      baseServerRev: existing.serverRev ?? 0,
      ts: rec.updatedAt,
      attempts: 0,
    });
  }
  await tx.done;
  notify([collection]);
}

export async function restore(collection: string, id: string): Promise<void> {
  const db = await getDB();
  const ex = await db.get("records", [collection, id]);
  if (ex?.deletedAt) await put(collection, id, ex.data);
}

export async function get<T>(collection: string, id: string): Promise<T | undefined> {
  const r = (await (await getDB()).get("records", [collection, id])) as StoredRecord<T> | undefined;
  return r && !r.deletedAt ? r.data : undefined;
}

export async function list<T>(collection: string, includeDeleted = false): Promise<T[]> {
  const all = (await (
    await getDB()
  ).getAllFromIndex("records", "byCollection", collection)) as StoredRecord<T>[];
  return all.filter((r) => includeDeleted || !r.deletedAt).map((r) => r.data);
}

export async function listRecords<T>(collection: string): Promise<StoredRecord<T>[]> {
  return (await (
    await getDB()
  ).getAllFromIndex("records", "byCollection", collection)) as StoredRecord<T>[];
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDB()).get("meta", key)) as T | undefined;
}
export async function setMeta(key: string, value: unknown) {
  await (await getDB()).put("meta", value, key);
}

/** Insert many records atomically (migration/import). Skips ids that exist unless overwrite. */
export async function bulkPut(
  items: { collection: string; id: string; data: unknown }[],
  opts: { overwrite?: boolean; track?: boolean } = {},
): Promise<{ written: number; skipped: number }> {
  const db = await getDB();
  const tx = db.transaction(["records", "outbox"], "readwrite");
  let written = 0,
    skipped = 0;
  const cols = new Set<string>();
  for (const it of items) {
    const ex = await tx.objectStore("records").get([it.collection, it.id]);
    if (ex && !ex.deletedAt && !opts.overwrite) {
      skipped++;
      continue;
    }
    const rec: StoredRecord = {
      collection: it.collection,
      id: it.id,
      data: it.data,
      rev: (ex?.rev ?? 0) + 1,
      serverRev: ex?.serverRev,
      updatedAt: Date.now(),
      deletedAt: null,
    };
    await tx.objectStore("records").put(rec);
    if (opts.track !== false) {
      await tx.objectStore("outbox").add({
        mid: newId(),
        collection: it.collection,
        id: it.id,
        op: "put",
        baseServerRev: ex?.serverRev ?? 0,
        data: it.data,
        ts: rec.updatedAt,
        attempts: 0,
      });
    }
    cols.add(it.collection);
    written++;
  }
  await tx.done;
  notify(cols);
  return { written, skipped };
}

export async function outboxCount(): Promise<number> {
  return (await getDB()).count("outbox");
}

/** Everything, for backup. */
export async function dumpAll(): Promise<StoredRecord[]> {
  return (await (await getDB()).getAll("records")) as StoredRecord[];
}

export async function clearCollections(cols: string[]) {
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  for (const c of cols) {
    const keys = await tx.store.index("byCollection").getAllKeys(c);
    for (const k of keys) await tx.store.delete(k);
  }
  await tx.done;
  notify(cols);
}

/* ------------------------------ Sync support ------------------------------ */
export async function getRecord(collection: string, id: string): Promise<StoredRecord | undefined> {
  return (await getDB()).get("records", [collection, id]);
}

export async function outboxAll(): Promise<Mutation[]> {
  return (await getDB()).getAll("outbox");
}

export async function outboxDelete(seqs: number[]) {
  const db = await getDB();
  const tx = db.transaction("outbox", "readwrite");
  for (const s of seqs) await tx.store.delete(s);
  await tx.done;
}

export async function outboxFail(seq: number, error: string) {
  const db = await getDB();
  const m = await db.get("outbox", seq);
  if (m) await db.put("outbox", { ...m, attempts: m.attempts + 1, lastError: error });
}

export async function setServerRev(collection: string, id: string, serverRev: number) {
  const db = await getDB();
  const rec = await db.get("records", [collection, id]);
  if (rec) await db.put("records", { ...rec, serverRev });
}

/** Applies a record received from the server. Never queues an outbox entry. */
export async function applyRemote(
  collection: string,
  id: string,
  data: unknown,
  serverRev: number,
  deleted: boolean,
) {
  const db = await getDB();
  const ex = await db.get("records", [collection, id]);
  await db.put("records", {
    collection,
    id,
    data: data ?? ex?.data ?? null,
    rev: (ex?.rev ?? 0) + 1,
    serverRev,
    updatedAt: Date.now(),
    deletedAt: deleted ? Date.now() : null,
  });
  notify([collection]);
}

/** Queue a fresh mutation for an existing record (used when resolving a conflict in favour of this device). */
export async function enqueue(collection: string, id: string, op: "put" | "delete", data: unknown) {
  const db = await getDB();
  const rec = await db.get("records", [collection, id]);
  await db.add("outbox", {
    mid: newId(),
    collection,
    id,
    op,
    baseServerRev: rec?.serverRev ?? 0,
    data,
    ts: Date.now(),
    attempts: 0,
  });
}

export function onAnyChange(fn: Listener): () => void {
  return subscribe(ALL, fn);
}
