import { Link, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { put } from "@/data/db";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL } from "@/data/types";
import type { BuddyGuidanceRecord } from "@/domain/companion-guidance";
import { shouldSpeak } from "@/domain/buddy/brain";
import { STATE_META } from "@/domain/buddy/state";
import { localDate } from "@/domain/dates";
import { canSpeak, chime, speak, stopSpeaking } from "@/lib/buddy-audio";
import { saveCompanionConfig } from "@/data/companion";
import { BuddyCharacter } from "./BuddyCharacter";
import { MirrorToday } from "./MirrorCard";
import {
  useBrief,
  useBuddyContext,
  useBuddyMotion,
  useBuddyState,
  useCompanionConfig,
} from "./useBuddy";

const DOCK_ID = "dock";
const hour = 60 * 60_000;

/**
 * Keep the dock clear of anything marked data-dock-avoid (tab bar, resume bar, bottom action
 * bars). Measures real rectangles so it holds at any width, text size or safe-area inset.
 */
function useDockClearance(ref: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  const frame = useRef(0);
  const measure = useCallback(() => {
    const dock = ref.current;
    if (!dock) return;
    dock.style.setProperty("--dock-lift", "0px");
    const box = dock.getBoundingClientRect();
    const vh = window.innerHeight;
    let lift = 0;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-dock-avoid]"));
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(el).display === "none") continue;
        const top = box.top - lift;
        const bottom = box.bottom - lift;
        const overlapsX = r.left < box.right && r.right > box.left;
        const overlapsY = r.top < bottom && r.bottom > top;
        if (overlapsX && overlapsY) {
          const needed = box.bottom - r.top + 8;
          if (needed > lift) {
            lift = needed;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    dock.style.setProperty("--dock-lift", `${Math.max(0, Math.min(lift, vh * 0.5))}px`);
  }, [ref]);
  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);
  useLayoutEffect(() => {
    schedule();
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "style"],
    });
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, ...deps]);
}

function useTypingFocus() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const on = (e: FocusEvent) =>
      setTyping(
        !!(e.target as HTMLElement)?.matches?.(
          "input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select",
        ),
      );
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);
  return typing;
}

/** Routes with their own full-screen controls show Buddy inline instead of floating. */
const INLINE_ONLY = ["/train/session", "/onboarding"];

export function BuddyDock() {
  const loc = useLocation();
  const config = useCompanionConfig();
  const ctx = useBuddyContext();
  const brief = useBrief(config, ctx);
  const state = useBuddyState(brief, config.enabled);
  const motion = useBuddyMotion(config);
  const { profile } = useProfile();
  const now = useNow(60_000);
  const records = useCollection<BuddyGuidanceRecord>(COL.buddyGuidance).items;
  const rec = records.find((r) => r.id === DOCK_ID);
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const typing = useTypingFocus();
  const dockRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const tz = profile?.timezone ?? "UTC";
  const today = localDate(now, tz);
  const asleep =
    !!rec &&
    ((rec.snoozedUntil ?? 0) > now ||
      (rec.dismissedAt && localDate(rec.dismissedAt, tz) === today));
  const hiddenByRoute = INLINE_ONLY.some((p) => loc.pathname.startsWith(p));
  const floating =
    config.enabled &&
    !hiddenByRoute &&
    config.placement !== "inline" &&
    config.placement !== "setup";

  // Bubble: speak up when the brief changes, according to frequency, mute and snooze.
  const key = brief.key;
  useEffect(() => {
    setBubble(null);
    if (!floating || asleep || open) return;
    if (!shouldSpeak(config, brief)) return;
    setBubble(brief.line);
    const id = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, floating, asleep, open]);

  // Optional sound: only if the person turned it on, and never while muted.
  useEffect(() => {
    if (!floating || config.muted || asleep) return;
    if (config.sound === "chime" && (state === "celebrate" || state === "recover"))
      chime(state === "celebrate" ? "win" : "soft");
    if (config.sound === "voice" && bubble) speak(bubble);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, bubble]);

  useDockClearance(dockRef, [open, bubble, floating, asleep, loc.pathname, typing]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => setOpen(false), [loc.pathname]);

  if (!floating || typing) return null;
  const snooze = (ms: number) => {
    void put(COL.buddyGuidance, DOCK_ID, {
      id: DOCK_ID,
      snoozedUntil: Date.now() + ms,
    } satisfies BuddyGuidanceRecord);
    setOpen(false);
    setBubble(null);
  };
  const hideToday = () => {
    void put(COL.buddyGuidance, DOCK_ID, {
      id: DOCK_ID,
      dismissedAt: Date.now(),
    } satisfies BuddyGuidanceRecord);
    setOpen(false);
    setBubble(null);
  };
  const wake = () =>
    void put(COL.buddyGuidance, DOCK_ID, { id: DOCK_ID } satisfies BuddyGuidanceRecord);
  const side = config.placement === "dock_left" ? "left" : "right";
  const live = brief.state === "error" ? "assertive" : "polite";

  if (asleep)
    return (
      <aside
        ref={dockRef}
        className="buddy-dock"
        data-side={side}
        data-mode="peek"
        aria-label={`${config.name}, snoozed`}
      >
        <button
          type="button"
          className="buddy-peek"
          onClick={wake}
          aria-label={`Wake ${config.name}`}
        >
          <BuddyCharacter
            form={config.form}
            state="rest"
            motion="off"
            palette={config.palette}
            size={34}
            decorative
          />
          <span className="buddy-peek-label">Wake {config.name}</span>
        </button>
      </aside>
    );

  const compact = config.placement === "on_demand";
  return (
    <aside
      ref={dockRef}
      className="buddy-dock"
      data-side={side}
      data-mode={open ? "open" : compact ? "compact" : "closed"}
      aria-label={`${config.name}, your companion`}
    >
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          tabIndex={-1}
          role="region"
          aria-label={`${config.name} on this screen`}
          className="buddy-panel"
        >
          <div className="buddy-panel-head">
            <div className="min-w-0">
              <p className="eyebrow">{config.name}</p>
              <p className="buddy-panel-state">{STATE_META[state].label}</p>
            </div>
            <button
              type="button"
              className="buddy-x"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label={`Close ${config.name}`}
            >
              ×
            </button>
          </div>
          <p className="buddy-panel-line">{brief.line}</p>
          <p className="buddy-panel-body">{brief.body}</p>
          {brief.tips.length > 0 && (
            <ul className="buddy-tips">
              {brief.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          {brief.scene === "today" ||
          brief.scene === "workout_ready" ||
          brief.scene === "workout_done" ||
          brief.scene === "missed" ? (
            <MirrorToday />
          ) : null}
          {brief.action && (
            <Link to={brief.action.to} className="buddy-action">
              {brief.action.label} →
            </Link>
          )}
          <div className="buddy-controls" role="group" aria-label={`${config.name} controls`}>
            <button type="button" onClick={() => snooze(4 * hour)}>
              Snooze 4h
            </button>
            <button type="button" onClick={hideToday}>
              Hide today
            </button>
            <button
              type="button"
              aria-pressed={config.muted}
              onClick={() => void saveCompanionConfig({ ...config, muted: !config.muted })}
            >
              {config.muted ? "Unmute" : "Mute"}
            </button>
            {canSpeak() && (
              <button
                type="button"
                onClick={() => speak(`${brief.line} ${brief.body}`)}
                onBlur={stopSpeaking}
              >
                Read aloud
              </button>
            )}
            <Link to="/settings" hash="companion">
              Buddy settings
            </Link>
            <Link to="/settings" hash="feedback">
              Report a problem
            </Link>
          </div>
        </div>
      )}
      {!open && bubble && !compact && (
        <button
          type="button"
          className="buddy-bubble"
          onClick={() => {
            setBubble(null);
            setOpen(true);
          }}
          aria-label={`${config.name} says: ${bubble}. Open details`}
        >
          <span aria-hidden>{bubble}</span>
        </button>
      )}
      <div className="sr-only" aria-live={live} role="status">
        {bubble ?? ""}
      </div>
      <button
        ref={buttonRef}
        type="button"
        className="buddy-hit"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${config.name}: ${STATE_META[state].label}. ${open ? "Close" : "Open"} companion`}
        onClick={() => {
          setBubble(null);
          setOpen((v) => !v);
        }}
      >
        <BuddyCharacter
          form={config.form}
          state={state}
          motion={motion}
          palette={config.palette}
          expression={config.expression}
          size={compact ? 48 : 68}
          decorative
        />
      </button>
    </aside>
  );
}
