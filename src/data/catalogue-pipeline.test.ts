import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import raw from "../domain/__fixtures__/wger-sample.json";
import type { WgerExercise } from "../domain/catalogue-wger";
import {
  buildSnapshot,
  diffSnapshots,
  fetchWger,
  WGER_BASE,
} from "../../scripts/catalogue/pipeline";

const all = raw as unknown as WgerExercise[];
const mkRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/** A fake wger serving `all` in pages of 4, optionally failing a given request. */
function server(failOn?: { call: number; status: number }) {
  let call = 0;
  const calls: string[] = [];
  const impl = (async (url: string) => {
    call++;
    calls.push(url);
    if (failOn && call === failOn.call) return mkRes({}, failOn.status);
    const offset = Number(new URL(url).searchParams.get("offset") ?? 0);
    const results = all.slice(offset, offset + 4);
    const next =
      offset + 4 < all.length
        ? `${WGER_BASE}?language=2&limit=4&offset=${offset + 4}&format=json`
        : null;
    return mkRes({ count: all.length, next, results });
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const dir = () => mkdtempSync(join(tmpdir(), "cat-"));
const opts = (d: string, extra = {}) => ({
  stateFile: join(d, "s.json"),
  rawFile: join(d, "r.json"),
  sleep: async () => {},
  now: () => "2026-10-16T12:00:00.000Z",
  ...extra,
});

describe("fetch", () => {
  it("fetches every page once", async () => {
    const d = dir();
    const s = server();
    const r = await fetchWger(opts(d, { fetchImpl: s.impl }));
    expect(r.count).toBe(all.length);
    expect(JSON.parse(readFileSync(join(d, "r.json"), "utf8"))).toHaveLength(all.length);
    rmSync(d, { recursive: true });
  });
  it("resumes at the failed page after an outage, without duplicating anything", async () => {
    const d = dir();
    const bad = server({ call: 3, status: 503 }); // 3rd request keeps failing
    const failing = (async (u: string) => {
      const r = await bad.impl(u);
      return r;
    }) as typeof fetch;
    // every attempt at page 3 fails: exhaust retries
    let n = 0;
    const alwaysFailAt3 = (async (u: string) => {
      n++;
      return new URL(u).searchParams.get("offset") === "8" ? mkRes({}, 503) : bad.impl(u);
    }) as typeof fetch;
    await expect(fetchWger(opts(d, { fetchImpl: alwaysFailAt3, retries: 1 }))).rejects.toThrow(
      /503/,
    );
    void failing;
    void n;
    const saved = JSON.parse(readFileSync(join(d, "r.json"), "utf8"));
    expect(saved).toHaveLength(8); // two good pages were kept
    const ok = server();
    const r = await fetchWger(opts(d, { fetchImpl: ok.impl }));
    expect(r.resumed).toBe(true);
    expect(ok.calls[0]).toContain("offset=8"); // resumed exactly where it stopped
    const final = JSON.parse(readFileSync(join(d, "r.json"), "utf8")) as WgerExercise[];
    expect(final).toHaveLength(all.length);
    expect(new Set(final.map((e) => e.uuid)).size).toBe(all.length);
    rmSync(d, { recursive: true });
  });
  it("retries transient errors with backoff and then succeeds", async () => {
    const d = dir();
    let first = true;
    const delays: number[] = [];
    const flaky = (async (u: string) => {
      if (first) {
        first = false;
        return mkRes({}, 429);
      }
      return server().impl(u);
    }) as typeof fetch;
    await fetchWger(
      opts(d, {
        fetchImpl: flaky,
        sleep: async (ms: number) => {
          delays.push(ms);
        },
      }),
    );
    expect(delays[0]).toBe(1000);
    rmSync(d, { recursive: true });
  });
  it("does not retry a client error such as 404", async () => {
    const d = dir();
    let calls = 0;
    const nf = (async () => {
      calls++;
      return mkRes({}, 404);
    }) as typeof fetch;
    await expect(fetchWger(opts(d, { fetchImpl: nf }))).rejects.toThrow(/404/);
    expect(calls).toBe(1);
    rmSync(d, { recursive: true });
  });
  it("rerunning a finished fetch makes no requests", async () => {
    const d = dir();
    await fetchWger(opts(d, { fetchImpl: server().impl }));
    const s = server();
    const r = await fetchWger(opts(d, { fetchImpl: s.impl }));
    expect(r.skipped).toBe(true);
    expect(s.calls).toHaveLength(0);
    rmSync(d, { recursive: true });
  });
});

describe("build", () => {
  const meta = { snapshot: "2026-10-16", fetchedAt: "2026-10-16T12:00:00.000Z" };
  it("is idempotent: same input gives identical output and no duplicates even with repeated rows", () => {
    const a = buildSnapshot(all, meta),
      b = buildSnapshot([...all, ...all], meta);
    expect(JSON.stringify(a.snapshot)).toBe(JSON.stringify(b.snapshot));
    expect(new Set(a.snapshot.exercises.map((e) => e.id)).size).toBe(a.snapshot.exercises.length);
  });
  it("reports quarantines and keeps attribution for every published exercise", () => {
    const r = buildSnapshot(all, meta);
    expect(r.quarantine.length).toBeGreaterThan(0);
    expect(r.attribution).toHaveLength(r.snapshot.exercises.length);
    expect(r.snapshot.counts.published + r.snapshot.counts.quarantined).toBe(all.length);
  });
  it("dry-run diff finds additions, removals and upstream changes; local overrides survive a refresh", () => {
    const v1 = buildSnapshot(all, meta).snapshot;
    const edited = structuredClone(all);
    edited[1]!.translations[0]!.name = "Renamed upstream";
    const dropped = edited.slice(0, -1);
    const v2 = buildSnapshot(dropped, meta).snapshot;
    const d = diffSnapshots(v1, v2);
    expect(d.changed.length + d.removed.length).toBeGreaterThan(0);
    expect(diffSnapshots(null, v1).added).toHaveLength(v1.exercises.length);
    const id = `wger:${edited[1]!.uuid}`;
    const o = buildSnapshot(edited, {
      ...meta,
      overrides: { [id]: { name: "My name" } },
    }).snapshot.exercises.find((e) => e.id === id);
    expect(o?.name).toBe("My name"); // the override is applied over the refreshed upstream value
  });
});
