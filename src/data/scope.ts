/**
 * Storage scope: who the on-device data belongs to.
 *
 * Every scope is its own physical IndexedDB (records, outbox, meta, sync cursor, conflicts), so one
 * account's records can never be read, queued or synced as another's:
 *   guest         → "new-life"            (the original database; also holds the owner's pre-account data)
 *   user <id>     → "new-life:u:<id>"     (one per signed-in account on this device)
 *
 * `generation` increments on every change. Long-running async work captures it at the start and
 * calls `assertGeneration` before each write, so a late result from the previous scope is dropped
 * instead of landing in the next one.
 */
export type Scope = { kind: "guest" } | { kind: "user"; userId: string };

export const GUEST_DB = "new-life";
export const USER_DB_PREFIX = "new-life:u:";

export const scopeDbName = (s: Scope) =>
  s.kind === "guest" ? GUEST_DB : `${USER_DB_PREFIX}${s.userId}`;
export const sameScope = (a: Scope | null, b: Scope | null) =>
  !a || !b ? a === b : scopeDbName(a) === scopeDbName(b);

let current: Scope | null = null;
let generation = 0;
const listeners = new Set<() => void>();

export class ScopeChangedError extends Error {
  constructor() {
    super("The signed-in account changed; this operation was cancelled.");
    this.name = "ScopeChangedError";
  }
}

export const getScope = () => current;
export const scopeGeneration = () => generation;

export function requireScope(): Scope {
  if (!current) throw new Error("Storage scope isn't resolved yet.");
  return current;
}

/** Atomically switch scope. No-op if unchanged. Always bumps the generation on a real change. */
export function setScope(next: Scope | null) {
  if (sameScope(current, next)) return;
  current = next;
  generation++;
  listeners.forEach((f) => f());
}

export function assertGeneration(gen: number) {
  if (gen !== generation) throw new ScopeChangedError();
}

export function onScopeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
