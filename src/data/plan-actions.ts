import type { CatalogueExercise } from "@/domain/catalogue";
import { RULES_VERSION } from "@/domain/programmes";
import type { Plan } from "@/domain/planner";
import { planToTemplates } from "@/domain/plan-templates";
import { toKey } from "@/domain/plan-diff";
import { applyBatch, list, newId, type BatchOp } from "./db";
import { scopeGeneration } from "./scope";
import { COL, type PlanRecord, type WorkoutTemplate } from "./types";

export type HandleExisting = "add" | "replace";

export type AcceptArgs = {
  plan: Plan;
  byId: Map<string, CatalogueExercise>;
  /** What to do with workouts already on the schedule. Required (no default) when there are any to handle. */
  handle?: HandleExisting;
  /** Only these existing templates are archived on "replace" (defaults to every active one). */
  archiveIds?: string[];
  /** Regeneration: the plan being replaced. */
  from?: PlanRecord;
  equipment?: import("@/domain/catalogue").EquipmentId[];
  mkId?: () => string;
};

export class NeedsChoice extends Error {
  constructor() {
    super("Choose what to do with your current workouts first.");
  }
}

/**
 * Accept (or regenerate) a plan as ONE atomic, account-scoped operation: new templates, archives of replaced ones,
 * the plan record and the equipment profile are written together with their sync mutations. If anything fails nothing
 * changes and the previous schedule is exactly as it was. Logged sessions are never touched.
 */
export async function acceptPlan(
  a: AcceptArgs,
): Promise<{ planId: string; templateIds: string[] }> {
  const generation = scopeGeneration();
  const mk = a.mkId ?? newId;
  const all = await list<WorkoutTemplate>(COL.templates);
  const active = all.filter((t) => !t.archivedAt);
  const target = a.from ? active.filter((t) => a.from!.templateIds.includes(t.id)) : active;
  const archive = a.archiveIds ? active.filter((t) => a.archiveIds!.includes(t.id)) : target;
  const mustChoose = (a.from ? target.length : active.length) > 0;
  if (mustChoose && !a.handle) throw new NeedsChoice();

  const maxOrder = all.reduce((m, t) => Math.max(m, t.order), -1);
  const made = planToTemplates(a.plan, a.byId, mk, maxOrder + 1).map((t) =>
    mustChoose && a.handle === "add" ? { ...t, weekday: null } : t,
  );
  const planId = mk();
  const rec: PlanRecord = {
    id: planId,
    createdAt: new Date().toISOString(),
    rulesVersion: a.plan.rulesVersion ?? RULES_VERSION,
    programmeId: a.plan.programmeId,
    input: a.plan.input,
    seed: a.plan.input.seed ?? "vayvor",
    generation: (a.from?.generation ?? 0) + (a.from ? 1 : 0),
    regeneratedFrom: a.from?.id,
    status: "active",
    templateIds: made.map((t) => t.id),
    snapshot: made.map((t) => ({
      templateId: t.id,
      title: t.title,
      exercises: t.exercises.map(toKey),
    })),
    attribution:
      "Exercise data: wger.de contributors, licensed CC-BY-SA. See the Library for each exercise's credit.",
  };
  const now = new Date().toISOString();
  const ops: BatchOp[] = [];
  if (mustChoose && a.handle === "replace")
    for (const t of archive)
      ops.push({ collection: COL.templates, id: t.id, op: "put", data: { ...t, archivedAt: now } });
  for (const t of made) ops.push({ collection: COL.templates, id: t.id, op: "put", data: t });
  ops.push({ collection: COL.plans, id: planId, op: "put", data: rec });
  if (a.from)
    ops.push({
      collection: COL.plans,
      id: a.from.id,
      op: "put",
      data: { ...a.from, status: "replaced", supersededBy: planId },
    });
  if (a.equipment)
    ops.push({
      collection: COL.equipmentProfile,
      id: "main",
      op: "put",
      data: { id: "main", have: a.equipment, configured: true },
    });
  await applyBatch(ops, { generation });
  return { planId, templateIds: made.map((t) => t.id) };
}

/** Restore an archived workout. It keeps its day only if that day is free; otherwise it comes back unscheduled. */
export async function restoreTemplate(id: string): Promise<{ scheduled: boolean }> {
  const all = await list<WorkoutTemplate>(COL.templates);
  const t = all.find((x) => x.id === id);
  if (!t) throw new Error("That workout no longer exists.");
  const clash =
    t.weekday != null && all.some((x) => x.id !== id && !x.archivedAt && x.weekday === t.weekday);
  const weekday = clash ? null : t.weekday;
  await applyBatch(
    [{ collection: COL.templates, id, op: "put", data: { ...t, archivedAt: null, weekday } }],
    {
      generation: scopeGeneration(),
    },
  );
  return { scheduled: weekday != null };
}
