import { createContext, useContext } from "react";
import type { BuddyBrief } from "@/domain/buddy/brain";
import type { BuddyState } from "@/domain/buddy/state";
import type { CompanionConfig } from "@/domain/companion";

export type BuddyDockValue = {
  config: CompanionConfig;
  brief: BuddyBrief;
  state: BuddyState;
  motion: "off" | "gentle" | "full";
  /** How Buddy is presented in the shell: a standalone floating character, header-only on demand, or not at all. */
  mode: "float" | "demand" | "none";
  asleep: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** What the bar or rail says. Falls back to a quiet label when frequency or mute says not to speak. */
  line: string;
  snooze: (ms: number) => void;
  hideToday: () => void;
  wake: () => void;
  toggleMute: () => void;
  /** A tap on the companion: delighted reaction, optional haptic and chime. */
  poke: () => void;
  toggleHaptics: (on: boolean) => void;
};

export const BuddyDockContext = createContext<BuddyDockValue | null>(null);
export const useBuddyDock = () => useContext(BuddyDockContext);
