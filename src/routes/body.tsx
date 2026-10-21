import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { VIcon, type VIconName } from "@/components/nl/icon";
import { Group, PageHeader, Section } from "@/components/nl/ui";
import { useFoodData } from "@/data/food-hooks";
import { useCollection, useToday } from "@/data/hooks";
import { activeTemplates, plannedTemplateFor, weekTraining } from "@/data/selectors";
import { COL, type Session, type WeighIn, type WorkoutTemplate } from "@/data/types";

export const Route = createFileRoute("/body")({ component: BodyPage });

const chip =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary";

/** Big rounded destination card: circular icon chip, bold title, one live line. */
function Card({
  to,
  search,
  icon,
  title,
  line,
}: {
  to: string;
  search?: Record<string, string>;
  icon: VIconName;
  title: string;
  line: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="flex min-h-36 min-w-0 flex-col justify-start gap-6 rounded-3xl bg-surface/80 p-4 transition active:scale-[0.97] hover:bg-surface"
    >
      <span className={chip}>
        <VIcon name={icon} size={24} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">
          {title}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{line}</span>
      </span>
    </Link>
  );
}

function ListLink({
  to,
  icon,
  title,
  line,
}: {
  to: string;
  icon: VIconName;
  title: string;
  line: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 active:bg-surface-2/60"
    >
      <span className={chip}>
        <VIcon name={icon} size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{line}</span>
      </span>
      <VIcon name="next" size={20} className="shrink-0 text-muted-foreground" />
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
      <PageHeader title="Body" />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card
          to="/train"
          icon="training"
          title="Training"
          line={
            !templates.ready
              ? "Loading…"
              : !hasPlan
                ? "No workouts yet."
                : `${planned ? `Workout ${planned.letter} today` : "Rest day"} · ${week.completed} of ${week.planned} this week`
          }
        />
        <Card
          to="/food"
          icon="nutrition"
          title="Food"
          line={
            !food.ready
              ? "Loading…"
              : food.logs.length
                ? `${food.logs.length} ${food.logs.length === 1 ? "meal" : "meals"} logged today`
                : "Nothing logged today"
          }
        />
        <Card
          to="/food"
          search={{ tab: "shop" }}
          icon="checklist"
          title="Shopping"
          line="List and budget from your meal plan"
        />
        <Card
          to="/progress"
          icon="progress"
          title="Progress"
          line={
            latest
              ? `Latest weigh-in ${latest.kg} kg · ${latest.date}`
              : "Trends appear once you log a few weigh-ins"
          }
        />
      </div>
      <Section title="More">
        <Group>
          <ListLink
            to="/train/build"
            icon="buddy"
            title="Build me a plan"
            line="From your goal, time and kit. Editable."
          />
          <ListLink
            to="/library"
            icon="library"
            title="Exercise library"
            line="Photos, muscles and credits"
          />
        </Group>
      </Section>
    </>
  );
}
