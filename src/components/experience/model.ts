/**
 * Experience lab: one shared model so the three prototypes differ only in presentation. Copy, content,
 * state machine and timing are identical, so the experience is judged, not the wording.
 * Every state change is an action; the autoplay schedule is a list of timed actions, so seeking is a pure fold.
 */
export type Ready = "fresh" | "okay" | "tired";
export type SceneId = "arrive" | "readiness" | "adapt" | "now" | "enter" | "set" | "rest";

export const SCENES: { id: SceneId; label: string }[] = [
  { id: "arrive", label: "Arrive" },
  { id: "readiness", label: "Readiness" },
  { id: "adapt", label: "Adapt with Buddy" },
  { id: "now", label: "Now" },
  { id: "enter", label: "Enter Gym Mode" },
  { id: "set", label: "Set" },
  { id: "rest", label: "Rest" },
];

export const COPY = {
  date: "Wednesday 21 October",
  greeting: "Good morning, Sam.",
  dayline: [
    { id: "readiness", label: "Readiness" },
    { id: "plan", label: "Plan" },
    { id: "now", label: "Now" },
    { id: "recovery", label: "Recovery" },
  ],
  question: "How ready do you feel?",
  ready: [
    { id: "fresh" as Ready, label: "Fresh", note: "A full session." },
    { id: "okay" as Ready, label: "Okay", note: "A steady session." },
    { id: "tired" as Ready, label: "Tired", note: "A lighter session." },
  ],
  planTitle: "Back & biceps",
  meta45: "5 exercises · about 45 min",
  meta35: "4 exercises · about 35 min",
  hint: "Short on time?",
  command: "I only have 35 minutes",
  preview: {
    title: "Shorten to 35 minutes",
    lines: ["Drops hammer curl", "Keeps your heaviest sets", "Saves 10 minutes"],
    confirm: "Confirm",
    cancel: "Not now",
  },
  applied: "Shortened to 35 minutes",
  undo: "Undo",
  begin: "Begin",
  gym: {
    exercise: "Seated cable row",
    set: "Set 1 of 3",
    load: "62.5",
    unit: "kg",
    reps: "8",
    repsUnit: "reps",
    done: "Done",
    cue: "Pull to the ribs. Pause. Control the return.",
  },
  rest: {
    label: "Rest",
    seconds: 90,
    logged: "Set 1 logged",
    next: "Next: set 2 of 3",
  },
  recovery: "Tonight",
} as const;

export type State = {
  scene: SceneId;
  ready: Ready | null;
  /** characters of the command typed so far */
  typed: number;
  preview: boolean;
  applied: boolean;
  undoOpen: boolean;
  setDone: boolean;
  restDone: boolean;
  /** latest haptic-worthy event, for the lab's log */
  event: { n: number; kind: HapticEvent; label: string } | null;
};
export type HapticEvent = "selection" | "acknowledge" | "set_logged" | "rest_finished";

export type Action =
  | { type: "scene"; scene: SceneId }
  | { type: "choose"; ready: Ready }
  | { type: "type"; n: number }
  | { type: "preview"; open: boolean }
  | { type: "confirm" }
  | { type: "undo" }
  | { type: "dismissUndo" }
  | { type: "begin" }
  | { type: "set" }
  | { type: "doneSet" }
  | { type: "rest" }
  | { type: "restDone" }
  | { type: "reset" };

export const INITIAL: State = {
  scene: "arrive",
  ready: null,
  typed: 0,
  preview: false,
  applied: false,
  undoOpen: false,
  setDone: false,
  restDone: false,
  event: null,
};

const ev = (s: State, kind: HapticEvent, label: string): State["event"] => ({
  n: (s.event?.n ?? 0) + 1,
  kind,
  label,
});

export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case "reset":
      return INITIAL;
    case "scene":
      return { ...s, scene: a.scene };
    case "choose":
      return {
        ...s,
        ready: a.ready,
        scene: "adapt",
        event: ev(s, "selection", `Ready: ${a.ready}`),
      };
    case "type":
      return { ...s, typed: a.n };
    case "preview":
      return { ...s, preview: a.open, typed: a.open ? COPY.command.length : s.typed };
    case "confirm":
      return {
        ...s,
        preview: false,
        applied: true,
        undoOpen: true,
        scene: "now",
        event: ev(s, "acknowledge", "Shortened to 35 min"),
      };
    case "undo":
      return { ...s, applied: false, undoOpen: false, event: ev(s, "selection", "Undone") };
    case "dismissUndo":
      return { ...s, undoOpen: false };
    case "begin":
      return { ...s, scene: "enter", undoOpen: false, event: ev(s, "acknowledge", "Begin") };
    case "set":
      return { ...s, scene: "set" };
    case "doneSet":
      return { ...s, setDone: true, event: ev(s, "set_logged", "Set logged") };
    case "rest":
      return { ...s, scene: "rest" };
    case "restDone":
      return { ...s, restDone: true, event: ev(s, "rest_finished", "Rest finished") };
  }
}

/** The 15-second autoplay: every beat is an action at a time. */
export const SCHEDULE: { at: number; action: Action }[] = [
  { at: 0, action: { type: "reset" } },
  { at: 2000, action: { type: "scene", scene: "readiness" } },
  { at: 3700, action: { type: "choose", ready: "okay" } },
  ...Array.from({ length: COPY.command.length }, (_, i) => ({
    at: 4900 + i * 45,
    action: { type: "type", n: i + 1 } as Action,
  })),
  { at: 6200, action: { type: "preview", open: true } },
  { at: 7800, action: { type: "confirm" } },
  { at: 9500, action: { type: "begin" } },
  { at: 11300, action: { type: "set" } },
  { at: 12200, action: { type: "doneSet" } },
  { at: 12700, action: { type: "rest" } },
  { at: 14600, action: { type: "restDone" } },
];
export const DURATION = 15500;

/** State at time t: a pure fold, so seeking and screenshots are deterministic. */
export function stateAt(t: number): State {
  let s = INITIAL;
  for (const step of SCHEDULE) if (step.at <= t) s = reduce(s, step.action);
  return s;
}

/** Which Dayline node is the current moment in this scene. */
export const NODE_FOR_SCENE: Record<SceneId, number> = {
  arrive: 0,
  readiness: 0,
  adapt: 1,
  now: 2,
  enter: 2,
  set: 2,
  rest: 3,
};

export const HAPTIC_LABEL: Record<HapticEvent, string> = {
  selection: "tick",
  acknowledge: "tap",
  set_logged: "set logged",
  rest_finished: "rest finished",
};
