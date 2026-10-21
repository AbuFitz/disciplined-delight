import { createFileRoute, Link } from "@tanstack/react-router";
import { ExerciseBrowser } from "@/components/nl/exercise-browser";
import { Group, PageHeader } from "@/components/nl/ui";
import { VIcon } from "@/components/nl/icon";
import { WorkoutLibrary } from "@/components/nl/workout-library";
import { useCatalogue } from "@/data/catalogue-runtime";
import { cn } from "@/lib/utils";

type Tab = "workouts" | "programmes" | "exercises";
export const Route = createFileRoute("/library")({
  component: LibraryPage,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s.tab === "workouts" || s.tab === "programmes" || s.tab === "exercises" ? { tab: s.tab } : {},
});

const TABS: { id: Tab; label: string }[] = [
  { id: "workouts", label: "Workouts" },
  { id: "programmes", label: "Programmes" },
  { id: "exercises", label: "Exercises" },
];

function LibraryPage() {
  const { tab = "workouts" } = Route.useSearch();
  const nav = Route.useNavigate();
  const cat = useCatalogue();
  return (
    <>
      <PageHeader
        title="Library"
        sub={
          cat.snapshot
            ? `${cat.snapshot.counts.published.toLocaleString("en-GB")} exercises with credited demos or a form guide.`
            : "Workouts, programmes and every exercise."
        }
      />
      <div
        role="tablist"
        aria-label="Library"
        className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-surface/80 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => nav({ search: t.id === "workouts" ? {} : { tab: t.id } })}
            className={cn(
              "min-h-11 rounded-full px-3 text-sm font-semibold transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "exercises" ? (
        <ExerciseBrowser />
      ) : (
        <WorkoutLibrary
          embedded
          activeTab={tab}
          onTabChange={(next) => nav({ search: next === "workouts" ? {} : { tab: next } })}
        />
      )}
      <Group className="mt-6">
        <Link
          to="/train/build"
          className="flex min-h-14 items-center gap-3 px-4 font-semibold active:bg-surface-2/60"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <VIcon name="adaptation" size={18} />
          </span>
          <span className="flex-1">Build me a plan from my kit</span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
        </Link>
        <Link
          to="/credits"
          className="flex min-h-14 items-center gap-3 px-4 font-semibold active:bg-surface-2/60"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground/8">
            <VIcon name="note" size={18} />
          </span>
          <span className="flex-1">Credits and licences</span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
        </Link>
      </Group>
    </>
  );
}
