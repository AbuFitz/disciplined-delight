/**
 * Buddy animation state machine. Pure: components feed it signals and a clock.
 * Every state has a distinct static pose so state is visible with motion off
 * (reduced motion, battery saver, screenshots) and testable without a browser.
 */
export const BUDDY_STATES = [
  "enter",
  "idle",
  "breathe",
  "listen",
  "think",
  "explain",
  "point",
  "encourage",
  "celebrate",
  "recover",
  "rest",
  "error",
  "offline",
  "exit",
] as const;
export type BuddyState = (typeof BUDDY_STATES)[number];

export type Eyes = "open" | "wide" | "happy" | "closed" | "half" | "up" | "side" | "soft";
export type Mouth = "smile" | "grin" | "flat" | "open" | "small" | "soft" | "wavy";
export type Accessory =
  | "none"
  | "waves"
  | "dots"
  | "arrow"
  | "pip"
  | "tally"
  | "dawn"
  | "zzz"
  | "bang"
  | "cloud"
  | "ring";

export type Pose = { eyes: Eyes; mouth: Mouth; accessory: Accessory; lean: number };

export const POSES: Record<BuddyState, Pose> = {
  enter: { eyes: "wide", mouth: "smile", accessory: "none", lean: 0 },
  idle: { eyes: "open", mouth: "small", accessory: "none", lean: 0 },
  breathe: { eyes: "half", mouth: "small", accessory: "ring", lean: 0 },
  listen: { eyes: "wide", mouth: "flat", accessory: "waves", lean: -5 },
  think: { eyes: "up", mouth: "flat", accessory: "dots", lean: 3 },
  explain: { eyes: "open", mouth: "open", accessory: "none", lean: 0 },
  point: { eyes: "side", mouth: "smile", accessory: "arrow", lean: 4 },
  encourage: { eyes: "happy", mouth: "smile", accessory: "pip", lean: 0 },
  celebrate: { eyes: "happy", mouth: "grin", accessory: "tally", lean: 0 },
  recover: { eyes: "soft", mouth: "soft", accessory: "dawn", lean: 0 },
  rest: { eyes: "closed", mouth: "flat", accessory: "zzz", lean: 0 },
  error: { eyes: "wide", mouth: "wavy", accessory: "bang", lean: 0 },
  offline: { eyes: "open", mouth: "flat", accessory: "cloud", lean: 0 },
  exit: { eyes: "happy", mouth: "small", accessory: "none", lean: -4 },
};

type Meta = {
  /** Plain-language label for assistive tech and the setup preview. */
  label: string;
  /** ms before the state settles back to the base state; null holds until replaced. */
  hold: number | null;
  /** Higher priority is never displaced by lower priority while held. */
  priority: 1 | 2 | 3 | 4 | 5;
};
export const STATE_META: Record<BuddyState, Meta> = {
  enter: { label: "arriving", hold: 1100, priority: 1 },
  idle: { label: "standing by", hold: null, priority: 1 },
  breathe: { label: "breathing with you", hold: null, priority: 2 },
  listen: { label: "listening", hold: null, priority: 2 },
  think: { label: "working it out", hold: 4000, priority: 2 },
  explain: { label: "explaining", hold: null, priority: 2 },
  point: { label: "pointing the way", hold: 4200, priority: 2 },
  encourage: { label: "encouraging", hold: 3000, priority: 2 },
  celebrate: { label: "celebrating", hold: 4200, priority: 4 },
  recover: { label: "welcoming you back", hold: 4200, priority: 3 },
  rest: { label: "sleeping", hold: null, priority: 1 },
  error: { label: "asking for help", hold: null, priority: 5 },
  offline: { label: "offline, saving on this device", hold: null, priority: 1 },
  exit: { label: "waving goodbye", hold: 600, priority: 1 },
};

export type BuddyModel = {
  state: BuddyState;
  /** State to settle back to when a transient state ends. */
  base: BuddyState;
  since: number;
  until: number | null;
};

export const initialModel = (now: number, base: BuddyState = "idle"): BuddyModel => ({
  state: "enter",
  base,
  since: now,
  until: now + (STATE_META.enter.hold ?? 0),
});

export type BuddyAction =
  | { type: "signal"; state: BuddyState; now: number; force?: boolean }
  | { type: "base"; base: BuddyState; now: number }
  | { type: "tick"; now: number };

const heldAt = (model: BuddyModel, now: number) => model.until === null || now < model.until;

export function reduce(model: BuddyModel, action: BuddyAction): BuddyModel {
  switch (action.type) {
    case "tick": {
      if (model.until === null || action.now < model.until) return model;
      return { ...model, state: model.base, since: action.now, until: null };
    }
    case "base": {
      const next = { ...model, base: action.base };
      // A held non-transient base state follows the base; a transient one finishes first.
      if (
        model.state === model.base ||
        (model.until === null && STATE_META[model.state].priority <= 1)
      )
        return { ...next, state: action.base, since: action.now, until: null };
      return next;
    }
    case "signal": {
      const incoming = STATE_META[action.state];
      const holding = heldAt(model, action.now) && model.state !== model.base;
      if (
        !action.force &&
        holding &&
        STATE_META[model.state].priority > incoming.priority &&
        model.state !== action.state
      )
        return model;
      if (model.state === action.state && model.until === null && incoming.hold === null)
        return model;
      return {
        ...model,
        state: action.state,
        since: action.now,
        until: incoming.hold === null ? null : action.now + incoming.hold,
      };
    }
  }
}

/** Whether to animate: reduced-motion preference always wins over the saved setting. */
export function effectiveMotion(
  setting: "off" | "gentle" | "full",
  prefersReduced: boolean,
): "off" | "gentle" | "full" {
  return prefersReduced ? "off" : setting;
}

/** Unique signature of a pose, used to prove every state looks different. */
export const poseSignature = (state: BuddyState) => {
  const p = POSES[state];
  return [p.eyes, p.mouth, p.accessory, p.lean].join("|");
};
