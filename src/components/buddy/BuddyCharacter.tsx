import { POSES, STATE_META, type BuddyState } from "@/domain/buddy/state";
import type { BuddyForm, BuddyPalette, CompanionConfig } from "@/domain/companion";
import { useAnimationGate } from "./useAnimationGate";
import "./buddy.css";

/**
 * Original VAYVOR characters. One rig (eyes, mouth, two arms, accessories, ledger baseline)
 * wearing three different bodies: Bell (a kettlebell with a face), Cairn (three balanced
 * stones) and Plate (a weight plate that rolls up on its feet). Pose is set through data
 * attributes so a state is readable with motion off; CSS adds the movement.
 */
const GEOM: Record<
  BuddyForm,
  {
    eyes: [number, number, number];
    mouth: [number, number];
    shoulders: [[number, number], [number, number]];
    cheek: number;
  }
> = {
  bell: {
    eyes: [49, 71, 79],
    mouth: [60, 92],
    shoulders: [
      [27, 86],
      [93, 86],
    ],
    cheek: 87,
  },
  cairn: {
    eyes: [49, 71, 66],
    mouth: [60, 78],
    shoulders: [
      [29, 72],
      [91, 72],
    ],
    cheek: 75,
  },
  plate: {
    eyes: [46, 74, 60],
    mouth: [60, 85],
    shoulders: [
      [21, 72],
      [99, 72],
    ],
    cheek: 73,
  },
};

const Arm = ({ side, at }: { side: "L" | "R"; at: [number, number] }) => (
  <g transform={`translate(${at[0]} ${at[1]})`}>
    <g className={`bd-arm bd-arm-${side}`}>
      <path d="M0 0 L0 17" className="bd-limb" />
      <circle cx="0" cy="20" r="4.6" className="bd-hand" />
    </g>
  </g>
);

function Bodies({ form }: { form: BuddyForm }) {
  if (form === "bell")
    return (
      <>
        <path d="M31 64 C24 28 96 28 89 64" className="bd-handle" />
        <path d="M37 56 C35 36 85 36 83 56" className="bd-handle-hi" />
        <rect x="40" y="110" width="14" height="8" rx="4" className="bd-shade" />
        <rect x="66" y="110" width="14" height="8" rx="4" className="bd-shade" />
        <path
          d="M27 99 C21 66 38 47 60 47 C82 47 99 66 93 99 Q91 115 76 115 L44 115 Q29 115 27 99Z"
          className="bd-body"
        />
        <path d="M33 70 C36 58 44 52 52 51" className="bd-gloss" />
        <path
          d="M30 99 Q60 108 90 99 L90 104 Q88 115 76 115 L44 115 Q32 115 30 104Z"
          className="bd-shade"
        />
        <path d="M34 101 H86 M36 106 H84" className="bd-rule" />
        <path d="M72 107 v5 M76 107 v5 M80 107 v5 M84 107 v5 M71 111 L85 108" className="bd-tick" />
      </>
    );
  if (form === "cairn")
    return (
      <>
        <path
          d="M20 106 C18 94 34 87 60 87 C88 87 102 94 100 106 C99 116 85 118 60 118 C35 118 21 116 20 106Z"
          className="bd-shade"
        />
        <path d="M30 100 H88 M27 108 H92" className="bd-rule" />
        <g className="bd-cap">
          <path
            d="M43 50 C40 37 49 28 61 28 C74 28 80 37 77 49 C71 54 52 55 43 50Z"
            className="bd-hi"
          />
          <path d="M50 38 C53 34 58 33 62 33" className="bd-gloss" />
        </g>
        <path
          d="M28 80 C24 61 40 47 60 47 C80 47 96 61 92 80 C91 90 77 94 60 94 C43 94 29 90 28 80Z"
          className="bd-body"
        />
        <path d="M33 66 C36 57 43 52 51 51" className="bd-gloss" />
        <path d="M36 88 H84" className="bd-rule" />
        <path d="M76 84 v4 M80 84 v4 M84 84 v4" className="bd-tick" />
      </>
    );
  return (
    <>
      <rect x="39" y="104" width="15" height="8" rx="4" className="bd-shade" />
      <rect x="66" y="104" width="15" height="8" rx="4" className="bd-shade" />
      <circle cx="60" cy="69" r="41" className="bd-body" />
      <circle cx="60" cy="69" r="41" className="bd-rim" />
      <circle cx="60" cy="69" r="32" className="bd-inner" />
      <path
        d="M60 28 v5 M60 105 v5 M19 69 h5 M96 69 h5 M31 40 l4 4 M85 94 l4 4 M89 40 l-4 4 M35 94 l-4 4"
        className="bd-tick"
      />
      <circle cx="60" cy="72" r="6" className="bd-hole" />
      <path d="M32 52 C36 43 43 38 51 36" className="bd-gloss" />
    </>
  );
}

function Eye({ kind, x, y }: { kind: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`bd-eye bd-eye-${kind}`}>
      {kind === "open" && (
        <>
          <circle r="4.6" className="bd-ink" />
          <circle cx="1.5" cy="-1.5" r="1.4" className="bd-glint" />
        </>
      )}
      {kind === "wide" && (
        <>
          <circle r="5.8" className="bd-ink" />
          <circle cx="1.7" cy="-1.8" r="1.7" className="bd-glint" />
        </>
      )}
      {kind === "happy" && <path d="M-5.5 2 Q0 -6 5.5 2" className="bd-stroke" />}
      {kind === "closed" && <path d="M-5.5 -1 Q0 5.5 5.5 -1" className="bd-stroke" />}
      {kind === "half" && (
        <>
          <path d="M-4.8 -0.5 A4.8 4.8 0 0 0 4.8 -0.5 Z" className="bd-ink" />
          <path d="M-5.5 -0.5 H5.5" className="bd-stroke" />
        </>
      )}
      {kind === "up" && (
        <>
          <circle cy="-1.4" r="4.6" className="bd-ink" />
          <circle cx="1.4" cy="-3.6" r="1.6" className="bd-glint" />
        </>
      )}
      {kind === "side" && (
        <>
          <circle cx="1.8" r="4.6" className="bd-ink" />
          <circle cx="3.4" cy="-1.4" r="1.4" className="bd-glint" />
        </>
      )}
      {kind === "soft" && (
        <>
          <path d="M-4.8 0.6 A4.8 4.8 0 0 0 4.8 0.6 Q0 -3 -4.8 0.6Z" className="bd-ink" />
          <path d="M-5.5 -3.5 L5.5 -5.5" className="bd-stroke-thin bd-brow-soft" />
        </>
      )}
    </g>
  );
}

function Mouth({ kind, x, y }: { kind: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`bd-mouth bd-mouth-${kind}`}>
      {kind === "smile" && <path d="M-7.5 0 Q0 7.5 7.5 0" className="bd-stroke" />}
      {kind === "grin" && <path d="M-8.5 -1 Q0 12 8.5 -1 Z" className="bd-ink" />}
      {kind === "flat" && <path d="M-5 1 H5" className="bd-stroke" />}
      {kind === "open" && <ellipse cy="2" rx="4.2" ry="5" className="bd-ink bd-talk" />}
      {kind === "small" && <path d="M-4.5 0 Q0 3.8 4.5 0" className="bd-stroke" />}
      {kind === "soft" && <path d="M-6 1 Q0 5.5 6 1" className="bd-stroke" />}
      {kind === "wavy" && <path d="M-8 1 q4 -4 8 0 t8 0" className="bd-stroke" />}
    </g>
  );
}

const EYES = ["open", "wide", "happy", "closed", "half", "up", "side", "soft"];
const MOUTHS = ["smile", "grin", "flat", "open", "small", "soft", "wavy"];

function Accessories() {
  return (
    <g className="bd-acc-all">
      <g className="bd-acc bd-acc-waves">
        <path d="M13 66 Q6 78 13 90" />
        <path d="M7 60 Q-3 78 7 96" />
      </g>
      <g className="bd-acc bd-acc-dots">
        <circle cx="48" cy="12" r="2.8" />
        <circle cx="60" cy="9" r="2.8" />
        <circle cx="72" cy="12" r="2.8" />
      </g>
      <g className="bd-acc bd-acc-arrow">
        <path d="M100 56 l8 5 l-8 5" />
        <path d="M108 40 l8 5 l-8 5" />
      </g>
      <g className="bd-acc bd-acc-pip">
        <path
          d="M102 14 L104.4 21 L111.5 23.4 L104.4 25.8 L102 33 L99.6 25.8 L92.5 23.4 L99.6 21Z"
          className="bd-fillacc"
        />
      </g>
      <g className="bd-acc bd-acc-tally">
        <path
          className="bd-tally-bars"
          d="M84 8 V32 M92 8 V32 M100 8 V32 M108 8 V32"
          pathLength={1}
        />
        <path className="bd-tally-slash" d="M80 28 L113 12" pathLength={1} />
        <circle className="bd-conf bd-conf-1" cx="22" cy="22" r="2.4" />
        <circle className="bd-conf bd-conf-2" cx="40" cy="8" r="2" />
        <circle className="bd-conf bd-conf-3" cx="14" cy="46" r="2" />
      </g>
      <g className="bd-acc bd-acc-dawn">
        <path d="M86 118 A14 14 0 0 1 114 118Z" className="bd-fillacc" />
        <path d="M100 94 v6 M85 100 l4 4 M115 100 l-4 4" />
      </g>
      <g className="bd-acc bd-acc-zzz">
        <path className="bd-z bd-z1" d="M88 34 h9 l-9 10 h9" />
        <path className="bd-z bd-z2" d="M100 18 h7 l-7 8 h7" />
        <path className="bd-z bd-z3" d="M108 6 h5 l-5 6 h5" />
      </g>
      <g className="bd-acc bd-acc-bang">
        <circle cx="102" cy="22" r="14" className="bd-warnring" />
        <path d="M102 14 v10" className="bd-warnmark" />
        <circle cx="102" cy="29.5" r="1.4" className="bd-warnfill" />
      </g>
      <g className="bd-acc bd-acc-cloud">
        <path d="M88 32 a7 7 0 0 1 3 -13 a9 9 0 0 1 17 2 a6 6 0 0 1 0 11Z" />
        <path d="M86 40 L114 10" className="bd-cloud-slash" />
      </g>
      <circle className="bd-acc bd-acc-ring" cx="60" cy="80" r="46" />
    </g>
  );
}

export type BuddyCharacterProps = {
  form: BuddyForm;
  state: BuddyState;
  motion?: "off" | "gentle" | "full";
  palette?: BuddyPalette;
  expression?: CompanionConfig["expression"];
  size?: number;
  name?: string;
  /** Decorative when a labelled control already names the character. */
  decorative?: boolean;
  className?: string;
};

export function BuddyCharacter({
  form,
  state,
  motion = "gentle",
  palette = "world",
  expression = "calm",
  size = 96,
  name = "Buddy",
  decorative = false,
  className,
}: BuddyCharacterProps) {
  const pose = POSES[state];
  const g = GEOM[form];
  const { ref, live } = useAnimationGate();
  return (
    <svg
      ref={ref}
      viewBox="0 0 120 124"
      width={size}
      height={(size * 124) / 120}
      className={`buddy${className ? ` ${className}` : ""}`}
      data-form={form}
      data-state={state}
      data-eyes={pose.eyes}
      data-mouth={pose.mouth}
      data-arms={pose.arms}
      data-accessory={pose.accessory}
      data-motion={motion}
      data-live={live ? "true" : "false"}
      data-palette={palette}
      data-expression={expression}
      style={{ ["--bd-lean" as string]: `${pose.lean}deg` }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${name}, ${STATE_META[state].label}`}
      focusable="false"
    >
      <g className="bd-ground">
        <path d="M4 118.5 H116" />
        <path d="M12 118.5 v3 M36 118.5 v3 M60 118.5 v3 M84 118.5 v3 M108 118.5 v3" />
      </g>
      <ellipse className="bd-shadow" cx="60" cy="118" rx="34" ry="3.6" />
      <Accessories />
      <g className="bd-root">
        <g className="bd-bob">
          <g className="bd-squash">
            <Bodies form={form} />
            <g className="bd-face">
              <g className="bd-cheeks">
                <circle cx={g.eyes[0] - 4} cy={g.cheek} r="4.2" />
                <circle cx={g.eyes[1] + 4} cy={g.cheek} r="4.2" />
              </g>
              <g className="bd-brows">
                <path
                  d={`M${g.eyes[0] - 6} ${g.eyes[2] - 10} L${g.eyes[0] + 5} ${g.eyes[2] - 7}`}
                />
                <path
                  d={`M${g.eyes[1] + 6} ${g.eyes[2] - 10} L${g.eyes[1] - 5} ${g.eyes[2] - 7}`}
                />
              </g>
              {EYES.map((k) => (
                <g key={k}>
                  <Eye kind={k} x={g.eyes[0]} y={g.eyes[2]} />
                  <Eye kind={k} x={g.eyes[1]} y={g.eyes[2]} />
                </g>
              ))}
              {MOUTHS.map((k) => (
                <Mouth key={k} kind={k} x={g.mouth[0]} y={g.mouth[1]} />
              ))}
            </g>
            <Arm side="L" at={g.shoulders[0]} />
            <Arm side="R" at={g.shoulders[1]} />
          </g>
        </g>
      </g>
    </svg>
  );
}
