import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarDays,
  Dumbbell,
  Home,
  LineChart,
  MoonStar,
  Play,
  Settings,
  Utensils,
  BookOpen,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useCollection } from "@/data/hooks";
import { COL, type Session } from "@/data/types";
import { SYNC_LABEL, useSyncStatus } from "@/data/sync-status";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { to: "/", label: "Today", icon: Home },
  { to: "/train", label: "Train", icon: Dumbbell },
  { to: "/food", label: "Food", icon: Utensils },
  { to: "/salah", label: "Salah", icon: MoonStar },
  { to: "/progress", label: "Progress", icon: LineChart },
] as const;

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

export function useActiveSession(): Session | undefined {
  const { items } = useCollection<Session>(COL.sessions);
  return items.find((s) => s.status === "active" || s.status === "paused");
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
  const onSession = loc.pathname.startsWith("/train/session");
  const isActive = (to: string) =>
    to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
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
            {[
              ...PRIMARY,
              { to: "/plan", label: "Week", icon: CalendarDays },
              { to: "/library", label: "Library", icon: BookOpen },
            ].map((t) => (
              <Link
                key={t.to}
                to={t.to}
                aria-current={isActive(t.to) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-medium transition",
                  isActive(t.to)
                    ? "bg-surface text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-5" strokeWidth={isActive(t.to) ? 2.4 : 1.9} />
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
            <Settings className="size-5" />
            Settings
          </Link>
          <div className="px-3">
            <SyncChip />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 pb-1 pt-[calc(0.5rem+var(--safe-top))] backdrop-blur-md [background:color-mix(in_oklab,var(--background)_82%,transparent)] lg:hidden">
          <Link to="/" aria-label="VAYVOR, Today" className="flex min-h-11 items-center">
            <Wordmark className="text-[1.05rem]" />
          </Link>
          <div className="flex items-center">
            <Link
              to="/plan"
              aria-label="Plan the week"
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <CalendarDays className="size-5" />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </div>

        <main
          id="main"
          className="scroll-pad-bottom mx-auto w-full max-w-[88rem] px-4 pb-10 pt-4 md:px-8 md:pt-8 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {/* Resume bar */}
      {active && !onSession && loc.pathname !== "/" && (
        <Link
          to="/train/session"
          className={cn(
            "fixed inset-x-3 z-40 flex min-h-12 items-center justify-between gap-3 rounded-full bg-primary px-5 text-primary-foreground shadow-xl lg:inset-x-auto lg:bottom-6 lg:right-8 lg:w-80",
            "bottom-[calc(5.25rem+var(--safe-bottom))]",
            typing && "hidden",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Play className="size-4 fill-current" />
            Continue session
          </span>
          <span className="text-sm opacity-80">
            {active.templateLetter ? `Workout ${active.templateLetter}` : active.templateName}
          </span>
        </Link>
      )}

      {/* Mobile tabs */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line px-2 pb-[var(--safe-bottom)] backdrop-blur-xl [background:color-mix(in_oklab,var(--background)_88%,transparent)] lg:hidden",
          (typing || onSession) && "hidden",
        )}
      >
        <ul className="mx-auto flex max-w-xl">
          {PRIMARY.map((t) => (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                aria-current={isActive(t.to) ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-[0.68rem] font-medium",
                  isActive(t.to) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition",
                    isActive(t.to) && "bg-primary text-primary-foreground",
                  )}
                >
                  <t.icon className="size-[1.15rem]" strokeWidth={2.2} />
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
