import "./buddy.css";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { STATE_META } from "@/domain/buddy/state";
import { canSpeak, speak, stopSpeaking } from "@/lib/buddy-audio";
import { webHaptics } from "@/lib/haptics";
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
  const capability = webHaptics.capability();
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
          size={56}
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
      {capability !== "none" && !config.hapticsAsked && !config.haptics && (
        <div className="buddy-ask" role="group" aria-label="Haptic feedback">
          <p>Want a light buzz when you tap things, log a set or finish a rest?</p>
          <div>
            <button type="button" onClick={() => b.toggleHaptics(true)}>
              Yes, buzz
            </button>
            <button type="button" onClick={() => b.toggleHaptics(false)}>
              No thanks
            </button>
          </div>
        </div>
      )}
      <div className="buddy-controls" role="group" aria-label={`${config.name} controls`}>
        <button
          type="button"
          aria-pressed={config.haptics}
          disabled={capability === "none"}
          title={
            capability === "none" ? "This browser can't vibrate (iOS Safari can't)." : undefined
          }
          onClick={() => b.toggleHaptics(!config.haptics)}
        >
          {capability === "none"
            ? "Haptics unavailable"
            : config.haptics
              ? "Haptics on"
              : "Haptics off"}
        </button>
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
