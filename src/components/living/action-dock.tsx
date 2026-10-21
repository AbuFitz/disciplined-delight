import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./living.css";

/**
 * Utility surface for the one primary action (and an optional secondary). It sits in flow at the end of its
 * scroll container (sticky), never over content, and is the only place besides sheets and nav that uses glass.
 */
export function ActionDock({
  primary,
  secondary,
  className,
  label,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("lv-dock", className)} role="group" aria-label={label}>
      <div className="lv-dock-primary flex">{primary}</div>
      {secondary}
    </div>
  );
}
