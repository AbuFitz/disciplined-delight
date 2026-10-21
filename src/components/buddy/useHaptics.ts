import { useCallback } from "react";
import { useProfile } from "@/data/hooks";
import { inQuietHours } from "@/domain/buddy/brain";
import { localMinutes } from "@/domain/dates";
import type { HapticKind } from "@/domain/haptics";
import { webHaptics } from "@/lib/haptics";
import { useCompanionConfig } from "./useBuddy";

/**
 * Haptics for the person's own actions and key moments. Enabled only by an explicit setting
 * (Buddy setup or Gym Mode), separate from reduced motion, and held back by mute and quiet hours.
 * Where the device cannot vibrate nothing happens; callers keep their visual feedback.
 */
export function useHaptics() {
  const config = useCompanionConfig();
  const { profile } = useProfile();
  const enabled = config.haptics || !!profile?.gymMode?.haptics;
  const tz = profile?.timezone ?? "UTC";
  return useCallback(
    (kind: HapticKind, passive = false) =>
      webHaptics.play(
        kind,
        {
          enabled,
          muted: config.muted,
          quietHours: inQuietHours(config, localMinutes(Date.now(), tz)),
        },
        passive,
      ),
    [enabled, config, tz],
  );
}
