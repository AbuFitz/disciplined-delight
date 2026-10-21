import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Glyph } from "./glyph";
import type { GlyphName } from "./glyph-names";
import "./living.css";

/** Honest fallback when there is no demonstration: a glyph and a text cue, never a broken image. */
export function MediaPoster({ glyph = "train", cue }: { glyph?: GlyphName; cue?: ReactNode }) {
  return (
    <div className="lv-poster">
      <Glyph name={glyph} size={28} />
      {cue && <span className="lv-poster-cue">{cue}</span>}
    </div>
  );
}

/**
 * Media first: a square frame, then a name and one line of meta. `src` may be a still or a short loop; on load
 * error it falls back to the poster so a missing file is never a broken box. State "loading" shows a still tone.
 */
export function MediaTile({
  name,
  meta,
  src,
  alt = "",
  badge,
  glyph,
  cue,
  to,
  onClick,
  loading,
  className,
}: {
  name: ReactNode;
  meta?: ReactNode;
  src?: string;
  alt?: string;
  badge?: ReactNode;
  glyph?: GlyphName;
  cue?: ReactNode;
  to?: string;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const frame = (
    <span className="lv-media-frame" aria-busy={loading || undefined}>
      {loading ? null : src && !failed ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <MediaPoster glyph={glyph} cue={cue} />
      )}
      {badge && !loading && <span className="lv-media-badge">{badge}</span>}
    </span>
  );
  const body = (
    <>
      {frame}
      <span className="grid gap-0.5">
        <span className="lv-media-name">{name}</span>
        {meta && <span className="lv-media-meta">{meta}</span>}
      </span>
    </>
  );
  if (to)
    return (
      <Link to={to} className={cn("lv-media", className)}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn("lv-media", className)}>
        {body}
      </button>
    );
  return <div className={cn("lv-media", className)}>{body}</div>;
}
