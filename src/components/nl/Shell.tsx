import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useActiveSession } from "@/data/session-hooks";
import { SYNC_LABEL, useSyncStatus } from "@/data/sync-status";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";
import { useProfile } from "@/data/hooks";
import type { AppModule } from "@/data/types";
import { VIcon, type VIconName } from "./icon";

type NavItem = {
  to: string;
  label: string;
  icon: VIconName;
  match: string[];
  module?: AppModule;
};

/** Product areas feed the shared Today and Plan views; optional areas disappear when not selected. */
const PRIMARY: NavItem[] = [
  { to: "/", label: "Today", icon: "today", match: [] },
  {
    to: "/train",
    label: "Training",
    icon: "training",
    match: ["/train", "/workouts", "/library", "/progress"],
    module: "training",
  },
  {
    to: "/food",
    label: "Nutrition",
    icon: "nutrition",
    match: ["/food", "/nutrition"],
    module: "nutrition",
  },
  { to: "/mind", label: "Mind", icon: "mind", match: ["/mind"], module: "mind" },
  {
    to: "/plan",
    label: "Plan",
    icon: "calendar",
    match: ["/plan", "/schedule"],
    module: "routines",
  },
  { to: "/circle", label: "Community", icon: "community", match: ["/circle"], module: "community" },
  {
    to: "/soul",
    label: "Faith & reflection",
    icon: "spirituality",
    match: ["/soul", "/salah"],
    module: "spirituality",
  },
];
const QUICK: NavItem[] = [
  { to: "/progress", label: "Progress", icon: "progress", match: ["/progress"] },
  { to: "/library", label: "Library", icon: "library", match: ["/library"] },
];

function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const on = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t?.matches?.("input:not([type=checkbox]):not([type=radio]),textarea,select"))
        setTyping(true);
    };
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);
  return typing;
}

function SyncChip() {
  const s = useSyncStatus();
  return (
    <span className="eyebrow inline-flex items-center gap-2" title={s.detail}>
      <span
        className={cn(
          "size-2 rounded-full",
          s.mode === "synced"
            ? "bg-ok"
            : s.mode === "attention"
              ? "bg-destructive"
              : s.mode === "local"
                ? "bg-muted-foreground"
                : "bg-warn",
        )}
        aria-hidden
      />
      {SYNC_LABEL[s.mode]}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const typing = useTyping();
  const active = useActiveSession();
  const { profile } = useProfile();
  const selected = profile?.modules;
  const primary = PRIMARY.filter(
    (item) => !item.module || !selected || selected.includes(item.module),
  );
  const onSession = loc.pathname.startsWith("/train/session");
  const isActive = (to: string, match: string[] = []) =>
    to === "/"
      ? loc.pathname === "/"
      : [to, ...match].some((m) => loc.pathname === m || loc.pathname.startsWith(m + "/"));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-line px-4 py-6 lg:flex">
        <div>
          <Link
            to="/"
            aria-label="VAYVOR, Today"
            className="mb-6 flex min-h-11 items-center px-3 text-[1.35rem]"
          >
            <Wordmark className="text-[1.05rem]" />
          </Link>
          <nav aria-label="Primary" className="grid gap-1">
            {primary.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                aria-current={isActive(t.to, t.match) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-l-2 px-3 text-[0.95rem] font-medium transition",
                  isActive(t.to, t.match)
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <VIcon name={t.icon} active={isActive(t.to, t.match)} />
                {t.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Shortcuts" className="mt-6 grid gap-1">
            <p className="eyebrow mb-1 px-3">Shortcuts</p>
            {QUICK.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                aria-current={isActive(t.to, t.match) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition",
                  isActive(t.to, t.match)
                    ? "text-foreground underline underline-offset-4"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <VIcon name={t.icon} size={18} active={isActive(t.to, t.match)} />
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-3">
          <Link
            to="/settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-medium",
              isActive("/settings") ? "bg-surface" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <VIcon name="settings" active={isActive("/settings")} />
            Settings
          </Link>
          <div className="px-3">
            <SyncChip />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <div className="spatial-glass sticky top-0 z-30 flex items-center justify-between border-b px-4 pb-1 pt-[calc(0.5rem+var(--safe-top))] lg:hidden">
          <Link to="/" aria-label="VAYVOR, Today" className="flex min-h-11 items-center">
            <Wordmark className="text-[1.05rem]" />
          </Link>
          <div className="flex items-center">
            <Link
              to="/plan"
              aria-label="Plan the week"
              className="inline-flex size-[44px] items-center justify-center rounded-full hover:bg-surface-2"
            >
              <VIcon name="calendar" />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              className="inline-flex size-[44px] items-center justify-center rounded-full hover:bg-surface-2"
            >
              <VIcon name="settings" />
            </Link>
          </div>
        </div>

        <main
          id="main"
          className={cn(
            "scroll-pad-bottom mx-auto w-full max-w-[88rem] px-4 pb-10 pt-4 md:px-8 md:pt-8 lg:pb-12",
            active && !onSession && loc.pathname !== "/" && "scroll-pad-with-resume",
          )}
        >
          {children}
        </main>
      </div>

      {/* Resume bar */}
      {active && !onSession && loc.pathname !== "/" && (
        <Link
          to="/train/session"
          className={cn(
            "spatial-glass fixed inset-x-3 z-40 flex min-h-12 items-center justify-between gap-3 border-l-2 border-l-primary px-5 text-foreground lg:inset-x-auto lg:bottom-6 lg:right-8 lg:w-80",
            "bottom-[calc(5.25rem+var(--safe-bottom))]",
            typing && "hidden",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <VIcon name="play" size={16} active />
            Continue session
          </span>
          <span className="text-sm opacity-80">
            {active.templateLetter ? `Workout ${active.templateLetter}` : active.templateName}
          </span>
        </Link>
      )}

      {/* Mobile tabs. Buddy guidance is rendered in context, never as a floating overlay. */}
      <nav
        aria-label="Primary"
        className={cn(
          "spatial-glass fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[var(--safe-bottom)] lg:hidden",
          (typing || onSession) && "hidden",
        )}
      >
        <ul className="mx-auto flex max-w-2xl overflow-x-auto">
          {primary.map((t) => (
            <li key={t.to} className="w-20 shrink-0 flex-1">
              <Link
                to={t.to}
                aria-current={isActive(t.to, t.match) ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-[0.68rem] font-medium",
                  isActive(t.to, t.match) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 max-w-full items-center justify-center border-b-2 transition",
                    isActive(t.to, t.match) ? "border-primary text-primary" : "border-transparent",
                  )}
                >
                  <VIcon name={t.icon} size={20} active={isActive(t.to, t.match)} />
                </span>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
