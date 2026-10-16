import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCompletion,
  clearException,
  moveOccurrence,
  pauseBlock,
  restOccurrence,
  resumeBlock,
  saveMindEntry,
  setCompletion,
  skipOccurrence,
} from "./routine-actions";
import { closeDB, get, list, outboxAll, put } from "./db";
import {
  COL,
  PRIVATE_COLLECTIONS,
  type MindEntry,
  type RoutineBlock,
  type RoutineCompletion,
  type RoutineException,
} from "./types";

beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});
const block: RoutineBlock = {
  id: "b1",
  label: "Walk",
  start: "17:00",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  kind: "personal",
  order: 0,
};

describe("routine actions", () => {
  it("ticks and corrects one occurrence without touching the series", async () => {
    await put(COL.routine, "b1", block);
    await setCompletion("b1", "2026-10-14", "done");
    expect((await get<RoutineCompletion>(COL.routineDone, "b1:2026-10-14"))!.status).toBe("done");
    await setCompletion("b1", "2026-10-14", "skipped"); // changing your mind replaces it, never duplicates
    expect(await list(COL.routineDone)).toHaveLength(1);
    await clearCompletion("b1", "2026-10-14");
    expect(await list(COL.routineDone)).toHaveLength(0);
    expect(await get<RoutineBlock>(COL.routine, "b1")).toEqual(block);
  });
  it("skip, rest and move are per-date exceptions, one per block and date", async () => {
    await skipOccurrence("b1", "2026-10-14");
    await restOccurrence("b1", "2026-10-14");
    let ex = await list<RoutineException>(COL.routineExceptions);
    expect(ex).toHaveLength(1);
    expect(ex[0]!.reason).toBe("rest");
    await moveOccurrence("b1", "2026-10-14", {
      toDate: "2026-10-15",
      start: "19:00",
      end: "19:30",
    });
    ex = await list<RoutineException>(COL.routineExceptions);
    expect(ex).toHaveLength(1);
    expect(ex[0]).toMatchObject({ kind: "move", toDate: "2026-10-15", start: "19:00" });
    await moveOccurrence("b1", "2026-10-14", { toDate: "2026-10-14", start: "18:00" });
    expect((await list<RoutineException>(COL.routineExceptions))[0]!.toDate).toBeUndefined();
    await clearException("b1", "2026-10-14");
    expect(await list(COL.routineExceptions)).toHaveLength(0);
  });
  it("pauses and resumes without losing the series", async () => {
    await put(COL.routine, "b1", block);
    await pauseBlock("b1", "2026-10-14");
    expect((await get<RoutineBlock>(COL.routine, "b1"))!.pausedFrom).toBe("2026-10-14");
    await resumeBlock("b1", "2026-10-20");
    const b = (await get<RoutineBlock>(COL.routine, "b1"))!;
    expect(b.pausedUntil).toBe("2026-10-20");
    expect(b.label).toBe("Walk");
  });
  it("every change is queued for sync with the write", async () => {
    await setCompletion("b1", "2026-10-14", "done");
    await restOccurrence("b1", "2026-10-15");
    expect((await outboxAll()).map((m) => m.collection).sort()).toEqual(
      [COL.routineDone, COL.routineExceptions].sort(),
    );
  });
});

describe("mind entries are private", () => {
  it("are always stored as private and the collection is on the private list", async () => {
    const e = await saveMindEntry({
      date: "2026-10-14",
      kind: "reflection",
      space: "mind",
      text: "hello",
      ...({ visibility: "public" } as object),
    });
    expect((await get<MindEntry>(COL.mind, e.id))!.visibility).toBe("private");
    expect(PRIVATE_COLLECTIONS).toEqual(
      expect.arrayContaining([COL.mind, COL.prayerLogs, COL.prayerSettings, COL.prayerDays]),
    );
  });
});
