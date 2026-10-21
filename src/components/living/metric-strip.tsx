import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./living.css";

export type Metric = {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Change versus a stated baseline, as text. Never colour alone. */
  delta?: string;
  /** "unknown" shows a dash: not logged is unknown, not zero. */
  state?: "known" | "unknown";
};

/** A row of telemetry: mono figures, small labels, hairline separators, no boxes. Wraps to two columns when narrow. */
export function MetricStrip({
  metrics,
  label,
  className,
}: {
  metrics: Metric[];
  label?: string;
  className?: string;
}) {
  return (
    <dl className={cn("lv-metrics", className)} aria-label={label}>
      {metrics.map((m) => (
        <div key={m.label} className="lv-metric" data-state={m.state ?? "known"}>
          <dd>
            <span className="lv-metric-value">{m.state === "unknown" ? "—" : m.value}</span>
            {m.unit && m.state !== "unknown" && <span className="lv-metric-unit">{m.unit}</span>}
            {m.delta && <span className="lv-metric-delta block">{m.delta}</span>}
          </dd>
          <dt>{m.label}</dt>
        </div>
      ))}
    </dl>
  );
}
