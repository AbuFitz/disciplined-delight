import type { TrackingType } from "./catalogue";
import type { RecordedSet } from "./progression";

/** What a logged set must contain to count, per tracking type. Legacy exercises have no tracking and behave as weight_reps. */
export function trackingOf(t?: TrackingType): TrackingType {
  return t ?? "weight_reps";
}

export function hasRecord(s: RecordedSet, t?: TrackingType): boolean {
  switch (trackingOf(t)) {
    case "weight_reps":
      return s.weightKg != null;
    case "bodyweight_reps":
      return s.reps != null;
    case "assisted_reps":
      return s.reps != null;
    case "time":
      return s.seconds != null;
    case "distance_time":
      return s.distanceM != null || s.seconds != null;
  }
}

/** Only loaded lifts contribute to volume and to weight progression. Bodyweight, timed and assisted work never do. */
export function countsTowardVolume(t?: TrackingType) {
  return trackingOf(t) === "weight_reps";
}
export function supportsProgression(t?: TrackingType) {
  return trackingOf(t) === "weight_reps";
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function formatSet(s: RecordedSet, t?: TrackingType): string {
  switch (trackingOf(t)) {
    case "weight_reps":
      return `${s.weightKg} kg × ${s.reps ?? "?"}`;
    case "bodyweight_reps":
      return `${s.reps ?? "?"} reps`;
    case "assisted_reps":
      return `${s.reps ?? "?"} reps${s.assistKg != null ? `, ${s.assistKg} kg assist` : ""}`;
    case "time":
      return formatSeconds(s.seconds ?? 0);
    case "distance_time":
      return [
        s.distanceM != null ? `${(s.distanceM / 1000).toFixed(2)} km` : null,
        s.seconds != null ? formatSeconds(s.seconds) : null,
      ]
        .filter(Boolean)
        .join(" in ");
  }
}
