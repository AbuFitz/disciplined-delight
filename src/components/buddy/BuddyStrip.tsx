import "./buddy.css";
import { BuddyCharacter } from "./BuddyCharacter";
import {
  useBrief,
  useBuddyContext,
  useBuddyMotion,
  useBuddyState,
  useCompanionConfig,
} from "./useBuddy";

/**
 * Buddy inside a full-screen surface (Gym Mode, active workout): same brain and state machine
 * as the floating dock, laid out in the flow so it can never cover a control.
 */
export function BuddyStrip({ className }: { className?: string }) {
  const config = useCompanionConfig();
  const ctx = useBuddyContext();
  const brief = useBrief(config, ctx);
  const state = useBuddyState(brief, config.enabled);
  const motion = useBuddyMotion(config);
  if (!config.enabled || config.placement === "on_demand") return null;
  return (
    <div
      className={`buddy-strip${className ? ` ${className}` : ""}`}
      data-testid="buddy-strip"
      data-scene={brief.scene}
      role="status"
      aria-label={`${config.name}: ${brief.line}`}
    >
      <BuddyCharacter
        variant={config.variant}
        state={state}
        motion={motion}
        palette={config.palette}
        expression={config.expression}
        size={68}
        name={config.name}
      />
      <p className="buddy-strip-line">
        <span className="eyebrow block">{config.name}</span>
        {brief.line}
      </p>
    </div>
  );
}
