import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DAY_PLANS } from "./sunrise-data";

describe("curated meal media", () => {
  it("keeps every public image reference backed by a file", () => {
    const missing = DAY_PLANS.flatMap((day) => day.meals)
      .map((meal) => meal.image)
      .filter((image) => !existsSync(resolve(process.cwd(), "public", image.replace(/^\//, ""))));

    expect(missing).toEqual([]);
  });
});
