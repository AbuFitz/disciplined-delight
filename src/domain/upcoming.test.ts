import { describe, expect, it } from "vitest";
import { upcomingWorkout } from "./upcoming";

const t = (id: string, weekday: number | null, extra = {}) => ({
  id,
  title: `W${id}`,
  weekday,
  exercises: [1],
  ...extra,
});
describe("upcoming workout", () => {
  // 2026-10-20 is a Tuesday (Monday-first index 1)
  it("finds the next scheduled day and labels it", () => {
    const u = upcomingWorkout([t("a", 0), t("b", 2), t("c", 4)], "2026-10-20")!;
    expect(u.template.id).toBe("b");
    expect(u.daysAway).toBe(1);
    expect(u.label).toBe("Tomorrow");
  });
  it("includes today, wraps the week, and skips archived or empty plans", () => {
    expect(upcomingWorkout([t("a", 1)], "2026-10-20")!.label).toBe("Today");
    expect(upcomingWorkout([t("a", 0)], "2026-10-20")!.label).toBe("Monday");
    expect(upcomingWorkout([t("a", 1, { archivedAt: "x" })], "2026-10-20")).toBeNull();
    expect(upcomingWorkout([t("a", 1, { exercises: [] })], "2026-10-20")).toBeNull();
    expect(upcomingWorkout([t("a", null)], "2026-10-20")).toBeNull();
  });
});
