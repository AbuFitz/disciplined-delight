import { beforeEach, describe, expect, it } from "vitest";
import { closeDB, get, getScopeDB, list, put, outboxCount } from "./db";
import { guestClaim, guestHasData, importGuest, previewGuestImport } from "./guest-import";
import { setScope, type Scope } from "./scope";
import { COL, type Profile } from "./types";

const guest: Scope = { kind: "guest" };
const acct: Scope = { kind: "user", userId: "u-1" };
const profile = (p: Partial<Profile>): Profile => ({
  name: "",
  timezone: "Europe/London",
  goal: { kind: "strength" },
  targets: { status: "unset" },
  setup: { goals: false, routine: false, prayer: false, food: false },
  ...p,
});

beforeEach(async () => {
  setScope(guest);
  await closeDB();
  for (const d of (await indexedDB.databases()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
});

async function seedGuest() {
  setScope(guest);
  await put(
    COL.profile,
    "main",
    profile({
      name: "Abukar",
      goal: { kind: "gain-weight", targetWeightKg: 80 },
      targets: { status: "provisional", kcal: 2760 },
    }),
  );
  await put(COL.weighIns, "w1", { id: "w1", date: "2026-10-12", kg: 64.2 });
  await put(COL.templates, "t1", { id: "t1", title: "Guest day" });
}

describe("guest → account import", () => {
  it("brings guest records across once, merging the profile and leaving the guest copy intact", async () => {
    await seedGuest();
    setScope(acct);
    await put(COL.profile, "main", profile({ name: "Sam", username: "sam_lifts" }));
    await put(COL.templates, "t1", { id: "t1", title: "Account day" }); // conflicts with the guest's t1

    const pre = await previewGuestImport();
    expect(pre.totals.conflicting).toBeGreaterThanOrEqual(1);

    await importGuest("u-1");
    const p = await get<Profile>(COL.profile, "main");
    expect(p).toMatchObject({ name: "Sam", username: "sam_lifts" }); // identity kept
    expect(p!.targets.kcal).toBe(2760); // guest targets adopted where the account had none
    expect(await list(COL.weighIns)).toHaveLength(1);
    expect(await get(COL.templates, "t1")).toEqual({ id: "t1", title: "Account day" }); // conflict: account wins
    expect(await outboxCount()).toBeGreaterThan(0); // imported records will sync to the account

    // the guest copy is untouched, and marked as claimed
    const g = await getScopeDB(guest);
    expect((await g.get("records", [COL.templates, "t1"]))!.data).toEqual({
      id: "t1",
      title: "Guest day",
    });
    expect((await guestClaim())?.userId).toBe("u-1");
  });
  it("refuses a second import", async () => {
    await seedGuest();
    setScope(acct);
    await put(COL.profile, "main", profile({ name: "Sam" }));
    await importGuest("u-1");
    await expect(importGuest("u-1")).rejects.toThrow(/already imported/);
  });
  it("an empty guest has nothing to offer", async () => {
    setScope(guest);
    await put(COL.profile, "main", profile({}));
    expect(await guestHasData()).toBe(0);
  });
});
