import { addDays, type ISODate } from "@/domain/dates";
import { applyBatch, list, newId, put, remove } from "./db";
import { scopeGeneration } from "./scope";
import {
  COL,
  type MindEntry,
  type MindKind,
  type Modules,
  type RoutineBlock,
  type RoutineCompletion,
  type RoutineException,
} from "./types";

const gen = () => scopeGeneration();

/* ------------------------------ completion ------------------------------ */

/** Tick or skip a manual activity for one date. Linked activities complete from their own records instead. */
export function setCompletion(blockId: string, date: ISODate, status: "done" | "skipped") {
  const id = `${blockId}:${date}`;
  return put(COL.routineDone, id, {
    id,
    blockId,
    date,
    status,
    at: Date.now(),
  } satisfies RoutineCompletion);
}
/** Correct a mistake: forget the tick or skip. */
export const clearCompletion = (blockId: string, date: ISODate) =>
  remove(COL.routineDone, `${blockId}:${date}`);

/* ------------------------------ one-off changes (never edit the series) ------------------------------ */

async function upsertException(e: Omit<RoutineException, "id">) {
  const all = await list<RoutineException>(COL.routineExceptions);
  const existing = all.find((x) => x.blockId === e.blockId && x.date === e.date);
  const id = existing?.id ?? newId();
  await applyBatch([{ collection: COL.routineExceptions, id, op: "put", data: { ...e, id } }], {
    generation: gen(),
  });
}

export const skipOccurrence = (blockId: string, date: ISODate) =>
  upsertException({ blockId, date, kind: "skip", reason: "skip" });
export const restOccurrence = (blockId: string, date: ISODate) =>
  upsertException({ blockId, date, kind: "skip", reason: "rest" });
export const moveOccurrence = (
  blockId: string,
  date: ISODate,
  to: { toDate?: ISODate; start: string; end?: string },
) =>
  upsertException({
    blockId,
    date,
    kind: "move",
    toDate: to.toDate && to.toDate !== date ? to.toDate : undefined,
    start: to.start,
    end: to.end,
  });

/** Undo a skip, rest or move for that date. */
export async function clearException(blockId: string, date: ISODate) {
  const all = await list<RoutineException>(COL.routineExceptions);
  const ex = all.find((x) => x.blockId === blockId && x.date === date);
  if (ex) await remove(COL.routineExceptions, ex.id);
}

/* ------------------------------ pause and resume ------------------------------ */

/** Pause from `from` (inclusive) until `until` (exclusive) or indefinitely. */
export async function pauseBlock(id: string, from: ISODate, until: ISODate | null = null) {
  const b = (await list<RoutineBlock>(COL.routine)).find((x) => x.id === id);
  if (!b) throw new Error("That activity no longer exists.");
  await put(COL.routine, id, { ...b, pausedFrom: from, pausedUntil: until });
}
/** Resume today: it comes back from `today` and earlier days keep their pause. */
export async function resumeBlock(id: string, today: ISODate) {
  const b = (await list<RoutineBlock>(COL.routine)).find((x) => x.id === id);
  if (!b?.pausedFrom) return;
  await put(COL.routine, id, { ...b, pausedUntil: today });
}
export const tomorrow = (d: ISODate) => addDays(d, 1);

/* ------------------------------ mind ------------------------------ */

export type MindInput = Omit<MindEntry, "id" | "at" | "visibility"> & { id?: string };
export async function saveMindEntry(e: MindInput) {
  const id = e.id ?? newId();
  const entry: MindEntry = { ...e, id, at: Date.now(), visibility: "private" };
  await put(COL.mind, id, entry);
  return entry;
}
export const deleteMindEntry = (id: string) => remove(COL.mind, id);
export const MIND_KINDS: MindKind[] = ["checkin", "reflection", "focus"];

/* ------------------------------ modules ------------------------------ */

export const setSalahEnabled = (on: boolean) =>
  put(COL.modules, "main", { id: "main", salah: on } satisfies Modules);
