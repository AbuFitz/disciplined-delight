import { describe, expect, it } from "vitest";
import { validateMessage } from "./circle-chat";

describe("Circle chat validation", () => {
  it("rejects blank and oversized messages", () => {
    expect(validateMessage("   ")).toMatch(/message/i);
    expect(validateMessage("x".repeat(1001))).toMatch(/1,000/);
  });

  it("accepts a concise message", () => {
    expect(validateMessage("Training tomorrow at six? ")).toBeNull();
  });
});
