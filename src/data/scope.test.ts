import { beforeEach, describe, expect, it } from "vitest";
import {
  closeDB,
  deleteScopeData,
  get,
  getScopeDB,
  list,
  listLocalScopes,
  outboxCount,
  put,
  getMeta,
  setMeta,
} from "./db";
import {
  assertGeneration,
  ScopeChangedError,
  scopeGeneration,
  setScope,
  type Scope,
} from "./scope";

const A: Scope = { kind: "user", userId: "aaaaaaaa-0000-0000-0000-000000000001" };
const B: Scope = { kind: "user", userId: "bbbbbbbb-0000-0000-0000-000000000002" };
const guest: Scope = { kind: "guest" };

beforeEach(async () => {
  setScope(guest);
  await closeDB();
  for (const d of (await indexedDB.databases()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
});

/**
 * Reproduces the pre-fix defect: at 71a2422 there was ONE database ("new-life") and no account in any key,
 * so after "sign out, sign in as someone else" every private record of the previous account was still
 * returned by list()/get() and still sat in the same outbox that the next account's sync would drain.
 */
describe("account scoping", () => {
  it("account B never sees account A's records, outbox or metadata", async () => {
    setScope(A);
    await put("mealLogs", "m1", { kcal: 700 });
    await setMeta("sync:cursor", 42);
    expect(await outboxCount()).toBe(1);

    setScope(B);
    expect(await list("mealLogs")).toEqual([]);
    expect(await get("mealLogs", "m1")).toBeUndefined();
    expect(await outboxCount()).toBe(0);
    expect(await getMeta("sync:cursor")).toBeUndefined();

    setScope(A);
    expect(await list("mealLogs")).toEqual([{ kcal: 700 }]);
    expect(await getMeta("sync:cursor")).toBe(42);
    expect(await outboxCount()).toBe(1);
  });

  it("signing out does not turn account records into guest data", async () => {
    setScope(A);
    await put("weighIns", "w1", { kg: 65 });
    setScope(guest);
    expect(await list("weighIns")).toEqual([]);
    await put("weighIns", "g1", { kg: 99 });
    setScope(A);
    expect((await list<{ kg: number }>("weighIns")).map((w) => w.kg)).toEqual([65]);
  });

  it("pending changes stay owned by the account that created them", async () => {
    setScope(A);
    await put("sessions", "s1", { a: 1 });
    setScope(B);
    await put("sessions", "s2", { b: 1 });
    expect(await outboxCount()).toBe(1);
    const dbA = await getScopeDB(A);
    expect((await dbA.getAll("outbox")).map((m) => m.id)).toEqual(["s1"]);
  });

  it("a late async result from the previous scope can be detected and dropped", async () => {
    setScope(A);
    const gen = scopeGeneration();
    setScope(B);
    expect(() => assertGeneration(gen)).toThrow(ScopeChangedError);
    expect(() => assertGeneration(scopeGeneration())).not.toThrow();
  });

  it("two tabs: each switch yields the right database", async () => {
    // Tabs are separate JS contexts over the same IndexedDB; model that with a second connection.
    setScope(A);
    await put("x", "1", { from: "tab1" });
    const tab2 = await getScopeDB(A);
    expect((await tab2.get("records", ["x", "1"]))?.data).toEqual({ from: "tab1" });
    const tab2B = await getScopeDB(B);
    expect(await tab2B.get("records", ["x", "1"])).toBeUndefined();
  });

  it("lists remembered scopes and can remove one, but never the scope in use", async () => {
    setScope(A);
    await put("x", "1", {});
    setScope(B);
    await put("x", "1", {});
    const scopes = await listLocalScopes();
    expect(scopes.length).toBeGreaterThanOrEqual(2);
    await expect(deleteScopeData(B)).rejects.toThrow();
    await deleteScopeData(A);
    expect((await listLocalScopes()).some((s) => s.kind === "user" && s.userId === A.userId)).toBe(
      false,
    );
    setScope(A);
    expect(await list("x")).toEqual([]);
  });
});
