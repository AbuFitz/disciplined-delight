import { describe, expect, it } from "vitest";
import { setupGuide } from "./setup-guide";
describe("setup guide", () => {
  const context = { modules: ["training", "routines"], safetyGate: false, days: 3, minutes: 45 };
  it("explains what each step changes and previews selected choices", () => {
    expect(setupGuide(2, context).body).toMatch(/explicit choice/);
    expect(setupGuide(5, context).body).toMatch(/3 days.*45 minutes.*2 selected areas/);
  });
  it("repairs safety conflicts without diagnosis or shame", () => {
    const result = setupGuide(5, { ...context, safetyGate: true });
    expect(result.body).toMatch(/will not guess.*clinician or qualified trainer/);
    expect(result.body).not.toMatch(/diagnos|failed|fault/i);
  });
});
