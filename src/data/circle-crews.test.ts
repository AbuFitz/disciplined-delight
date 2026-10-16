import { describe, expect, it } from "vitest";
import { validateCrewCheckin, validateCrewDraft } from "./circle-crews";

const valid = {
  name: "Saturday Standard",
  purpose: "Show up for one deliberate session before the weekend disappears.",
  inviteeIds: ["person-2", "person-3"],
};

describe("Circle crew validation", () => {
  it("accepts a specific small-crew brief", () => {
    expect(validateCrewDraft(valid)).toBeNull();
  });

  it("requires a useful name and purpose", () => {
    expect(validateCrewDraft({ ...valid, name: "x" })).toMatch(/3 and 40/);
    expect(validateCrewDraft({ ...valid, purpose: "vague" })).toMatch(/10 to 160/);
  });

  it("keeps crews to twelve unique people including the owner", () => {
    expect(validateCrewDraft({ ...valid, inviteeIds: ["person-2", "person-2"] })).toMatch(/once/);
    expect(
      validateCrewDraft({
        ...valid,
        inviteeIds: Array.from({ length: 12 }, (_, index) => `person-${index}`),
      }),
    ).toMatch(/twelve/);
  });

  it("bounds manual weekly roll calls", () => {
    expect(validateCrewCheckin({ state: "showed_up", note: "Kept Tuesday honest." })).toBeNull();
    expect(validateCrewCheckin({ state: "rested", note: "x".repeat(181) })).toMatch(/180/);
    expect(validateCrewCheckin({ state: "invalid" as "rested", note: "" })).toMatch(/state/);
  });
});
