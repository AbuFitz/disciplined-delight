import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./living.css";

export type DaylineState = "done" | "current" | "next" | "unknown" | "skipped";
export type DaylineNode = {
  id: string;
  label: string;
  /** Short telemetry under the label, for example "Self-report" or "Back & biceps". */
  value?: ReactNode;
  state: DaylineState;
};

/**
 * The signature: one thin rail through readiness, plan, current action and recovery. It is a tab list, so the
 * selected moment owns the Stage below it: pass the Stage as `children` and it is rendered as the tabpanel,
 * wired with aria-controls / aria-labelledby using ids unique to this instance.
 * Horizontal when there is room; vertical when the container is narrow or text is zoomed. Arrow keys move.
 */
export function Dayline({
  nodes,
  selectedId,
  onSelect,
  label = "Your day",
  className,
  children,
}: {
  nodes: DaylineNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
  className?: string;
  /** The selected moment's content (usually a Stage). Rendered as the tabpanel. */
  children?: ReactNode;
}) {
  const uid = useId();
  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = `${uid}-panel`;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastReached = nodes.reduce(
    (acc, n, i) => (n.state === "done" || n.state === "current" ? i : acc),
    -1,
  );
  const move = (e: KeyboardEvent, index: number) => {
    const key = e.key;
    const next =
      key === "ArrowRight" || key === "ArrowDown"
        ? (index + 1) % nodes.length
        : key === "ArrowLeft" || key === "ArrowUp"
          ? (index - 1 + nodes.length) % nodes.length
          : key === "Home"
            ? 0
            : key === "End"
              ? nodes.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const n = nodes[next]!;
    onSelect(n.id);
    refs.current[n.id]?.focus();
  };
  return (
    <div className={cn("lv-dayline", className)}>
      <div role="tablist" aria-label={label} className="lv-dayline-list">
        {nodes.map((n, i) => {
          const selected = n.id === selectedId;
          return (
            <button
              key={n.id}
              id={tabId(n.id)}
              aria-controls={children !== undefined ? panelId : undefined}
              ref={(el) => {
                refs.current[n.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="lv-node"
              data-state={n.state}
              data-reached={i <= lastReached ? "true" : "false"}
              data-last-reached={i === lastReached ? "true" : "false"}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => move(e, i)}
            >
              <span className="lv-dot" aria-hidden />
              <span className="min-w-0">
                <span className="lv-node-label block">{n.label}</span>
                {n.value && <span className="lv-node-value block">{n.value}</span>}
                <span className="sr-only">
                  {n.state === "done"
                    ? ", done"
                    : n.state === "current"
                      ? ", now"
                      : n.state === "skipped"
                        ? ", skipped"
                        : n.state === "unknown"
                          ? ", not recorded"
                          : ", up next"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(selectedId)} className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
}
