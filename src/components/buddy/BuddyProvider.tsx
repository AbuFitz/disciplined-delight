import "./buddy.css";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { saveCompanionConfig } from "@/data/companion";
import { put } from "@/data/db";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL } from "@/data/types";
import { shouldSpeak } from "@/domain/buddy/brain";
import { localDate } from "@/domain/dates";
import type { BuddyGuidanceRecord } from "@/domain/companion-guidance";
import { chime, speak } from "@/lib/buddy-audio";
import { webHaptics } from "@/lib/haptics";
import { useHaptics } from "./useHaptics";
import { BuddyDockContext, type BuddyDockValue } from "./buddy-context";
import {
  useBrief,
  useBuddyContext,
  useBuddyMotion,
  useBuddyState,
  useCompanionConfig,
} from "./useBuddy";

const DOCK_ID = "dock";
/** Routes with their own full-screen controls show Buddy inline instead. */
const INLINE_ONLY = ["/train/session", "/onboarding"];

/**
 * Owns Buddy's shell state once, so the mobile bar, desktop rail, header button and panels all
 * read the same brief and animation state. Nothing here positions anything: the shell reserves
 * space for Buddy in its layout, so Buddy never floats over page content.
 */
export function BuddyProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const config = useCompanionConfig();
  const ctx = useBuddyContext();
  const brief = useBrief(config, ctx);
  const { state, signal } = useBuddyState(brief, config.enabled);
  const motion = useBuddyMotion(config);
  const { profile } = useProfile();
  const now = useNow(60_000);
  const records = useCollection<BuddyGuidanceRecord>(COL.buddyGuidance).items;
  const rec = records.find((r) => r.id === DOCK_ID);
  const [open, setOpen] = useState(false);
  const tz = profile?.timezone ?? "UTC";
  const today = localDate(now, tz);
  const asleep =
    !!rec &&
    ((rec.snoozedUntil ?? 0) > now ||
      (!!rec.dismissedAt && localDate(rec.dismissedAt, tz) === today));
  const inlineOnly = INLINE_ONLY.some((p) => loc.pathname.startsWith(p));
  const placed = config.placement === "dock_left" || config.placement === "dock_right";
  const mode: BuddyDockValue["mode"] =
    !config.enabled || inlineOnly || config.placement === "inline" || config.placement === "setup"
      ? "none"
      : placed
        ? "float"
        : "demand";
  const haptic = useHaptics();
  const speaks = shouldSpeak(config, brief);
  const line = speaks ? brief.line : "Tap for help on this screen";

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (mode === "none") setOpen(false);
  }, [mode]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Optional sound: only if the person turned it on, and never while muted or asleep.
  const key = brief.key;
  useEffect(() => {
    if (mode === "none" || config.muted || asleep || !speaks) return;
    if (config.sound === "chime" && (state === "celebrate" || state === "recover"))
      chime(state === "celebrate" ? "win" : "soft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  // Haptics: only a personal best or something that needs attention. Never for coaching text.
  useEffect(() => {
    if (brief.scene === "pr") haptic("personal_best");
    else if (brief.scene === "error") haptic("warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief.scene, key]);
  useEffect(() => {
    if (mode === "none" || config.muted || asleep || !speaks || config.sound !== "voice") return;
    speak(brief.line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = useMemo<BuddyDockValue>(
    () => ({
      config,
      brief,
      state,
      motion,
      mode,
      asleep,
      open,
      setOpen,
      line,
      snooze: (ms) => {
        void put(COL.buddyGuidance, DOCK_ID, {
          id: DOCK_ID,
          snoozedUntil: Date.now() + ms,
        } satisfies BuddyGuidanceRecord);
        setOpen(false);
      },
      hideToday: () => {
        void put(COL.buddyGuidance, DOCK_ID, {
          id: DOCK_ID,
          dismissedAt: Date.now(),
        } satisfies BuddyGuidanceRecord);
        setOpen(false);
      },
      wake: () =>
        void put(COL.buddyGuidance, DOCK_ID, { id: DOCK_ID } satisfies BuddyGuidanceRecord),
      toggleMute: () => void saveCompanionConfig({ ...config, muted: !config.muted }),
      poke: () => {
        signal("poke", true);
        haptic("acknowledge");
        if (config.sound === "chime" && !config.muted) chime("soft");
      },
      toggleHaptics: (on: boolean) => {
        void saveCompanionConfig({ ...config, haptics: on, hapticsAsked: true });
        if (on) webHaptics.play("acknowledge", { enabled: true, muted: false, quietHours: false });
      },
    }),
    [config, brief, state, motion, mode, asleep, open, line, signal, haptic],
  );
  return <BuddyDockContext.Provider value={value}>{children}</BuddyDockContext.Provider>;
}
