import { useId, useRef } from "react";
import { getArtPack, type Layer } from "@/domain/buddy/art";
import { POSES, STATE_META, type BuddyState } from "@/domain/buddy/state";
import { VARIANTS, type VariantId } from "@/domain/buddy/variants";
import type { BuddyPalette, CompanionConfig } from "@/domain/companion";
import { useAnimationGate } from "./useAnimationGate";
import { useBuddyAnimator } from "./useBuddyAnimator";
import "./buddy-character.css";

/**
 * Renderer. Geometry comes from the registered art pack; behaviour comes from the variant's
 * motion profile and the authored clips. This file owns only the rig contract: parts named
 * root, body, face, eyes, mouth, acc and shadow, so final art can replace the pack without
 * touching animation, states or haptics.
 */
function Eye({ kind, x, y }: { kind: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`bd-eye bd-eye-${kind}`}>
      <g className="bd-eye-in">
        {kind === "open" && (
          <>
            <ellipse rx="5" ry="6" className="bd-lens" />
            <circle cx="1.2" cy="0.6" r="3" className="bd-pupil" />
            <circle cx="2.2" cy="-0.8" r="1" className="bd-lens" />
          </>
        )}
        {kind === "wide" && (
          <>
            <ellipse rx="5.6" ry="6.8" className="bd-lens" />
            <circle cx="1.2" cy="0.6" r="3.5" className="bd-pupil" />
            <circle cx="2.4" cy="-1" r="1.2" className="bd-lens" />
          </>
        )}
        {kind === "happy" && <path d="M-5.5 2.4 Q0 -5.6 5.5 2.4" className="bd-stroke" />}
        {kind === "closed" && <path d="M-5.5 -0.8 Q0 5.2 5.5 -0.8" className="bd-stroke" />}
        {kind === "half" && (
          <>
            <path d="M-5 0 A5 5 0 0 0 5 0 Z" className="bd-lens" />
            <path d="M-5.6 0 H5.6" className="bd-stroke bd-thin" />
          </>
        )}
        {kind === "up" && (
          <>
            <ellipse cy="-0.6" rx="5" ry="6" className="bd-lens" />
            <circle cx="1.2" cy="-2.6" r="3" className="bd-pupil" />
          </>
        )}
        {kind === "side" && (
          <>
            <ellipse cx="1" rx="5" ry="6" className="bd-lens" />
            <circle cx="3.2" cy="0.4" r="3" className="bd-pupil" />
          </>
        )}
        {kind === "soft" && (
          <>
            <path d="M-5.2 0.8 A5.2 5.2 0 0 0 5.2 0.8 Q0 -3.2 -5.2 0.8Z" className="bd-lens" />
            <path d="M-5.8 -4.4 L5.8 -6" className="bd-stroke bd-thin" />
          </>
        )}
      </g>
    </g>
  );
}

function Mouth({ kind, x, y }: { kind: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`bd-mouth bd-mouth-${kind}`}>
      <g className="bd-mouth-in">
        {kind === "smile" && <path d="M-5 0 Q0 5 5 0" className="bd-stroke" />}
        {kind === "grin" && <path d="M-6 -1 Q0 8.5 6 -1 Z" className="bd-lens" />}
        {kind === "flat" && <path d="M-3.4 0.6 H3.4" className="bd-stroke" />}
        {kind === "open" && <ellipse cy="1.4" rx="2.8" ry="3.4" className="bd-lens" />}
        {kind === "small" && <path d="M-3 0 Q0 2.8 3 0" className="bd-stroke bd-thin" />}
        {kind === "soft" && <path d="M-4 0.6 Q0 3.8 4 0.6" className="bd-stroke bd-thin" />}
        {kind === "wavy" && (
          <path d="M-5.4 0.6 q2.7 -3 5.4 0 t5.4 0" className="bd-stroke bd-thin" />
        )}
      </g>
    </g>
  );
}

function Layers({ layers, clipId }: { layers: Layer[]; clipId: string }) {
  return (
    <>
      {layers.map((l, i) => {
        const cls = `bd-fill-${l.fill}${l.edge ? " bd-edged" : ""}`;
        const style = l.opacity === undefined ? undefined : { opacity: l.opacity };
        return l.clip ? (
          <g key={i} clipPath={`url(#${clipId}-${i})`}>
            <path d={l.d} className={cls} style={style} />
          </g>
        ) : (
          <path key={i} d={l.d} className={cls} style={style} />
        );
      })}
    </>
  );
}

const EYES = ["open", "wide", "happy", "closed", "half", "up", "side", "soft"];
const MOUTHS = ["smile", "grin", "flat", "open", "small", "soft", "wavy"];

function Accessories() {
  return (
    <g data-part="acc" className="bd-acc-all">
      <g className="bd-acc bd-acc-waves">
        <path d="M18 80 Q12 88 18 96" />
        <path d="M12 74 Q4 88 12 102" />
      </g>
      <g className="bd-acc bd-acc-dots">
        <circle cx="48" cy="26" r="2.6" />
        <circle cx="60" cy="22" r="2.6" />
        <circle cx="72" cy="26" r="2.6" />
      </g>
      <g className="bd-acc bd-acc-arrow">
        <path d="M96 70 l7 5 l-7 5" />
        <path d="M104 56 l7 5 l-7 5" />
      </g>
      <g className="bd-acc bd-acc-pip">
        <path
          d="M98 22 L100.2 28.6 L106.8 30.8 L100.2 33 L98 39.6 L95.8 33 L89.2 30.8 L95.8 28.6Z"
          className="bd-fillacc"
        />
      </g>
      <g className="bd-acc bd-acc-tally">
        <path className="bd-tally-bars" d="M82 18 V40 M89 18 V40 M96 18 V40 M103 18 V40" />
        <path className="bd-tally-slash" d="M78 36 L108 22" />
      </g>
      <g className="bd-acc bd-acc-dawn">
        <path d="M86 118 A12 12 0 0 1 110 118Z" className="bd-fillacc" />
        <path d="M98 98 v5 M86 103 l3 3 M110 103 l-3 3" />
      </g>
      <g className="bd-acc bd-acc-zzz">
        <path className="bd-z" d="M88 44 h8 l-8 9 h8" />
        <path className="bd-z" d="M99 30 h6 l-6 7 h6" />
        <path className="bd-z" d="M106 18 h4 l-4 5 h4" />
      </g>
      <g className="bd-acc bd-acc-bang">
        <circle cx="98" cy="34" r="12" className="bd-warnring" />
        <path d="M98 27 v8" className="bd-warnmark" />
        <circle cx="98" cy="40.5" r="1.3" className="bd-warnfill" />
      </g>
      <g className="bd-acc bd-acc-cloud">
        <path d="M86 44 a6 6 0 0 1 2.6 -11.4 a8 8 0 0 1 15 1.8 a5.4 5.4 0 0 1 0 9.6Z" />
        <path d="M84 50 L110 24" className="bd-cloud-slash" />
      </g>
      <circle className="bd-acc bd-acc-ring" cx="60" cy="86" r="44" />
    </g>
  );
}

export type BuddyCharacterProps = {
  variant: VariantId;
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
  variant,
  state,
  motion = "gentle",
  palette = "world",
  expression = "calm",
  size = 64,
  name = "Buddy",
  decorative = false,
  className,
}: BuddyCharacterProps) {
  const v = VARIANTS[variant];
  const art = getArtPack().bodies[v.silhouette];
  const pose = POSES[state];
  const { ref, live } = useAnimationGate();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const setRef = (node: SVGSVGElement | null) => {
    svgRef.current = node;
    (ref as { current: SVGSVGElement | null }).current = node;
  };
  useBuddyAnimator(svgRef, state, v.profile, motion, live);
  const clip = useId().replace(/:/g, "");
  const f = art.face;
  const ex = [f.x + f.w * 0.29, f.x + f.w * 0.71] as const;
  const ey = f.y + f.h * 0.44;
  const mx = f.x + f.w / 2;
  const my = f.y + f.h * 0.8;
  return (
    <svg
      ref={setRef}
      viewBox="0 0 120 124"
      width={size}
      height={(size * 124) / 120}
      className={`buddy${className ? ` ${className}` : ""}`}
      data-variant={variant}
      data-silhouette={v.silhouette}
      data-state={state}
      data-eyes={pose.eyes}
      data-mouth={pose.mouth}
      data-accessory={pose.accessory}
      data-motion={motion}
      data-live={live ? "true" : "false"}
      data-palette={palette}
      data-expression={expression}
      data-art={getArtPack().id}
      data-provisional={getArtPack().provisional ? "true" : "false"}
      style={{ ["--bd-lean" as string]: `${pose.lean}deg` }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `${name}, ${STATE_META[state].label}`}
      focusable="false"
    >
      <defs>
        {art.body.map((l, i) =>
          l.clip ? (
            <clipPath key={i} id={`${clip}-${i}`}>
              <path d={l.clip} />
            </clipPath>
          ) : null,
        )}
      </defs>
      <g className="bd-ground">
        <path d="M6 118.5 H114" />
      </g>
      <g data-part="shadow">
        <ellipse className="bd-shadow" cx="60" cy="118" rx="30" ry="3.2" />
      </g>
      <g data-part="root" className="bd-lean">
        <g data-part="body">
          <Layers layers={art.back} clipId={clip} />
          <Layers layers={art.body} clipId={clip} />
          {art.limbs && (
            <>
              {(["l", "r"] as const).map((side) => (
                <g
                  key={side}
                  data-part={side === "l" ? "armL" : "armR"}
                  style={{
                    transformOrigin: `${art.limbs![side].pivot[0]}px ${art.limbs![side].pivot[1]}px`,
                  }}
                >
                  <Layers layers={art.limbs![side].layers} clipId={`${clip}-l${side}`} />
                </g>
              ))}
            </>
          )}
          <g className="bd-ticks">
            {art.ticks.map((t, i) => (
              <path key={i} d="M0 0 v4.5" transform={`translate(${t.x} ${t.y}) rotate(${t.r})`} />
            ))}
          </g>
          <g data-part="face">
            <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.r} className="bd-window" />
            <g className="bd-cheeks">
              <circle cx={ex[0] - 3} cy={f.y + f.h * 0.78} r="2.6" />
              <circle cx={ex[1] + 3} cy={f.y + f.h * 0.78} r="2.6" />
            </g>
            <g className="bd-brows">
              <path d={`M${ex[0] - 4.5} ${ey - 7.5} L${ex[0] + 3.5} ${ey - 5.5}`} />
              <path d={`M${ex[1] + 4.5} ${ey - 7.5} L${ex[1] - 3.5} ${ey - 5.5}`} />
            </g>
            <g data-part="eyes">
              {EYES.map((k) => (
                <g key={k}>
                  <Eye kind={k} x={ex[0]} y={ey} />
                  <Eye kind={k} x={ex[1]} y={ey} />
                </g>
              ))}
            </g>
            <g data-part="mouth">
              {MOUTHS.map((k) => (
                <Mouth key={k} kind={k} x={mx} y={my} />
              ))}
            </g>
          </g>
          {art.front && <Layers layers={art.front} clipId={clip} />}
        </g>
      </g>
      <Accessories />
    </svg>
  );
}
