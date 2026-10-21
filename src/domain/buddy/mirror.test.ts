import { describe, expect, it } from "vitest";
import type { Session, SessionExercise } from "@/data/types";
import {
  compareToLast,
  consistencyMirror,
  ghostTarget,
  mirrorForExercise,
  mirrorSummary,
  personalBest,
  previousPerformance,
} from "./mirror";

const ex = (
  name: string,
  sets: [number, number][],
  over: Partial<SessionExercise> = {},
): SessionExercise => ({
  id: `e-${name}`,
  name,
  catalogueId: name.toLowerCase(),
  prescription: { sets: 3, repMin: 6, repMax: 8, schemeText: "3x6-8" },
  incrementKg: 2.5,
  sets: sets.map(([weightKg, reps], i) => ({
    id: `s${i}`,
    kind: "working",
    weightKg,
    reps,
    completed: true,
  })),
  ...over,
});
const session = (
  id: string,
  date: string,
  exercises: SessionExercise[],
  over: Partial<Session> = {},
): Session => ({
  id,
  date,
  templateId: "t",
  templateName: "A",
  status: "completed",
  startedAt: Date.parse(`${date}T10:00:00Z`),
  endedAt: Date.parse(`${date}T11:00:00Z`),
  pausedMs: 0,
  exercises,
  ...over,
});

describe("Mirror Mode compares a person only with their own history", () => {
  const history = [
    session("old", "2026-01-01", [
      ex("Squat", [
        [60, 8],
        [60, 8],
      ]),
    ]),
    session("last", "2026-01-08", [
      ex("Squat", [
        [60, 6],
        [62.5, 6],
      ]),
    ]),
  ];
  it("finds the most recent earlier mark, ignoring the current session", () => {
    const current = session("now", "2026-01-15", [ex("Squat", [[62.5, 7]])]);
    const prev = previousPerformance(current.exercises[0]!, [...history, current], current);
    expect(prev?.session.id).toBe("last");
    expect(prev?.top).toMatchObject({ weightKg: 62.5, reps: 6 });
  });
  it("builds a ghost target: add a rep inside the range, else a small load step", () => {
    const g1 = ghostTarget(ex("Squat", []), {
      kind: "working",
      weightKg: 62.5,
      reps: 6,
      completed: true,
    });
    expect(g1.match).toBe("62.5 kg × 6");
    expect(g1.stretch).toBe("62.5 kg × 7");
    const g2 = ghostTarget(ex("Squat", []), {
      kind: "working",
      weightKg: 62.5,
      reps: 8,
      completed: true,
    });
    expect(g2.stretch).toBe("65 kg × 6");
  });
  it("uses time for holds and reps for bodyweight work", () => {
    const plank = ex("Plank", [], { tracking: "time" });
    expect(ghostTarget(plank, { kind: "working", seconds: 60, completed: true }).stretch).toBe(
      "1:05",
    );
    const pushup = ex("Pushup", [], { tracking: "bodyweight_reps" });
    expect(ghostTarget(pushup, { kind: "working", reps: 12, completed: true }).stretch).toBe(
      "13 reps",
    );
  });
  it("describes ahead, matched and lighter without judgement", () => {
    const e = ex("Squat", []);
    const prev = { kind: "working" as const, weightKg: 62.5, reps: 6, completed: true };
    expect(compareToLast(e, { ...prev, reps: 7 }, prev).verdict).toBe("ahead");
    expect(compareToLast(e, prev, prev).verdict).toBe("match");
    const lighter = compareToLast(e, { ...prev, weightKg: 60 }, prev);
    expect(lighter.verdict).toBe("lighter");
    expect(lighter.text).not.toMatch(/fail|worse|behind|weak|lazy/i);
    expect(compareToLast(e, prev, undefined).verdict).toBe("new");
  });
  it("says so plainly when there is no earlier mark", () => {
    const r = mirrorForExercise(ex("Deadlift", [[100, 5]]), history, { date: "2026-01-15" });
    expect(r.ghost).toBeUndefined();
    expect(r.lines[0]!.kind).toBe("new");
  });
  it("summarises a session and offers a compassionate comeback after a long gap", () => {
    const now = session("now", "2026-02-01", [ex("Squat", [[65, 6]]), ex("Row", [[40, 8]])]);
    const s = mirrorSummary(now, [...history, now]);
    expect(s.ahead).toBe(1);
    expect(s.fresh).toBe(1);
    expect(s.comeback).toMatch(/Back after 24 days/);
    expect(s.wins.join(" ")).not.toMatch(/fail|lazy|behind|streak/i);
  });
  it("measures consistency against the person's own recent weeks", () => {
    const sessions = [
      { date: "2026-01-14", status: "completed" as const },
      { date: "2026-01-12", status: "completed" as const },
      { date: "2026-01-03", status: "completed" as const },
    ];
    const c = consistencyMirror(sessions, "2026-01-15");
    expect(c.thisWeek).toBe(2);
    expect(c.text).toMatch(/this week/);
    expect(consistencyMirror([], "2026-01-15").text).toMatch(/first session/);
  });
});

describe("personal bests", () => {
  const earlier = session("a", "2026-01-01", [ex("Squat", [[80, 5]])]);
  it("flags a heavier top set against the person's own history only", () => {
    const now = session("b", "2026-01-08", [ex("Squat", [[85, 3]])]);
    expect(personalBest(now, [earlier, now])).toMatchObject({ exercise: "Squat" });
  });
  it("does not call a first mark or an equal load a record", () => {
    const first = session("b", "2026-01-08", [ex("Deadlift", [[100, 5]])]);
    expect(personalBest(first, [earlier, first])).toBeUndefined();
    const same = session("c", "2026-01-09", [ex("Squat", [[80, 6]])]);
    expect(personalBest(same, [earlier, same])).toBeUndefined();
  });
});
