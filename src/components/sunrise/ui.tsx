import { useEffect, useState, type ReactNode } from "react";
import { UtensilsCrossed, X, type LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  note,
  eyebrow,
}: {
  title: string;
  note?: string;
  eyebrow?: string;
}) {
  return (
    <div className="px-5 pb-5 pt-6">
      {eyebrow && (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
      )}
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

/** Bottom sheet popup — used for "tap a compact card to see the full info" flows. */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-center bg-white pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

const THUMB_DIMS = {
  sm: "h-14 w-14 rounded-xl",
  md: "h-20 w-20 rounded-xl",
  lg: "h-40 w-full rounded-2xl",
  banner: "aspect-[16/10] w-full rounded-2xl",
} as const;

/** Small thumbnail that falls back to a plain icon tile if the image is missing. */
export function ThumbImage({
  src,
  alt,
  size = "sm",
  fallbackIcon: FallbackIcon = UtensilsCrossed,
}: {
  src?: string;
  alt: string;
  size?: keyof typeof THUMB_DIMS;
  fallbackIcon?: LucideIcon;
}) {
  const [failed, setFailed] = useState(false);
  // Only attempt the real <img> after hydration — an SSR'd <img src> can start
  // loading (and fail) before React attaches onError, silently swallowing 404s.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dims = THUMB_DIMS[size];

  if (!src || !mounted || failed) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-accent text-primary ${dims}`}>
        <FallbackIcon className={size === "sm" || size === "md" ? "h-5 w-5" : "h-8 w-8"} />
      </div>
    );
  }
  return (
    <div className={`shrink-0 overflow-hidden bg-secondary ${dims}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
