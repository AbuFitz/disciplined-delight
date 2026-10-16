import { describe, expect, it } from "vitest";
import { diffPlans, diffSession, editedSince } from "./plan-diff";
import type { WorkoutTemplate } from "@/data/types";

const x = (id: string, sets = 3, s = "3 × 8–12") => ({
  catalogueId: id,
  name: id,
  sets,
  schemeText: s,
});

describe("plan diff", () => {
  it("reports added, removed and changed exercises and counts the rest", () => {
    const d = diffSession(
      "A",
      [x("a"), x("b"), x("c", 3)],
      [x("a"), x("c", 2, "2 × 8–12"), x("d")],
    );
    expect(d.added).toEqual(["d"]);
    expect(d.removed).toEqual(["b"]);
    expect(d.changed).toEqual([{ name: "c", from: "3 × 8–12", to: "2 × 8–12" }]);
    expect(d.unchanged).toBe(1);
  });
  it("notes sessions that appear or disappear", () => {
    const d = diffPlans(
      [
        { title: "A", exercises: [] },
        { title: "B", exercises: [] },
      ],
      [{ title: "A", exercises: [] }],
    );
    expect(d.sessionsRemoved).toEqual(["B"]);
  });
  it("detects edits to a plan's workouts, including archival", () => {
    const snap = [{ templateId: "t", exercises: [x("a"), x("b")] }];
    const tpl = (ex: ReturnType<typeof x>[], archivedAt?: string) =>
      ({
        id: "t",
        letter: "A",
        title: "A",
        focus: "",
        weekday: 0,
        order: 0,
        archivedAt,
        exercises: ex.map((e, i) => ({ id: String(i), ...e })),
      }) as unknown as WorkoutTemplate;
    expect(editedSince(snap, [tpl([x("a"), x("b")])])).toBe(false);
    expect(editedSince(snap, [tpl([x("a")])])).toBe(true);
    expect(editedSince(snap, [tpl([x("a"), x("b", 4)])])).toBe(true);
    expect(editedSince(snap, [tpl([x("a"), x("b")], "2026-01-01")])).toBe(true);
  });
});
