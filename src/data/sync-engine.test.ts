import { beforeEach, describe, expect, it } from "vitest";
import { closeDB, get, outboxCount, put, remove, getRecord } from "./db";
import {
  getConflicts,
  resolveConflict,
  runSync,
  type PushResult,
  type Remote,
  type RemoteRecord,
} from "./sync-engine";

/** In-memory server with the same semantics as push_mutation(). */
class FakeRemote implements Remote {
  rows = new Map<string, RemoteRecord>();
  log = new Set<string>();
  seq = 0;
  fail = false;
  pushes = 0;
  async push(m: {
    collection: string;
    id: string;
    op: "put" | "delete";
    data: unknown;
    baseRev: number;
    mid: string;
  }): Promise<PushResult> {
    if (this.fail) throw new Error("offline");
    this.pushes++;
    const k = `${m.collection}/${m.id}`;
    if (this.log.has(m.mid)) return { status: "duplicate", rev: this.rows.get(k)?.rev ?? 0 };
    const cur = this.rows.get(k);
    if (!cur) {
      if (m.op === "delete") return { status: "applied", rev: 0 };
      this.log.add(m.mid);
      this.rows.set(k, {
        collection: m.collection,
        id: m.id,
        data: m.data,
        rev: 1,
        seq: ++this.seq,
        deleted_at: null,
      });
      return { status: "applied", rev: 1 };
    }
    if (cur.rev !== m.baseRev)
      return { status: "conflict", rev: cur.rev, data: cur.data, deleted: !!cur.deleted_at };
    this.log.add(m.mid);
    this.rows.set(k, {
      ...cur,
      data: m.op === "put" ? m.data : cur.data,
      deleted_at: m.op === "delete" ? "now" : null,
      rev: cur.rev + 1,
      seq: ++this.seq,
    });
    return { status: "applied", rev: cur.rev + 1 };
  }
  async pull(after: number) {
    const rs = [...this.rows.values()].filter((r) => r.seq > after).sort((a, b) => a.seq - b.seq);
    return { records: rs, cursor: rs.length ? rs[rs.length - 1]!.seq : after, more: false };
  }
  /** Another device edits the record directly. */
  external(collection: string, id: string, data: unknown) {
    const k = `${collection}/${id}`;
    const cur = this.rows.get(k);
    this.rows.set(k, {
      collection,
      id,
      data,
      rev: (cur?.rev ?? 0) + 1,
      seq: ++this.seq,
      deleted_at: null,
    });
  }
}

beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});

describe("sync engine", () => {
  it("pushes local writes once and clears the outbox", async () => {
    const r = new FakeRemote();
    await put("mealLogs", "a", { kcal: 100 });
    await put("mealLogs", "a", { kcal: 200 });
    const res = await runSync(r);
    expect(res).toMatchObject({ pushed: 1, conflicts: 0 });
    expect(r.rows.get("mealLogs/a")!.data).toEqual({ kcal: 200 });
    expect(await outboxCount()).toBe(0);
  });
  it("keeps changes queued when offline and retries without duplicating", async () => {
    const r = new FakeRemote();
    await put("mealLogs", "a", { kcal: 1 });
    r.fail = true;
    expect((await runSync(r)).error).toBe("offline");
    expect(await outboxCount()).toBe(1);
    r.fail = false;
    await runSync(r);
    await runSync(r); // nothing left to push
    expect(r.pushes).toBe(1); // the offline attempt threw before reaching the server; the retry applied once
    expect(r.rows.size).toBe(1);
    expect(await outboxCount()).toBe(0);
  });
  it("retrying after a lost response is idempotent", async () => {
    const r = new FakeRemote();
    await put("mealLogs", "a", { kcal: 1 });
    const orig = r.push.bind(r);
    let first = true;
    r.push = async (m) => {
      const res = await orig(m);
      if (first) {
        first = false;
        throw new Error("response lost");
      }
      return res;
    };
    await runSync(r); // server applied, client never heard
    await runSync(r); // retry with same mid + stale base → duplicate or conflict-identical
    expect(r.rows.get("mealLogs/a")!.rev).toBe(1);
    expect(await outboxCount()).toBe(0);
    expect(await getConflicts()).toHaveLength(0);
  });
  it("pulls other devices' records", async () => {
    const r = new FakeRemote();
    r.external("weighIns", "w1", { kg: 65 });
    expect((await runSync(r)).pulled).toBe(1);
    expect(await get("weighIns", "w1")).toEqual({ kg: 65 });
    expect((await getRecord("weighIns", "w1"))!.serverRev).toBe(1);
  });
  it("surfaces a two-device edit as a conflict instead of merging silently", async () => {
    const r = new FakeRemote();
    await put("templates", "t", { title: "mine v1" });
    await runSync(r);
    r.external("templates", "t", { title: "from phone" });
    await put("templates", "t", { title: "mine v2" });
    const res = await runSync(r);
    expect(res.conflicts).toBe(1);
    expect(await get("templates", "t")).toEqual({ title: "mine v2" }); // local kept
    expect(r.rows.get("templates/t")!.data).toEqual({ title: "from phone" }); // server kept
    const [c] = await getConflicts();
    await resolveConflict(c!.key, "mine");
    await runSync(r);
    expect(r.rows.get("templates/t")!.data).toEqual({ title: "mine v2" });
    expect(await getConflicts()).toHaveLength(0);
  });
  it("conflict resolved with theirs adopts the server version", async () => {
    const r = new FakeRemote();
    await put("templates", "t", { title: "v1" });
    await runSync(r);
    r.external("templates", "t", { title: "phone" });
    await put("templates", "t", { title: "laptop" });
    await runSync(r);
    const [c] = await getConflicts();
    await resolveConflict(c!.key, "theirs");
    expect(await get("templates", "t")).toEqual({ title: "phone" });
    await runSync(r);
    expect(await outboxCount()).toBe(0);
  });
  it("a delete on one device vs an edit on another is a conflict, not a silent loss", async () => {
    const r = new FakeRemote();
    await put("mealLogs", "m", { kcal: 300 });
    await runSync(r);
    r.external("mealLogs", "m", { kcal: 350 });
    await remove("mealLogs", "m");
    const res = await runSync(r);
    expect(res.conflicts).toBe(1);
    expect(r.rows.get("mealLogs/m")!.deleted_at).toBeNull();
  });
  it("identical records on both sides (first sync) are not conflicts", async () => {
    const r = new FakeRemote();
    r.external("templates", "t", { title: "same" });
    await put("templates", "t", { title: "same" });
    const res = await runSync(r);
    expect(res.conflicts).toBe(0);
    expect(await outboxCount()).toBe(0);
  });
  it("pulled deletions become tombstones", async () => {
    const r = new FakeRemote();
    await put("mealLogs", "m", { kcal: 1 });
    await runSync(r);
    const row = r.rows.get("mealLogs/m")!;
    r.rows.set("mealLogs/m", { ...row, rev: 2, seq: ++r.seq, deleted_at: "now" });
    await runSync(r);
    expect(await get("mealLogs", "m")).toBeUndefined();
  });
  it("does not overwrite local pending edits with a pull", async () => {
    const r = new FakeRemote();
    await put("settings", "s", { a: 1 });
    await runSync(r);
    r.external("settings", "s", { a: 2 });
    await put("settings", "s", { a: 3 });
    await runSync(r);
    expect(await get("settings", "s")).toEqual({ a: 3 });
  });
});
