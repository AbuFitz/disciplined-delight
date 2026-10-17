import { get, put } from "./db";
import { COL } from "./types";
import { DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
export const getCompanionConfig = async () => ({
  ...DEFAULT_COMPANION,
  ...((await get<CompanionConfig>(COL.companion, "main")) ?? {}),
});
export const saveCompanionConfig = (config: CompanionConfig) => put(COL.companion, "main", config);
