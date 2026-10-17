import { beforeEach, describe, expect, it } from "vitest";
import { zonedInstant } from "@/domain/dates";
import { closeDB, put } from "./db";
import { computeReminders } from "./reminders";
import { setScope } from "./scope";
import {
  COL,
  type MindEntry,
  type RoutineBlock,
  type RoutineCompletion,
  type RoutineException,
} from "./types";

beforeEach(async () => {
  setScope({ kind: "guest" });
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});

const now = zonedInstant("2026-10-16", "09:00", "Europe/London");
const block: RoutineBlock = {
  id: "read",
  label: "Read ten pages",
  detail: "Phone away. Book open.",
  start: "19:00",
  weekdays: [4],
  kind: "personal",
  reminderMinutes: 15,
  order: 0,
};

describe("routine reminder schedule", () => {
  it("turns an explicitly opted-in activity into a stable background reminder", async () => {
    await put(COL.routine, block.id, block);
    expect(await computeReminders(now)).toEqual([
      expect.objectContaining({
        key: "routine:read:2026-10-16",
        kind: "routine",
        fireAt: zonedInstant("2026-10-16", "18:45", "Europe/London"),
        title: "Read ten pages",
        body: "Phone away. Book open.",
      }),
    ]);
  });

  it("follows a one-off move to its new date and time", async () => {
    await put(COL.routine, block.id, block);
    await put(COL.routineExceptions, "move", {
      id: "move",
      blockId: block.id,
      date: "2026-10-16",
      kind: "move",
      toDate: "2026-10-17",
      start: "20:00",
    } satisfies RoutineException);
    const reminders = await computeReminders(now);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      key: "routine:read:2026-10-16",
      fireAt: zonedInstant("2026-10-17", "19:45", "Europe/London"),
    });
  });

  it("drops skipped, completed and paused occurrences", async () => {
    await put(COL.routine, block.id, block);
    await put(COL.routineExceptions, "skip", {
      id: "skip",
      blockId: block.id,
      date: "2026-10-16",
      kind: "skip",
      reason: "rest",
    } satisfies RoutineException);
    expect(await computeReminders(now)).toEqual([]);

    await put(COL.routineExceptions, "skip", {
      id: "skip",
      blockId: block.id,
      date: "2026-10-16",
      kind: "move",
      start: "19:00",
    } satisfies RoutineException);
    await put(COL.routineDone, `${block.id}:2026-10-16`, {
      id: `${block.id}:2026-10-16`,
      blockId: block.id,
      date: "2026-10-16",
      status: "done",
      at: now,
    } satisfies RoutineCompletion);
    expect(await computeReminders(now)).toEqual([]);

    await put(COL.routine, block.id, {
      ...block,
      pausedFrom: "2026-10-16",
      pausedUntil: null,
    });
    expect(await computeReminders(now)).toEqual([]);
  });

  it("drops a linked activity once its real record exists", async () => {
    await put(COL.routine, block.id, {
      ...block,
      link: { type: "mind", kind: "reflection" },
    });
    await put(COL.mind, "reflection", {
      id: "reflection",
      date: "2026-10-16",
      at: now,
      kind: "reflection",
      space: "mind",
      text: "Done before the reminder.",
      visibility: "private",
    } satisfies MindEntry);
    expect(await computeReminders(now)).toEqual([]);
  });
});
