import { describe, expect, it } from "vitest";
import { sessionElapsedMs } from "./actions";
import type { Session } from "./types";

describe("session timing", () => {
  it("excludes optional readiness setup time once work has begun", () => {
    const session = {
      startedAt: 1_000,
      workStartedAt: 61_000,
      pausedMs: 0,
    } as Session;
    expect(sessionElapsedMs(session, 181_000)).toBe(120_000);
  });

  it("keeps backwards-compatible timing for sessions without a work start", () => {
    const session = {
      startedAt: 1_000,
      pausedMs: 30_000,
      readiness: { decision: "dismissed" },
    } as Session;
    expect(sessionElapsedMs(session, 91_000)).toBe(60_000);
  });

  it("does not count time while a new session awaits the optional decision", () => {
    const session = { startedAt: 1_000, pausedMs: 0, status: "active" } as Session;
    expect(sessionElapsedMs(session, 91_000)).toBe(0);
  });
});
