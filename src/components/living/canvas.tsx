import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./living.css";

/** Page frame: a calm reading column with a quiet header. The Shell owns the <main> landmark. */
export function Canvas({
  title,
  kicker,
  actions,
  width = "reading",
  children,
  className,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  width?: "reading" | "wide";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("lv-canvas", className)} data-width={width}>
      <header className="lv-canvas-head">
        <div className="min-w-0">
          {kicker && <p className="lv-kicker mb-1.5">{kicker}</p>}
          <h1 className="lv-title">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
