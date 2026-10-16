import { describe, expect, it } from "vitest";
import { validateChallenge } from "./circle-challenges";

const today = new Date(2026, 9, 16);
const valid = {
  userId: "person-2",
  title: "Eight-session pact",
  unit: "sessions",
  target: 8,
  endsOn: "2026-10-30",
};

describe("Circle challenge validation", () => {
  it("accepts a bounded, connection-scoped challenge", () => {
    expect(validateChallenge(valid, today)).toBeNull();
  });

  it("requires a connection and meaningful labels", () => {
    expect(validateChallenge({ ...valid, userId: "" }, today)).toMatch(/connection/i);
    expect(validateChallenge({ ...valid, title: "" }, today)).toMatch(/title/i);
    expect(validateChallenge({ ...valid, unit: "" }, today)).toMatch(/counting/i);
  });

  it("bounds targets and duration", () => {
    expect(validateChallenge({ ...valid, target: 101 }, today)).toMatch(/1 to 100/);
    expect(validateChallenge({ ...valid, endsOn: "2026-12-01" }, today)).toMatch(/42 days/);
    expect(validateChallenge({ ...valid, endsOn: "2026-10-16" }, today)).toMatch(/42 days/);
  });
});
