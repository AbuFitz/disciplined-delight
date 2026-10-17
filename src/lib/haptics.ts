import {
  HAPTIC_PATTERNS,
  shouldHaptic,
  type HapticCapability,
  type HapticKind,
  type HapticSettings,
} from "@/domain/haptics";

/**
 * HapticsAdapter. One interface, three back ends:
 *  - native: a registered bridge from an iOS/Android wrapper (see docs/HAPTICS.md)
 *  - vibrate: navigator.vibrate on supported web browsers (Chrome/Android; NOT iOS Safari)
 *  - none: silent. Callers fall back to the visual and optional audio feedback they already show.
 */
export type NativeHaptics = { play: (kind: HapticKind, pattern: number[]) => void };
export interface HapticsAdapter {
  capability(): HapticCapability;
  /** Returns true when a vibration was actually requested. */
  play(kind: HapticKind, settings: HapticSettings, passive?: boolean): boolean;
}

let native: NativeHaptics | undefined;
/** A native wrapper calls this once at startup, e.g. from a Capacitor plugin or WKWebView bridge. */
export const registerNativeHaptics = (impl: NativeHaptics | undefined) => {
  native = impl;
};

const activated = () => {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  return ua ? ua.hasBeenActive : true;
};

export const webHaptics: HapticsAdapter = {
  capability() {
    if (native) return "native";
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function")
      return "vibrate";
    return "none";
  },
  play(kind, settings, passive = false) {
    const capability = this.capability();
    if (!shouldHaptic(settings, kind, { userActivated: activated(), passive }, capability))
      return false;
    const pattern = HAPTIC_PATTERNS[kind];
    try {
      if (capability === "native") native!.play(kind, pattern);
      else navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  },
};
