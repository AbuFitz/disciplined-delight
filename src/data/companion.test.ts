import { beforeEach, describe, expect, it } from "vitest";
import { closeDB } from "./db";
import { getCompanionConfig, saveCompanionConfig } from "./companion";
import { DEFAULT_COMPANION } from "@/domain/companion";
beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});
describe("companion settings", () => {
  it("persist as an explicit opt-in", async () => {
    expect((await getCompanionConfig()).enabled).toBe(false);
    await saveCompanionConfig({ ...DEFAULT_COMPANION, enabled: true, name: "Pip" });
    expect(await getCompanionConfig()).toMatchObject({ enabled: true, name: "Pip" });
  });
});
