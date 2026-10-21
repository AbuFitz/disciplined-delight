import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { NODES, PATH_D } from "./model";
import "./cinema.css";
import "./app.css";

export type EnergyNode = { id: string; label: string; value?: string };
const PROGRESS = [0.03, 0.36, 0.68, 0.97];

/**
 * The Dayline as an energy path: readiness, plan, now and recovery along one luminous lane. The head sits on the
 * current moment; the lane behind it is lit; the lane ahead glows in proportion to `charge`. The labels are a tab
 * list: the selected moment owns the panel passed as children.
 */
export function DaylineEnergy({
  nodes,
  node,
  charge,
  selectedId,
  onSelect,
  label = "Your day",
  children,
}: {
  nodes: EnergyNode[];
  node: number;
  charge: number;
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
  children?: ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hx, hy] = NODES[node]!;
  const move = (e: KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % nodes.length
        : e.key === "ArrowLeft"
          ? (i - 1 + nodes.length) % nodes.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? nodes.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(nodes[next]!.id);
    refs.current[nodes[next]!.id]?.focus();
  };
  return (
    <div
      className="cn-dl"
      style={
        {
          "--charge": charge.toFixed(3),
          "--progress": PROGRESS[node],
          "--node": node,
        } as CSSProperties
      }
    >
      <div className="cn-pathbox">
        <svg viewBox="0 0 100 34" className="cn-path" aria-hidden>
          <defs>
            <linearGradient id={`${uid}-e`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className="cn-e-0" />
              <stop offset="0.55" className="cn-e-1" />
              <stop offset="1" className="cn-e-2" />
            </linearGradient>
          </defs>
          <path className="cn-lane" d={PATH_D} />
          <path className="cn-ahead cn-ahead-glow" d={PATH_D} />
          <path className="cn-ahead" d={PATH_D} />
          <path
            className="cn-behind cn-behind-glow"
            d={PATH_D}
            pathLength={100}
            stroke={`url(#${uid}-e)`}
          />
          <path className="cn-behind" d={PATH_D} pathLength={100} stroke={`url(#${uid}-e)`} />
          {NODES.map(([x, y], i) => (
            <g
              key={i}
              className="cn-node"
              data-state={i < node ? "done" : i === node ? "current" : "next"}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <circle className="cn-node-halo" r="3.4" />
              <circle className="cn-node-dot" r="1.5" />
            </g>
          ))}
          <g className="cn-head" style={{ transform: `translate(${hx}px, ${hy}px)` }}>
            <circle className="cn-head-halo" r="4.6" />
            <circle className="cn-head-core" r="1.9" />
          </g>
        </svg>
        <div className="cn-labels cn-labels-tabs" role="tablist" aria-label={label}>
          {nodes.map((n, i) => (
            <button
              key={n.id}
              id={`${uid}-tab-${n.id}`}
              ref={(el) => {
                refs.current[n.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={n.id === selectedId}
              aria-controls={children !== undefined ? `${uid}-panel` : undefined}
              tabIndex={n.id === selectedId ? 0 : -1}
              data-state={i < node ? "done" : i === node ? "current" : "next"}
              data-align={i === 0 ? "start" : i === nodes.length - 1 ? "end" : "mid"}
              style={{ left: `${NODES[i]![0]}%` }}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => move(e, i)}
            >
              <span className="cn-lab">{n.label}</span>
              <span className="cn-val">{n.value}</span>
            </button>
          ))}
        </div>
      </div>
      {children !== undefined && (
        <div
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${selectedId}`}
          className="cn-dl-panel"
        >
          {children}
        </div>
      )}
    </div>
  );
}
