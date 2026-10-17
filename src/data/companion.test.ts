import { beforeEach, describe, expect, it } from "vitest";
import { closeDB } from "./db";
import { getCompanionConfig, saveCompanionConfig } from "./companion";
import { DEFAULT_COMPANION } from "@/domain/companion";
beforeEach(async () => {
  await closeDB();
  indexedDB.deleteDatabase("new-life");
});
describe("companion settings", () => {
  it("persist and default to on, with an easy opt-out", async () => {
    expect((await getCompanionConfig()).enabled).toBe(true);
    await saveCompanionConfig({ ...DEFAULT_COMPANION, enabled: false, name: "Pip" });
    expect(await getCompanionConfig()).toMatchObject({
      enabled: false,
      name: "Pip",
      setupDone: true,
    });
  });
});
