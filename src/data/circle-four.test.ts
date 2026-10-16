import { describe, expect, it } from "vitest";
import { validateFourDare, validateFourDraft } from "./circle-four";

describe("Four in a Row invitations", () => {
  it("requires a real connection and a bounded self-authored dare", () => {
    expect(validateFourDraft({ userId: "", dare: "Walk before lunch" })).toMatch(/connection/i);
    expect(validateFourDraft({ userId: "person-2", dare: "" })).toMatch(/4 and 120/);
    expect(validateFourDraft({ userId: "person-2", dare: "Walk before lunch" })).toBeNull();
  });

  it("trims before validating dare length", () => {
    expect(validateFourDare("   run   ")).toMatch(/4 and 120/);
    expect(validateFourDare(`x${"y".repeat(119)}`)).toBeNull();
    expect(validateFourDare(`x${"y".repeat(120)}`)).toMatch(/4 and 120/);
  });
});
