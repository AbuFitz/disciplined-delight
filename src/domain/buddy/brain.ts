/**
 * Decides what Buddy says and which state it shows for the screen the person is
 * on. Inputs are status signals only; private entry text is never an input.
 * Copy never shames, guilts, diagnoses or presumes faith.
 */
import type { CompanionConfig } from "../companion";
import type { BuddyState } from "./state";

export type BuddyScene =
  | "first_run"
  | "onboarding"
  | "today"
  | "plan_setup"
  | "library"
  | "workout_ready"
  | "readiness"
  | "low_readiness"
  | "next_exercise"
  | "form_cue"
  | "rest"
  | "pr"
  | "workout_done"
  | "missed"
  | "reflection"
  | "help"
  | "empty"
  | "error"
  | "offline"
  | "quiet"
  | "other";

export type BuddyContext = {
  pathname: string;
  minute: number;
  online: boolean;
  syncError: boolean;
  /** True when the person has not been through Buddy setup. */
  needsSetup: boolean;
  session?: {
    resting: boolean;
    next?: string;
    cue?: string;
    doneSets: number;
    totalSets: number;
    readinessAsked: boolean;
    lowReadiness: boolean;
  };
  plannedToday: boolean;
  completedToday: boolean;
  daysSinceLastSession?: number;
  personalBest?: { exercise: string; detail: string };
  mindDoneToday: boolean;
  hasPlan: boolean;
  /** The screen reports that it has nothing to show. */
  empty?: boolean;
};

export type BuddyBrief = {
  scene: BuddyScene;
  state: BuddyState;
  /** Short line shown in the speech bubble. */
  line: string;
  /** Longer explanation for the expanded panel. */
  body: string;
  tips: string[];
  action?: { label: string; to: string };
  /** 1 = ambient, 2 = useful, 3 = important. Frequency setting gates bubbles by this. */
  priority: 1 | 2 | 3;
  /** Changes when the content changes; used to decide when to speak up. */
  key: string;
};

const hm = (value: string) => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};
export function inQuietHours(config: CompanionConfig, minute: number) {
  if (!config.quiet.enabled) return false;
  const a = hm(config.quiet.start),
    b = hm(config.quiet.end);
  return a <= b ? minute >= a && minute < b : minute >= a || minute < b;
}

type Voice = { quiet: string; direct: string; warm: string };
const say = (config: CompanionConfig, v: Voice) => v[config.tone];
const flourish = (config: CompanionConfig, steady: string, playful: string, dry: string) =>
  config.personality === "playful" ? playful : config.personality === "dry" ? dry : steady;

export function sceneFor(ctx: BuddyContext, config: CompanionConfig): BuddyScene {
  if (ctx.syncError) return "error";
  if (!ctx.online) return "offline";
  const p = ctx.pathname;
  if (p.startsWith("/onboarding")) return "onboarding";
  if (p.startsWith("/train/session") && ctx.session) {
    if (ctx.session.lowReadiness) return "low_readiness";
    if (!ctx.session.readinessAsked) return "readiness";
    if (ctx.session.resting) return "rest";
    if (ctx.session.cue) return "form_cue";
    return "next_exercise";
  }
  if (ctx.personalBest && config.celebration !== "off") return "pr";
  if (ctx.completedToday && (p === "/" || p.startsWith("/train"))) return "workout_done";
  if (ctx.empty) return "empty";
  if (p.startsWith("/library")) return "library";
  if (p.startsWith("/train/build") || p.startsWith("/plan") || p.startsWith("/train/plan"))
    return "plan_setup";
  if (p.startsWith("/mind")) return "reflection";
  if (p.startsWith("/settings") || p.startsWith("/help") || p.startsWith("/credits")) return "help";
  if (ctx.needsSetup) return "first_run";
  if (p === "/" || p.startsWith("/train")) {
    if ((ctx.daysSinceLastSession ?? 0) >= 8 && !ctx.plannedToday) return "missed";
    if (ctx.plannedToday) return "workout_ready";
    return "today";
  }
  return "other";
}

export function buddyBrief(ctx: BuddyContext, config: CompanionConfig): BuddyBrief {
  if (inQuietHours(config, ctx.minute) && !ctx.syncError)
    return {
      scene: "quiet",
      state: "rest",
      line: "Resting. Tap to wake me.",
      body: `${config.name} is resting during your quiet hours. Nothing is waiting on you.`,
      tips: ["Quiet hours are yours to set in Buddy settings."],
      priority: 1,
      key: "quiet",
    };
  const scene = sceneFor(ctx, config);
  const s = ctx.session;
  const make = (
    state: BuddyState,
    line: string,
    body: string,
    tips: string[],
    priority: 1 | 2 | 3,
    action?: BuddyBrief["action"],
  ): BuddyBrief => ({ scene, state, line, body, tips, priority, action, key: `${scene}:${line}` });

  switch (scene) {
    case "error":
      return make(
        "error",
        "Sync needs a look.",
        "Your changes are safe on this device. Syncing stopped and needs your attention.",
        ["Nothing you logged is lost.", "Open Settings to see what sync is reporting."],
        3,
        { label: "Open sync settings", to: "/settings" },
      );
    case "offline":
      return make(
        "offline",
        "Offline. Saving here.",
        "No connection right now. Everything you log is stored on this device and will sync later.",
        ["Workouts, meals and notes all keep working offline."],
        2,
      );
    case "onboarding":
      return make(
        "explain",
        say(config, {
          quiet: "Take your time.",
          direct: "Answer what you want. Skip the rest.",
          warm: "No rush. Skip anything and come back later.",
        }),
        "Setup shapes your plan. Every question can be skipped and changed later in Settings.",
        ["Optional areas can be left out entirely.", "Nothing here is shared without your say-so."],
        2,
      );
    case "first_run":
      return make(
        "enter",
        `Hi, I'm ${config.name}. Want me set up your way?`,
        "A short setup lets you choose my look, voice and how often I speak up. You can skip it.",
        ["Takes about a minute.", "Everything stays on this device."],
        3,
        { label: "Set up Buddy", to: "/settings#companion" },
      );
    case "today":
      return make(
        "idle",
        say(config, {
          quiet: "Here when needed.",
          direct: "Pick one thing for today.",
          warm: "One useful step at a time.",
        }),
        "Nothing is scheduled to train today. A walk, a meal plan or a short reflection all count.",
        ["Open Plan to shape the week.", "A quieter day is still part of the plan."],
        1,
      );
    case "workout_ready":
      return make(
        "point",
        say(config, {
          quiet: "Today's session is ready.",
          direct: "Today's session is ready. Start when you are.",
          warm: "Today's session is ready whenever you are.",
        }),
        "A short readiness check-in first lets the plan adapt to how you feel today.",
        ["Gym Mode shows one set at a time.", "You can swap or shorten any exercise."],
        2,
        { label: "Open training", to: "/train" },
      );
    case "missed":
      return make(
        "recover",
        flourish(
          config,
          `Welcome back. Nothing is broken.`,
          `Welcome back! The ledger kept your place.`,
          `You're back. Fine by me.`,
        ),
        `It has been ${ctx.daysSinceLastSession} days since your last session. A lighter restart is available, or pick up exactly where you were.`,
        ["Your history is untouched.", "A conservative first session rebuilds momentum safely."],
        3,
        { label: "See a gentle restart", to: "/train" },
      );
    case "plan_setup":
      return make(
        "explain",
        say(config, {
          quiet: "Start small.",
          direct: "Choose days you can keep.",
          warm: "Pick days you can realistically keep.",
        }),
        "A plan you can keep beats an ambitious one you cannot. Fewer days, done consistently, progresses well.",
        ["Start with the days that are easiest.", "You can regenerate the plan any time."],
        2,
      );
    case "library":
      return make(
        "point",
        "Tap any exercise for illustrated steps.",
        "Each exercise shows credited demonstration images or an original form guide. Neutral cues only; stop if something hurts.",
        [
          "Filter by muscle, equipment or difficulty.",
          "Save a movement or add it to a workout.",
          "Formats are labelled honestly: illustrations are not video.",
        ],
        1,
      );
    case "readiness":
      return make(
        "listen",
        "How are you feeling today?",
        "Five quick sliders. Your answers can adjust today's plan. They are never required.",
        ["Skip it and the plan stays as written.", "Your answers stay on this device."],
        3,
      );
    case "low_readiness":
      return make(
        "encourage",
        say(config, {
          quiet: "A lighter option is ready.",
          direct: "Lighter option ready. Take it or keep the plan.",
          warm: "Low energy is useful information. A lighter option is ready.",
        }),
        "Today's check-in suggests easing off. You choose: lighten the load, trim a set, shorten the session, or keep the plan.",
        [
          "Reducing today supports the next hard session.",
          "This is a training decision, not a medical one.",
        ],
        3,
      );
    case "next_exercise":
      return make(
        "point",
        s?.next ? `Next: ${s.next}` : "Next set when you're ready.",
        `${s?.doneSets ?? 0} of ${s?.totalSets ?? 0} sets recorded. One controlled set at a time.`,
        ["Open Gym Mode for a one-set-at-a-time view.", "Form media stays one tap away."],
        2,
      );
    case "form_cue":
      return make(
        "explain",
        s?.cue ? `Cue: ${s.cue}` : "Check the form guide.",
        "General setup cues only. Stop if you feel pain and choose a different movement.",
        ["Open the form guide for step images.", "Pick the version that suits your equipment."],
        2,
      );
    case "rest":
      return make(
        "breathe",
        s?.next ? `Rest. Next: ${s.next}` : "Rest. Breathe slowly.",
        "Rest is part of the set. Let breathing settle before the next one.",
        ["The rest bar keeps counting when you leave this screen."],
        1,
      );
    case "pr":
      return make(
        "celebrate",
        flourish(
          config,
          `New personal best: ${ctx.personalBest?.exercise}.`,
          `Personal best on ${ctx.personalBest?.exercise}! Tick it off.`,
          `${ctx.personalBest?.exercise}: a new best. Noted.`,
        ),
        `${ctx.personalBest?.detail} That beats your own previous mark.`,
        ["Compared only with your own history."],
        3,
      );
    case "workout_done":
      return make(
        "celebrate",
        flourish(
          config,
          "Session logged. Recover well.",
          "Session in the ledger. Nice one.",
          "Done. Eat, sleep, repeat.",
        ),
        "That session counts, whatever the numbers were. Food, water and sleep do the rest.",
        ["Check Progress to see how today compares with your last time."],
        2,
        { label: "See progress", to: "/progress" },
      );
    case "reflection":
      return make(
        "breathe",
        say(config, {
          quiet: "A minute for yourself?",
          direct: "Take one minute to reflect.",
          warm: ctx.mindDoneToday
            ? "Today's reflection is done."
            : "A minute for yourself, if you want one.",
        }),
        "Reflection is private and optional. Short is fine.",
        ["Entries stay on your device unless you share them."],
        1,
      );
    case "help":
      return make(
        "explain",
        "Want something changed? It's all here.",
        "Everything about how I behave, how the app looks and what is stored is adjustable. Accessibility options sit in Settings too.",
        ["Text size follows your device setting.", "Reduced motion is respected automatically."],
        1,
      );
    case "empty":
      return make(
        "think",
        "Nothing here yet.",
        "This area is empty. Add something small to start it.",
        [],
        1,
      );
    default:
      return make(
        "idle",
        say(config, {
          quiet: "Here if needed.",
          direct: "Ready.",
          warm: "Here when you need me.",
        }),
        "Tap to see what I can help with on this screen.",
        [],
        1,
      );
  }
}

/** Should the dock speak up unprompted for this brief? Muted and frequency settings gate it. */
export function shouldSpeak(config: CompanionConfig, brief: BuddyBrief) {
  if (config.muted || config.placement === "on_demand") return false;
  if (brief.scene === "quiet") return false;
  const threshold = config.frequency === "minimal" ? 3 : config.frequency === "balanced" ? 2 : 1;
  return brief.priority >= threshold;
}
