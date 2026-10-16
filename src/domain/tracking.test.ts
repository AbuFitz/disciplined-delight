import { describe, expect, it } from "vitest";
import {
  countsTowardVolume,
  formatSeconds,
  formatSet,
  hasRecord,
  supportsProgression,
} from "./tracking";
import { sessionSummary, suggestionFor } from "@/data/session-logic";
import type { Session, SessionExercise } from "@/data/types";

const ex = (
  tracking: SessionExercise["tracking"],
  sets: SessionExercise["sets"],
): SessionExercise => ({
  id: "e",
  name: "x",
  tracking,
  prescription: { sets: 3, repMin: 8, repMax: 12, schemeText: "" },
  sets,
});

describe("tracking types", () => {
  it("records per type and treats legacy as weight_reps", () => {
    expect(hasRecord({ kind: "working", completed: true, weightKg: 20 })).toBe(true);
    expect(hasRecord({ kind: "working", completed: true, reps: 10 }, "weight_reps")).toBe(false);
    expect(hasRecord({ kind: "working", completed: true, reps: 10 }, "bodyweight_reps")).toBe(true);
    expect(hasRecord({ kind: "working", completed: true, seconds: 30 }, "time")).toBe(true);
    expect(hasRecord({ kind: "working", completed: true, distanceM: 500 }, "distance_time")).toBe(
      true,
    );
  });
  it("only loaded lifts count toward volume and progression", () => {
    expect(countsTowardVolume("bodyweight_reps")).toBe(false);
    expect(supportsProgression("time")).toBe(false);
    expect(supportsProgression(undefined)).toBe(true);
    const s = {
      exercises: [
        ex("weight_reps", [{ id: "a", kind: "working", completed: true, weightKg: 10, reps: 10 }]),
        ex("bodyweight_reps", [
          { id: "b", kind: "working", completed: true, reps: 20, weightKg: 99 },
        ]),
      ],
    } as unknown as Session;
    expect(sessionSummary(s).volume).toBe(100);
    expect(
      suggestionFor(ex("bodyweight_reps", []), { date: "d", sessionId: "s", sets: [] }).kind,
    ).toBe("none");
  });
  it("formats sets", () => {
    expect(formatSeconds(75)).toBe("1:15");
    expect(formatSet({ kind: "working", completed: true, seconds: 45 }, "time")).toBe("45s");
    expect(
      formatSet({ kind: "working", completed: true, reps: 6, assistKg: 20 }, "assisted_reps"),
    ).toBe("6 reps, 20 kg assist");
    expect(formatSet({ kind: "working", completed: true, weightKg: 40, reps: 8 })).toBe(
      "40 kg × 8",
    );
  });
});
