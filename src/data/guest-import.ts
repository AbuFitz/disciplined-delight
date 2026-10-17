import { applyBackup, group, previewBackup } from "./backup";
import { get, getScopeDB, put } from "./db";
import { COL, type Profile } from "./types";
import { BACKUP_APP, BACKUP_SCHEMA, type Backup, type ImportPreview } from "@/domain/backup";
import { mergeGuestProfile } from "@/domain/profile-merge";
import type { StoredRecord } from "./db";

const GUEST = { kind: "guest" } as const;
export type GuestClaim = { userId: string; at: number };

async function guestRecords(): Promise<StoredRecord[]> {
  const db = await getScopeDB(GUEST);
  return (await db.getAll("records")) as StoredRecord[];
}

export async function guestBackup(): Promise<Backup> {
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    attachments: "none",
    collections: group(await guestRecords()),
  };
}

export async function guestClaim(): Promise<GuestClaim | undefined> {
  const db = await getScopeDB(GUEST);
  return (await db.get("meta", "guest:claim")) as GuestClaim | undefined;
}

/** How much guest data exists, ignoring the empty profile document the app always creates. */
export async function guestHasData(): Promise<number> {
  const recs = (await guestRecords()).filter((r) => !r.deletedAt && r.collection !== COL.legacyRaw);
  const meaningful = recs.filter(
    (r) =>
      !(
        r.collection === COL.profile &&
        JSON.stringify((r.data as Profile).targets) === '{"status":"unset"}' &&
        !(r.data as Profile).name
      ),
  );
  return meaningful.length;
}

/** What a merge into the CURRENT (account) scope would do. Reads the guest database; writes nothing. */
export async function previewGuestImport(): Promise<ImportPreview> {
  return previewBackup(await guestBackup(), "merge");
}

/**
 * Deliberate, one-time import of guest data into the current account scope.
 * - Merge only: existing account records are never overwritten; differing ones stay as the account's.
 * - The guest database is left exactly as it was (nothing is deleted), then marked as claimed.
 */
export async function importGuest(userId: string) {
  const claim = await guestClaim();
  if (claim) throw new Error("Guest data was already imported on this device.");
  const backup = await guestBackup();
  // The profile is merged field by field (account identity wins); everything else is a plain merge.
  const guestProfile = backup.collections[COL.profile]?.find((r) => r.id === "main")?.data as
    | Profile
    | undefined;
  const accountProfile = await get<Profile>(COL.profile, "main");
  if (guestProfile && accountProfile)
    await put(COL.profile, "main", mergeGuestProfile(accountProfile, guestProfile));
  delete backup.collections[COL.profile];
  const res = await applyBackup(backup, "merge");
  const db = await getScopeDB(GUEST);
  await db.put("meta", { userId, at: Date.now() } satisfies GuestClaim, "guest:claim");
  return res;
}
