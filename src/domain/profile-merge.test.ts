import { describe, expect, it } from "vitest";
import { mergeGuestProfile } from "./profile-merge";
import { checkUsername } from "./username";
import type { Profile } from "@/data/types";

const base = (p: Partial<Profile>): Profile => ({
  name: "",
  timezone: "Europe/London",
  goal: { kind: "strength" },
  targets: { status: "unset" },
  setup: { goals: false, routine: false, prayer: false, food: false },
  ...p,
});

describe("guest → account profile merge", () => {
  it("keeps the account's identity and adopts the guest's targets and goal weight", () => {
    const account = base({
      name: "Sam",
      username: "sam_lifts",
      timezone: "Europe/Paris",
      pillars: ["body"],
    });
    const guest = base({
      name: "Abukar",
      timezone: "Europe/London",
      goal: { kind: "gain-weight", targetWeightKg: 80 },
      targets: { status: "provisional", kcal: 2760, protein: 138 },
      budgetPencePerWeek: 4000,
      setup: { goals: true, routine: false, prayer: true, food: false },
    });
    const m = mergeGuestProfile(account, guest);
    expect(m).toMatchObject({
      name: "Sam",
      username: "sam_lifts",
      timezone: "Europe/Paris",
      pillars: ["body"],
    });
    expect(m.targets).toMatchObject({ status: "provisional", kcal: 2760 });
    expect(m.goal.targetWeightKg).toBe(80);
    expect(m.budgetPencePerWeek).toBe(4000);
    expect(m.setup).toMatchObject({ goals: true, prayer: true });
  });
  it("never overwrites targets or notes the account already set", () => {
    const account = base({
      targets: { status: "confirmed", kcal: 3000 },
      allergies: "nuts",
      goal: { kind: "gain-weight", targetWeightKg: 75 },
    });
    const guest = base({
      targets: { status: "provisional", kcal: 2760 },
      allergies: "none",
      goal: { kind: "maintain", targetWeightKg: 80 },
    });
    const m = mergeGuestProfile(account, guest);
    expect(m.targets.kcal).toBe(3000);
    expect(m.allergies).toBe("nuts");
    expect(m.goal).toEqual({ kind: "gain-weight", targetWeightKg: 75 });
  });
});

describe("username rules", () => {
  it("accepts and rejects what the database does", () => {
    expect(checkUsername("Sam_Lifts").ok).toBe(true);
    for (const bad of ["ab", "1abc", "a b", "a".repeat(21), "Admin", "NEWLIFE", "he!lo"])
      expect(checkUsername(bad).ok).toBe(false);
  });
});
