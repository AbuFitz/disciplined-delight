import { useId } from "react";

/**
 * The environment: sky, aurora ribbons, volumetric rays, depth ridges with running lanes, horizon light and grain.
 * Colours come from CSS variables on the nearest .cn element (mode, time of day, colour world, charge).
 */
export function Atmosphere() {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="cn-atmos" aria-hidden>
      <div className="cn-sky" />
      <div className="cn-rib cn-rib-1" />
      <div className="cn-rib cn-rib-2" />
      <div className="cn-rib cn-rib-3" />
      <div className="cn-rays" />
      <svg className="cn-planes" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${uid}-far`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="cn-far-0" />
            <stop offset="1" className="cn-far-1" />
          </linearGradient>
          <linearGradient id={`${uid}-near`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="cn-near-0" />
            <stop offset="1" className="cn-near-1" />
          </linearGradient>
        </defs>
        <path
          className="cn-hill cn-hill-far"
          fill={`url(#${uid}-far)`}
          d="M0 66 C14 58 26 62 40 57 S66 52 80 58 S94 56 100 54 V100 H0Z"
        />
        <g className="cn-lanes">
          {[-46, -22, 0, 22, 46].map((d) => (
            <line key={d} x1={50 + d * 0.16} y1="62" x2={50 + d * 2.1} y2="100" />
          ))}
        </g>
        <path
          className="cn-hill cn-hill-near"
          fill={`url(#${uid}-near)`}
          d="M0 84 C18 78 34 86 52 81 S84 76 100 82 V100 H0Z"
        />
      </svg>
      <div className="cn-horizon" />
      <div className="cn-grain" />
      <div className="cn-bloom" />
    </div>
  );
}
