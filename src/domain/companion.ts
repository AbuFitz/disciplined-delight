import type { AppModule } from "@/data/types";

export type CompanionConfig = {
  id: "main";
  enabled: boolean;
  name: string;
  form: "orb" | "totem" | "spark";
  palette: "mint" | "amber" | "violet";
  expression: "calm" | "bright" | "focused";
  tone: "quiet" | "direct" | "warm";
  energy: "low" | "medium" | "high";
  frequency: "minimal" | "balanced" | "active";
  celebration: "off" | "subtle" | "full";
  motion: "off" | "gentle" | "full";
  placement: "setup" | "dashboard" | "on_demand";
  quiet: { enabled: boolean; start: string; end: string };
  modules: AppModule[];
  privacy: "status_only";
};
export const DEFAULT_COMPANION: CompanionConfig = {
  id: "main",
  enabled: false,
  name: "Buddy",
  form: "orb",
  palette: "mint",
  expression: "calm",
  tone: "warm",
  energy: "medium",
  frequency: "balanced",
  celebration: "subtle",
  motion: "gentle",
  placement: "dashboard",
  quiet: { enabled: true, start: "21:30", end: "07:30" },
  modules: ["training", "nutrition", "mind", "routines"],
  privacy: "status_only",
};
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
