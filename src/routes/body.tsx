import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/nl/ui";
import { useFoodData } from "@/data/food-hooks";
import { useCollection, useToday } from "@/data/hooks";
import { activeTemplates, plannedTemplateFor, weekTraining } from "@/data/selectors";
import { COL, type Session, type WeighIn, type WorkoutTemplate } from "@/data/types";

export const Route = createFileRoute("/body")({ component: BodyPage });

function Tile({
  to,
  search,
  title,
  line,
  children,
}: {
  to: string;
  search?: Record<string, string>;
  title: string;
  line: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="group flex min-h-32 flex-col justify-between rounded-[1.5rem] border border-line bg-surface p-5 transition hover:border-foreground/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 font-display text-2xl font-bold leading-tight [overflow-wrap:anywhere]">
          {title}
        </h2>
        <ArrowRight
          className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{line}</p>
      {children}
    </Link>
  );
}

function BodyPage() {
  const today = useToday();
  const templates = useCollection<WorkoutTemplate>(COL.templates);
  const sessions = useCollection<Session>(COL.sessions);
  const weigh = useCollection<WeighIn>(COL.weighIns);
  const food = useFoodData(today);
  const planned = plannedTemplateFor(templates.items, today);
  const week = weekTraining(templates.items, sessions.items, today);
  const hasPlan = activeTemplates(templates.items).length > 0;
  const latest = [...weigh.items].sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <>
      <PageHeader
        eyebrow="Body"
        title="Train, eat, track"
        sub="Training, food, shopping and progress in one place."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Tile
          to="/train"
          title="Training"
          line={
            !templates.ready
              ? "Loading…"
              : !hasPlan
                ? "No workouts yet. Build a plan or add your own."
                : `${planned ? `Workout ${planned.letter} today. ` : "Rest day today. "}${week.completed} of ${week.planned} sessions this week.`
          }
        />
        <Tile
          to="/food"
          title="Food"
          line={
            !food.ready
              ? "Loading…"
              : food.logs.length
                ? `${food.logs.length} ${food.logs.length === 1 ? "meal" : "meals"} logged today.`
                : "Nothing logged today yet."
          }
        />
        <Tile
          to="/food"
          search={{ tab: "shop" }}
          title="Shopping and budget"
          line="Shopping list from your meal plan, with what you've bought and spent."
        />
        <Tile
          to="/progress"
          title="Progress"
          line={
            latest
              ? `Latest weigh-in ${latest.kg} kg on ${latest.date}.`
              : "No weigh-ins yet. Trends appear once you log a few."
          }
        />
        <Tile
          to="/library"
          title="Exercise library"
          line="Every exercise with photos, muscles and credits. Favourite the ones you like."
        />
        <Tile
          to="/train/build"
          title="Build me a plan"
          line="A programme from your goal, time and kit, that you can edit."
        />
      </div>
    </>
  );
}
