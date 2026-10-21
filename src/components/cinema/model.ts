/**
 * Ambient Athletic Cinema: shared state, content and timing for the Today -> Gym -> assistant adaptation prototype.
 * Every change is an action and autoplay is a list of timed actions, so seeking and screenshots are a pure fold.
 */
export type Ready = "fresh" | "okay" | "tired";
export type Scene = "arrive" | "ready" | "now" | "enter" | "gym" | "rest" | "story";
export type Assist = "closed" | "listening" | "preview" | "applied";
export type HapticEvent = "selection" | "acknowledge" | "set_logged" | "rest_finished";

/** How fully the Dayline is charged by each readiness answer. */
export const CHARGE: Record<Ready, number> = { fresh: 1, okay: 0.66, tired: 0.34 };

export const SCENES: { id: Scene; label: string }[] = [
  { id: "arrive", label: "Arrive" },
  { id: "ready", label: "Readiness" },
  { id: "now", label: "Now" },
  { id: "enter", label: "Enter Gym Mode" },
  { id: "gym", label: "Set" },
  { id: "rest", label: "Rest" },
  { id: "story", label: "Story and recovery" },
];

export const COPY = {
  date: "Wednesday 21 October",
  greeting: ["Good morning,", "Sam."],
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
  meta30: "4 exercises · about 30 min",
  begin: "Begin",
  gym: {
    exercise: "Seated cable row",
    swapped: "Dumbbell one-arm row",
    set: "Set 1 of 3",
    load: "62.5",
    swappedLoad: "24",
    unit: "kg",
    reps: "8",
    swappedReps: "10",
    repsUnit: "reps",
    done: "Done",
    cue: "Pull to the ribs. Pause. Control the return.",
    swappedCue: "Brace on the bench. Elbow to the hip. Slow return.",
  },
  assistant: {
    name: "Assistant",
    invoke: "Ask",
    placeholder: "Tell me what changed",
    command: "I only have 30 minutes and this machine is busy",
    listening: "Listening",
    previewTitle: "Rewrite today's session",
    summary: "45 → 30 min",
    rows: [
      {
        id: "row",
        kind: "swap" as const,
        from: "Seated cable row",
        to: "Dumbbell one-arm row",
        why: "Machine busy",
      },
      { id: "pull", kind: "keep" as const, from: "Lat pulldown", to: "Lat pulldown", why: "" },
      {
        id: "chest",
        kind: "keep" as const,
        from: "Chest-supported row",
        to: "Chest-supported row",
        why: "",
      },
      { id: "hammer", kind: "drop" as const, from: "Hammer curl", to: "", why: "To fit 30 min" },
      { id: "cable", kind: "drop" as const, from: "Cable curl", to: "", why: "To fit 30 min" },
    ],
    confirm: "Confirm",
    cancel: "Not now",
    applied: "Session rewritten: 30 min",
    undo: "Undo",
  },
  rest: { label: "Rest", seconds: 90, logged: "Set 1 logged", next: "Next: set 2 of 3" },
  finish: "Finish",
  story: {
    title: "Session complete",
    metrics: [
      { label: "Exercises", value: "4" },
      { label: "Sets", value: "9" },
      { label: "Time", value: "29", unit: "min" },
    ],
    adapted: "Adapted from 45 to 30 min, as you asked.",
    recovery: "Recovery starts now. Nothing more is asked of you today.",
  },
} as const;

export type State = {
  scene: Scene;
  ready: Ready | null;
  assist: Assist;
  typed: number;
  applied: boolean;
  undoOpen: boolean;
  setDone: boolean;
  /** increments to trigger one energy pulse along the path */
  pulse: number;
  restDone: boolean;
  event: { n: number; kind: HapticEvent; label: string } | null;
};

export type Action =
  | { type: "reset" }
  | { type: "scene"; scene: Scene }
  | { type: "choose"; ready: Ready }
  | { type: "begin" }
  | { type: "invoke" }
  | { type: "type"; n: number }
  | { type: "preview" }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "closeAssist" }
  | { type: "undo" }
  | { type: "dismissUndo" }
  | { type: "doneSet" }
  | { type: "restDone" }
  | { type: "finish" };

export const INITIAL: State = {
  scene: "arrive",
  ready: null,
  assist: "closed",
  typed: 0,
  applied: false,
  undoOpen: false,
  setDone: false,
  pulse: 0,
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
        pulse: s.pulse + 1,
        event: ev(s, "selection", `Readiness ${a.ready}`),
      };
    case "begin":
      return { ...s, scene: "enter", event: ev(s, "acknowledge", "Begin") };
    case "invoke":
      return { ...s, assist: "listening", typed: 0, event: ev(s, "selection", "Assistant") };
    case "type":
      return { ...s, assist: s.assist === "closed" ? "listening" : s.assist, typed: a.n };
    case "preview":
      return { ...s, assist: "preview", typed: COPY.assistant.command.length };
    case "cancel":
      return { ...s, assist: "closed", typed: 0 };
    case "confirm":
      return {
        ...s,
        assist: "applied",
        applied: true,
        undoOpen: true,
        pulse: s.pulse + 1,
        event: ev(s, "acknowledge", "Session rewritten"),
      };
    case "closeAssist":
      return { ...s, assist: "closed" };
    case "undo":
      return { ...s, applied: false, undoOpen: false, event: ev(s, "selection", "Undone") };
    case "dismissUndo":
      return { ...s, undoOpen: false };
    case "doneSet":
      return { ...s, setDone: true, pulse: s.pulse + 1, event: ev(s, "set_logged", "Set logged") };
    case "restDone":
      return {
        ...s,
        restDone: true,
        pulse: s.pulse + 1,
        event: ev(s, "rest_finished", "Rest finished"),
      };
    case "finish":
      return { ...s, scene: "story", undoOpen: false, event: ev(s, "acknowledge", "Finish") };
  }
}

const TYPE_START = 10_800;
const TYPE_STEP = 40;
/** The autoplay: every beat is an action at a time (ms). */
export const SCHEDULE: { at: number; action: Action }[] = [
  { at: 0, action: { type: "reset" } },
  { at: 2_700, action: { type: "scene", scene: "ready" } },
  { at: 4_600, action: { type: "choose", ready: "okay" } },
  { at: 6_300, action: { type: "scene", scene: "now" } },
  { at: 8_200, action: { type: "begin" } },
  { at: 9_900, action: { type: "scene", scene: "gym" } },
  { at: 10_500, action: { type: "invoke" } },
  ...Array.from({ length: COPY.assistant.command.length }, (_, i) => ({
    at: TYPE_START + i * TYPE_STEP,
    action: { type: "type", n: i + 1 } as Action,
  })),
  { at: 13_200, action: { type: "preview" } },
  { at: 15_600, action: { type: "confirm" } },
  { at: 17_000, action: { type: "closeAssist" } },
  { at: 18_000, action: { type: "doneSet" } },
  { at: 18_900, action: { type: "scene", scene: "rest" } },
  { at: 21_100, action: { type: "restDone" } },
  { at: 21_800, action: { type: "finish" } },
];
export const DURATION = 26_500;

export function stateAt(t: number): State {
  let s = INITIAL;
  for (const step of SCHEDULE) if (step.at <= t) s = reduce(s, step.action);
  return s;
}

/** Which Dayline node is the current moment. */
export const NODE_FOR_SCENE: Record<Scene, number> = {
  arrive: 0,
  ready: 0,
  now: 2,
  enter: 2,
  gym: 2,
  rest: 2,
  story: 3,
};

/** Node positions along the Dayline path, in the path's 100 x 34 coordinate space. */
export const PATH_D = "M5 28 C18 28 20 12 34 12 S52 26 64 22 S84 8 95 6";
export const NODES: [number, number][] = [
  [8.09, 27.67],
  [36.61, 12.17],
  [66.29, 21.15],
  [92.1, 6.72],
];
