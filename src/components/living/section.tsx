import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { VIcon } from "@/components/nl/icon";
import { cn } from "@/lib/utils";
import "./living.css";

/** A heading and rows separated by hairlines. No container box. */
export function Section({
  title,
  action,
  children,
  className,
  ...rest
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cn("lv-section", className)} {...rest}>
      {(title || action) && (
        <div className="lv-section-head">
          {title && <h2>{title}</h2>}
          {action && <div className="lv-section-action">{action}</div>}
        </div>
      )}
      <div className="lv-rows">{children}</div>
    </section>
  );
}

type RowProps = {
  label: ReactNode;
  hint?: ReactNode;
  value?: ReactNode;
  lead?: ReactNode;
  /** Link target (a router path) or a click handler; omit for a read-only row. */
  to?: string;
  onClick?: () => void;
  className?: string;
};

/** One labelled fact or action: label and hint on the left, a telemetry value on the right, a chevron if it goes somewhere. */
export function DataRow({ label, hint, value, lead, to, onClick, className }: RowProps) {
  const inner = (
    <>
      {lead && <span className="lv-row-lead">{lead}</span>}
      <span className="lv-row-main">
        <span className="lv-row-label block">{label}</span>
        {hint && <span className="lv-row-hint block">{hint}</span>}
      </span>
      {value !== undefined ? <span className="lv-row-value">{value}</span> : <span />}
      {to || onClick ? (
        <span className="lv-row-chev" aria-hidden>
          <VIcon name="next" size={18} />
        </span>
      ) : (
        <span />
      )}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cn("lv-row", className)}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn("lv-row", className)}>
        {inner}
      </button>
    );
  return <div className={cn("lv-row", className)}>{inner}</div>;
}
