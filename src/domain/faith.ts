import type { FaithProfile, Profile } from "@/data/types";

/** Missing legacy data means no assumption. Only an explicit old prayer opt-in migrates to Islam. */
export function resolveFaithProfile(
  profile: Pick<Profile, "faith" | "faithRoutines">,
): FaithProfile {
  if (profile.faith) return normalizeFaithProfile(profile.faith);
  if (profile.faithRoutines)
    return {
      enabled: true,
      traditions: ["islam"],
      practices: ["prayer_remembrance"],
      private: true,
    };
  return { enabled: false, traditions: ["not_for_me"], practices: [], private: true };
}

export function normalizeFaithProfile(faith: FaithProfile): FaithProfile {
  const privateChoices = faith.traditions.filter(
    (item) => item === "not_for_me" || item === "prefer_not_to_say",
  );
  if (!faith.enabled || privateChoices.length)
    return {
      ...faith,
      enabled: false,
      traditions: [privateChoices[0] ?? "not_for_me"],
      practices: [],
      private: true,
    };
  return {
    ...faith,
    traditions: [...new Set(faith.traditions)],
    practices: [...new Set(faith.practices)],
    private: true,
  };
}

export function hasIslamicPrayerPack(faith: FaithProfile) {
  return (
    faith.enabled &&
    faith.traditions.includes("islam") &&
    faith.practices.includes("prayer_remembrance")
  );
}
