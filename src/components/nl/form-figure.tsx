import { solvePose, type FormFrame, type Pose } from "@/domain/form-figure";

const stroke = (w = 3.4) => ({
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});
const line = (pts: [number, number][]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

/** One frame of an original form diagram. Colours come from tokens so it follows the theme and colour world. */
export function FormFigure({
  pose,
  ghost,
  className,
  title,
}: {
  pose: Pose;
  /** The previous step, drawn faintly so the movement reads as a sequence. */
  ghost?: Pose;
  className?: string;
  title?: string;
}) {
  const s = solvePose(pose);
  const g = ghost ? solvePose(ghost) : null;
  return (
    <svg
      viewBox="0 -16 100 116"
      role="img"
      aria-label={title ?? "Form diagram"}
      className={className}
      style={{ color: "var(--foreground)" }}
    >
      <line
        x1="2"
        y1="93"
        x2="98"
        y2="93"
        stroke="currentColor"
        strokeOpacity=".28"
        strokeDasharray="1.5 3"
        strokeWidth="1"
      />
      {g && (
        <g opacity=".16" stroke="currentColor" {...stroke(3)}>
          {g.legs.map((l, i) => (
            <path key={i} d={line([g.hip, l.knee, l.ankle, l.toe])} />
          ))}
          <path d={line([g.hip, g.shoulder])} />
          <path d={line([g.shoulder, g.elbow, g.hand])} />
          <circle cx={g.head[0]} cy={g.head[1]} r="5.4" fill="none" />
        </g>
      )}
      {s.bench && (
        <rect x="22" y="80" width="46" height="6" rx="1" fill="currentColor" opacity=".25" />
      )}
      {s.prop === "bar-overhead" && (
        <path
          d={`M${s.hand[0] - 14} ${s.hand[1]} H${s.hand[0] + 14}`}
          stroke="var(--primary)"
          {...stroke(2.4)}
        />
      )}
      {s.legs.map((l, i) => (
        <path
          key={i}
          d={line([s.hip, l.knee, l.ankle, l.toe])}
          stroke="currentColor"
          strokeOpacity={i === 0 ? 1 : 0.55}
          {...stroke()}
        />
      ))}
      <path d={line([s.hip, s.shoulder])} stroke="currentColor" {...stroke(4.2)} />
      <path d={line([s.shoulder, s.elbow, s.hand])} stroke="currentColor" {...stroke()} />
      <circle
        cx={s.head[0]}
        cy={s.head[1]}
        r="5.4"
        fill="var(--background)"
        stroke="currentColor"
        strokeWidth="3"
      />
      {s.prop === "dumbbell" && (
        <g stroke="var(--primary)" {...stroke(3)}>
          <path d={`M${s.hand[0] - 3.5} ${s.hand[1]} H${s.hand[0] + 3.5}`} />
          <path d={`M${s.hand[0] - 3.5} ${s.hand[1] - 3.5} V${s.hand[1] + 3.5}`} />
          <path d={`M${s.hand[0] + 3.5} ${s.hand[1] - 3.5} V${s.hand[1] + 3.5}`} />
        </g>
      )}
      {s.prop === "barbell" && (
        <g stroke="var(--primary)" {...stroke(3)}>
          <circle cx={s.hand[0]} cy={s.hand[1]} r="6" fill="none" />
          <circle cx={s.hand[0]} cy={s.hand[1]} r="1.2" fill="var(--primary)" />
        </g>
      )}
      <circle cx={s.hand[0]} cy={s.hand[1]} r="1.8" fill="currentColor" />
    </svg>
  );
}

export function FormFrameLabel({ frame, index }: { frame: FormFrame; index: number }) {
  return (
    <p className="text-sm">
      <span className="num mr-2 text-primary">{String(index + 1).padStart(2, "0")}</span>
      <strong>{frame.label}.</strong> {frame.cue}
    </p>
  );
}
