import "./buddy.css";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { STATE_META } from "@/domain/buddy/state";
import { canSpeak, speak, stopSpeaking } from "@/lib/buddy-audio";
import { BuddyCharacter } from "./BuddyCharacter";
import { useBuddyDock } from "./buddy-context";
import { MirrorToday } from "./MirrorCard";

const hour = 60 * 60_000;

/** The expanded guidance panel. Rendered in flow (mobile sheet above the tab bar, desktop third column). */
export function BuddyPanel({ className }: { className?: string }) {
  const b = useBuddyDock();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (b?.open) ref.current?.focus();
  }, [b?.open]);
  if (!b || !b.open) return null;
  const { config, brief, state } = b;
  const mirror = ["today", "workout_ready", "workout_done", "missed"].includes(brief.scene);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={`${config.name} on this screen`}
      className={`buddy-panel${className ? ` ${className}` : ""}`}
      data-testid="buddy-panel"
    >
      <div className="buddy-panel-head">
        <BuddyCharacter
          variant={config.variant}
          state={state}
          motion={b.motion}
          palette={config.palette}
          expression={config.expression}
          size={52}
          decorative
        />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{config.name}</p>
          <p className="buddy-panel-state">{STATE_META[state].label}</p>
        </div>
        <button
          type="button"
          className="buddy-x"
          onClick={() => b.setOpen(false)}
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
      {mirror ? <MirrorToday /> : null}
      {brief.action && (
        <Link to={brief.action.to} className="buddy-action">
          {brief.action.label} →
        </Link>
      )}
      <div className="buddy-controls" role="group" aria-label={`${config.name} controls`}>
        <button type="button" onClick={() => b.snooze(4 * hour)}>
          Snooze 4h
        </button>
        <button type="button" onClick={b.hideToday}>
          Hide today
        </button>
        <button type="button" aria-pressed={config.muted} onClick={b.toggleMute}>
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
  );
}

/** Mobile: a slim in-flow bar inside the shell's reserved bottom stack. Never floats over content. */
export function BuddyBar() {
  const b = useBuddyDock();
  if (!b || b.mode !== "bar" || b.asleep) return null;
  const { config } = b;
  return (
    <div className="buddy-bar" data-side={config.placement === "dock_left" ? "left" : "right"}>
      <button
        type="button"
        className="buddy-bar-char"
        aria-expanded={b.open}
        aria-label={`${config.name}: ${STATE_META[b.state].label}. ${b.open ? "Close" : "Open"} companion`}
        onClick={() => b.setOpen(!b.open)}
      >
        <BuddyCharacter
          variant={config.variant}
          state={b.state}
          motion={b.motion}
          palette={config.palette}
          expression={config.expression}
          size={38}
          decorative
        />
      </button>
      <button
        type="button"
        className="buddy-bar-line"
        aria-expanded={b.open}
        onClick={() => b.setOpen(!b.open)}
      >
        <span className="eyebrow block">{config.name}</span>
        <span className="buddy-bar-text">{b.line}</span>
      </button>
    </div>
  );
}

/** Mobile header button: wakes a snoozed Buddy or opens an on-demand one. */
export function BuddyHeaderButton() {
  const b = useBuddyDock();
  if (!b || b.mode === "none" || !(b.asleep || b.mode === "demand")) return null;
  const { config } = b;
  const label = b.asleep ? `Wake ${config.name}` : `Open ${config.name}`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={b.asleep ? undefined : b.open}
      onClick={() => (b.asleep ? b.wake() : b.setOpen(!b.open))}
      className="inline-flex size-[44px] items-center justify-center rounded-full hover:bg-surface-2"
    >
      <BuddyCharacter
        variant={config.variant}
        state={b.asleep ? "rest" : "idle"}
        motion="off"
        palette={config.palette}
        size={30}
        decorative
      />
    </button>
  );
}

/** Desktop: Buddy lives in the sidebar rail, so it takes its own space instead of covering content. */
export function BuddyRail() {
  const b = useBuddyDock();
  if (!b || b.mode === "none") return null;
  const { config } = b;
  if (b.asleep)
    return (
      <div className="buddy-rail" data-mode="asleep">
        <button type="button" className="buddy-rail-wake" onClick={b.wake}>
          <BuddyCharacter
            variant={config.variant}
            state="rest"
            motion="off"
            palette={config.palette}
            size={36}
            decorative
          />
          <span>Wake {config.name}</span>
        </button>
      </div>
    );
  const demand = b.mode === "demand";
  return (
    <div className="buddy-rail" data-mode={demand ? "demand" : "bar"}>
      <button
        type="button"
        className="buddy-rail-char"
        aria-expanded={b.open}
        aria-label={`${config.name}: ${STATE_META[b.state].label}. ${b.open ? "Close" : "Open"} companion`}
        onClick={() => b.setOpen(!b.open)}
      >
        <BuddyCharacter
          variant={config.variant}
          state={b.state}
          motion={b.motion}
          palette={config.palette}
          expression={config.expression}
          size={demand ? 48 : 72}
          decorative
        />
      </button>
      {!demand && (
        <button
          type="button"
          className="buddy-rail-line"
          aria-expanded={b.open}
          onClick={() => b.setOpen(!b.open)}
        >
          <span className="eyebrow block">{config.name}</span>
          {b.line}
        </button>
      )}
    </div>
  );
}
