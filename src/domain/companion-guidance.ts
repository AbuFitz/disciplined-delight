import type { CompanionConfig } from "./companion";

export type BuddyEvent =
  | { kind: "readiness"; score: number; soreness: number; action: string; reason: string }
  | { kind: "adaptation"; exercise: string; reason: string }
  | { kind: "gym_start"; exercise: string }
  | { kind: "first_set"; exercise: string }
  | { kind: "rest"; seconds: number; next: string }
  | { kind: "return_after_gap"; days: number }
  | { kind: "library_saved"; workout: string }
  | { kind: "workout_complete"; completed: number; planned: number }
  | { kind: "missed_session"; nextAction: string };

export type BuddyGuidanceRecord = {
  id: string;
  seenAt?: number;
  dismissedAt?: number;
  snoozedUntil?: number;
};

const priority: Record<BuddyEvent["kind"], 1 | 2 | 3> = {
  readiness: 3,
  adaptation: 3,
  return_after_gap: 3,
  gym_start: 2,
  first_set: 1,
  rest: 1,
  library_saved: 2,
  workout_complete: 2,
  missed_session: 3,
};
const minutes = (value: string) => {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
};
const isQuiet = (config: CompanionConfig, minute: number) => {
  if (!config.quiet.enabled) return false;
  const start = minutes(config.quiet.start),
    end = minutes(config.quiet.end);
  return start <= end ? minute >= start && minute < end : minute >= start || minute < end;
};

export function buddyGuidance(
  config: CompanionConfig,
  event: BuddyEvent,
  record: BuddyGuidanceRecord | undefined,
  now: number,
  minute: number,
  requested = false,
) {
  if (!config.enabled || !config.modules.includes("training") || isQuiet(config, minute))
    return null;
  if (config.placement === "on_demand" && !requested) return null;
  if (record?.dismissedAt || (record?.snoozedUntil ?? 0) > now) return null;
  if (record?.seenAt && now - record.seenAt < 12 * 60 * 60_000) return null;
  const threshold = config.frequency === "minimal" ? 3 : config.frequency === "balanced" ? 2 : 1;
  if (priority[event.kind] < threshold) return null;
  const text = message(event);
  return { id: eventId(event), text, priority: priority[event.kind] };
}

export function eventId(event: BuddyEvent) {
  if (event.kind === "adaptation") return `adaptation:${event.exercise}`;
  if (event.kind === "library_saved") return `library:${event.workout}`;
  return event.kind;
}

function message(event: BuddyEvent) {
  switch (event.kind) {
    case "readiness":
      return `You rated soreness ${event.soreness}/5 and readiness ${event.score}/100. ${event.reason}`;
    case "adaptation":
      return `${event.exercise}: ${event.reason} You choose whether to apply it.`;
    case "gym_start":
      return `Heads-up mode is ready. Start with ${event.exercise}; form media stays on demand.`;
    case "first_set":
      return `First set of ${event.exercise}. Use a load that leaves the planned reps in reserve.`;
    case "rest":
      return `${event.seconds} seconds of rest. Next: ${event.next}.`;
    case "return_after_gap":
      return `${event.days} days since this movement. A conservative restart is available.`;
    case "library_saved":
      return `${event.workout} is saved as an editable copy. Its source version stays attached.`;
    case "workout_complete":
      return `${event.completed} of ${event.planned} planned sets recorded. That is the evidence used next time.`;
    case "missed_session":
      return `Nothing is broken. ${event.nextAction}`;
  }
}
