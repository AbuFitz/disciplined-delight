import type { ReactNode } from "react";
import { VIcon } from "./icon";
import { cn } from "@/lib/utils";

/** Previous/next week pill: one rounded surface, 44px circular arrows, the range in the middle. */
export function WeekNav({
  label,
  onPrev,
  onNext,
  trailing,
  className,
}: {
  label: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  trailing?: ReactNode;
  className?: string;
}) {
  const arrow =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 hover:bg-foreground/10";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center rounded-full bg-surface/80 p-1">
        <button aria-label="Previous week" onClick={onPrev} className={arrow}>
          <VIcon name="previous" />
        </button>
        <p className="tnum min-w-0 flex-1 px-1 text-center font-semibold">{label}</p>
        <button aria-label="Next week" onClick={onNext} className={arrow}>
          <VIcon name="next" />
        </button>
      </div>
      {trailing}
    </div>
  );
}

/**
 * Pill tabs: one rounded track, the active option is a solid pill. Same radiogroup semantics as
 * Segmented, but full width and scrollable so four labels fit at 320px.
 */
export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex w-full gap-1 overflow-x-auto sm:w-fit sm:max-w-full rounded-full bg-surface/80 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 flex-1 shrink-0 rounded-full px-2.5 min-[380px]:px-4 sm:flex-none sm:px-6 text-sm font-semibold whitespace-nowrap transition active:scale-[0.97]",
            o.value === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
