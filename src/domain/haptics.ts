/**
 * Haptic policy. Pure, so the rules are unit-tested without a device.
 * Haptics are an independent setting: reduced-motion does not turn them on or off.
 * Passive coaching never vibrates; only acknowledgements of the person's own actions and a
 * few important moments do.
 */
export type HapticKind =
  | "selection"
  | "acknowledge"
  | "set_logged"
  | "rest_finished"
  | "personal_best"
  | "warning";

/** Milliseconds on/off/on... Restrained: short, few pulses. */
export const HAPTIC_PATTERNS: Record<HapticKind, number[]> = {
  selection: [6],
  acknowledge: [10],
  set_logged: [18],
  rest_finished: [30, 60, 30],
  personal_best: [20, 50, 20, 50, 70],
  warning: [60, 50, 60],
};

export type HapticSettings = {
  /** Explicit opt-in. Off by default. */
  enabled: boolean;
  /** Companion mute also silences haptics. */
  muted: boolean;
  quietHours: boolean;
};
export type HapticContext = {
  /** True once the person has interacted with the page (required by browsers). */
  userActivated: boolean;
  /** Triggered by something the person did, or a timer they started, rather than by coaching text. */
  passive: boolean;
};
export type HapticCapability = "native" | "vibrate" | "none";

export function shouldHaptic(
  settings: HapticSettings,
  kind: HapticKind,
  ctx: HapticContext,
  capability: HapticCapability,
): boolean {
  if (capability === "none") return false;
  if (!settings.enabled) return false;
  if (ctx.passive) return false;
  if (!ctx.userActivated && capability === "vibrate") return false;
  // Quiet hours and mute hold back everything except a warning the person must see.
  if ((settings.muted || settings.quietHours) && kind !== "warning") return false;
  return true;
}

/** Where each kind is used, so passive coaching can never be wired to a vibration by accident. */
export const HAPTIC_USES: Record<HapticKind, string> = {
  selection: "A light tick when the person selects, toggles or taps a control",
  acknowledge: "A tap on a primary control the person pressed",
  set_logged: "Completing a set",
  rest_finished: "A rest timer the person started has ended",
  personal_best: "A personal best against the person's own history",
  warning: "Sync needs attention, or an action could not be saved",
};
