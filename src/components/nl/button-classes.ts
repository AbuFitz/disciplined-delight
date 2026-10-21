import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg" | "sm";

/** Class list for anything that should look like a Button (for example a router Link). */
export function buttonClasses({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex max-w-full items-center justify-center gap-2 rounded-[var(--r-control)] text-center font-medium whitespace-normal select-none [overflow-wrap:anywhere]",
    "transition-[transform,background-color,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
    size === "lg" && "min-h-14 px-8 text-base font-semibold",
    size === "md" && "min-h-12 px-6 text-[0.95rem] font-semibold",
    size === "sm" && "min-h-10 px-4 text-sm",
    variant === "primary" && "bg-primary text-primary-foreground hover:brightness-110",
    variant === "secondary" &&
      "border border-transparent bg-surface-2/80 text-foreground hover:bg-surface-2",
    variant === "ghost" && "text-foreground hover:bg-surface-2",
    variant === "danger" && "border border-destructive/50 text-destructive hover:bg-destructive/10",
    className,
  );
}
