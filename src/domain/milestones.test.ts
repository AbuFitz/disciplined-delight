import { describe, expect, it } from "vitest";
import { nextMilestone, progressMilestones, type MilestoneInput } from "./milestones";

const empty = (): MilestoneInput => ({ sessions: [], foodDays: [], weighIns: [], mind: [] });

describe("private progress milestones", () => {
  it("starts empty and chooses the closest honest next marker", () => {
    const input = empty();
    input.sessions = [{ status: "completed" }, { status: "active" }];
    input.foodDays = Array.from({ length: 5 }, (_, index) => ({
      date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      complete: true,
    }));
    const milestones = progressMilestones(input);
    expect(milestones.find(({ id }) => id === "first-session")?.earned).toBe(true);
    expect(milestones.find(({ id }) => id === "five-sessions")?.current).toBe(1);
    expect(nextMilestone(milestones)?.id).toBe("seven-food-days");
  });

  it("counts partial training honestly but ignores active sessions and incomplete food days", () => {
    const input = empty();
    input.sessions = [
      { status: "completed" },
      { status: "ended-early" },
      { status: "paused" },
      { status: "active" },
    ];
    input.foodDays = [
      { date: "2026-10-01", complete: true },
      { date: "2026-10-01", complete: true },
      { date: "2026-10-02", complete: false },
    ];
    const milestones = progressMilestones(input);
    expect(milestones.find(({ id }) => id === "five-sessions")?.current).toBe(2);
    expect(milestones.find(({ id }) => id === "seven-food-days")?.current).toBe(1);
  });

  it("requires both enough weigh-ins and enough time for a trend", () => {
    const input = empty();
    input.weighIns = ["01", "02", "03", "04", "05", "06"].map((day) => ({
      date: `2026-10-${day}`,
    }));
    expect(progressMilestones(input).find(({ id }) => id === "weight-trend")).toMatchObject({
      earned: false,
      current: 5,
      target: 14,
    });
    input.weighIns[5] = { date: "2026-10-15" };
    expect(progressMilestones(input).find(({ id }) => id === "weight-trend")?.earned).toBe(true);
  });

  it("uses only private reflection counts and finished focus minutes", () => {
    const input = empty();
    input.mind = [
      ...Array.from({ length: 5 }, () => ({ kind: "reflection" as const })),
      { kind: "focus", minutes: 25 },
      { kind: "focus", minutes: 35 },
      { kind: "checkin" },
    ];
    const milestones = progressMilestones(input);
    expect(milestones.find(({ id }) => id === "five-reflections")?.earned).toBe(true);
    expect(milestones.find(({ id }) => id === "focus-hour")?.earned).toBe(true);
  });
});
