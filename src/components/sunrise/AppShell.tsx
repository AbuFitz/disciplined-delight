import { Link } from "@tanstack/react-router";
import { CalendarClock, Dumbbell, Home, Settings, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-soft">
        <main className="flex-1 pb-24 pt-[env(safe-area-inset-top)]">{children}</main>

        <nav className="sticky bottom-0 z-30 flex border-t border-border bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: tab.to === "/" }}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <tab.icon className="h-5 w-5" strokeWidth={2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
