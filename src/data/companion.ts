import { get, put } from "./db";
import { COL } from "./types";
import { normaliseCompanion, type CompanionConfig } from "@/domain/companion";
export const getCompanionConfig = async () =>
  normaliseCompanion(await get<CompanionConfig>(COL.companion, "main"));
export const saveCompanionConfig = (config: CompanionConfig) =>
  put(COL.companion, "main", { ...config, setupDone: true });
