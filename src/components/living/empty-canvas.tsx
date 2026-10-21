import type { ReactNode } from "react";
import { Glyph } from "./glyph";
import type { GlyphName } from "./glyph-names";
import "./living.css";

export type EmptyKind = "empty" | "error" | "offline" | "denied" | "loading";

/** An empty, failed, offline, denied or loading moment: a glyph, a plain sentence and at most one action. No box. */
export function EmptyCanvas({
  kind = "empty",
  glyph = "dayline",
  title,
  body,
  action,
}: {
  kind?: EmptyKind;
  glyph?: GlyphName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  const live = kind === "error" || kind === "denied" ? "alert" : "status";
  return (
    <div
      className="lv-empty"
      data-kind={kind}
      role={live}
      aria-busy={kind === "loading" || undefined}
    >
      <span className="lv-empty-glyph">
        <Glyph name={glyph} size={24} />
      </span>
      <h3>{title}</h3>
      {kind === "loading" ? (
        <div className="grid gap-2" aria-hidden>
          <div className="lv-skel w-3/4" />
          <div className="lv-skel w-1/2" />
        </div>
      ) : (
        body && <p>{body}</p>
      )}
      {action && <div className="lv-empty-action">{action}</div>}
    </div>
  );
}
