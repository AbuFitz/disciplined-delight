import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="px-5 pb-5 pt-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {note && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export function Callout({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2.5 rounded-2xl border border-accent bg-accent/60 p-4 text-xs leading-relaxed text-foreground ${className ?? ""}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>{children}</div>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-4 shadow-soft ${className ?? ""}`}>
      {children}
    </div>
  );
}
