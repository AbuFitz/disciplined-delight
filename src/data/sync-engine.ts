import { assertGeneration, ScopeChangedError, scopeGeneration } from "./scope";
import {
  applyRemote,
  enqueue,
  getMeta,
  getRecord,
  outboxAll,
  outboxDelete,
  outboxFail,
  setMeta,
  setServerRev,
  type Mutation,
} from "./db";

export type RemoteRecord = {
  collection: string;
  id: string;
  data: unknown;
  rev: number;
  seq: number;
  deleted_at: string | null;
};
export type PushResult =
  | { status: "applied" | "duplicate"; rev: number }
  | { status: "conflict"; rev: number; data: unknown; deleted: boolean };

/** The server contract (see supabase/migrations/0003_sync.sql). */
export interface Remote {
  push(m: {
    collection: string;
    id: string;
    op: "put" | "delete";
    data: unknown;
    baseRev: number;
    mid: string;
  }): Promise<PushResult>;
  pull(after: number): Promise<{ records: RemoteRecord[]; cursor: number; more: boolean }>;
}

export type Conflict = {
  key: string;
  collection: string;
  id: string;
  localDeleted: boolean;
  local: unknown;
  server: unknown;
  serverRev: number;
  serverDeleted: boolean;
  at: number;
};

export type SyncResult = { pushed: number; pulled: number; conflicts: number; error?: string };

const key = (c: string, i: string) => `${c}\u0000${i}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const getConflicts = async () => (await getMeta<Conflict[]>("sync:conflicts")) ?? [];
const setConflicts = (c: Conflict[]) => setMeta("sync:conflicts", c);

/**
 * One sync pass: push (coalesced per record), then pull.
 * - Pushes use the record's latest known server revision as their base, so a record edited twice isn't
 *   mistaken for a conflict with itself.
 * - A true conflict (the server changed it too) is never merged silently: both versions are kept and
 *   listed in sync:conflicts until the user picks one.
 * - Records with pending local changes or unresolved conflicts are not overwritten by pulls.
 */
export async function runSync(remote: Remote): Promise<SyncResult> {
  let pushed = 0,
    pulled = 0;
  // Everything below reads and writes the scope that was current when the pass started.
  // If the account changes mid-pass, stop before touching the next scope's database.
  const gen = scopeGeneration();
  const live = () => assertGeneration(gen);
  try {
    // 1. coalesce: only the latest mutation per record matters
    const all = await outboxAll();
    const latest = new Map<string, Mutation>();
    for (const m of all) latest.set(key(m.collection, m.id), m);
    const stale = all.filter((m) => latest.get(key(m.collection, m.id)) !== m).map((m) => m.seq!);
    if (stale.length) await outboxDelete(stale);

    const conflicts = await getConflicts();
    const conflictKeys = new Set(conflicts.map((c) => c.key));
    for (const m of [...latest.values()].sort((a, b) => a.seq! - b.seq!)) {
      const k = key(m.collection, m.id);
      if (conflictKeys.has(k)) {
        await outboxDelete([m.seq!]);
        continue;
      }
      const rec = await getRecord(m.collection, m.id);
      let res: PushResult;
      try {
        res = await remote.push({
          collection: m.collection,
          id: m.id,
          op: m.op,
          data: m.data,
          baseRev: rec?.serverRev ?? 0,
          mid: m.mid,
        });
      } catch (e) {
        live();
        await outboxFail(m.seq!, (e as Error).message);
        throw e;
      }
      live();
      if (res.status === "conflict") {
        const localData = rec?.data;
        const localDeleted = m.op === "delete";
        if (same(localData, res.data) && localDeleted === res.deleted) {
          await setServerRev(m.collection, m.id, res.rev); // identical on both sides: nothing to decide
        } else {
          conflicts.push({
            key: k,
            collection: m.collection,
            id: m.id,
            localDeleted,
            local: localData,
            server: res.data,
            serverRev: res.rev,
            serverDeleted: res.deleted,
            at: Date.now(),
          });
          conflictKeys.add(k);
        }
        await outboxDelete([m.seq!]);
      } else {
        await setServerRev(m.collection, m.id, res.rev);
        await outboxDelete([m.seq!]);
        pushed++;
      }
    }
    await setConflicts(conflicts);

    // 2. pull
    const pending = new Set((await outboxAll()).map((m) => key(m.collection, m.id)));
    let cursor = (await getMeta<number>("sync:cursor")) ?? 0;
    for (;;) {
      const page = await remote.pull(cursor);
      live();
      for (const r of page.records) {
        const k = key(r.collection, r.id);
        if (pending.has(k) || conflictKeys.has(k)) continue;
        const local = await getRecord(r.collection, r.id);
        if (local && local.serverRev === r.rev) continue; // our own write coming back
        await applyRemote(r.collection, r.id, r.data, r.rev, !!r.deleted_at);
        pulled++;
      }
      cursor = Math.max(cursor, page.cursor);
      await setMeta("sync:cursor", cursor);
      if (!page.more) break;
    }
    return { pushed, pulled, conflicts: (await getConflicts()).length };
  } catch (e) {
    if (e instanceof ScopeChangedError) return { pushed, pulled, conflicts: 0, error: "cancelled" };
    return {
      pushed,
      pulled,
      conflicts: (await getConflicts()).length,
      error: (e as Error).message,
    };
  }
}

/** Resolve a conflict: keep this device's version (re-pushed on top of the server's) or take the server's. */
export async function resolveConflict(k: string, choice: "mine" | "theirs") {
  const list = await getConflicts();
  const c = list.find((x) => x.key === k);
  if (!c) return;
  if (choice === "theirs") {
    await applyRemote(c.collection, c.id, c.server, c.serverRev, c.serverDeleted);
  } else {
    await setServerRev(c.collection, c.id, c.serverRev);
    await enqueue(c.collection, c.id, c.localDeleted ? "delete" : "put", c.local);
  }
  await setConflicts(list.filter((x) => x.key !== k));
}
