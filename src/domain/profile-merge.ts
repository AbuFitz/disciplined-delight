import type { Profile } from "@/data/types";

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Bringing a guest profile into an account: the ACCOUNT's identity (name, username, timezone, pillars)
 * always wins; the guest's goals, targets, budget, notes and setup progress are adopted only where the
 * account hasn't set its own. Nothing the account already chose is overwritten.
 */
export function mergeGuestProfile(account: Profile, guest: Profile): Profile {
  const out: Profile = { ...account };
  if (isEmpty(account.name) && !isEmpty(guest.name)) out.name = guest.name;
  if (account.targets.status === "unset" && guest.targets.status !== "unset")
    out.targets = guest.targets;
  if (account.budgetPencePerWeek == null && guest.budgetPencePerWeek != null)
    out.budgetPencePerWeek = guest.budgetPencePerWeek;
  if (isEmpty(account.allergies)) out.allergies = guest.allergies;
  if (isEmpty(account.dietaryNotes)) out.dietaryNotes = guest.dietaryNotes;
  if (account.goal.targetWeightKg == null && guest.goal.targetWeightKg != null) {
    out.goal = { ...account.goal, targetWeightKg: guest.goal.targetWeightKg };
  }
  const acctSetup = account.setup;
  out.setup = {
    goals: acctSetup.goals || guest.setup.goals,
    routine: acctSetup.routine || guest.setup.routine,
    prayer: acctSetup.prayer || guest.setup.prayer,
    food: acctSetup.food || guest.setup.food,
    skipped: acctSetup.skipped || guest.setup.skipped,
  };
  if (account.wakeLock == null && guest.wakeLock != null) out.wakeLock = guest.wakeLock;
  return out;
}
