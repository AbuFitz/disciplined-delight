import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { useActiveSession } from "@/data/session-hooks";
import { useSyncStatus } from "@/data/sync-status";
import {
  COL,
  type MealPlanEntry,
  type MindEntry,
  type Session,
  type WorkoutTemplate,
} from "@/data/types";
import { companionState, DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
import { localDate, localMinutes, weekdayIndex } from "@/domain/dates";
import { cn } from "@/lib/utils";

export function Companion() {
  const configs = useCollection<CompanionConfig>(COL.companion);
  const saved = configs.items.find((item) => item.id === "main");
  const config = useMemo(() => (saved ? { ...DEFAULT_COMPANION, ...saved } : undefined), [saved]);
  const { profile } = useProfile();
  const active = useActiveSession();
  const sessions = useCollection<Session>(COL.sessions).items;
  const templates = useCollection<WorkoutTemplate>(COL.templates).items;
  const meals = useCollection<MealPlanEntry>(COL.mealPlan).items;
  const mind = useCollection<MindEntry>(COL.mind).items;
  const sync = useSyncStatus();
  const now = useNow(60_000);
  const tz = profile?.timezone ?? "UTC";
  const today = localDate(now, tz);
  const state = useMemo(
    () =>
      config
        ? companionState(config, {
            minute: localMinutes(now, tz),
            activeWorkout: !!active,
            workoutCompleted: sessions.some(
              (item) => item.date === today && item.status === "completed",
            ),
            workoutPlanned: templates.some((item) => item.weekday === weekdayIndex(today)),
            mealPlanning: meals.filter((item) => item.date === today).length === 0,
            focusPlanned: mind.filter((item) => item.date === today).length === 0,
            recoveryDay: !templates.some((item) => item.weekday === weekdayIndex(today)),
            offline: typeof navigator !== "undefined" && !navigator.onLine,
            syncError: sync.mode === "attention",
          })
        : { kind: "hidden" as const, message: "" },
    [config, now, tz, active, sessions, templates, meals, mind, today, sync.mode],
  );
  if (!config || config.placement !== "dashboard" || state.kind === "hidden") return null;
  return (
    <aside
      aria-live={state.kind === "sync" ? "assertive" : "polite"}
      className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-3 z-30 max-w-[19rem] rounded-2xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur lg:bottom-5 lg:right-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground",
            config.form === "totem" && "rounded-xl",
            config.form === "spark" && "rotate-45 rounded-xl [&>svg]:-rotate-45",
            config.palette === "amber" && "bg-amber-300 text-stone-950",
            config.palette === "violet" && "bg-violet-300 text-violet-950",
            config.motion !== "off" && "motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
          )}
        >
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {config.name}
          </p>
          <p className="mt-0.5 text-sm leading-snug">{state.message}</p>
          {state.action && (
            <Link
              to={state.action.to}
              className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold underline underline-offset-4"
            >
              {state.action.label}
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
