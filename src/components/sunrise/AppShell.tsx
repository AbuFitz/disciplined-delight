import { Link } from "@tanstack/react-router";
import { CalendarClock, Dumbbell, Home, LineChart, Settings, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/schedule", label: "Schedule", icon: CalendarClock },
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-soft">
        <main className="flex-1 pb-28 pt-[env(safe-area-inset-top)]">{children}</main>

        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
          <div className="pointer-events-auto flex items-center justify-between rounded-3xl border border-border/60 bg-white/90 px-1 py-1.5 shadow-elevated backdrop-blur-lg">
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                activeOptions={{ exact: tab.to === "/" }}
                className="group flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-muted-foreground transition-colors [&.active]:text-primary"
                activeProps={{ className: "active" }}
              >
                <span className="flex h-7 w-9 items-center justify-center rounded-full transition-colors group-[&.active]:bg-accent">
                  <tab.icon className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <span className="text-[9px] font-semibold">{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
