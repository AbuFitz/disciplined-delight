import type { AppModule } from "@/data/types";
import type { AccentWorld } from "@/lib/theme";
import { DEFAULT_VARIANT, VARIANTS, normaliseVariant, type VariantId } from "./buddy/variants";

export type BuddyPalette = "world" | AccentWorld;
export type BuddyPlacement = "dock_right" | "dock_left" | "inline" | "on_demand" | "setup";
export type BuddyPersonality = "steady" | "playful" | "dry";

export type CompanionConfig = {
  id: "main";
  enabled: boolean;
  /** True once the person has been through (or skipped) guided setup. */
  setupDone: boolean;
  name: string;
  /** Companion family member. Recolour and rename are independent of this choice. */
  variant: VariantId;
  /** "world" follows the selected colour world; otherwise a fixed world. */
  palette: BuddyPalette;
  expression: "calm" | "bright" | "focused";
  personality: BuddyPersonality;
  tone: "quiet" | "direct" | "warm";
  energy: "low" | "medium" | "high";
  frequency: "minimal" | "balanced" | "active";
  celebration: "off" | "subtle" | "full";
  motion: "off" | "gentle" | "full";
  /** Off by default. Independent of reduced motion. Only acknowledgements and key moments vibrate. */
  haptics: boolean;
  /** Off by default. "chime" is a soft tone; "voice" reads lines aloud with the device voice. */
  sound: "off" | "chime" | "voice";
  placement: BuddyPlacement;
  /** Muted: no unprompted speech, sound or celebration. The panel still opens on tap. */
  muted: boolean;
  quiet: { enabled: boolean; start: string; end: string };
  modules: AppModule[];
  privacy: "status_only";
};
export const DEFAULT_COMPANION: CompanionConfig = {
  id: "main",
  enabled: true,
  setupDone: false,
  name: VARIANTS[DEFAULT_VARIANT].defaultName,
  variant: DEFAULT_VARIANT,
  palette: "world",
  expression: "calm",
  personality: "steady",
  tone: "warm",
  energy: "medium",
  frequency: "balanced",
  celebration: "subtle",
  motion: "gentle",
  haptics: false,
  sound: "off",
  placement: "dock_right",
  muted: false,
  quiet: { enabled: true, start: "21:30", end: "07:30" },
  modules: ["training", "nutrition", "mind", "routines"],
  privacy: "status_only",
};

const PLACEMENTS: BuddyPlacement[] = ["dock_right", "dock_left", "inline", "on_demand", "setup"];
const WORLDS = ["mint", "cobalt", "violet", "coral", "amber", "rose", "slate"];
/** Merge a stored (possibly old-shape) record over the defaults. */
export function normaliseCompanion(
  stored?: (Partial<Record<keyof CompanionConfig, unknown>> & { form?: unknown }) | null,
) {
  const base = { ...DEFAULT_COMPANION, ...(stored ?? {}) } as CompanionConfig;
  // Earlier builds stored `form` (orb/totem/spark, then bell/cairn/plate). Map without losing a choice.
  const raw = stored as Record<string, unknown> | null | undefined;
  base.variant = normaliseVariant(raw?.variant ?? raw?.form);
  delete (base as unknown as Record<string, unknown>).form;
  // A saved name that was only ever the old default follows the variant's default.
  if (raw && (raw.name === "Buddy" || raw.name === undefined) && !("variant" in raw))
    base.name = VARIANTS[base.variant].defaultName;
  const placement = String(base.placement);
  base.placement =
    placement === "dashboard"
      ? "dock_right"
      : PLACEMENTS.includes(placement as BuddyPlacement)
        ? (placement as BuddyPlacement)
        : "dock_right";
  // A stored record from before the redesign had no setupDone flag; the choice was already made.
  if (stored && !("setupDone" in stored)) base.setupDone = true;
  const palette = String(base.palette);
  base.palette =
    palette === "world" || WORLDS.includes(palette) ? (palette as BuddyPalette) : "world";
  if (stored && !("palette" in stored)) base.palette = "world";
  // The legacy default palette was "mint"; that was a default, not a choice.
  if (stored && stored.palette === "mint" && !("setupDone" in stored)) base.palette = "world";
  return base;
}

export type CompanionSignals = {
  minute: number;
  activeWorkout?: boolean;
  workoutPlanned?: boolean;
  workoutCompleted?: boolean;
  mealPlanning?: boolean;
  focusPlanned?: boolean;
  recoveryDay?: boolean;
  milestone?: boolean;
  offline?: boolean;
  syncError?: boolean;
};
export type CompanionState = {
  kind:
    | "hidden"
    | "sync"
    | "active_workout"
    | "celebrate"
    | "planned_workout"
    | "meal_plan"
    | "focus"
    | "recovery"
    | "idle";
  message: string;
  action?: { label: string; to: string };
};
const hm = (value: string) => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};
const quiet = (minute: number, start: string, end: string) => {
  const a = hm(start),
    b = hm(end);
  return a <= b ? minute >= a && minute < b : minute >= a || minute < b;
};

export function companionState(config: CompanionConfig, signals: CompanionSignals): CompanionState {
  if (
    !config.enabled ||
    (config.quiet.enabled && quiet(signals.minute, config.quiet.start, config.quiet.end))
  )
    return { kind: "hidden", message: "" };
  const say = (quietLine: string, direct: string, warm: string) =>
    config.tone === "direct" ? direct : config.tone === "quiet" ? quietLine : warm;
  if (signals.syncError)
    return {
      kind: "sync",
      message: "Sync needs your attention. Your local changes are still on this device.",
      action: { label: "Open settings", to: "/settings" },
    };
  if (signals.offline)
    return {
      kind: "sync",
      message: "You’re offline. Keep going—changes will wait safely on this device.",
    };
  if (signals.activeWorkout && config.modules.includes("training"))
    return {
      kind: "active_workout",
      message: say(
        "One controlled set at a time.",
        "Finish the set you’re on.",
        "You’ve got this set.",
      ),
      action: { label: "Continue workout", to: "/train/session" },
    };
  if (
    (signals.milestone || signals.workoutCompleted) &&
    config.celebration !== "off" &&
    config.modules.includes("training")
  )
    return {
      kind: "celebrate",
      message: say(
        "Session complete.",
        "Session done. Recover next.",
        "That session counts. Recover well.",
      ),
    };
  if (signals.workoutPlanned && config.modules.includes("training"))
    return {
      kind: "planned_workout",
      message: "Your next workout is already in the plan.",
      action: { label: "Open Training", to: "/train" },
    };
  if (signals.mealPlanning && config.modules.includes("nutrition"))
    return {
      kind: "meal_plan",
      message: "A small meal-planning step can make the week easier.",
      action: { label: "Open Nutrition", to: "/food" },
    };
  if (signals.focusPlanned && config.modules.includes("mind"))
    return {
      kind: "focus",
      message: "Your focus block is ready when you are.",
      action: { label: "Open Mind", to: "/mind" },
    };
  if (signals.recoveryDay)
    return { kind: "recovery", message: "A quieter day is still part of the plan." };
  return { kind: "idle", message: "Your plan is here when you need it." };
}
