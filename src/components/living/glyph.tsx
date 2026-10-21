import type { ReactNode } from "react";
import { GLYPH_LABEL, type GlyphName } from "./glyph-names";

const PATHS: Record<GlyphName, ReactNode> = {
  // A day: three moments on one rail, the current one ringed.
  dayline: (
    <>
      <path d="M3 12h18" />
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  // A weight plate seen edge-on: the bar through a disc.
  train: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M2.5 12h5M16.5 12h5" />
    </>
  ),
  // A bowl with rising steam.
  fuel: (
    <>
      <path d="M4 11.5h16a8 7.5 0 0 1-16 0Z" />
      <path d="M9 8c0-1.6 1.2-1.6 1.2-3.2M14 8c0-1.6 1.2-1.6 1.2-3.2" />
    </>
  ),
  // A crescent resting.
  recover: <path d="M19.5 14.2A8 8 0 1 1 9.8 4.5a6.4 6.4 0 0 0 9.7 9.7Z" />,
  // A figure at rest, arms open.
  body: (
    <>
      <circle cx="12" cy="5.2" r="2.2" />
      <path d="M12 8.4v6M6.8 11.2h10.4M12 14.4l-3 6.2M12 14.4l3 6.2" />
    </>
  ),
  // Nested openings: attention settling inward.
  mind: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
      <path d="M12 8a4 4 0 1 1-4 4" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A four-point bearing: direction without assuming a tradition.
  meaning: <path d="M12 3l2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1Z" />,
  // Three overlapping rings: people, deliberately.
  circle: (
    <>
      <circle cx="9" cy="10" r="4.5" />
      <circle cx="15" cy="10" r="4.5" />
      <circle cx="12" cy="15.5" r="4.5" />
    </>
  ),
  // The companion: a soft body and two eyes.
  buddy: (
    <>
      <path d="M4.5 14.5a7.5 6 0 0 1 15 0c0 3.2-3.4 5.5-7.5 5.5s-7.5-2.3-7.5-5.5Z" />
      <circle cx="9.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A gauge: how ready today is.
  readiness: (
    <>
      <path d="M4 16.5a8 8 0 0 1 16 0" />
      <path d="M12 16.5l4-5" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // Two opposed arrows: the plan changing to fit.
  adaptation: <path d="M5 8.5h11l-3-3M19 15.5H8l3 3" />,
  // An open ring: a set in progress.
  gym: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
      <path d="M12 3.5l-2 2.4M12 3.5l-2 -2.4" strokeOpacity="0" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Glyph({
  name,
  size = 24,
  label,
  className,
}: {
  name: GlyphName;
  size?: number;
  /** Pass a label only when the glyph stands alone; beside visible text it is decorative. */
  label?: string | true;
  className?: string;
}) {
  const text = label === true ? GLYPH_LABEL[name] : label;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={text ? "img" : undefined}
      aria-label={text}
      aria-hidden={text ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
