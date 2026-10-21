import "./journey.css";
import type { ReactNode } from "react";
import { STEP_LABEL, type StepId } from "@/domain/onboarding";

/** A radio or checkbox row. The native input is visually hidden, so keyboard and screen readers get the real control. */
export function Row({
  type = "radio",
  name,
  on,
  onChange,
  title,
  text,
  disabled,
}: {
  type?: "radio" | "checkbox";
  name: string;
  on: boolean;
  onChange: () => void;
  title: string;
  text?: string;
  disabled?: boolean;
}) {
  return (
    <label className="jr-row" data-on={on} data-type={type === "radio" ? "radio" : "check"}>
      <input
        type={type}
        name={name}
        checked={on}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span className="jr-mark" aria-hidden />
      <span className="min-w-0">
        <span className="jr-row-title">{title}</span>
        {text && <span className="jr-row-text">{text}</span>}
      </span>
    </label>
  );
}

export function Chip({
  on,
  onChange,
  children,
  name,
}: {
  on: boolean;
  onChange: () => void;
  children: ReactNode;
  name: string;
}) {
  return (
    <label className="jr-chip" data-on={on}>
      <input type="checkbox" name={name} checked={on} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/** Progress map. Mobile: a row of ticks with a count. Wide screens: a ledger rail with step names. */
export function ProgressMap({ steps, current }: { steps: readonly StepId[]; current: StepId }) {
  const idx = Math.max(0, steps.indexOf(current === "personalise" ? "start" : current));
  const stateOf = (i: number) => (i < idx ? "done" : i === idx ? "current" : "todo");
  return (
    <>
      <div className="jr-map" aria-label="Setup progress">
        <ol className="jr-ticks">
          {steps.map((s, i) => (
            <li
              key={s}
              className="jr-tick"
              data-state={stateOf(i)}
              aria-current={i === idx ? "step" : undefined}
            >
              <span className="sr-only">
                {STEP_LABEL[s]},{" "}
                {stateOf(i) === "done" ? "done" : stateOf(i) === "current" ? "current" : "to do"}
              </span>
            </li>
          ))}
        </ol>
        <p className="jr-count">
          Step {idx + 1} of {steps.length} · {STEP_LABEL[current]}
        </p>
      </div>
      <nav className="jr-rail" aria-label="Setup steps">
        <ol>
          {steps.map((s, i) => (
            <li key={s} data-state={stateOf(i)} aria-current={i === idx ? "step" : undefined}>
              {STEP_LABEL[s]}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
