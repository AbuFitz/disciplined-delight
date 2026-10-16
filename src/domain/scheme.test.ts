import { expect, it } from "vitest";
import { schemeFrom } from "./scheme";

it("formats and keeps qualifiers", () => {
  expect(schemeFrom(3, 8, 12)).toBe("3 × 8–12");
  expect(schemeFrom(3, 12, 15, "3 × 12–15 per arm")).toBe("3 × 12–15 per arm");
  expect(schemeFrom(4, 10, 10, "3 × 12–15 per arm")).toBe("4 × 10 per arm");
});

it("does not duplicate the old rep range", () => {
  expect(schemeFrom(3, 8, 15, "3 × 8–12")).toBe("3 × 8–15");
  expect(schemeFrom(3, 8, 15, "3 × 8–15")).toBe("3 × 8–15");
});
