import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./living.css";

/**
 * The one dominant object in a viewport: what is happening now. In Gym Mode it becomes set/rest progress,
 * in review the session story. "quiet" is for a stage that is present but not the call to action.
 */
export function Stage({
  kicker,
  title,
  meta,
  children,
  actions,
  tone = "now",
  className,
  ...rest
}: {
  kicker?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "now" | "quiet";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cn("lv-stage", className)} data-tone={tone} {...rest}>
      <div className="grid gap-2">
        {kicker && <p className="lv-kicker">{kicker}</p>}
        <h2 className="lv-title lv-stage-title">{title}</h2>
        {meta && <p className="lv-stage-meta">{meta}</p>}
      </div>
      {children}
      {actions && <div className="lv-stage-actions">{actions}</div>}
    </section>
  );
}
